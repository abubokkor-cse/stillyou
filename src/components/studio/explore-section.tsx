"use client";
import {
  ArrowRight,
  Check,
  Images,
  Plus,
  ScanFace,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import type { PublicWorkspace } from "@/lib/types";
import { dateLabel, mediaUrl } from "@/lib/browser";
import { Portrait, styleStudies } from "../portrait";
import type { PreviewRequest } from "./types";
import { HairLab } from "./hair-lab";
const tabs = [
  { id: "hair", label: "Wigs" },
  { id: "styles", label: "Cuts, colour & more" },
  { id: "brows", label: "Brows · optional" },
  { id: "hat", label: "Hats · experimental" },
] as const;
type Props = {
  workspace: PublicWorkspace | null;
  tab: "hair" | "brows" | "hat" | "styles";
  busy: boolean;
  browColor: string;
  onTab: (tab: "hair" | "brows" | "hat" | "styles") => void;
  onReference: () => void;
  onAddChoice: (name?: string) => void;
  onPreview: (input: PreviewRequest) => void;
  onBrowColor: (color: string) => void;
};
export function ExploreSection({
  workspace,
  tab,
  busy,
  browColor,
  onTab,
  onReference,
  onAddChoice,
  onPreview,
  onBrowColor,
}: Props) {
  const baseline = workspace?.photos.find(
    (photo) => photo.id === workspace.baselineId,
  );
  const currentColor = workspace?.previews.findLast(
    (preview) =>
      preview.kind === "color" &&
      preview.sourceId === baseline?.id &&
      preview.state === "success",
  )?.color;
  return (
    <>
      <div className="source-bar">
        <div className="source-mini">
          {baseline ? (
            <img
              src={mediaUrl(baseline.id)}
              alt="Current reference thumbnail"
            />
          ) : (
            <ScanFace size={25} />
          )}
          <div>
            <span className="micro">YOUR REFERENCE</span>
            <strong>
              {baseline
                ? dateLabel(baseline.takenOn)
                : "A photo is your first step"}
            </strong>
          </div>
        </div>
        {currentColor && (
          <span className="color-family">
            <i style={{ background: currentColor.hex }} />
            {currentColor.name} family{" "}
            <span className="micro">· photo estimate</span>
          </span>
        )}
        <button className="text-link" onClick={onReference}>
          {baseline ? "Change photo" : "Add a photo"}
          <ArrowRight size={14} />
        </button>
      </div>
      <div className="explore-toolbar">
        <div
          className="tabs"
          role="tablist"
          aria-label="Preview type"
          onKeyDown={(event) => {
            const index = tabs.findIndex((item) => item.id === tab);
            const next =
              event.key === "ArrowRight"
                ? (index + 1) % tabs.length
                : event.key === "ArrowLeft"
                  ? (index + tabs.length - 1) % tabs.length
                  : event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? tabs.length - 1
                      : -1;
            if (next < 0) return;
            event.preventDefault();
            onTab(tabs[next].id);
            event.currentTarget
              .querySelectorAll<HTMLButtonElement>('[role="tab"]')
              [next]?.focus();
          }}
        >
          {tabs.map((item) => (
            <button
              role="tab"
              aria-selected={tab === item.id}
              aria-controls={`panel-${item.id}`}
              id={`tab-${item.id}`}
              tabIndex={tab === item.id ? 0 : -1}
              key={item.id}
              className={tab === item.id ? "active" : ""}
              onClick={() => onTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        {(tab === "hair" || tab === "hat") && (
          <button
            className="button button-secondary button-small"
            onClick={() => onAddChoice()}
            disabled={busy}
          >
            <Plus size={16} /> Add {tab === "hair" ? "wig" : "hat"} reference
          </button>
        )}
      </div>
      <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === "styles" ? <HairLab workspace={workspace} busy={busy} onPreview={onPreview} onReference={onReference}/> : tab === "brows" ? (
          <section className="brows-panel">
            <div className="brow-art">
              <Portrait variant={3} shade="#5a4437" skin="#ddb294" />
              <span>
                Illustration · choose a shade to preview on your photo
              </span>
            </div>
            <div>
              <span className="eyebrow">THE SMALL DETAILS</span>
              <h2>
                A familiar frame
                <br />
                for your face.
              </h2>
              <p>
                Explore a brow colour on your selected photo. Your existing brow
                shape is preserved by this setting; skin smoothing is turned
                off.
              </p>
              <div className="swatches" aria-label="Brow shade">
                {[
                  { name: "Soft brown", color: "#574237" },
                  { name: "Deep brown", color: "#342820" },
                  { name: "Taupe", color: "#817366" },
                  { name: "Auburn", color: "#84503c" },
                ].map((shade) => (
                  <button
                    key={shade.color}
                    aria-label={shade.name}
                    aria-pressed={browColor === shade.color}
                    title={shade.name}
                    className={browColor === shade.color ? "selected" : ""}
                    style={{ background: shade.color }}
                    onClick={() => onBrowColor(shade.color)}
                  >
                    {browColor === shade.color && <Check size={17} />}
                  </button>
                ))}
              </div>
              <button
                className="button button-primary"
                onClick={() => onPreview({ kind: "brows", browColor })}
              >
                <Sparkles size={16} /> Preview this brow shade
              </button>
              <p className="micro">
                Generated details may differ. Compare with your original.
              </p>
            </div>
          </section>
        ) : (
          <>
            <div className="section-heading compact">
              <div>
                <h2>
                  {tab === "hair"
                    ? "Your wig references"
                    : "For days without a wig"}
                </h2>
                <p>
                  {tab === "hair"
                    ? "Create a photo preview, then try its hair layer live with your camera."
                    : "Experimental: hat previews may change your face, clothing and framing. Review carefully."}
                </p>
              </div>
              <span className="count-label">
                {workspace?.choices.filter((choice) => choice.kind === tab)
                  .length ?? 0}{" "}
                saved
              </span>
            </div>
            {workspace?.choices.some((choice) => choice.kind === tab) ? (
              <div className="choice-grid">
                {workspace.choices
                  .filter((choice) => choice.kind === tab)
                  .map((choice) => (
                    <article className="choice-card" key={choice.id}>
                      <div className="choice-image">
                        <img
                          src={mediaUrl(choice.reference.id)}
                          alt={`Reference for ${choice.name}`}
                        />
                        <span className="image-label">Your reference</span>
                      </div>
                      <div className="choice-body">
                        <h3>{choice.name}</h3>
                        <p className="micro">
                          {choice.sellerUrl
                            ? "Product link saved · policy not verified"
                            : "Reference image · no seller linked"}
                        </p>
                        <button
                          className="button button-secondary full"
                          onClick={() =>
                            onPreview({
                              kind: choice.kind,
                              choiceId: choice.id,
                            })
                          }
                        >
                          <Sparkles size={15} /> Preview on my photo
                        </button>
                      </div>
                    </article>
                  ))}
              </div>
            ) : (
              <div className="add-reference-callout">
                <div className="callout-icon">
                  <Images size={25} strokeWidth={1.5} />
                </div>
                <div>
                  <h3>
                    {tab === "hair"
                      ? "Have a wig in mind?"
                      : "A favourite hat, perhaps?"}
                  </h3>
                  <p>
                    {tab === "hair"
                      ? "Add the exact wig and shade you’re considering. A clear reference helps you judge the style transfer."
                      : "Add a hat product photo or a photo of someone wearing it."}
                  </p>
                </div>
                <button className="text-link" onClick={() => onAddChoice()}>
                  Add your first reference <ArrowRight size={16} />
                </button>
              </div>
            )}
            <div className="section-heading compact studies-heading">
              <div>
                <span className="eyebrow">A LITTLE INSPIRATION</span>
                <h2>
                  {tab === "hair"
                    ? "Which direction feels like you?"
                    : "A change of pace."}
                </h2>
              </div>
              <span className="micro">
                Illustrations, not products or AI results
              </span>
            </div>
            <div className="study-grid">
              {(tab === "hair"
                ? styleStudies
                : [
                    {
                      name: "A soft everyday hat",
                      detail: "Bring a reference you like",
                      shade: "#574237",
                      skin: "#ddb294",
                      variant: 1,
                    },
                    {
                      name: "A little shade",
                      detail: "Bring a reference you like",
                      shade: "#3c302b",
                      skin: "#b77a58",
                      variant: 0,
                    },
                  ]
              ).map((study, index) => (
                <button
                  className="study-card"
                  key={study.name}
                  onClick={() => onAddChoice(study.name)}
                  disabled={busy}
                >
                  <div className={`study-image study-bg-${index % 4}`}>
                    <Portrait {...study} hat={tab === "hat"} />
                    <span className="study-add">
                      <Plus size={16} />
                    </span>
                  </div>
                  <div className="study-body">
                    <h3>{study.name}</h3>
                    <p>{study.detail}</p>
                  </div>
                </button>
              ))}
            </div>
            <p className="micro study-note">
              Choose a direction to add your own reference image.{" "}
              {tab === "hair"
                ? "Wig details and colour transfer can vary; compare every result with the actual reference."
                : "Hat previews may also change clothing and background. A photo with hair does not predict appearance without hair."}
            </p>
          </>
        )}
      </div>
      {baseline && (
        <details className="optional-analysis">
          <summary>Optional colour context · availability varies</summary>
          <p className="micro">
            The service may not return a hair colour. StillYou does not
            calculate a shade-match score.
          </p>
          <div className="color-analysis-callout">
            <div>
              <SlidersHorizontal size={18} />
              <span>
                Want a little colour context?{" "}
                <small>
                  A broad photo estimate, when available. Lighting affects
                  colour.
                </small>
              </span>
            </div>
            <button
              className="text-link"
              onClick={() => onPreview({ kind: "color" })}
            >
              Check colour family <ArrowRight size={14} />
            </button>
          </div>
        </details>
      )}
    </>
  );
}
