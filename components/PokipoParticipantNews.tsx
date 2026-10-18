
"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "../lib/supabase-client";

export type ParticipantNewsAnnouncement = {
  id: string;
  title: string;
};

type NewsProps = {
  progress: number;
  rewardExchanged?: boolean;
  announcements?: ParticipantNewsAnnouncement[];
};

type NewsMessage = {
  id: string;
  text: string;
  kind: "normal" | "personal" | "important";
};

function normalizeProgress(value: number) {
  return Math.min(
    5,
    Math.max(0, Number.isFinite(value) ? value : 0)
  );
}

export function makeParticipantNews({
  progress,
  rewardExchanged = false,
  announcements = [],
}: NewsProps): NewsMessage[] {
  const count = normalizeProgress(progress);

  const messages: NewsMessage[] = [];

  function add(
    id: string,
    text: string,
    kind: NewsMessage["kind"] = "normal"
  ) {
    messages.push({ id, text, kind });
  }

  if (rewardExchanged) {
    add(
      "exchanged",
      "特典交換ありがとうございます！POKIPOへのご参加ありがとうございました。",
      "personal"
    );
  } else if (count === 0) {
    add(
      "progress-0",
      "POKIPOへようこそ！キャンパス内の5か所を巡ってスタンプを集めよう！",
      "personal"
    );
  } else if (count === 1) {
    add(
      "progress-1",
      "最初のスタンプを獲得！あと4か所でコンプリートです。",
      "personal"
    );
  } else if (count === 2) {
    add(
      "progress-2",
      "スタンプ2個達成！あと3か所です。次のスポットを探してみよう！",
      "personal"
    );
  } else if (count === 3) {
    add(
      "progress-3",
      "スタンプ3個達成！コンプリートまで残り2か所です。",
      "personal"
    );
  } else if (count === 4) {
    add(
      "progress-4",
      "コンプリートまであと1か所！最後のスタンプを探そう！",
      "personal"
    );
  } else {
    add(
      "progress-5",
      "5か所コンプリート！特典画面から交換に向けた手続きを確認しよう！",
      "personal"
    );
  }

  add(
    "rally",
    "POKIPOスタンプラリー開催中！キャンパスを巡りながらポッキーの魅力を発見しよう！"
  );

  for (const announcement of announcements.slice(0, 5)) {
    const title = announcement.title?.trim();
    if (!title) continue;

    add(
      `announcement-${announcement.id}`,
      `LiPostからのお知らせ：${title}`,
      "important"
    );
  }

  add(
    "exchange-event",
    "特典交換会は10月27日 12:35〜16:00、雄飛ホールで開催！",
    "important"
  );

  if (count === 5 && !rewardExchanged) {
    add(
      "reward-preparation",
      "特典交換には参加後アンケートなどの手続きが必要です。特典画面をご確認ください。",
      "important"
    );
  }

  return messages;
}

export default function PokipoParticipantNews(
  props: NewsProps
) {
  const news = useMemo(
    () => makeParticipantNews(props),
    [
      props.progress,
      props.rewardExchanged,
      props.announcements,
    ]
  );

  const duration = Math.max(
    35,
    news.reduce(
      (total, item) => total + item.text.length,
      0
    ) * 0.28
  );

  const renderGroup = (copy: boolean) => (
    <div
      className="pokipoParticipantNewsGroup"
      aria-hidden={copy ? true : undefined}
    >
      {news.map((item) => (
        <span
          key={item.id}
          className={
            `pokipoParticipantNewsItem ${item.kind}`
          }
        >
          <span aria-hidden="true">◆</span>
          {item.text}
        </span>
      ))}
    </div>
  );

  return (
    <section
      className="pokipoParticipantNews"
      aria-label="POKIPOからのお知らせ"
    >
      <div className="pokipoParticipantNewsLabel">
        <span>INFO</span>
        <strong>POKIPO NEWS</strong>
      </div>

      <div className="pokipoParticipantNewsViewport">
        <div
          className="pokipoParticipantNewsTrack"
          style={{
            animationDuration: `${duration}s`,
          }}
        >
          {renderGroup(false)}
          {renderGroup(true)}
        </div>
      </div>
    </section>
  );
}

/* ========================================
   STAFF PREVIEW
   本番データを変更しない表示専用
======================================== */

export function ParticipantHomeNewsPreview({
  initialProgress = 0,
  initialRewardExchanged = false,
}: {
  initialProgress?: number;
  initialRewardExchanged?: boolean;
}) {
  const [progress, setProgress] = useState(
    normalizeProgress(initialProgress)
  );

  const [rewardExchanged, setRewardExchanged] =
    useState(initialRewardExchanged);

  const [announcements, setAnnouncements] =
    useState<ParticipantNewsAnnouncement[]>([]);

  const [loading, setLoading] = useState(true);
  const [newsError, setNewsError] = useState(false);

  useEffect(() => {
    setProgress(normalizeProgress(initialProgress));
    setRewardExchanged(initialRewardExchanged);
  }, [initialProgress, initialRewardExchanged]);

  useEffect(() => {
    let active = true;

    async function loadAnnouncements() {
      const { data, error } = await supabase
        .from("lipost_announcements")
        .select("id, title")
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .limit(3);

      if (!active) return;

      setLoading(false);
      setNewsError(Boolean(error));

      if (!error) {
        setAnnouncements(data ?? []);
      }
    }

    void loadAnnouncements();

    const interval = window.setInterval(
      () => void loadAnnouncements(),
      60000
    );

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const news = makeParticipantNews({
    progress,
    rewardExchanged,
    announcements,
  });

  return (
    <section className="pokipoNewsPreviewPanel">
      <div className="pokipoNewsPreviewHeading">
        <div>
          <span>PARTICIPANT HOME PREVIEW</span>
          <h2>参加者トップ画面・ニュース確認</h2>
          <p>
            検証用の表示イメージです。
            本番の参加者データは変更しません。
          </p>
        </div>
      </div>

      <div className="pokipoNewsPreviewControls">
        <label>
          スタンプ獲得数
          <select
            value={progress}
            onChange={(event) =>
              setProgress(Number(event.target.value))
            }
          >
            {[0, 1, 2, 3, 4, 5].map((count) => (
              <option key={count} value={count}>
                {count} / 5
              </option>
            ))}
          </select>
        </label>

        <label>
          特典交換状態
          <select
            value={
              rewardExchanged
                ? "exchanged"
                : "not_exchanged"
            }
            onChange={(event) =>
              setRewardExchanged(
                event.target.value === "exchanged"
              )
            }
          >
            <option value="not_exchanged">
              未交換
            </option>
            <option value="exchanged">
              交換済み
            </option>
          </select>
        </label>
      </div>

      <div className="pokipoNewsPreviewPhone">
        <div className="pokipoNewsPreviewHomeHeader">
          <div>
            <small>高安ゼミ LiPost × POCKY</small>
            <strong>POKIPO</strong>
          </div>
          <span>参加者さん</span>
        </div>

        <PokipoParticipantNews
          progress={progress}
          rewardExchanged={rewardExchanged}
          announcements={announcements}
        />

        <div className="pokipoNewsPreviewHero">
          <span>POKIPO STAMP RALLY</span>
          <strong>
            {progress === 5
              ? "CONGRATULATIONS!"
              : "キャンパスを巡ろう！"}
          </strong>
          <p>
            {progress === 5
              ? "5か所すべてのスタンプを獲得！"
              : `コンプリートまであと${5 - progress}か所`}
          </p>
          <div className="pokipoNewsPreviewStampRow">
            {[1, 2, 3, 4, 5].map((number) => (
              <div
                key={number}
                className={
                  number <= progress ? "acquired" : ""
                }
              >
                {number <= progress ? "✓" : number}
              </div>
            ))}
          </div>
        </div>

        <div className="pokipoNewsPreviewMenu">
          <div>スタンプを集める</div>
          <div>豆知識を見る</div>
          <div>進捗を確認</div>
          <div>特典を確認</div>
        </div>

        <p className="pokipoNewsPreviewDisclaimer">
          ※ 本番ホームの主要要素を簡略化したプレビューです。
          画面構成や装飾を完全再現するものではありません。
        </p>
      </div>

      <div className="pokipoNewsPreviewDetails">
        <strong>
          現在の条件で流れるニュース
        </strong>

        {loading && (
          <p>公開中のお知らせを取得中...</p>
        )}

        {newsError && (
          <p role="alert">
            公開お知らせを取得できませんでした。
            共通・進捗別メッセージを表示しています。
          </p>
        )}

        <ol>
          {news.map((item) => (
            <li key={item.id}>
              {item.text}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
