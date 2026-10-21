import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TABLES = [
  { key: "participants", table: "participants", time: "created_at" },
  { key: "completions", table: "participant_completions", time: "completed_at" },
  { key: "surveys", table: "pokipo_post_surveys", time: "created_at" },
  { key: "exchanges", table: "reward_exchanges", time: "exchanged_at" },
] as const;

function dayKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(date);
}

function hourKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const p = (t: string) => parts.find((part) => part.type === t)?.value || "00";
  return `${p("year")}-${p("month")}-${p("day")} ${p("hour")}:00`;
}

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "private, no-store" } }
  );
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) {
    return errorResponse("不正なOriginです。", 403);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    return errorResponse("Supabase接続設定が不足しています。", 503);
  }

  const jwt = req.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!jwt) return errorResponse("スタッフログインが必要です。", 401);

  // 秘密鍵は使わず、ログイン中のユーザー権限でSupabaseを呼び出す。
  // RLSは有効なまま、既存のauthenticated用SELECTポリシーを適用。
  const client = createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });

  const { data: identity, error: identityError } = await client.auth.getUser(jwt);
  if (identityError || !identity.user) {
    return errorResponse("ログイン状態が無効です。再ログインしてください。", 401);
  }

  const { data: staff, error: staffError } = await client
    .from("staff_profiles")
    .select("user_id")
    .eq("user_id", identity.user.id)
    .maybeSingle();

  if (staffError) {
    console.error("参加動向分析スタッフ認証失敗", staffError.message);
    return errorResponse("スタッフ権限を確認できませんでした。", 500);
  }
  if (!staff) return errorResponse("スタッフ権限がありません。", 403);

  const requestedDays = Number(req.nextUrl.searchParams.get("days") || 14);
  const days = [7, 14, 31].includes(requestedDays) ? requestedDays : 14;
  const now = new Date();
  const start = new Date(now.getTime() - (days + 2) * 86400000);
  const daysInJst: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    daysInJst.push(dayKey(new Date(now.getTime() - i * 86400000)));
  }

  const events: Record<string, string[]> = {
    participants: [],
    completions: [],
    surveys: [],
    exchanges: [],
  };

  try {
    for (const entry of TABLES) {
      let offset = 0;
      while (true) {
        let query = client
          .from(entry.table)
          .select(entry.time)
          .gte(entry.time, start.toISOString())
          .order(entry.time, { ascending: true })
          .range(offset, offset + 999);

        if (entry.table === "reward_exchanges") {
          query = query.eq("status", "exchanged");
        }

        const { data, error } = await query;
        if (error) throw error;
        const rows = (data || []) as unknown as Record<string, string | null>[];

        for (const row of rows) {
          const value = row[entry.time];
          if (value) events[entry.key].push(value);
        }

        if (rows.length < 1000) break;
        offset += 1000;
        if (offset > 200000) {
          throw new Error("集計対象が多すぎます。期間を短縮してください。");
        }
      }
    }
  } catch (error) {
    console.error("参加動向分析の集計失敗", error);
    return errorResponse("本番データの集計に失敗しました。", 500);
  }

  const summarize = (values: string[], keyFn: (date: Date) => string) => {
    const result: Record<string, number> = {};
    for (const value of values) {
      const key = keyFn(new Date(value));
      result[key] = (result[key] || 0) + 1;
    }
    return result;
  };

  const daily = Object.fromEntries(
    Object.entries(events).map(([key, values]) => [key, summarize(values, dayKey)])
  );
  const hourly = Object.fromEntries(
    Object.entries(events).map(([key, values]) => [key, summarize(values, hourKey)])
  );

  const records = daysInJst.map((day) => ({
    day,
    participants: daily.participants[day] || 0,
    completions: daily.completions[day] || 0,
    surveys: daily.surveys[day] || 0,
    exchanges: daily.exchanges[day] || 0,
  }));

  const currentHour = hourKey(now);
  const previousHour = hourKey(new Date(now.getTime() - 3600000));
  const yesterdayHour = hourKey(new Date(now.getTime() - 86400000));

  const comparison = Object.fromEntries(
    Object.keys(events).map((key) => [key, {
      current: hourly[key][currentHour] || 0,
      previous: hourly[key][previousHour] || 0,
      yesterday: hourly[key][yesterdayHour] || 0,
    }])
  );

  return NextResponse.json({
    days,
    records,
    comparison,
    generatedAt: now.toISOString(),
    note: "時間比較は各1時間枠の件数です。現在時刻の枠は集計途中です。",
  }, { headers: { "Cache-Control": "private, no-store" } });
}