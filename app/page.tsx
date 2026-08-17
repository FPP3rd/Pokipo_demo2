"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

export default function StartPage() {
  const router = useRouter();

  const [nickname, setNickname] =
    useState("");

  const [grade, setGrade] =
    useState("");

  const [department, setDepartment] =
    useState("");

  const [message, setMessage] =
    useState("");

  // =====================================
  // 登録済みならホームへ
  // =====================================

  useEffect(() => {
    const savedNickname =
      localStorage.getItem(
        "pokipo_nickname"
      );

    if (savedNickname) {
      router.replace("/home");
    }
  }, [router]);

  // =====================================
  // 初回登録
  // =====================================

  function submit(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    const name =
      nickname.trim();

    // ニックネーム確認
    if (
      name.length < 2 ||
      name.length > 20
    ) {
      setMessage(
        "ニックネームは2〜20文字で入力してください。"
      );

      return;
    }

    // 学年確認
    if (!grade) {
      setMessage(
        "学年を選択してください。"
      );

      return;
    }

    // 学科確認
    if (!department) {
      setMessage(
        "学科を選択してください。"
      );

      return;
    }

    // =================================
    // ユーザー情報保存
    // =================================

    localStorage.setItem(
      "pokipo_nickname",
      name
    );

    localStorage.setItem(
      "pokipo_grade",
      grade
    );

    localStorage.setItem(
      "pokipo_department",
      department
    );

    // =================================
    // スタンプ初期化
    // =================================

    localStorage.setItem(
      "pokipo_scans",
      JSON.stringify([])
    );

    // =================================
    // 豆知識初期化
    // =================================

    localStorage.setItem(
      "pokipo_knowledge",
      JSON.stringify([])
    );

    // =================================
    // ポッキー進捗
    // =================================

    localStorage.setItem(
      "pokipo_progress",
      "0"
    );

    // =================================
    // コンプリート状態
    // =================================

    localStorage.setItem(
      "pokipo_completed",
      "false"
    );

    // =================================
    // 特典交換状態
    // =================================

    localStorage.setItem(
      "pokipo_reward_exchanged",
      "false"
    );

    // =================================
    // ユーザーID
    // =================================

    const userId =
      crypto.randomUUID();

    localStorage.setItem(
      "pokipo_user_id",
      userId
    );

    // =================================
    // ホームへ
    // =================================

    router.push("/home");
  }

  return (
    <main className="shell">
      <section className="card startPage">

        {/* =========================
            HERO
        ========================== */}

        <header className="startHero">

          <p className="startEyebrow">
            高安ゼミ LiPost × POCKY
          </p>

          <h1 className="startLogo">
            POKIPO
          </h1>

          <p className="startCatch">
            キャンパスをめぐって、
            <br />
            ポッキーを完成させよう。
          </p>

          {/* ポッキービジュアル */}

          <div className="startVisual">

            <div className="startPocky pockyOne">
              <div className="startChocolate" />
              <div className="startBiscuit" />
            </div>

            <div className="startPocky pockyTwo">
              <div className="startChocolate" />
              <div className="startBiscuit" />
            </div>

            <div className="startPocky pockyThree">
              <div className="startChocolate" />
              <div className="startBiscuit" />
            </div>

          </div>

        </header>

        {/* =========================
            スタンプラリー説明
        ========================== */}

        <section className="startIntro">

          <div className="startIntroNumber">
            5
          </div>

          <div>
            <p>
              POKIPO STAMP RALLY
            </p>

            <h2>
              5つのスポットを巡って特典をゲットしよう
            </h2>

            <span>
              学内に散りばめられたQRコードを読み取って、スタンプと豆知識を集めよう。
            </span>
          </div>

        </section>

        {/* =========================
            プロフィール登録
        ========================== */}

        <form
          className="startForm"
          onSubmit={submit}
        >

          <div className="startFormTitle">
            <p>
              PLAYER PROFILE
            </p>

            <h2>
              プロフィールを登録
            </h2>
          </div>

          {/* ニックネーム */}

          <div className="field">
            <label htmlFor="nickname">
              ニックネーム
            </label>

            <input
              id="nickname"
              type="text"
              value={nickname}
              onChange={(e) =>
                setNickname(
                  e.target.value
                )
              }
              placeholder="例：ぽっきー"
              maxLength={20}
            />
          </div>

          {/* 学年 */}

          <div className="field">
            <label htmlFor="grade">
              学年
            </label>

            <select
              id="grade"
              value={grade}
              onChange={(e) =>
                setGrade(
                  e.target.value
                )
              }
            >
              <option value="">
                選択してください
              </option>

              <option value="1年">
                1年
              </option>

              <option value="2年">
                2年
              </option>

              <option value="3年">
                3年
              </option>

              <option value="4年">
                4年
              </option>

              <option value="その他">
                その他
              </option>
            </select>
          </div>

          {/* 学科 */}

          <div className="field">
            <label htmlFor="department">
              学科
            </label>

            <select
              id="department"
              value={department}
              onChange={(e) =>
                setDepartment(
                  e.target.value
                )
              }
            >
              <option value="">
                選択してください
              </option>

              <optgroup label="外国語学部">

                <option value="ドイツ語学科">
                  ドイツ語学科
                </option>

                <option value="英語学科">
                  英語学科
                </option>

                <option value="フランス語学科">
                  フランス語学科
                </option>

                <option value="交流文化学科">
                  交流文化学科
                </option>

              </optgroup>

              <optgroup label="国際教養学部">

                <option value="言語文化学科">
                  言語文化学科
                </option>

              </optgroup>

              <optgroup label="経済学部">

                <option value="経済学科">
                  経済学科
                </option>

                <option value="経営学科">
                  経営学科
                </option>

                <option value="国際環境経済学科">
                  国際環境経済学科
                </option>

              </optgroup>

              <optgroup label="法学部">

                <option value="法律学科">
                  法律学科
                </option>

                <option value="国際関係法学科">
                  国際関係法学科
                </option>

                <option value="総合政策学科">
                  総合政策学科
                </option>

              </optgroup>

            </select>
          </div>

          {/* エラー */}

          {message && (
            <p className="error">
              {message}
            </p>
          )}

          {/* =========================
              データ注意事項
          ========================== */}

          <section className="dataWarning">

            <div className="dataWarningText">

              <strong>
              始める前にチェック！
              </strong>

              <p>
                スタンプや豆知識などの進捗は、この端末のブラウザに保存されます。
              </p>

              <p>
                イベント終了まで、Cookie・サイトデータ・閲覧データを削除しないでください。
              </p>

              <p>
                削除すると、 集めたスタンプや進捗が消える場合があります。
              </p>

              <p className="dataWarningImportant">
                シークレットモード・プライベートブラウズでの参加も避けてください。
              </p>

            </div>

          </section>

          {/* =========================
              START BUTTON
          ========================== */}

          <button
            type="submit"
            className="primaryButton startButton"
          >
            <span>
              POKIPOをはじめる
            </span>

            <span>
              →
            </span>
          </button>

        </form>

        {/* =========================
            FOOTER
        ========================== */}

        <p className="startFooter">
          登録した情報は、
          POKIPOの進捗管理に使用します。
        </p>

      </section>
    </main>
  );
}