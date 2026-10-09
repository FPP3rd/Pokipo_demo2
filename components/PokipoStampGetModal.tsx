
"use client";

import type { ReactNode } from "react";

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
}: Props): ReactNode {
  const safeCount = Math.max(
    1,
    Math.min(stampCount, 5)
  );

  const currentStep = getPockyStep(safeCount);
  const completed = safeCount >= 5;

  return (
    <div className="stampGetOverlay">
      <div className="stampGetBurst burst1">✦</div>
      <div className="stampGetBurst burst2">✦</div>
      <div className="stampGetBurst burst3">✦</div>
      <div className="stampGetBurst burst4">✦</div>

      <section className="stampGetModal">
        <div className="stampGetCircle">✓</div>

        <p className="stampGetLabel">
          STAMP GET!
        </p>

        <h2>スタンプ獲得！</h2>

        <p className="stampGetPlace">
          {spotName}
        </p>

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

          <strong>{currentStep.title}</strong>

          <p className="stampGetStepDescription">
            {currentStep.description}
          </p>
        </div>

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
                        !saving &&
                        quizInput.trim()
                      ) {
                        onQuizSubmit();
                      }
                    }}
                    placeholder="答えを入力"
                    className="triviaQuizInput"
                    disabled={saving}
                  />

                  <button
                    type="button"
                    className="triviaQuizCheckButton"
                    disabled={
                      !quizInput.trim() || saving
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

        {triviaReady && quizCorrect && (
          <button
            type="button"
            className="stampGetCloseButton"
            onClick={onClose}
            disabled={saving}
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
