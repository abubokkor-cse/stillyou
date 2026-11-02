"use client";
import { ArrowRight, Camera, CircleHelp, Heart, Loader2 } from "lucide-react";
import type { PublicWorkspace } from "@/lib/types";
import { dateLabel, mediaUrl } from "@/lib/browser";
import { previewErrorMessage } from "@/lib/youcam";
import { isImagePreview, isObservation, previewName } from "@/lib/hair-tools";
import { SaveLook } from "./save-look";
type Props = {
  workspace: PublicWorkspace;
  busy: boolean;
  onCompare: (id: string) => void;
  onLive: (id: string) => void;
  onToggle: (id: string) => void;
  onReference: () => void;
  onPoll: (id: string) => void;
};
export function PreviewResults({
  workspace,
  busy,
  onCompare,
  onLive,
  onToggle,
  onReference,
  onPoll,
}: Props) {
  return (
    <section className="results-section">
      <div className="section-heading compact">
        <div>
          <span className="eyebrow">ONE POSSIBILITY AT A TIME</span>
          <h2>Your previews</h2>
        </div>
        <span className="micro">Always compared with your original</span>
      </div>
      <div className="result-grid">
        {[...workspace.previews].reverse().map((preview) => {
          const name = previewName(preview, workspace.choices);
          return (
            <article
              className={`result-card result-${preview.state}`}
              key={preview.id}
            >
              {preview.state === "success" && isImagePreview(preview.kind) ? (
                <>
                  <button
                    className="result-image"
                    onClick={() => onCompare(preview.id)}
                    aria-label={`Compare ${name} with original`}
                  >
                    <img
                      src={mediaUrl(preview.id)}
                      alt={`AI preview: ${name}`}
                    />
                    <span className="image-label">AI preview</span>
                  </button>
                  <button
                    className={`heart-button ${workspace.shortlist.includes(preview.id) ? "selected" : ""}`}
                    aria-label={`${workspace.shortlist.includes(preview.id) ? "Remove" : "Save"} ${name} ${workspace.shortlist.includes(preview.id) ? "from" : "to"} shortlist`}
                    onClick={() => onToggle(preview.id)}
                    disabled={busy}
                  >
                    <Heart
                      size={19}
                      fill={
                        workspace.shortlist.includes(preview.id)
                          ? "currentColor"
                          : "none"
                      }
                    />
                  </button>
                </>
              ) : preview.state === "success" ? (
                <div className="color-result">
                  {isObservation(preview.kind) ? <>
                    <CircleHelp size={26}/><strong>{preview.observation?.term ?? "Observation unavailable"}</strong>
                    {preview.kind === "hair_type" && preview.observation?.mapping && <span>{preview.observation.mapping}</span>}
                    <p>{preview.notice ?? "Visible hair in your selected photo. Not a health assessment or a reason to buy a product."}</p>
                  </> : preview.color ? (
                    <>
                      <span style={{ background: preview.color.hex }} />
                      <strong>{preview.color.name} family</strong>
                      <p>Photo estimate, not an exact shade match.</p>
                    </>
                  ) : (
                    <>
                      <CircleHelp size={28} />
                      <strong>Colour estimate unavailable</strong>
                      <p>{preview.notice}</p>
                    </>
                  )}
                </div>
              ) : preview.state === "error" ? (
                <div className="failed-result">
                  <CircleHelp size={26} />
                  <strong>This photo needs another approach.</strong>
                  <p>{previewErrorMessage(preview.error ?? "")}</p>
                  <button className="text-link" onClick={() => onReference()}>
                    Choose a saved photo <ArrowRight size={14} />
                  </button>
                </div>
              ) : (
                <div className="pending-result" role="status">
                  <Loader2 className="spin" size={27} />
                  <strong>Exploring this possibility…</strong>
                  <p>This may take a minute. Your original stays unchanged.</p>
                  <button
                    className="text-link"
                    onClick={() => onPoll(preview.id)}
                  >
                    Check again
                  </button>
                </div>
              )}
              <div className="result-meta">
                <h3>{name}</h3>
                <p className="micro">
                  Using your {dateLabel(preview.sourceDate)} photo
                  {preview.inputPreviewId ? " · edited from an AI look" : ""}
                </p>
                {preview.state === "success" && isImagePreview(preview.kind) && <SaveLook id={preview.id} name={name}/>}
                {preview.state === "success" && preview.kind === "hair" && (
                  <button
                    className="text-link live-entry"
                    onClick={() => onLive(preview.id)}
                  >
                    <Camera size={14} /> Try this wig live
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
