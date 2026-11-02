"use client";
import { useState } from "react";
import { Check, Heart } from "lucide-react";
import type { PublicWorkspace } from "@/lib/types";
import { dateLabel, mediaUrl } from "@/lib/browser";
import { reviewLabel } from "@/lib/decision";
import { isImagePreview, previewName } from "@/lib/hair-tools";
import { SaveLook } from "./save-look";

export function PreviewReview({
  workspace,
  previewId,
  save,
  toggle,
}: {
  workspace: PublicWorkspace;
  previewId: string;
  save: (data: unknown) => Promise<void>;
  toggle: () => Promise<void>;
}) {
  const preview = workspace.previews.find((item) => item.id === previewId)!;
  const choice = workspace.choices.find((item) => item.id === preview.choiceId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  return (
    <div className="form-stack">
      <div className="review-triptych">
        <figure>
          <img src={mediaUrl(preview.sourceId)} alt="Your original photo" />
          <figcaption>
            Your original · {dateLabel(preview.sourceDate)}
          </figcaption>
        </figure>
        {choice && (
          <figure>
            <img
              src={mediaUrl(choice.reference.id)}
              alt={`Actual reference for ${choice.name}`}
            />
            <figcaption>The actual reference</figcaption>
          </figure>
        )}
        {preview.inputPreviewId && <figure><img src={mediaUrl(preview.inputPreviewId)} alt="AI look used as input"/><figcaption>Earlier AI look · input for this edit</figcaption></figure>}
        {preview.templateThumb && <figure><img src={preview.templateThumb} alt="Selected style example" referrerPolicy="no-referrer"/><figcaption>Style example · not a product</figcaption></figure>}
        <figure>
          <img src={mediaUrl(preview.id)} alt="Generated appearance preview" />
          <figcaption>AI preview · check the differences</figcaption>
        </figure>
      </div>
      <p className="micro">
        Compare your face, the hairline, silhouette and reference colour. A
        useful impression can still differ from a real wig, haircut or dye result. Your review is
        personal feedback, not a validated accuracy score.
      </p>
      {isImagePreview(preview.kind) && (
        <form
          className="form-stack"
          onSubmit={async (event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            setBusy(true);
            setError("");
            setSaved(false);
            try {
              await save({
                action: "review",
                previewId,
                face: data.get("face"),
                style: data.get("style"),
                liked: data.get("liked"),
                concern: data.get("concern"),
              });
              setSaved(true);
            } catch (error) {
              setError((error as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="form-columns">
            <label className="field">
              Does your face still look like you?
              <select
                name="face"
                defaultValue={preview.review?.face ?? "unchecked"}
              >
                <option value="unchecked">I haven’t checked yet</option>
                <option value="consistent">Looks consistent to me</option>
                <option value="changed">Important details changed</option>
              </select>
            </label>
            <label className="field">
              {preview.kind === "hair" ? "Does the wig reference carry through?" : "Is this a useful impression of the style?"}
              <select
                name="style"
                defaultValue={preview.review?.style ?? "unchecked"}
              >
                <option value="unchecked">I haven’t checked yet</option>
                <option value="useful">Useful style impression</option>
                <option value="misleading">The result is misleading</option>
              </select>
            </label>
          </div>
          <label className="field">
            What I like
            <textarea
              name="liked"
              maxLength={400}
              defaultValue={preview.review?.liked}
              placeholder="e.g. The length feels familiar and the fringe is softer."
            />
          </label>
          <label className="field">
            What gives me pause
            <textarea
              name="concern"
              maxLength={400}
              defaultValue={preview.review?.concern}
              placeholder="e.g. My jaw looks different. I need a real colour swatch."
            />
          </label>
          <div className="review-actions">
            <button className="button button-secondary" disabled={busy}>
              <Check size={16} />
              {busy ? "Saving…" : "Save my review"}
            </button>
            <span className="micro" role="status">
              {saved
                ? "Review saved. Your comparison is up to date."
                : reviewLabel(preview.review)}
            </span>
          </div>
        </form>
      )}
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      <SaveLook id={preview.id} name={previewName(preview, workspace.choices)}/>
      <button
        className="button button-primary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await toggle();
          } catch (error) {
            setError((error as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Heart size={16} />
        {workspace.shortlist.includes(preview.id)
          ? "Remove from shortlist"
          : "Keep in my shortlist"}
      </button>
    </div>
  );
}
