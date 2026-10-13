"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import {
  getPokipoLearningContent,
} from "../app/data/pokipo-learning";

type PockyStep = {
  step: string;
  title: string;
  description: string;
};

type Props = {
  spotName: string;
  stampCount: number;
  triviaReady: boolean;
  quizQuestion: string;
  quizHint: string;
  quizInput: string;
  quizCorrect: boolean;
  quizError: boolean;
  saving?: boolean;
  knowledgeTitle: string;
  knowledgeText: string;
  onQuizInputChange: (value: string) => void;
  onQuizSubmit: () => void;
  onClose: () => void;

  // 第2段階で追加
  spotId?: string;
  stampConfirmed?: boolean;
  onLearningConfirm?: (
    selectedAnswer: string
  ) => void | Promise<void>;
};

export function getPockyStep(
  stampCount: number
): PockyStep {
  switch (stampCount) {
    case 1:
      return {
        step: "STEP 1",
        title: "材料をそろえる",
        description:
          "ポッキーづくりがスタート！小麦粉など、プレッツェルやチョコレートにつながる材料をそろえました。",
      };

    case 2:
      return {
        step: "STEP 2",
        title: "生地をつくる",
        description:
          "材料を混ぜ合わせて、ポッキーのプレッツェル部分になる生地ができてきました。",
      };

    case 3:
      return {
        step: "STEP 3",
        title: "プレッツェルを焼く",
        description:
          "生地を焼き上げて、ポッキーの芯になるプレッツェルが完成しました。",
      };

    case 4:
      return {
        step: "STEP 4",
        title: "チョコレートをまとわせる",
        description:
          "焼き上がったプレッツェルにチョコレートをまとわせて、いよいよポッキーらしい姿に！",
      };

    default:
      return {
        step: "STEP 5",
        title: "ポッキー完成！",
        description:
          "プレッツェルとチョコレートがそろって、ついにポッキーが完成しました！",
      };
  }
}

export default function PokipoStampGetModal({
  spotName,
  stampCount,
  triviaReady,
  quizQuestion,
  quizHint,
  quizInput,
  quizCorrect,
  quizError,
  saving = false,
  knowledgeTitle,
  knowledgeText,
  onQuizInputChange,
  onQuizSubmit,
  onClose,
  spotId,
  stampConfirmed = false,
  onLearningConfirm,
}: Props): ReactNode {
  const safeCount = Math.max(
    1,
    Math.min(stampCount, 5)
  );

  const currentStep = getPockyStep(safeCount);

  const completed = safeCount >= 5;

  const learningContent = spotId
    ? getPokipoLearningContent(spotId)
    : null;

  const learningEnabled = Boolean(
    learningContent &&
    onLearningConfirm
  );

  const [selectedAnswer, setSelectedAnswer] =
    useState("");

  const [articleOpened, setArticleOpened] =
    useState(false);

  const [readConfirmed, setReadConfirmed] =
    useState(false);

  const [localSubmitting, setLocalSubmitting] =
    useState(false);

  const [learningError, setLearningError] =
    useState("");

  useEffect(() => {
    setSelectedAnswer("");
    setArticleOpened(false);
    setReadConfirmed(false);
    setLocalSubmitting(false);
    setLearningError("");
  }, [spotId]);

  async function confirmLearning() {
    if (
      !learningContent ||
      !onLearningConfirm ||
      !selectedAnswer ||
      !articleOpened ||
      !readConfirmed ||
      saving ||
      localSubmitting
    ) {
      return;
    }

    setLocalSubmitting(true);
    setLearningError("");

    try {
      await onLearningConfirm(selectedAnswer);
    } catch (error) {
      console.error(
        "学習確認エラー:",
        error
      );

      setLearningError(
        "確認処理に失敗しました。通信環境を確認して、もう一度お試しください。"
      );
    } finally {
      setLocalSubmitting(false);
    }
  }

  const busy = saving || localSubmitting;

  const showStampResult =
    !learningEnabled || stampConfirmed;

  return (
    <div className="stampGetOverlay">
      <div className="stampGetBurst burst1">✦</div>
      <div className="stampGetBurst burst2">✦</div>
      <div className="stampGetBurst burst3">✦</div>
      <div className="stampGetBurst burst4">✦</div>

      <section className="stampGetModal">
        <div className="stampGetCircle">
          {showStampResult ? "✓" : "★"}
        </div>

        <p className="stampGetLabel">
          {showStampResult
            ? "STAMP GET!"
            : "POKIPO LEARNING"}
        </p>

        <h2>
          {showStampResult
            ? "スタンプ獲得！"
            : "その一本の向こう側へ。"}
        </h2>

        <p className="stampGetPlace">
          {spotName}
        </p>

        {showStampResult && (
          <>
            <div className="stampGetProgress">
              <span>{safeCount} / 5</span>

              <div className="stampGetProgressBar">
                <div
                  className="stampGetProgressFill"
                  style={{
                    width: `${safeCount * 20}%`,
                  }}
                />
              </div>
            </div>

            <div className="stampGetStep">
              <span>POCKY STEP</span>

              <small className="stampGetStepNumber">
                {currentStep.step}
              </small>

              <strong>
                {currentStep.title}
              </strong>

              <p className="stampGetStepDescription">
                {currentStep.description}
              </p>
            </div>
          </>
        )}

        {/* ==================================
            EXISTING QUIZ AND KNOWLEDGE
        ================================== */}

        <div
          className={
            triviaReady
              ? "stampGetKnowledge triviaShow"
              : "stampGetKnowledge triviaWaiting"
          }
        >
          <div className="stampGetKnowledgeIcon">
            !
          </div>

          <div className="stampGetKnowledgeBody">
            <span>TRIVIA CHALLENGE</span>

            {!triviaReady ? (
              <div className="triviaLoading">
                <span />
                <span />
                <span />

                <strong>
                  トリビア問題を準備中...
                </strong>
              </div>
            ) : !quizCorrect ? (
              <>
                <h3>
                  QRの下の説明から
                  答えを探そう！
                </h3>

                <div className="triviaQuizQuestion">
                  <span>QUESTION</span>
                  <strong>
                    {quizQuestion}
                  </strong>
                </div>

                <p className="triviaQuizHint">
                  🔍 {quizHint}
                </p>

                <div className="triviaQuizInputRow">
                  <input
                    type="text"
                    value={quizInput}
                    onChange={(event) =>
                      onQuizInputChange(
                        event.target.value
                      )
                    }
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" &&
                        !busy &&
                        quizInput.trim()
                      ) {
                        onQuizSubmit();
                      }
                    }}
                    placeholder="答えを入力"
                    className="triviaQuizInput"
                    disabled={busy}
                  />

                  <button
                    type="button"
                    className="triviaQuizCheckButton"
                    disabled={
                      !quizInput.trim() || busy
                    }
                    onClick={onQuizSubmit}
                  >
                    {saving
                      ? "保存中..."
                      : "答え合わせ"}
                  </button>
                </div>

                {quizError && (
                  <div className="triviaQuizWrong">
                    <strong>惜しい！</strong>

                    <span>
                      QRコードの下にある説明文を
                      もう一度探してみよう。
                    </span>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="triviaQuizCorrect">
                  <span className="triviaCorrectMark">
                    ✓
                  </span>

                  <div>
                    <small>CORRECT!</small>
                    <strong>正解！</strong>
                  </div>
                </div>

                <div className="triviaUnlockedContent">
                  <span>
                    NEW KNOWLEDGE UNLOCKED
                  </span>

                  <h3>
                    {knowledgeTitle}
                  </h3>

                  <p className="triviaText">
                    {knowledgeText}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ==================================
            ADDITIONAL LEARNING
        ================================== */}

        {triviaReady &&
          quizCorrect &&
          learningEnabled &&
          learningContent &&
          !stampConfirmed && (
            <section className="pokipoLearningSection">
              <div className="pokipoLearningHeading">
                <span>THINK BEYOND THE POCKY</span>

                <h3>
                  {learningContent.title}
                </h3>

                <p>
                  {learningContent.theme}
                </p>
              </div>

              <div className="pokipoLearningQuestion">
                <span>YOUR OPINION</span>

                <h4>
                  {learningContent.question}
                </h4>

                <p>
                  正解・不正解はありません。
                  今の考えに近いものを
                  一つ選んでください。
                </p>

                <div className="pokipoLearningOptions">
                  {learningContent.options.map(
                    (option) => (
                      <button
                        key={option}
                        type="button"
                        className={
                          selectedAnswer === option
                            ? "pokipoLearningOption active"
                            : "pokipoLearningOption"
                        }
                        disabled={busy}
                        onClick={() => {
                          setSelectedAnswer(option);
                          setLearningError("");
                        }}
                      >
                        {option}
                      </button>
                    )
                  )}
                </div>
              </div>

              {selectedAnswer && (
                <div className="pokipoLearningArticle">
                  <span>LEARN MORE</span>

                  <h4>
                    もう少し知ってみよう
                  </h4>

                  {!articleOpened ? (
                    <button
                      type="button"
                      className="pokipoLearningReadButton"
                      onClick={() =>
                        setArticleOpened(true)
                      }
                      disabled={busy}
                    >
                      記事を読む
                    </button>
                  ) : (
                    <>
                      <p>
                        {learningContent.article}
                      </p>

                      <div className="pokipoLearningSources">
                        <strong>
                          参考資料
                        </strong>

                        {learningContent.sources.map(
                          (source) => (
                            <a
                              key={source.url}
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {source.label} ↗
                            </a>
                          )
                        )}
                      </div>

                      <label className="pokipoLearningConfirmLabel">
                        <input
                          type="checkbox"
                          checked={readConfirmed}
                          disabled={busy}
                          onChange={(event) =>
                            setReadConfirmed(
                              event.target.checked
                            )
                          }
                        />

                        <span>
                          記事を確認しました
                        </span>
                      </label>

                      <button
                        type="button"
                        className="pokipoLearningFinishButton"
                        disabled={
                          !readConfirmed || busy
                        }
                        onClick={() =>
                          void confirmLearning()
                        }
                      >
                        {busy
                          ? "保存中..."
                          : "確認してスタンプを取得"}
                      </button>
                    </>
                  )}
                </div>
              )}

              {learningError && (
                <p
                  className="pokipoLearningError"
                  role="alert"
                >
                  {learningError}
                </p>
              )}
            </section>
          )}

        {/* ==================================
            FINISH
        ================================== */}

        {triviaReady &&
          quizCorrect &&
          showStampResult && (
            <button
              type="button"
              className="stampGetCloseButton"
              onClick={onClose}
              disabled={busy}
            >
              {completed
                ? "コンプリート！"
                : "次のスポットへ"}
            </button>
          )}
      </section>
    </div>
  );
}