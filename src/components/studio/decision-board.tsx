"use client";
import { useState } from "react";
import {
  ArrowRight,
  Check,
  ClipboardList,
  Camera,
  ExternalLink,
  Heart,
  Users,
} from "lucide-react";
import type { PublicWorkspace, SharedShortlist } from "@/lib/types";
import { dateLabel, mediaUrl } from "@/lib/browser";
import { decisionQuestions, money, reviewLabel } from "@/lib/decision";
import { ShoppingPlan } from "./shopping-plan";
import { StyleBoard, FamilyNotes } from "./style-board";

export function DecisionBoard({
  workspace,
  votes,
  save,
  onReview,
  onLive,
  onProduct,
  onPurchase,
  onExplore,
  onShare,
  onToggle,
}: {
  workspace: PublicWorkspace;
  votes?: SharedShortlist;
  save: (data: unknown) => Promise<void>;
  onReview: (id: string) => void;
  onLive: (id: string) => void;
  onProduct: (id: string) => void;
  onPurchase: (id: string) => void;
  onExplore: () => void;
  onShare: () => void;
  onToggle: (id: string) => void;
}) {
  const [selected, setSelected] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const previews = workspace.previews.filter(
    (preview) =>
      workspace.shortlist.includes(preview.id) &&
      preview.state === "success" &&
      preview.kind === "hair",
  );
  const extras = workspace.previews.filter(
    (preview) =>
      workspace.shortlist.includes(preview.id) &&
      preview.state === "success" &&
      preview.kind !== "hair",
  );
  const decisionPreview = previews.find(
    (preview) => preview.id === workspace.decision?.previewId,
  );
  const decisionChoice = workspace.choices.find(
    (choice) => choice.id === decisionPreview?.choiceId,
  );
  const differentSources =
    new Set(previews.map((preview) => preview.sourceId)).size > 1;
  return (
    <div className="decision-board">
      <ShoppingPlan value={workspace.preferences} save={save} />
      {decisionPreview && (
        <div className="decision-summary">
          <span className="decision-seal">
            <Check size={22} />
          </span>
          <div>
            <span className="eyebrow">YOUR CURRENT PICK</span>
            <h2>{decisionChoice?.name}</h2>
            <p>{workspace.decision!.reason}</p>
            <span className="micro">
              {decisionQuestions(workspace, decisionPreview.id).length} points
              to confirm before buying · saved{" "}
              {dateLabel(workspace.decision!.decidedAt)}
            </span>
          </div>
          <button
            className="button button-primary"
            onClick={() => onPurchase(decisionPreview.id)}
          >
            Open my decision card <ArrowRight size={15} />
          </button>
        </div>
      )}
      {previews.length === 0 && extras.length === 0 ? (
        <div className="shortlist-empty">
          <Heart size={34} />
          <h2>Your decision starts with a few options.</h2>
          <p>
            Save wig previews you want to compare, then bring the product facts
            and your preferences together.
          </p>
          <button className="button button-primary" onClick={onExplore}>
            Explore wig references <ArrowRight size={16} />
          </button>
        </div>
      ) : previews.length > 0 ? (
        <>
          <div className="section-heading compact">
            <div>
              <span className="eyebrow">COMPARE THE TRADE-OFFS</span>
              <h2>
                {previews.length}{" "}
                {previews.length === 1
                  ? "wig to consider"
                  : "wigs, side by side"}
              </h2>
              <p>
                Your observations and sourced product notes. No automatic
                winner.
              </p>
            </div>
            <button className="text-link" onClick={onExplore}>
              Add another option <ArrowRight size={14} />
            </button>
          </div>
          {differentSources && (
            <div className="notice">
              <p>
                These previews use different source photos. Dates are shown
                below; lighting and pose may affect the comparison.
              </p>
            </div>
          )}
          <div className="decision-grid">
            {previews.map((preview) => {
              const choice = workspace.choices.find(
                (item) => item.id === preview.choiceId,
              )!;
              const product = choice.product;
              const questions = decisionQuestions(workspace, preview.id);
              const label = reviewLabel(preview.review);
              const vote = votes?.choices.find(
                (item) => item.previewId === preview.id,
              );
              const currentPick = workspace.decision?.previewId === preview.id;
              return (
                <article
                  className={`decision-option ${currentPick ? "current-pick" : ""}`}
                  key={preview.id}
                >
                  <button
                    className="decision-image"
                    onClick={() => onReview(preview.id)}
                    aria-label={`Review ${choice.name} with original images`}
                  >
                    <img
                      src={mediaUrl(preview.id)}
                      alt={`AI preview of ${choice.name}`}
                    />
                    <span className="image-label">
                      {currentPick ? "Your current pick" : "AI preview"}
                    </span>
                  </button>
                  <div className="decision-option-body">
                    <h3>{choice.name}</h3>
                    <p className="micro">
                      Using your {dateLabel(preview.sourceDate)} photo
                    </p>
                    <button
                      className={`review-badge ${label === "Differences noted" ? "needs-care" : ""}`}
                      onClick={() => onReview(preview.id)}
                    >
                      {label} <ArrowRight size={12} />
                    </button>
                    <dl className="comparison-facts">
                      <div>
                        <dt>Item price</dt>
                        <dd>
                          {product?.priceMinor !== undefined
                            ? money(product.priceMinor, product.currency)
                            : "Not recorded"}
                          <small>Shipping & tax extra</small>
                        </dd>
                      </div>
                      <div>
                        <dt>Returns</dt>
                        <dd>
                          {!choice.policyUrl ||
                          !choice.returnPolicy ||
                          !product ||
                          product.returnStatus === "unknown"
                            ? "Not confirmed"
                            : product.returnStatus === "final_sale"
                              ? "Final sale · your notes"
                              : "Conditional · your notes"}
                          {choice.policyUrl && (
                            <a
                              href={choice.policyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Policy source <ExternalLink size={10} />
                            </a>
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt>Shade</dt>
                        <dd>{product?.shade || "Not recorded"}</dd>
                      </div>
                      <div>
                        <dt>Cap / fibre</dt>
                        <dd>
                          {[product?.capSize, product?.fibre]
                            .filter(Boolean)
                            .join(" · ") || "Ask the seller"}
                        </dd>
                      </div>
                    </dl>
                    <div className="personal-notes">
                      <span>WHY I LIKE IT</span>
                      <p>
                        {preview.review?.liked ||
                          "Add your own reason after reviewing the images."}
                      </p>
                      {preview.review?.concern && (
                        <>
                          <span>MY RESERVATION</span>
                          <p>{preview.review.concern}</p>
                        </>
                      )}
                    </div>
                    {vote && (
                      <p className="vote-tally">
                        <Users size={13} />
                        {vote.votes} {vote.votes === 1 ? "vote" : "votes"} ·
                        your decision comes first
                      </p>
                    )}
                    <details className="decision-questions">
                      <summary>
                        {questions.length
                          ? `${questions.length} things to confirm`
                          : "Checklist reviewed · confirm with seller"}
                      </summary>
                      {questions.length ? (
                        <ul>
                          {questions.map((question) => (
                            <li key={question}>{question}</li>
                          ))}
                        </ul>
                      ) : (
                        <p>
                          These are your recorded checks, not a guarantee of
                          fit, comfort or current eligibility.
                        </p>
                      )}
                    </details>
                    <div className="decision-option-actions">
                      <button
                        className="button button-secondary full"
                        onClick={() => onLive(preview.id)}
                      >
                        <Camera size={14} /> Try this wig live
                      </button>
                      <button
                        className="button button-secondary full"
                        onClick={() => onProduct(choice.id)}
                      >
                        <ClipboardList size={14} /> Product facts & policy
                      </button>
                      <button
                        className="button button-primary full"
                        onClick={() => {
                          if (label === "Review needed") onReview(preview.id);
                          else {
                            setSelected(preview.id);
                            setError("");
                          }
                        }}
                      >
                        {label === "Review needed"
                          ? "Review before choosing"
                          : currentPick
                            ? "Update my decision"
                            : "Make this my current pick"}
                      </button>
                      <div>
                        <button
                          className="text-link"
                          onClick={() => onPurchase(preview.id)}
                        >
                          Before you buy
                        </button>
                        <button
                          className="text-link"
                          onClick={() => onToggle(preview.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                  {selected === preview.id && (
                    <form
                      className="pick-form form-stack"
                      onSubmit={async (event) => {
                        event.preventDefault();
                        const data = new FormData(event.currentTarget);
                        setBusy(true);
                        setError("");
                        try {
                          await save({
                            action: "decision",
                            previewId: preview.id,
                            reason: data.get("reason"),
                          });
                          setSelected(undefined);
                        } catch (error) {
                          setError((error as Error).message);
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      <label className="field">
                        Why is this your current pick?
                        <textarea
                          name="reason"
                          minLength={10}
                          maxLength={600}
                          required
                          defaultValue={
                            currentPick ? workspace.decision?.reason : ""
                          }
                          placeholder="Explain your trade-off: style, cost, returns, care—and what remains uncertain."
                        />
                      </label>
                      <p className="micro">
                        You can change your mind. Unanswered questions stay on
                        your decision card.
                      </p>
                      {error && (
                        <p className="inline-error" role="alert">
                          {error}
                        </p>
                      )}
                      <button className="button button-primary" disabled={busy}>
                        {busy ? "Saving…" : "Save my decision"}
                      </button>
                      <button
                        type="button"
                        className="text-link"
                        onClick={() => setSelected(undefined)}
                      >
                        Cancel
                      </button>
                    </form>
                  )}
                </article>
              );
            })}
          </div>
          <div className="soft-notice">
            <Users size={21} />
            <p>
              <strong>A second opinion can help.</strong> Family votes stay
              separate from your priorities, product facts and final choice.
            </p>
            <button className="text-link" onClick={onShare}>
              Invite an opinion <ArrowRight size={14} />
            </button>
          </div>
        </>
      ) : null}
      <StyleBoard workspace={workspace} votes={votes} save={save} onReview={onReview} onToggle={onToggle} onShare={onShare}/>
      <FamilyNotes votes={votes}/>
    </div>
  );
}
