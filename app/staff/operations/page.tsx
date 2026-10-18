
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase-client";
import HealthPanel from "./HealthPanel";

/* ========================================
   TYPES
======================================== */

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

/* ========================================
   CONFIG
======================================== */

const spotNames: Record<string, string> = {
  spot1: "学生センター",
  spot2: "東棟2階",
  spot3: "ゆうちょ銀行ATM付近",
  spot4: "ラーニングスクエア",
  spot5: "セブンイレブン付近",
};

/* ========================================
   HELPERS
======================================== */

function n(value: unknown): number {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
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
  const raw =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};

  const totals =
    raw.totals && typeof raw.totals === "object"
      ? (raw.totals as Record<string, unknown>)
      : {};

  const rawDaily = Array.isArray(raw.daily)
    ? raw.daily
    : [];

  const rawSpots = Array.isArray(raw.spots)
    ? raw.spots
    : [];

  return {
    totals: {
      registered: n(totals.registered),
      completed: n(totals.completed),
      exchanged: n(totals.exchanged),
      stamps: n(totals.stamps),
    },

    daily: rawDaily.map((item) => ({
      date: String(item.date ?? ""),
      registered: n(item.registered),
      stamps: n(item.stamps),
      completed: n(item.completed),
      exchanged: n(item.exchanged),
    })),

    spots: rawSpots.map((item) => ({
      spot_id: String(item.spot_id ?? ""),
      count: n(item.count),
    })),
  };
}

/* ========================================
   CSV DOWNLOAD
======================================== */

function downloadCsv(
  name: string,
  rows: (string | number)[][]
) {
  const cell = (value: string | number) => {
    let text = String(value ?? "");

    // Excelの数式として解釈されることを防止
    if (
      typeof value === "string" &&
      /^[\s\r\n]*[=+@\-\t]/.test(text)
    ) {
      text = "'" + text;
    }

    return (
      '"' +
      text.replace(/"/g, '""') +
      '"'
    );
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

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1500);
}

/* ========================================
   MAIN PAGE
======================================== */

export default function StaffOperationsPage() {
  const router = useRouter();

  /* ----------------------------------------
     AUTH STATE
  ---------------------------------------- */

  const [auth, setAuth] = useState<
    "loading" | "denied" | "ok"
  >("loading");

  /* ----------------------------------------
     SYSTEM STATE
  ---------------------------------------- */

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [snapshot, setSnapshot] =
    useState<Snapshot | null>(null);

  const [checks, setChecks] =
    useState<Check[]>([]);

  const [checkedAt, setCheckedAt] =
    useState("");

  const [dataCheckedAt, setDataCheckedAt] =
    useState("");

  /* ========================================
     STAFF AUTHENTICATION
  ======================================== */

  useEffect(() => {
    let active = true;

    async function checkStaff() {
      try {
        const {
          data: userData,
          error: userError,
        } = await supabase.auth.getUser();

        if (!active) return;

        if (userError || !userData.user) {
          setAuth("denied");
          return;
        }

        const {
          data: staff,
          error: staffError,
        } = await supabase
          .from("staff_profiles")
          .select("user_id")
          .eq("user_id", userData.user.id)
          .maybeSingle();

        if (!active) return;

        if (staffError || !staff) {
          setAuth("denied");
          return;
        }

        setAuth("ok");
      } catch (caught) {
        console.error(
          "スタッフ認証エラー:",
          caught
        );

        if (active) {
          setAuth("denied");
        }
      }
    }

    void checkStaff();

    return () => {
      active = false;
    };
  }, []);

  /* ========================================
     SYSTEM CONNECTION CHECK
  ======================================== */

  const refresh = useCallback(async () => {
    if (auth !== "ok") return;

    setLoading(true);

    const results: Check[] = [];

    try {
      /* ------------------------------------
         スタッフ認証
      ------------------------------------ */

      const {
        data: userData,
        error: userError,
      } = await supabase.auth.getUser();

      const signedIn =
        !userError && !!userData.user;

      results.push({
        label: "管理者ログイン",
        ok: signedIn,
        detail: signedIn
          ? "スタッフ認証への応答を確認"
          : "認証状態を確認できません",
      });

      /* ------------------------------------
         参加者集計API
      ------------------------------------ */

      const {
        data: participantData,
        error: participantError,
      } = await supabase.rpc(
        "get_participant_count"
      );

      const participantApiOk =
        !participantError &&
        participantData !== null;

      results.push({
        label: "参加者集計API",
        ok: participantApiOk,
        detail: participantApiOk
          ? `応答あり・登録者数 ${n(
              participantData
            ).toLocaleString()}人`
          : "参加者集計APIの取得に失敗",
      });

      /* ------------------------------------
         分析データ取得
      ------------------------------------ */

      const {
        data: analytics,
        error: analyticsError,
      } = await supabase.rpc(
        "pokipo_staff_analytics"
      );

      const analyticsOk =
        !analyticsError && !!analytics;

      results.push({
        label: "分析データ取得",
        ok: analyticsOk,
        detail: analyticsOk
          ? "集計データの取得に成功"
          : "分析APIの取得に失敗",
      });

      if (analyticsOk) {
        setSnapshot(normalize(analytics));

        setDataCheckedAt(
          new Date().toLocaleString("ja-JP", {
            timeZone: "Asia/Tokyo",
          })
        );

        setError("");
      } else {
        setError(
          "集計データを取得できませんでした。通信状態・SQL関数・スタッフ権限を確認してください。"
        );
      }
    } catch (caught) {
      console.error(
        "システム確認エラー:",
        caught
      );

      results.push({
        label: "通信状態",
        ok: false,
        detail:
          "通信中に予期しないエラーが発生しました",
      });

      setError(
        "システム確認中に通信エラーが発生しました。"
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

  /* ========================================
     AUTO REFRESH: 60 SECONDS
  ======================================== */

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

    function onVisible() {
      if (
        document.visibilityState === "visible"
      ) {
        void refresh();
      }
    }

    document.addEventListener(
      "visibilitychange",
      onVisible
    );

    return () => {
      window.clearInterval(timer);

      document.removeEventListener(
        "visibilitychange",
        onVisible
      );
    };
  }, [auth, refresh]);

  /* ========================================
     AUTOMATIC STATISTICS REPORT
  ======================================== */

  const report = useMemo(() => {
    if (!snapshot) return [];

    const { totals } = snapshot;
    const days = snapshot.daily;

    const last7 = days.slice(-7);
    const previous7 = days.slice(-14, -7);

    const thisWeek = sum(
      last7,
      "registered"
    );

    const previous = sum(
      previous7,
      "registered"
    );

    const spots = Object.entries(
      spotNames
    ).map(([id, name]) => ({
      id,
      name,
      count:
        snapshot.spots.find(
          (spot) => spot.spot_id === id
        )?.count ?? 0,
    }));

    const highest = [...spots].sort(
      (a, b) => b.count - a.count
    )[0];

    const growth =
      previous > 0
        ? `${
            (
              ((thisWeek - previous) /
                previous) *
              100
            ).toFixed(1)
          }%`
        : "比較不可（前の7日間が0人）";

    return [
      `登録者は累計${totals.registered.toLocaleString()}人。直近7日間の新規登録は${thisWeek.toLocaleString()}人、前の7日間は${previous.toLocaleString()}人で、増減率は${growth}です。`,

      `完走者は${totals.completed.toLocaleString()}人、完走率は${percent(
        totals.completed,
        totals.registered
      )}%です。`,

      `交換済みは${totals.exchanged.toLocaleString()}人で、完走者に対する交換率は${percent(
        totals.exchanged,
        totals.completed
      )}%です。`,

      `最多読み取りスポットは${
        highest?.name ?? "未取得"
      }（${(
        highest?.count ?? 0
      ).toLocaleString()}人）です。`,

      "※数値から読み取れる事実を表示しています。増減の原因や不正利用を推測するものではありません。",
    ];
  }, [snapshot]);

  /* ========================================
     CSV: DAILY DATA
  ======================================== */

  function exportDaily() {
    if (!snapshot || error) return;

    downloadCsv("POKIPO_日別推移.csv", [
      [
        "日付(JST)",
        "新規登録",
        "スタンプ取得件数",
        "新規完走",
        "特典交換件数",
      ],
      ...snapshot.daily.map((day) => [
        day.date,
        day.registered,
        day.stamps,
        day.completed,
        day.exchanged,
      ]),
    ]);
  }

  /* ========================================
     CSV: SPOTS
  ======================================== */

  function exportSpots() {
    if (!snapshot || error) return;

    downloadCsv("POKIPO_スポット別.csv", [
      [
        "スポット",
        "読み取り人数(重複除外)",
      ],
      ...Object.entries(spotNames).map(
        ([id, name]) => [
          name,
          snapshot.spots.find(
            (spot) => spot.spot_id === id
          )?.count ?? 0,
        ]
      ),
    ]);
  }

  /* ========================================
     CSV: SUMMARY
  ======================================== */

  function exportSummary() {
    if (!snapshot || error) return;

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

  /* ========================================
     PAGE
  ======================================== */

  return (
    <main className="shell">
      <section className="pokipoOpsPage">

        {/* =================================
            HEADER
        ================================= */}

        <header className="pokipoOpsHeader">
          <div>
            <span>
              POKIPO STAFF / OPERATIONS
            </span>

            <h1>
              運営チェック・データ出力
            </h1>

            <p>
              システム接続確認・参加者機能監視・
              CSV出力・自動分析レポート
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              router.push("/staff")
            }
          >
            ← スタッフメニューへ戻る
          </button>
        </header>

        {/* =================================
            AUTH LOADING
        ================================= */}

        {auth === "loading" && (
          <div className="pokipoOpsCard">
            管理者認証を確認中...
          </div>
        )}

        {/* =================================
            ACCESS DENIED
        ================================= */}

        {auth === "denied" && (
          <div
            className="pokipoOpsCard"
            role="alert"
          >
            スタッフ権限を確認できませんでした。
            スタッフとしてログインし直してください。
          </div>
        )}

        {/* =================================
            STAFF CONTENT
        ================================= */}

        {auth === "ok" && (
          <>

            {/* =============================
                BASIC SYSTEM HEALTH
            ============================= */}

            <section className="pokipoOpsCard">
              <div className="pokipoOpsTitle">
                <h2>
                  システム接続状況
                </h2>

                <button
                  type="button"
                  onClick={() =>
                    void refresh()
                  }
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
                表示中は60秒ごとに自動更新
              </p>

              <div className="pokipoOpsChecks">
                {checks.map((check) => (
                  <article
                    key={check.label}
                    className={
                      check.ok
                        ? "ok"
                        : "ng"
                    }
                  >
                    <strong>
                      {check.ok
                        ? "● 応答あり"
                        : "● 要確認"}
                      {"｜"}
                      {check.label}
                    </strong>

                    <span>
                      {check.detail}
                    </span>
                  </article>
                ))}
              </div>

              <p className="pokipoOpsSmall">
                この確認はログインと
                集計APIへの接続状態を調べます。
                参加者端末での操作成功を
                保証するものではありません。
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

            {/* =============================
                PARTICIPANT FLOW HEALTH
                NEW MONITOR
            ============================= */}

            <HealthPanel />

            {/* =============================
                CSV EXPORT
            ============================= */}

            <section className="pokipoOpsCard">
              <h2>CSVデータ出力</h2>

              <p>
                Excelで開ける形式で、
                日別推移・スポット別実績・
                全体集計を出力します。
              </p>

              <p className="pokipoOpsSmall">
                ニックネーム・学籍番号などの
                個人情報は含みません。
              </p>

              <p className="pokipoOpsSmall">
                集計データ最終取得：
                {dataCheckedAt || "未取得"}
              </p>

              <div className="pokipoOpsButtons">
                <button
                  type="button"
                  disabled={
                    !snapshot ||
                    loading ||
                    Boolean(error)
                  }
                  onClick={exportDaily}
                >
                  日別推移CSV
                </button>

                <button
                  type="button"
                  disabled={
                    !snapshot ||
                    loading ||
                    Boolean(error)
                  }
                  onClick={exportSpots}
                >
                  スポット別CSV
                </button>

                <button
                  type="button"
                  disabled={
                    !snapshot ||
                    loading ||
                    Boolean(error)
                  }
                  onClick={exportSummary}
                >
                  全体集計CSV
                </button>
              </div>
            </section>

            {/* =============================
                AUTOMATIC REPORT
            ============================= */}

            <section className="pokipoOpsCard">
              <h2>
                自動分析レポート
              </h2>

              <p>
                現在の集計値から自動計算した
                統計レポートです。
                ChatGPT APIや外部AIは使用しません。
              </p>

              {!snapshot ? (
                <p>
                  分析データ取得後に表示されます。
                </p>
              ) : error ? (
                <p className="pokipoOpsError">
                  最新データを取得できていません。
                  再度更新してください。
                </p>
              ) : (
                <div className="pokipoOpsReport">
                  {report.map((line, index) => (
                    <p key={index}>
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
