"use client";
import { ArrowRight, Heart, Users } from "lucide-react";
import type { PublicWorkspace } from "@/lib/types";
import { dateLabel, mediaUrl } from "@/lib/browser";
import type { SharedShortlist } from "@/lib/types";
type Props = {
  workspace: PublicWorkspace | null;
  shortlist: PublicWorkspace["previews"];
  votes?: SharedShortlist;
  onExplore: () => void;
  onShare: () => void;
  onCompare: (id: string) => void;
  onPurchase: (id: string) => void;
  onToggle: (id: string) => void;
};
export function ShortlistSection({
  workspace,
  shortlist,
  votes,
  onExplore,
  onShare,
  onCompare,
  onPurchase,
  onToggle,
}: Props) {
  return (
    <>
      {shortlist.length === 0 ? (
        <div className="shortlist-empty">
          <div className="empty-heart">
            <Heart size={37} strokeWidth={1} />
          </div>
          <h2>A little space for your favourites.</h2>
          <p>
            When a preview feels like you, tap its heart.
            <br />
            Keep up to six choices here to compare and share.
          </p>
          <button className="button button-primary" onClick={() => onExplore()}>
            Explore possibilities <ArrowRight size={17} />
          </button>
        </div>
      ) : (
        <>
          <div className="shortlist-grid">
            {shortlist.map((preview) => {
              const choice = workspace!.choices.find(
                (choice) => choice.id === preview.choiceId,
              );
              const tally =
                votes?.choices.find((choice) => choice.previewId === preview.id)
                  ?.votes ?? 0;
              return (
                <article
                  className="choice-card shortlist-card"
                  key={preview.id}
                >
                  <div className="choice-image">
                    <img
                      src={mediaUrl(preview.id)}
                      alt={`AI preview: ${choice?.name ?? "Brow shade"}`}
                    />
                    <span className="image-label">AI preview</span>
                    <button
                      className="heart-button selected"
                      aria-label={`Remove ${choice?.name ?? "brow shade"} from shortlist`}
                      onClick={() => onToggle(preview.id)}
                    >
                      <Heart size={19} fill="currentColor" />
                    </button>
                  </div>
                  <div className="choice-body">
                    <h3>{choice?.name ?? "Brow preview"}</h3>
                    <p className="micro">
                      Photo from {dateLabel(preview.sourceDate)}
                    </p>
                    {workspace?.share?.previewIds.includes(preview.id) && (
                      <p className="vote-tally">
                        <Users size={14} />
                        {tally} {tally === 1 ? "vote" : "votes"} · your choice
                        comes first
                      </p>
                    )}
                    <div className="card-actions">
                      <button
                        className="button button-secondary"
                        onClick={() => onCompare(preview.id)}
                      >
                        Compare
                      </button>
                      <button
                        className="button button-primary"
                        onClick={() => onPurchase(preview.id)}
                      >
                        Before you buy <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          <div className="soft-notice">
            <Users size={22} />
            <p>
              <strong>A second opinion, when you want one.</strong> Share just
              these previews. Your original photos and private notes stay in
              your space.
            </p>
            <button className="text-link" onClick={() => onShare()}>
              {workspace?.share ? "Manage family link" : "Invite an opinion"}
              <ArrowRight size={14} />
            </button>
          </div>
        </>
      )}
    </>
  );
}
