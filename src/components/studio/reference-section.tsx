"use client";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  ImagePlus,
  Leaf,
  LockKeyhole,
  Plus,
  ScanFace,
} from "lucide-react";
import type { PublicWorkspace } from "@/lib/types";
import { dateLabel, mediaUrl } from "@/lib/browser";

type Props = {
  workspace: PublicWorkspace | null;
  expiresOn: string;
  busy: boolean;
  onAddPhoto: () => void;
  onExplore: () => void;
  onSelectPhoto: (id: string) => void;
};
export function ReferenceSection({
  workspace,
  expiresOn,
  busy,
  onAddPhoto,
  onExplore,
  onSelectPhoto,
}: Props) {
  const baseline = workspace?.photos.find(
    (photo) => photo.id === workspace.baselineId,
  );
  return (
    <>
      <div className="reference-layout">
        <section
          className={`baseline-card ${baseline ? "saved-baseline" : ""}`}
        >
          {baseline ? (
            <>
              <div className="baseline-image">
                <img
                  src={mediaUrl(baseline.id)}
                  alt={`Your saved reference from ${dateLabel(baseline.takenOn)}`}
                />
                <span className="image-label">
                  <Check size={13} /> Your original photo
                </span>
              </div>
              <div className="baseline-meta">
                <div>
                  <span className="eyebrow">YOUR SAVED REFERENCE</span>
                  <h3>{dateLabel(baseline.takenOn)}</h3>
                </div>
                <button
                  className="button button-secondary button-small"
                  onClick={onAddPhoto}
                  disabled={busy}
                >
                  <Plus size={15} /> Add photo
                </button>
              </div>
            </>
          ) : (
            <div className="baseline-empty">
              <div className="reference-frame">
                <ScanFace size={65} strokeWidth={0.75} />
                <span className="frame-corner tl" />
                <span className="frame-corner tr" />
                <span className="frame-corner bl" />
                <span className="frame-corner br" />
              </div>
              <h2>A photo that feels like you.</h2>
              <p>
                Use a clear photo with your hair and shoulders visible. An
                existing favourite works, too.
              </p>
              <button
                className="button button-primary"
                onClick={onAddPhoto}
                disabled={busy}
              >
                <ImagePlus size={17} />{" "}
                {busy ? "Opening…" : "Add your reference photo"}
              </button>
              <span className="micro">Upload a photo or use your camera</span>
            </div>
          )}
        </section>
        <div className="reference-guidance">
          <span className="pill">
            <Leaf size={14} /> An anchor for later
          </span>
          <h2>
            A familiar reflection.
            <br />
            <em>Whenever you need it.</em>
          </h2>
          <p>
            If your hair changes, a suitable saved photo can still be the
            starting point for exploring wig styles.
          </p>
          <div className="guidance-list">
            <div>
              <span>01</span>
              <p>
                <strong>Find soft, even light</strong>Face the camera. Keep your
                face, hair and shoulders in the frame.
              </p>
            </div>
            <div>
              <span>02</span>
              <p>
                <strong>Keep the original close</strong>Every preview stays
                connected to the date of your chosen photo.
              </p>
            </div>
            <div>
              <span>03</span>
              <p>
                <strong>Come back in your own time</strong>Your private
                workspace stays available in this browser until {expiresOn}.
              </p>
            </div>
          </div>
          {baseline && (
            <button className="button button-primary" onClick={onExplore}>
              Explore your possibilities <ArrowRight size={17} />
            </button>
          )}
        </div>
      </div>
      {workspace && workspace.photos.length > 0 && (
        <section className="saved-photos">
          <div className="section-heading compact">
            <h2>Your reference photos</h2>
            <span className="micro">
              Choose the photo to use for your next preview
            </span>
          </div>
          <div className="photo-options">
            {workspace.photos.map((photo) => (
              <button
                key={photo.id}
                className={`photo-option ${baseline?.id === photo.id ? "selected" : ""}`}
                onClick={() => onSelectPhoto(photo.id)}
                disabled={busy}
              >
                <img
                  src={mediaUrl(photo.id)}
                  alt={`Saved reference dated ${dateLabel(photo.takenOn)}`}
                />
                <span>
                  {dateLabel(photo.takenOn)}
                  {baseline?.id === photo.id && <Check size={15} />}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
      <div className="soft-notice">
        <LockKeyhole size={20} />
        <p>
          <strong>A private starting point.</strong> Saving a photo does not
          share it with family. We ask before sending photos for AI processing.
        </p>
        <Link href="/about" className="text-link">
          More about your photos <ArrowRight size={14} />
        </Link>
      </div>
    </>
  );
}
