"use client";
import { useState } from "react";
import { Check, Users } from "lucide-react";
import type { PublicWorkspace, SharedShortlist } from "@/lib/types";
import { previewName, isImagePreview } from "@/lib/hair-tools";
import { reviewLabel } from "@/lib/decision";
import { mediaUrl } from "@/lib/browser";
import { SaveLook } from "./save-look";

export function StyleBoard({ workspace, votes, save, onReview, onToggle, onShare }: {
  workspace: PublicWorkspace; votes?: SharedShortlist; save: (body: unknown) => Promise<void>;
  onReview: (id: string) => void; onToggle: (id: string) => void; onShare: () => void;
}) {
  const [editing, setEditing] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const looks = workspace.previews.filter((preview) => workspace.shortlist.includes(preview.id) && preview.state === "success" && preview.kind !== "hair" && isImagePreview(preview.kind));
  if (!looks.length) return null;
  return <section className="style-board">
    <div className="section-heading compact"><div><span className="eyebrow">YOUR STYLE DECISION</span><h2>Looks to talk over.</h2><p>Compare ideas for your next cut, colour or style. Show your pick to a stylist and discuss upkeep, suitability and cost.</p></div><button className="button button-secondary" onClick={onShare}><Users size={15}/> Ask family or friends</button></div>
    <div className="decision-grid">{looks.map((preview) => {
      const name = previewName(preview, workspace.choices);
      const chosen = workspace.styleDecision?.previewId === preview.id;
      const tally = votes?.choices.find((item) => item.previewId === preview.id);
      return <article key={preview.id} className={`decision-option ${chosen ? "current-pick" : ""}`}>
        <button className="decision-image" onClick={() => onReview(preview.id)} aria-label={`Review ${name}`}><img src={mediaUrl(preview.id)} alt={`AI style idea: ${name}`}/><span className="image-label">{chosen ? "Your style pick" : "AI style idea"}</span></button>
        <div className="decision-option-body form-stack">
          <h3>{name}</h3><button className="text-link" onClick={() => onReview(preview.id)}>{reviewLabel(preview.review)} · compare with original</button>
          {preview.inputPreviewId && <p className="micro">Edited from an earlier AI look. This is a style experiment, not an exact wig product preview.</p>}
          {preview.review?.liked && <p>{preview.review.liked}</p>}
          {preview.review?.concern && <p className="micro">To discuss: {preview.review.concern}</p>}
          {tally && <p className="vote-tally"><Users size={14}/>{tally.votes} family {tally.votes === 1 ? "vote" : "votes"}</p>}
          {chosen && <div className="style-pick-reason"><Check size={17}/><p>{workspace.styleDecision!.reason}</p></div>}
          <SaveLook id={preview.id} name={name}/>
          <button className="button button-primary" onClick={() => { if (reviewLabel(preview.review) === "Review needed") onReview(preview.id); else { setEditing(preview.id); setError(""); } }}>{reviewLabel(preview.review) === "Review needed" ? "Review before choosing" : chosen ? "Update my style pick" : "Choose this style"}</button>
          <button className="text-link" onClick={() => onToggle(preview.id)}>Remove from shortlist</button>
          {editing === preview.id && <form className="form-stack" onSubmit={async (event) => {
            event.preventDefault(); const data = new FormData(event.currentTarget); setBusy(true); setError("");
            try { await save({ action: "decision", previewId: preview.id, reason: data.get("reason") }); setEditing(undefined); }
            catch (error) { setError((error as Error).message); } finally { setBusy(false); }
          }}>
            <label className="field">Why this style, and what should a stylist confirm?<textarea required minLength={10} maxLength={600} name="reason" defaultValue={chosen ? workspace.styleDecision?.reason : ""} placeholder="I like the softer fringe. Ask about daily styling and whether the cut works with my texture."/></label>
            {error && <p className="inline-error" role="alert">{error}</p>}
            <button className="button button-primary" disabled={busy}>{busy ? "Saving…" : "Save my style decision"}</button><button type="button" className="text-link" onClick={() => setEditing(undefined)}>Cancel</button>
          </form>}
        </div>
      </article>;
    })}</div>
  </section>;
}

export function FamilyNotes({ votes }: { votes?: SharedShortlist }) {
  if (!votes) return null;
  return <section className="family-notes"><span className="eyebrow">FROM YOUR PEOPLE</span><h2>Family recommendations</h2>
    <p className="micro">Only you can read these notes. Names are supplied by visitors; one vote per browser is a convenience, not identity verification.</p>
    {!votes.feedback?.length ? <p>No named feedback yet. This section refreshes while your comparison board is open.</p> : <div>{votes.feedback.map((note, index) => <article key={`${note.updatedAt}-${index}`}><strong>{note.name}</strong><span className="micro"> voted for {votes.choices.find((choice) => choice.previewId === note.previewId)?.name ?? "a shared look"}</span><p>{note.recommendation || "Liked this look."}</p></article>)}</div>}
  </section>;
}
