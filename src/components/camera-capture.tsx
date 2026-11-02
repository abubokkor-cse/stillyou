"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";

export function CameraCapture({
  onCapture,
  onClose,
}: {
  onCapture: (file: File) => void;
  onClose: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    let stream: MediaStream | undefined;
    const camera = navigator.mediaDevices?.getUserMedia
      ? navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 960 },
          },
          audio: false,
        })
      : Promise.reject(new Error("Camera unavailable"));
    void camera
      .then((result) => {
        if (!active) {
          result.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = result;
        if (video.current) video.current.srcObject = stream;
      })
      .catch(() => {
        if (active)
          setError(
            "The camera could not open. Allow camera access, or choose an existing photo.",
          );
      });
    return () => {
      active = false;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function capture() {
    const source = video.current;
    if (!source?.videoWidth) return;
    const scale = Math.min(
      1,
      1024 / Math.max(source.videoWidth, source.videoHeight),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(source.videoWidth * scale);
    canvas.height = Math.round(source.videoHeight * scale);
    canvas
      .getContext("2d")
      ?.drawImage(source, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("Could not capture this frame. Please try again.");
          return;
        }
        onCapture(new File([blob], "camera-photo.jpg", { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.92,
    );
  }

  return (
    <div className="camera-capture">
      <div className="camera-video">
        <video
          ref={video}
          autoPlay
          playsInline
          muted
          onLoadedData={() => setReady(true)}
          aria-label="Live camera preview"
        />
        <div className="camera-guide" aria-hidden="true" />
        {!ready && !error && (
          <span>
            <Loader2 className="spin" size={22} /> Opening camera…
          </span>
        )}
      </div>
      <p className="micro">
        Face the camera in even light. Keep your hair and shoulders in view.
        This guide does not validate photo quality.
      </p>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      <div className="card-actions">
        <button
          type="button"
          className="button button-secondary"
          onClick={onClose}
        >
          <X size={15} /> Close camera
        </button>
        <button
          type="button"
          className="button button-primary"
          onClick={capture}
          disabled={!ready}
        >
          <Camera size={16} /> Capture photo
        </button>
      </div>
    </div>
  );
}
