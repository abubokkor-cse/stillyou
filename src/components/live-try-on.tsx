"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Eye, Loader2, RotateCcw, Square } from "lucide-react";
import type { PublicWorkspace } from "@/lib/types";
import { mediaUrl } from "@/lib/browser";
import {
  facePose,
  overlayTransform,
  smoothPose,
  type FaceAnchors,
  type Pose,
} from "@/lib/live-ar/geometry";

type WorkerResult =
  | {
      type: "prepared";
      id: number;
      overlay: ImageBitmap;
      anchors: FaceAnchors;
      width: number;
      height: number;
    }
  | { type: "tracked"; id: number; count: number; anchors: FaceAnchors | null }
  | { type: "error"; id: number; message: string };
type Session = {
  id: number;
  worker: Worker;
  stream: MediaStream;
  frame: number;
  overlay?: ImageBitmap;
  reference?: Pose;
  pose: Pose | null;
  trackedAt: number;
  sentAt: number;
  inFlight: boolean;
  ready: boolean;
  lastStatus: string;
  timeout?: ReturnType<typeof setTimeout>;
};

export function LiveTryOn({
  workspace,
  initialPreviewId,
}: {
  workspace: PublicWorkspace;
  initialPreviewId: string;
}) {
  const options = workspace.previews.filter(
    (preview) => preview.kind === "hair" && preview.state === "success",
  );
  const [previewId, setPreviewId] = useState(initialPreviewId);
  const [phase, setPhase] = useState<"idle" | "starting" | "running">("idle");
  const [status, setStatus] = useState("Start your camera when you’re ready.");
  const [error, setError] = useState("");
  const [size, setSize] = useState(1);
  const [offset, setOffset] = useState(0);
  const [showOverlay, setShowOverlay] = useState(true);
  const controls = useRef({ size: 1, offset: 0, showOverlay: true });
  const session = useRef<Session | null>(null);
  const sequence = useRef(0);
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  function dispose() {
    sequence.current++;
    const active = session.current;
    session.current = null;
    if (active) {
      clearTimeout(active.timeout);
      cancelAnimationFrame(active.frame);
      active.stream.getTracks().forEach((track) => track.stop());
      active.worker.terminate();
      active.overlay?.close();
    }
    if (video.current) video.current.srcObject = null;
    const output = canvas.current;
    output?.getContext("2d")?.clearRect(0, 0, output.width, output.height);
  }

  useEffect(() => {
    function visibility() {
      if (document.hidden) {
        dispose();
        setPhase("idle");
        setStatus(
          "Camera stopped while this tab was in the background. Start again to continue.",
        );
      }
    }
    document.addEventListener("visibilitychange", visibility);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      dispose();
    };
  }, []);

  function stop() {
    dispose();
    setPhase("idle");
    setStatus("Camera stopped. Nothing was recorded.");
  }

  async function start() {
    dispose();
    const generation = sequence.current;
    setPhase("starting");
    setError("");
    setStatus("Opening camera and preparing this wig…");
    let stream: MediaStream | undefined;
    let worker: Worker | undefined;
    try {
      if (
        !navigator.mediaDevices?.getUserMedia ||
        typeof OffscreenCanvas === "undefined" ||
        !window.Worker ||
        !window.createImageBitmap
      )
        throw new Error(
          "Live preview needs a browser with camera and graphics support. Try the latest Chrome, or use photo previews.",
        );
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });
      if (sequence.current !== generation) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      worker = new Worker("/live-ar/tracker.js");
      const active: Session = {
        id: generation,
        worker,
        stream,
        frame: 0,
        pose: null,
        trackedAt: 0,
        sentAt: 0,
        inFlight: false,
        ready: false,
        lastStatus: "",
      };
      session.current = active;
      function fail(message: string) {
        if (session.current !== active) return;
        dispose();
        setPhase("idle");
        setStatus("Live preview stopped.");
        setError(message);
      }
      active.timeout = setTimeout(
        () =>
          fail(
            "Preparing this wig took too long. Try again or choose another preview.",
          ),
        60_000,
      );
      worker.onerror = () =>
        fail(
          "Live tracking could not load on this browser. Try again in the latest Chrome; your saved photo previews are still available.",
        );
      worker.onmessage = ({ data }: MessageEvent<WorkerResult>) => {
        if (session.current !== active || data.id !== active.id) {
          if (data.type === "prepared") data.overlay.close();
          return;
        }
        if (data.type === "error") {
          fail(data.message);
          return;
        }
        if (data.type === "prepared") {
          const reference = facePose(data.anchors, data.width, data.height);
          if (!reference) {
            data.overlay.close();
            fail(
              "Choose a preview with a clearer, front-facing face for live mode.",
            );
            return;
          }
          clearTimeout(active.timeout);
          active.overlay = data.overlay;
          active.reference = reference;
          active.ready = true;
          setPhase("running");
          setStatus("Face the camera so the wig can follow you.");
        } else {
          active.inFlight = false;
          const output = canvas.current;
          const pose =
            data.anchors && output
              ? facePose(data.anchors, output.width, output.height)
              : null;
          active.pose = pose ? smoothPose(active.pose, pose) : null;
          active.trackedAt = performance.now();
          const nextStatus = pose
            ? "Tracking your face · move gently"
            : data.count > 1
              ? "Keep just one face in view."
              : data.count === 1
                ? "Face forward and move a little closer. Large turns pause the overlay."
                : "No face in view. The wig is hidden until tracking returns.";
          if (active.lastStatus !== nextStatus) {
            active.lastStatus = nextStatus;
            setStatus(nextStatus);
          }
        }
      };
      const input = video.current!;
      input.srcObject = stream;
      await input.play();
      if (session.current !== active) return;
      stream
        .getVideoTracks()[0]
        .addEventListener(
          "ended",
          () =>
            fail("Camera access ended. Start again or use a photo preview."),
          { once: true },
        );
      function draw(now: number) {
        if (session.current !== active) return;
        const output = canvas.current;
        const context = output?.getContext("2d");
        if (output && context && input.videoWidth && input.readyState >= 2) {
          if (
            output.width !== input.videoWidth ||
            output.height !== input.videoHeight
          ) {
            output.width = input.videoWidth;
            output.height = input.videoHeight;
          }
          context.clearRect(0, 0, output.width, output.height);
          context.drawImage(input, 0, 0, output.width, output.height);
          if (
            active.pose &&
            active.reference &&
            active.overlay &&
            now - active.trackedAt < 350 &&
            controls.current.showOverlay
          ) {
            const transform = overlayTransform(
              active.reference,
              active.pose,
              controls.current.size,
              controls.current.offset,
            );
            context.save();
            context.translate(transform.x, transform.y);
            context.rotate(transform.rotation);
            context.scale(transform.scale, transform.scale);
            context.drawImage(
              active.overlay,
              -transform.anchorX,
              -transform.anchorY,
            );
            context.restore();
          }
          if (active.ready && !active.inFlight && now - active.sentAt > 66) {
            active.inFlight = true;
            active.sentAt = now;
            void createImageBitmap(input)
              .then((bitmap) => {
                if (session.current !== active) {
                  bitmap.close();
                  return;
                }
                active.worker.postMessage(
                  { type: "frame", id: active.id, bitmap, timestamp: now },
                  [bitmap],
                );
              })
              .catch(() =>
                fail(
                  "The camera frame could not be read. Please restart live preview.",
                ),
              );
          }
          if (active.inFlight && now - active.sentAt > 5000)
            fail(
              "Face tracking stopped responding. Please restart live preview.",
            );
        }
        if (session.current === active)
          active.frame = requestAnimationFrame(draw);
      }
      active.frame = requestAnimationFrame(draw);
      const response = await fetch(mediaUrl(previewId), { cache: "no-store" });
      if (!response.ok)
        throw new Error(
          "This preview is no longer available. Choose another saved wig preview.",
        );
      const bitmap = await createImageBitmap(await response.blob());
      if (session.current !== active) {
        bitmap.close();
        return;
      }
      worker.postMessage({ type: "prepare", id: active.id, bitmap }, [bitmap]);
    } catch (failure) {
      stream?.getTracks().forEach((track) => track.stop());
      worker?.terminate();
      if (sequence.current !== generation) return;
      dispose();
      setPhase("idle");
      setStatus("Camera is off.");
      const exception = failure as Error;
      setError(
        exception.name === "NotAllowedError"
          ? "Camera access was not allowed. Enable it in your browser, then try again. Photo previews still work."
          : exception.name === "NotFoundError"
            ? "No camera was found. Connect a camera or use a photo preview."
            : exception.message,
      );
    }
  }

  function reset() {
    setSize(1);
    setOffset(0);
    setShowOverlay(true);
    controls.current = { size: 1, offset: 0, showOverlay: true };
  }
  return (
    <div className="live-try-on form-stack">
      <div className="live-disclosure">
        <span className="live-badge">LIVE 2D OVERLAY · BETA</span>
        <p>
          The hair from your saved AI preview follows your face. Best facing
          forward; this does not show the back, fit or exact colour. Your own
          hair can remain visible.
        </p>
      </div>
      <label className="field">
        Wig preview
        <select
          aria-label="Wig preview"
          value={previewId}
          disabled={phase === "starting"}
          onChange={(event) => {
            stop();
            reset();
            setPreviewId(event.target.value);
          }}
        >
          {options.map((preview) => (
            <option key={preview.id} value={preview.id}>
              {workspace.choices.find(
                (choice) => choice.id === preview.choiceId,
              )?.name ?? "Wig preview"}
            </option>
          ))}
        </select>
      </label>
      <div className="live-stage">
        <video
          ref={video}
          autoPlay
          muted
          playsInline
          className="live-input"
          aria-hidden="true"
        />
        <canvas
          ref={canvas}
          aria-label="Mirrored live camera with tracked wig overlay"
          className={phase === "idle" ? "live-canvas inactive" : "live-canvas"}
        />
        {phase === "idle" && (
          <div className="live-placeholder">
            <Camera size={32} />
            <p>Your camera is off</p>
          </div>
        )}
        {phase === "starting" && (
          <span className="live-loading">
            <Loader2 className="spin" size={15} /> Preparing live preview…
          </span>
        )}
        {phase === "running" && (
          <span className="live-stage-label">
            {showOverlay ? "Live wig overlay" : "Your original camera view"}
          </span>
        )}
      </div>
      <p className="live-status" role="status">
        {status}
      </p>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      <div className="live-actions">
        {phase === "idle" ? (
          <button
            className="button button-primary"
            onClick={() => void start()}
          >
            <Camera size={16} /> Start live preview
          </button>
        ) : (
          <button className="button button-secondary" onClick={stop}>
            <Square size={14} /> Stop camera
          </button>
        )}
        {phase === "running" && (
          <button
            className="button button-secondary"
            aria-pressed={!showOverlay}
            onClick={() => {
              setShowOverlay(!showOverlay);
              controls.current.showOverlay = !showOverlay;
            }}
          >
            <Eye size={15} />
            {showOverlay ? "See original" : "Show wig"}
          </button>
        )}
      </div>
      {phase === "running" && (
        <details className="live-adjustments">
          <summary>Adjust overlay alignment</summary>
          <p className="micro">
            These controls align the image. They do not change or measure a real
            cap size.
          </p>
          <label className="field">
            Overlay size · {Math.round(size * 100)}%
            <input
              type="range"
              min="0.8"
              max="1.3"
              step="0.01"
              value={size}
              onChange={(event) => {
                const value = Number(event.target.value);
                setSize(value);
                controls.current.size = value;
              }}
            />
          </label>
          <label className="field">
            Vertical position
            <input
              type="range"
              min="-0.4"
              max="0.4"
              step="0.01"
              value={offset}
              onChange={(event) => {
                const value = Number(event.target.value);
                setOffset(value);
                controls.current.offset = value;
              }}
            />
          </label>
          <button className="text-link" onClick={reset}>
            <RotateCcw size={13} /> Reset alignment
          </button>
        </details>
      )}
      <p className="micro">
        Camera frames are processed in this browser. Live mode does not upload
        or save them. Stop the camera or close this panel at any time.
      </p>
    </div>
  );
}
