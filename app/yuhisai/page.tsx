"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import { toPng } from "html-to-image";

/* ========================================
   TYPE
======================================== */

type PockySkin =
  | "chocolate"
  | "strawberry"
  | "matcha"
  | "white";

/* ========================================
   SKINS
======================================== */

const pockySkins: {
  id: PockySkin;
  name: string;
  english: string;
  emoji: string;
}[] = [
  {
    id: "chocolate",
    name: "チョコ",
    english: "CHOCOLATE",
    emoji: "🍫",
  },
  {
    id: "strawberry",
    name: "いちご",
    english: "STRAWBERRY",
    emoji: "🍓",
  },
  {
    id: "matcha",
    name: "抹茶",
    english: "MATCHA",
    emoji: "🍵",
  },
  {
    id: "white",
    name: "ホワイト",
    english: "WHITE",
    emoji: "🤍",
  },
];

export default function YuhisaiPage() {
  const router = useRouter();

  /* ========================================
     REFS
  ======================================== */

  const cardRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const videoRef =
    useRef<HTMLVideoElement | null>(
      null
    );

  const canvasRef =
    useRef<HTMLCanvasElement | null>(
      null
    );

  const cameraStreamRef =
    useRef<MediaStream | null>(
      null
    );

  /* ========================================
     STATE
  ======================================== */

  const [
    ready,
    setReady,
  ] = useState(false);

  const [
    nickname,
    setNickname,
  ] = useState("");

  const [
    skin,
    setSkin,
  ] = useState<PockySkin>(
    "chocolate"
  );

  const [
    cameraOpen,
    setCameraOpen,
  ] = useState(false);

  const [
    capturedPhoto,
    setCapturedPhoto,
  ] = useState("");

  const [
    cameraError,
    setCameraError,
  ] = useState("");

  const [
    creatingImage,
    setCreatingImage,
  ] = useState(false);

  /* ========================================
     LOAD
  ======================================== */

  useEffect(() => {
    const secretStamp =
      localStorage.getItem(
        "pokipo_secret_yuhisai"
      ) === "true";

    if (!secretStamp) {
      router.replace("/home");
      return;
    }

    const savedNickname =
      localStorage.getItem(
        "pokipo_nickname"
      ) ?? "";

    const savedSkin =
      localStorage.getItem(
        "pokipo_yuhisai_pocky_skin"
      );

    setNickname(
      savedNickname
    );

    if (
      savedSkin === "chocolate" ||
      savedSkin === "strawberry" ||
      savedSkin === "matcha" ||
      savedSkin === "white"
    ) {
      setSkin(
        savedSkin
      );
    }

    setReady(true);
  }, [router]);

  /* ========================================
     CAMERA CLEANUP
  ======================================== */

  useEffect(() => {
    return () => {
      const stream =
        cameraStreamRef.current;

      if (stream) {
        stream
          .getTracks()
          .forEach(
            (
              track
            ) => {
              track.stop();
            }
          );
      }
    };
  }, []);

  /* ========================================
     CURRENT SKIN
  ======================================== */

  const currentSkin =
    pockySkins.find(
      (item) =>
        item.id === skin
    ) ?? pockySkins[0];

  /* ========================================
     SKIN CHANGE
  ======================================== */

  function changeSkin(
    newSkin: PockySkin
  ) {
    setSkin(
      newSkin
    );

    localStorage.setItem(
      "pokipo_yuhisai_pocky_skin",
      newSkin
    );
  }

  /* ========================================
     CAMERA START
  ======================================== */

  async function startCamera() {
    try {
      setCameraError("");

      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        setCameraError(
          "このブラウザではカメラを利用できません。"
        );

        return;
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode:
              "user",
          },
          audio:
            false,
        });

      cameraStreamRef.current =
        stream;

      setCameraOpen(true);

      requestAnimationFrame(
        () => {
          if (
            videoRef.current
          ) {
            videoRef.current.srcObject =
              stream;

            videoRef.current
              .play()
              .catch(
                () => {}
              );
          }
        }
      );
    } catch (error) {
      console.error(
        "カメラ起動エラー:",
        error
      );

      setCameraError(
        "カメラを起動できませんでした。ブラウザのカメラ使用を許可してください。"
      );
    }
  }

  /* ========================================
     CAMERA STOP
  ======================================== */

  function stopCamera() {
    const stream =
      cameraStreamRef.current;

    if (stream) {
      stream
        .getTracks()
        .forEach(
          (
            track
          ) => {
            track.stop();
          }
        );
    }

    cameraStreamRef.current =
      null;

    if (
      videoRef.current
    ) {
      videoRef.current.srcObject =
        null;
    }

    setCameraOpen(false);
  }

  /* ========================================
     TAKE PHOTO
  ======================================== */

  function takePhoto() {
    const video =
      videoRef.current;

    const canvas =
      canvasRef.current;

    if (
      !video ||
      !canvas
    ) {
      return;
    }

    const videoWidth =
      video.videoWidth;

    const videoHeight =
      video.videoHeight;

    if (
      !videoWidth ||
      !videoHeight
    ) {
      setCameraError(
        "カメラ映像の準備ができていません。少し待ってからもう一度撮影してください。"
      );

      return;
    }

    /*
      SNSカードと同じ
      4:5比率で中央を切り出す
    */

    const targetRatio =
      4 / 5;

    let sourceWidth =
      videoWidth;

    let sourceHeight =
      videoHeight;

    let sourceX =
      0;

    let sourceY =
      0;

    const currentRatio =
      videoWidth /
      videoHeight;

    if (
      currentRatio >
      targetRatio
    ) {
      sourceWidth =
        videoHeight *
        targetRatio;

      sourceX =
        (
          videoWidth -
          sourceWidth
        ) /
        2;
    } else {
      sourceHeight =
        videoWidth /
        targetRatio;

      sourceY =
        (
          videoHeight -
          sourceHeight
        ) /
        2;
    }

    canvas.width =
      1080;

    canvas.height =
      1350;

    const context =
      canvas.getContext(
        "2d"
      );

    if (!context) {
      return;
    }

    /*
      インカメラなので
      ミラー反転した状態で保存
    */

    context.save();

    context.translate(
      canvas.width,
      0
    );

    context.scale(
      -1,
      1
    );

    context.drawImage(
      video,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      canvas.width,
      canvas.height
    );

    context.restore();

    const image =
      canvas.toDataURL(
        "image/jpeg",
        0.92
      );

    setCapturedPhoto(
      image
    );

    stopCamera();
  }

  /* ========================================
     RETAKE
  ======================================== */

  async function retakePhoto() {
    setCapturedPhoto("");

    await startCamera();
  }

  /* ========================================
     IMAGE CREATE
  ======================================== */

  async function createCardImage() {
    if (
      !cardRef.current
    ) {
      return null;
    }

    try {
      setCreatingImage(true);

      const dataUrl =
        await toPng(
          cardRef.current,
          {
            cacheBust:
              true,

            pixelRatio:
              2,

            backgroundColor:
              "#000000",
          }
        );

      return dataUrl;
    } catch (error) {
      console.error(
        "カード画像生成エラー:",
        error
      );

      return null;
    } finally {
      setCreatingImage(false);
    }
  }

  /* ========================================
     DOWNLOAD
  ======================================== */

  async function downloadCard() {
    const dataUrl =
      await createCardImage();

    if (!dataUrl) {
      alert(
        "画像を作成できませんでした。"
      );

      return;
    }

    const link =
      document.createElement(
        "a"
      );

    link.download =
      "pokipo-yuhisai-photo.png";

    link.href =
      dataUrl;

    document.body.appendChild(
      link
    );

    link.click();

    link.remove();
  }

  /* ========================================
     SHARE
  ======================================== */

  async function shareCard() {
    const dataUrl =
      await createCardImage();

    if (!dataUrl) {
      alert(
        "画像を作成できませんでした。"
      );

      return;
    }

    try {
      const response =
        await fetch(
          dataUrl
        );

      const blob =
        await response.blob();

      const file =
        new File(
          [
            blob,
          ],
          "pokipo-yuhisai-photo.png",
          {
            type:
              "image/png",
          }
        );

      if (
        navigator.share &&
        navigator.canShare?.({
          files: [
            file,
          ],
        })
      ) {
        await navigator.share({
          title:
            "POKIPO 雄飛祭 SPECIAL",

          text:
            `雄飛祭で${currentSkin.name}POKIPOに着せ替えました！`,

          files: [
            file,
          ],
        });

        return;
      }

      alert(
        "この端末では画像を直接共有できません。先に画像を保存して、LINE・X・Instagramから投稿してください。"
      );
    } catch (error) {
      console.error(
        "共有エラー:",
        error
      );
    }
  }

  /* ========================================
     LOADING
  ======================================== */

  if (!ready) {
    return null;
  }

  /* ========================================
     VIEW
  ======================================== */

  return (
    <main className="shell yuhisaiMode">

      <section className="yuhisaiSpecialPage">

        {/* ==================================
            HEADER
        ================================== */}

        <header className="yuhisaiSpecialHeader">

          <button
            type="button"
            className="backButton"
            onClick={() => {
              stopCamera();

              router.push(
                "/home"
              );
            }}
          >
            ←
          </button>

          <div>

            <span>
              SECRET CONTENT
            </span>

            <h1>
              雄飛祭モード
            </h1>

          </div>

        </header>

        {/* ==================================
            HERO
        ================================== */}

        <section className="yuhisaiSpecialHero">

          <span>
            SECRET STAMP BONUS
          </span>

          <h2>
            自分だけの
            <br />
            POKIPOを楽しもう！
          </h2>

          <p>
            好きなポッキーに着せ替えて、
            雄飛祭限定の写真フレームで
            記念写真を撮れます。
          </p>

        </section>

        {/* ==================================
            CURRENT STYLE
        ================================== */}

        <section
          className={
            `yuhisaiPockyPreview skin-${skin}`
          }
        >

          <span className="yuhisaiPreviewLabel">
            CURRENT STYLE
          </span>

          <div className="yuhisaiPreviewScene">

            <span className="yuhisaiPreviewSpark spark1">
              ✦
            </span>

            <span className="yuhisaiPreviewSpark spark2">
              ✦
            </span>

            <span className="yuhisaiPreviewSpark spark3">
              ✦
            </span>

            <div className="yuhisaiPreviewPocky pockyOne">

              <div className="yuhisaiPreviewCoating" />

              <div className="yuhisaiPreviewBiscuit" />

            </div>

            <div className="yuhisaiPreviewPocky pockyTwo">

              <div className="yuhisaiPreviewCoating" />

              <div className="yuhisaiPreviewBiscuit" />

            </div>

            <div className="yuhisaiPreviewPocky pockyThree">

              <div className="yuhisaiPreviewCoating" />

              <div className="yuhisaiPreviewBiscuit" />

            </div>

          </div>

          <span className="yuhisaiPreviewEnglish">
            {currentSkin.english}
          </span>

          <strong>
            {currentSkin.name}
            POKIPO
          </strong>

        </section>

        {/* ==================================
            SKIN SELECT
        ================================== */}

        <section className="yuhisaiSkinSection">

          <div className="yuhisaiSectionTitle">

            <span>
              POCKY STYLE
            </span>

            <h2>
              着せ替え
            </h2>

          </div>

          <div className="yuhisaiSkinGrid">

            {pockySkins.map(
              (
                item
              ) => {
                const active =
                  skin ===
                  item.id;

                return (
                  <button
                    key={
                      item.id
                    }
                    type="button"
                    className={
                      active
                        ? `yuhisaiSkinButton active skin-${item.id}`
                        : `yuhisaiSkinButton skin-${item.id}`
                    }
                    onClick={() =>
                      changeSkin(
                        item.id
                      )
                    }
                  >

                    <div className="yuhisaiSkinMiniPocky">

                      <div />

                      <span />

                    </div>

                    <strong>
                      {item.name}
                    </strong>

                    <small>
                      {item.english}
                    </small>

                  </button>
                );
              }
            )}

          </div>

        </section>

        {/* ==================================
            PHOTO CARD
        ================================== */}

        <section className="yuhisaiShareSection">

          <div className="yuhisaiSectionTitle">

            <span>
              YUHISAI PHOTO FRAME
            </span>

            <h2>
              雄飛祭限定フォト
            </h2>

          </div>

          <p className="yuhisaiShareGuide">
            選んだPOKIPOがそのまま
            写真フレームになります。
          </p>

          {/* =================================
              START
          ================================= */}

          {!capturedPhoto &&
            !cameraOpen && (
              <button
                type="button"
                className="yuhisaiCameraStartButton"
                onClick={
                  startCamera
                }
              >
                📷 カメラを起動する
              </button>
            )}

          {cameraError && (
            <p className="yuhisaiCameraError">
              {cameraError}
            </p>
          )}

          {/* =================================
              CAMERA
          ================================= */}

          {cameraOpen && (
            <div className="yuhisaiCameraBox">

              <div className="yuhisaiCameraViewport">

                <video
                  ref={
                    videoRef
                  }
                  className="yuhisaiCameraVideo"
                  playsInline
                  muted
                  autoPlay
                />

                <div
                  className={
                    `yuhisaiCameraLiveFrame skin-${skin}`
                  }
                >

                  {/* LEFT */}

                  <div className="liveFramePocky livePockyLeft">

                    <div className="liveFrameCoating" />

                    <div className="liveFrameBiscuit" />

                  </div>

                  {/* RIGHT */}

                  <div className="liveFramePocky livePockyRight">

                    <div className="liveFrameCoating" />

                    <div className="liveFrameBiscuit" />

                  </div>

                  {/* TOP */}

                  <div className="liveFrameHeader">

                    <span>
                      SECRET MODE
                    </span>

                    <strong>
                      POKIPO
                    </strong>

                    <small>
                      雄飛祭 SPECIAL
                    </small>

                  </div>

                  {/* FLAVOR */}

                  <div className="liveFrameFlavor">

                    <span>
                      {currentSkin.emoji}
                    </span>

                    <strong>
                      {currentSkin.name}
                    </strong>

                  </div>

                  {/* BOTTOM */}

                  <div className="liveFrameFooter">

                    <span>
                      SECRET STAMP #6
                    </span>

                    <strong>
                      雄飛祭 LiPostブース
                    </strong>

                  </div>

                </div>

              </div>

              <div className="yuhisaiCameraButtons">

                <button
                  type="button"
                  onClick={
                    stopCamera
                  }
                >
                  キャンセル
                </button>

                <button
                  type="button"
                  className="primary"
                  onClick={
                    takePhoto
                  }
                >
                  ● 撮影
                </button>

              </div>

            </div>
          )}

          {/* =================================
              CAPTURED PHOTO
          ================================= */}

          {capturedPhoto && (
            <>

              <div
                ref={
                  cardRef
                }
                className={
                  `yuhisaiPhotoShareCard skin-${skin}`
                }
              >

                {/* PHOTO */}

                <img
                  src={
                    capturedPhoto
                  }
                  alt="雄飛祭で撮影した写真"
                  className="yuhisaiCapturedPhoto"
                />

                {/* OVERLAY */}

                <div className="yuhisaiPhotoOverlay" />

                {/* TOP */}

                <div className="yuhisaiPhotoFrameTop">

                  <span>
                    SECRET STAMP UNLOCKED
                  </span>

                  <strong>
                    POKIPO
                  </strong>

                  <small>
                    雄飛祭 SPECIAL
                  </small>

                </div>

                {/* LEFT POCKY */}

                <div className="photoFramePocky photoFrameLeft">

                  <div className="photoFrameCoating" />

                  <div className="photoFrameBiscuit" />

                </div>

                {/* RIGHT POCKY */}

                <div className="photoFramePocky photoFrameRight">

                  <div className="photoFrameCoating" />

                  <div className="photoFrameBiscuit" />

                </div>

                {/* FLAVOR */}

                <div className="yuhisaiPhotoFlavor">

                  <span>
                    MY POCKY STYLE
                  </span>

                  <strong>
                    {currentSkin.emoji}
                    {" "}
                    {currentSkin.name}
                    POKIPO
                  </strong>

                </div>

                {/* NICKNAME */}

                {nickname && (
                  <div className="yuhisaiPhotoNickname">

                    <span>
                      PARTICIPANT
                    </span>

                    <strong>
                      {nickname}
                    </strong>

                  </div>
                )}

                {/* STAMP */}

                <div className="yuhisaiPhotoStamp">

                  <span className="yuhisaiPhotoStampNumber">
                    6
                  </span>

                  <div>

                    <small>
                      SECRET STAMP
                    </small>

                    <strong>
                      雄飛祭 LiPostブース
                    </strong>

                  </div>

                </div>

                {/* FOOTER */}

                <div className="yuhisaiPhotoFrameBottom">

                  <span>
                    高安ゼミ LiPost × POCKY
                  </span>

                  <strong>
                    SHARE HAPPINESS!
                  </strong>

                </div>

              </div>

              {/* RETAKE */}

              <button
                type="button"
                className="yuhisaiRetakeButton"
                onClick={
                  retakePhoto
                }
              >
                ↻ 撮り直す
              </button>

              {/* SHARE */}

              <div className="yuhisaiShareActions">

                <button
                  type="button"
                  onClick={
                    downloadCard
                  }
                  disabled={
                    creatingImage
                  }
                >
                  {creatingImage
                    ? "画像を作成中..."
                    : "画像を保存"}
                </button>

                <button
                  type="button"
                  className="primary"
                  onClick={
                    shareCard
                  }
                  disabled={
                    creatingImage
                  }
                >
                  SNSで共有
                </button>

              </div>

            </>
          )}

          {/* =================================
              HIDDEN CANVAS
          ================================= */}

          <canvas
            ref={
              canvasRef
            }
            style={{
              display:
                "none",
            }}
          />

        </section>

        {/* ==================================
            HOME
        ================================== */}

        <button
          type="button"
          className="yuhisaiBackHomeButton"
          onClick={() => {
            stopCamera();

            router.push(
              "/home"
            );
          }}
        >
          選んだPOKIPOでトップへ戻る
        </button>

      </section>

    </main>
  );
}