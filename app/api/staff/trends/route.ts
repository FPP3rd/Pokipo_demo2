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
    timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit"
  }).format(date);
}
function hourKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit",
    day: "2-digit", hour: "2-digit", hourCycle: "h23"
  }).formatToParts(date);
  const p = (t: string) => parts.find(x => x.type === t)?.value || "00";
  return `${p("year")}-${p("month")}-${p("day")} ${p("hour")}:00`;
}
function isOriginAllowed(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) return true; // GET requests can omit Origin; authorization is still required
  return origin === req.nextUrl.origin;
}
export async function GET(req: NextRequest) {
  if (!isOriginAllowed(req)) return NextResponse.json({ error: "不正なOrigin" }, { status: 403 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const pub = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !service || !pub) return NextResponse.json(
    { error: "サーバー環境変数が不足しています。管理者に連絡してください。" }, { status: 503 }
  );
  const jwt = req.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!jwt) return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  const client = createClient(url, pub, { auth: { persistSession: false, autoRefreshToken: false } });
  const privileged = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: who, error: authError } = await client.auth.getUser(jwt);
  if (authError || !who.user) return NextResponse.json({ error: "セッションが無効です。" }, { status: 401 });
  const { data: staff, error: staffError } = await privileged.from("staff_profiles")
    .select("user_id").eq("user_id", who.user.id).maybeSingle();
  if (staffError || !staff) return NextResponse.json({ error: "スタッフ権限がありません。" }, { status: 403 });

  // A maximum of 31 local calendar days. No participant IDs or other personal details are returned.
  const rawDays = Number(req.nextUrl.searchParams.get("days") || 14);
  const days = [7, 14, 31].includes(rawDays) ? rawDays : 14;
  const now = new Date();
  const start = new Date(now.getTime() - (days + 2) * 86400000);
  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    keys.push(dayKey(new Date(now.getTime() - i * 86400000)));
  }

  const events: Record<string, string[]> = {
    participants: [], completions: [], surveys: [], exchanges: []
  };

  // 1000-row PostgREST page limit is handled through pagination.
  try {
    for (const entry of TABLES) {
      let offset = 0;
      while (true) {
        let query = privileged.from(entry.table)
          .select(entry.time)
          .gte(entry.time, start.toISOString())
          .order(entry.time, { ascending: true })
          .range(offset, offset + 999);
        if (entry.table === "reward_exchanges") query = query.eq("status", "exchanged");
        const { data, error } = await query;
        if (error) throw error;
        const rows = (data || []) as unknown as Record<string, string | null>[];
        for (const row of rows) if (row[entry.time]) events[entry.key].push(row[entry.time] as string);
        if (rows.length < 1000) break;
        offset += 1000;
        if (offset > 200000) throw new Error("集計対象が多すぎます。期間を短縮してください。");
      }
    }
  } catch (error) {
    console.error("運営動向データ取得エラー", error);
    return NextResponse.json({ error: "集計情報を取得できませんでした。" }, { status: 500 });
  }
  const summarize = (values: string[], keyFn: (d: Date) => string) => {
    const result: Record<string, number> = {};
    for (const value of values) {
      const key = keyFn(new Date(value));
      result[key] = (result[key] || 0) + 1;
    }
    return result;
  };
  const daily = Object.fromEntries(
    Object.entries(events).map(([k, v]) => [k, summarize(v, dayKey)])
  );
  const hourly = Object.fromEntries(
    Object.entries(events).map(([k, v]) => [k, summarize(v, hourKey)])
  );
  const records = keys.map(day => ({
    day,
    participants: daily.participants[day] || 0,
    completions: daily.completions[day] || 0,
    surveys: daily.surveys[day] || 0,
    exchanges: daily.exchanges[day] || 0
  }));
  const currentHour = hourKey(now);
  const previousHour = hourKey(new Date(now.getTime() - 3600000));
  const yesterdayHour = hourKey(new Date(now.getTime() - 86400000));
  const comparison = Object.fromEntries(
    Object.keys(events).map(key => [key, {
      current: hourly[key][currentHour] || 0,
      previous: hourly[key][previousHour] || 0,
      yesterday: hourly[key][yesterdayHour] || 0
    }])
  );
  // No-store prevents other administrators or browsers from receiving cached private aggregates.
  return NextResponse.json({ days, records, comparison, generatedAt: now.toISOString(),
    note: "時間比較は各1時間枠の件数です。現在時刻の枠は集計途中です。" }, {
      headers: { "Cache-Control": "private, no-store" }
    });
}