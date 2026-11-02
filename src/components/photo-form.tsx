"use client";

import { useState, type FormEvent } from "react";
import { Camera, ImagePlus, Loader2, LockKeyhole } from "lucide-react";
import { preparePhoto } from "@/lib/browser";
import { CameraCapture } from "./camera-capture";

export function PhotoForm({
  reference = false,
  kind = "hair",
  initialName = "",
  expiresOn,
  onSubmit,
}: {
  reference?: boolean;
  kind?: "hair" | "hat";
  initialName?: string;
  expiresOn: string;
  onSubmit: (data: FormData) => Promise<void>;
}) {
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState<string>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);

  async function select(selected?: File) {
    if (!selected) return;
    setError("");
    setPreparing(true);
    try {
      const photo = await preparePhoto(selected);
      setFile(photo);
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(photo);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setPreparing(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError("Choose a photo first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = new FormData(event.currentTarget);
      data.set("photo", file);
      data.set("consent", "true");
      if (reference) data.set("kind", kind);
      await onSubmit(data);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="form-stack">
      <p className="muted">
        {reference
          ? kind === "hair"
            ? "Use the exact wig and shade on a person or a mannequin with a visible face. Faceless heads and detached wigs may be rejected. Only use images you have permission to process."
            : "Use a clear hat product photo or a person wearing the hat."
          : "Choose an existing photo or take one now. Face the camera, with your hair and shoulders clearly visible."}
      </p>
      <label className={`photo-drop ${preview ? "has-photo" : ""}`}>
        {preview ? (
          <img src={preview} alt="Selected image, ready to save" />
        ) : (
          <>
            <ImagePlus size={29} strokeWidth={1.4} />
            <strong>
              {preparing ? "Preparing your photo…" : "Choose a photo"}
            </strong>
            <span>JPG, PNG or WebP · up to 20 MB</span>
          </>
        )}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label="Choose photo file"
          disabled={busy || preparing}
          onChange={(event) => void select(event.target.files?.[0])}
        />
        {preview && <span className="photo-replace">Choose another photo</span>}
      </label>
      {!reference && !cameraOpen && (
        <button
          type="button"
          className="button button-quiet"
          disabled={busy || preparing}
          onClick={() => setCameraOpen(true)}
        >
          <Camera size={17} /> Take a photo
        </button>
      )}
      {cameraOpen && (
        <CameraCapture
          onClose={() => setCameraOpen(false)}
          onCapture={(file) => {
            setCameraOpen(false);
            void select(file);
          }}
        />
      )}
      {reference ? (
        <>
          <label className="field">
            Name this choice
            <input
              name="name"
              placeholder="e.g. Chestnut shoulder-length bob"
              defaultValue={initialName}
              maxLength={80}
              required
            />
          </label>
          <label className="field">
            Product link <span className="optional">optional</span>
            <input name="sellerUrl" type="url" placeholder="https://…" />
          </label>
        </>
      ) : (
        <label className="field">
          When was this photo taken?
          <input
            name="takenOn"
            type="date"
            defaultValue={new Date().toLocaleDateString("en-CA")}
            max={new Date().toLocaleDateString("en-CA")}
            required
          />
          <span>Every preview will show this date.</span>
        </label>
      )}
      <label className="check-row">
        <input type="checkbox" required />
        <span>
          {reference
            ? "I have permission to use this reference, including AI processing when I request a preview."
            : "This is my photo, or I have the person's permission. I agree to private storage for this workspace."}{" "}
          Photos remain available until {expiresOn}; I can delete them sooner.
        </span>
      </label>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      <button
        className="button button-primary full"
        disabled={busy || preparing}
      >
        {busy ? (
          <Loader2 className="spin" size={18} />
        ) : (
          <ImagePlus size={18} />
        )}{" "}
        {busy
          ? "Saving…"
          : reference
            ? "Add this reference"
            : "Save my reference photo"}
      </button>
      <p className="micro centered">
        <LockKeyhole size={13} /> Photos are private. Sharing is always your
        choice.
      </p>
    </form>
  );
}
