
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase-client";

type Daily = {
  date: string;
  registered: number;
  stamps: number;
  completed: number;
  exchanged: number;
};

type Spot = {
  spot_id: string;
  count: number;
};

type Snapshot = {
  totals: {
    registered: number;
    completed: number;
    exchanged: number;
    stamps: number;
  };
  daily: Daily[];
  spots: Spot[];
};

type Check = {
  label: string;
  ok: boolean;
  detail: string;
};

const spotNames: Record<string, string> = {
  spot1: "学生センター",
  spot2: "東棟2階",
  spot3: "ゆうちょ銀行ATM付近",
  spot4: "ラーニングスクエア",
  spot5: "セブンイレブン付近",
};

function n(value: unknown) {
  const v = Number(value);
  return Number.isFinite(v) ? v : 0;
}

function percent(a: number, b: number) {
  return b > 0
    ? Math.round((a / b) * 1000) / 10
    : 0;
}

function sum(
  days: Daily[],
  key: "registered" | "stamps" | "completed" | "exchanged"
) {
  return days.reduce(
    (total, row) => total + row[key],
    0
  );
}

function normalize(value: unknown): Snapshot {
  const x = (value ?? {}) as Record<string, any>;
  const totals = x.totals ?? {};

  return {
    totals: {
      registered: n(totals.registered),
      completed: n(totals.completed),
      exchanged: n(totals.exchanged),
      stamps: n(totals.stamps),
    },
    daily: Array.isArray(x.daily)
      ? x.daily.map((d: Record<string, unknown>) => ({
          date: String(d.date ?? ""),
          registered: n(d.registered),
          stamps: n(d.stamps),
          completed: n(d.completed),
          exchanged: n(d.exchanged),
        }))
      : [],
    spots: Array.isArray(x.spots)
      ? x.spots.map((s: Record<string, unknown>) => ({
          spot_id: String(s.spot_id ?? ""),
          count: n(s.count),
        }))
      : [],
  };
}

function downloadCsv(
  name: string,
  rows: (string | number)[][]
) {
  const cell = (v: string | number) => {
    let text = String(v ?? "");

    // Excel等で数式として解釈されることを防ぐ
    if (
      typeof v === "string" &&
      /^[\s\r\n]*[=+@\-\t]/.test(text)
    ) {
      text = "'" + text;
    }

    return '"' + text.replace(/"/g, '""') + '"';
  };

  const csv =
    "\uFEFF" +
    rows
      .map((row) => row.map(cell).join(","))
      .join("\r\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = name;

  document.body.appendChild(a);
  a.click();
  a.remove();

  window.setTimeout(
    () => URL.revokeObjectURL(url),
    1500
  );
}

export default function StaffOperationsPage() {
  const router = useRouter();

  const [auth, setAuth] = useState<
    "loading" | "denied" | "ok"
  >("loading");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [snapshot, setSnapshot] =
    useState<Snapshot | null>(null);
  const [checks, setChecks] = useState<Check[]>([]);
  const [checkedAt, setCheckedAt] = useState("");

  // 管理者認証
  useEffect(() => {
    let active = true;

    async function checkStaff() {
      const {
        data: user,
        error: userError,
      } = await supabase.auth.getUser();

      if (!active) return;

      if (userError || !user.user) {
        setAuth("denied");
        return;
      }

      const {
        data: staff,
        error: staffError,
      } = await supabase
        .from("staff_profiles")
        .select("user_id")
        .eq("user_id", user.user.id)
        .maybeSingle();

      if (!active) return;

      setAuth(
        !staffError && staff
          ? "ok"
          : "denied"
      );
    }

    void checkStaff();

    return () => {
      active = false;
    };
  }, []);

  // システム状態と集計データを更新
  const refresh = useCallback(async () => {
    if (auth !== "ok") return;

    setLoading(true);

    const results: Check[] = [];

    try {
      const {
        data: user,
        error: userError,
      } = await supabase.auth.getUser();

      const signedIn =
        !userError && !!user.user;

      results.push({
        label: "管理者ログイン",
        ok: signedIn,
        detail: signedIn
          ? "認証済み"
          : "認証を確認できません",
      });

      const {
        data: probe,
        error: probeError,
      } = await supabase.rpc(
        "get_participant_count"
      );

      results.push({
        label: "参加者集計API",
        ok: !probeError,
        detail: probeError
          ? "集計APIに接続できません"
          : `応答あり・登録者数 ${n(probe)}人`,
      });

      const {
        data: analytics,
        error: analyticsError,
      } = await supabase.rpc(
        "pokipo_staff_analytics"
      );

      results.push({
        label: "分析データ取得",
        ok:
          !analyticsError &&
          !!analytics,
        detail: analyticsError
          ? "分析APIに接続できません"
          : "データ取得成功",
      });

      if (analyticsError || !analytics) {
        setError(
          "集計データを取得できませんでした。SQL関数とスタッフ権限を確認してください。"
        );
      } else {
        setSnapshot(normalize(analytics));
        setError("");
      }
    } catch (error) {
      console.error("システム確認エラー:", error);

      results.push({
        label: "通信状態",
        ok: false,
        detail: "通信中にエラーが発生しました",
      });

      setError(
        "通信エラーが発生しました。"
      );
    } finally {
      setChecks(results);

      setCheckedAt(
        new Date().toLocaleString("ja-JP", {
          timeZone: "Asia/Tokyo",
        })
      );

      setLoading(false);
    }
  }, [auth]);

  // 60秒ごとの自動更新
  useEffect(() => {
    if (auth !== "ok") return;

    void refresh();

    const timer = window.setInterval(() => {
      if (
        document.visibilityState === "visible"
      ) {
        void refresh();
      }
    }, 60000);

    return () => {
      window.clearInterval(timer);
    };
  }, [auth, refresh]);

  // 自動分析文章
  const report = useMemo(() => {
    if (!snapshot) return [];

    const { totals } = snapshot;
    const days = snapshot.daily;

    const last7 = days.slice(-7);
    const prev7 = days.slice(-14, -7);

    const thisWeek =
      sum(last7, "registered");

    const previous =
      sum(prev7, "registered");

    const spots = Object.entries(spotNames).map(
      ([id, name]) => ({
        id,
        name,
        count:
          snapshot.spots.find(
            (s) => s.spot_id === id
          )?.count ?? 0,
      })
    );

    const highest = [...spots].sort(
      (a, b) => b.count - a.count
    )[0];

    const growth =
      previous > 0
        ? `${
            (
              ((thisWeek - previous) / previous) *
              100
            ).toFixed(1)
          }%`
        : "比較不可（前の7日間が0人）";

    return [
      `登録者は累計${totals.registered}人。直近7日間の新規登録は${thisWeek}人、前の7日間は${previous}人で、増減率は${growth}です。`,

      `完走者は${totals.completed}人、完走率は${percent(
        totals.completed,
        totals.registered
      )}%です。`,

      `交換済みは${totals.exchanged}人で、完走者に対する交換率は${percent(
        totals.exchanged,
        totals.completed
      )}%です。`,

      `最多読み取りスポットは${
        highest?.name ?? "未取得"
      }（${highest?.count ?? 0}人）です。`,

      "※数値から読み取れる事実を自動表示しています。増減の原因や不正利用を推測するものではありません。",
    ];
  }, [snapshot]);

  function exportDaily() {
    if (!snapshot) return;

    downloadCsv("POKIPO_日別推移.csv", [
      [
        "日付(JST)",
        "新規登録",
        "スタンプ取得件数",
        "新規完走",
        "特典交換件数",
      ],
      ...snapshot.daily.map((d) => [
        d.date,
        d.registered,
        d.stamps,
        d.completed,
        d.exchanged,
      ]),
    ]);
  }

  function exportSpots() {
    if (!snapshot) return;

    downloadCsv("POKIPO_スポット別.csv", [
      [
        "スポット",
        "読み取り人数(重複除外)",
      ],
      ...Object.entries(spotNames).map(
        ([id, name]) => [
          name,
          snapshot.spots.find(
            (s) => s.spot_id === id
          )?.count ?? 0,
        ]
      ),
    ]);
  }

  function exportSummary() {
    if (!snapshot) return;

    const t = snapshot.totals;

    downloadCsv("POKIPO_全体集計.csv", [
      ["指標", "値"],
      ["登録者", t.registered],
      ["完走者", t.completed],
      ["交換済み", t.exchanged],
      ["スタンプ取得件数", t.stamps],
      [
        "完走率(%)",
        percent(t.completed, t.registered),
      ],
      [
        "交換率(%)",
        percent(t.exchanged, t.completed),
      ],
    ]);
  }

  return (
    <main className="shell">
      <section className="pokipoOpsPage">

        {/* ヘッダー */}
        <header className="pokipoOpsHeader">
          <div>
            <span>
              POKIPO STAFF / OPERATIONS
            </span>

            <h1>
              運営チェック・データ出力
            </h1>

            <p>
              エラー監視・CSV出力・自動分析レポート
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/staff")}
          >
            スタッフメニューへ戻る
          </button>
        </header>

        {auth === "loading" && (
          <div className="pokipoOpsCard">
            管理者認証を確認中...
          </div>
        )}

        {auth === "denied" && (
          <div
            className="pokipoOpsCard"
            role="alert"
          >
            スタッフ権限を確認できませんでした。
            ログイン後に開いてください。
          </div>
        )}

        {auth === "ok" && (
          <>
            {/* システム稼働状況 */}
            <section className="pokipoOpsCard">
              <div className="pokipoOpsTitle">
                <h2>
                  システム稼働状況
                </h2>

                <button
                  type="button"
                  onClick={() => void refresh()}
                  disabled={loading}
                >
                  {loading
                    ? "確認中..."
                    : "今すぐ確認"}
                </button>
              </div>

              <p className="pokipoOpsSmall">
                最終確認：
                {checkedAt || "確認中"}
                {" ／ "}
                表示中は60秒ごとに再確認
              </p>

              <div className="pokipoOpsChecks">
                {checks.map((c) => (
                  <article
                    key={c.label}
                    className={
                      c.ok ? "ok" : "ng"
                    }
                  >
                    <strong>
                      {c.ok
                        ? "● 正常"
                        : "● 要確認"}
                      {"｜"}
                      {c.label}
                    </strong>

                    <span>
                      {c.detail}
                    </span>
                  </article>
                ))}
              </div>

              <p className="pokipoOpsSmall">
                この監視は管理画面からの疎通確認です。
                QR読み取りや景品交換の全操作を
                常時監視したり、過去のエラーを
                記録したりする機能ではありません。
              </p>

              {error && (
                <p
                  role="alert"
                  className="pokipoOpsError"
                >
                  {error}
                </p>
              )}
            </section>

            {/* CSV */}
            <section className="pokipoOpsCard">
              <h2>CSVデータ出力</h2>

              <p>
                Excelで開けるUTF-8形式で
                集計値のみ出力します。
                学籍番号・ニックネームは含めません。
              </p>

              <div className="pokipoOpsButtons">
                <button
                  type="button"
                  disabled={!snapshot}
                  onClick={exportDaily}
                >
                  日別推移CSV
                </button>

                <button
                  type="button"
                  disabled={!snapshot}
                  onClick={exportSpots}
                >
                  スポット別CSV
                </button>

                <button
                  type="button"
                  disabled={!snapshot}
                  onClick={exportSummary}
                >
                  全体集計CSV
                </button>
              </div>
            </section>

            {/* 自動分析レポート */}
            <section className="pokipoOpsCard">
              <h2>
                自動分析レポート
              </h2>

              <p>
                現在の集計データから計算した文章です。
                ChatGPTや外部AIには送信しません。
              </p>

              {!snapshot ? (
                <p>
                  分析データ取得後に表示されます。
                </p>
              ) : (
                <div className="pokipoOpsReport">
                  {report.map((line, i) => (
                    <p key={i}>
                      {line}
                    </p>
                  ))}
                </div>
              )}

              <p className="pokipoOpsSmall">
                前週比較は直近7日間と、
                その直前の7日間を比較します。
                集計日付は日本時間です。
              </p>
            </section>
          </>
        )}
      </section>
    </main>
  );
}
