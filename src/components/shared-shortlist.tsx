"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Heart, Loader2, LockKeyhole } from "lucide-react";
import type { SharedShortlist as SharedData } from "@/lib/types";
import { dateLabel, request } from "@/lib/browser";
import { Brand } from "./brand";

export function SharedShortlist({ token }: { token: string }) {
  const [data, setData] = useState<SharedData>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    let active = true;
    void request<SharedData>(`/api/share/${token}`)
      .then((data) => {
        if (active) {
          setData(data);
          setName(data.myFeedback?.name ?? "");
          setRecommendation(data.myFeedback?.recommendation ?? "");
        }
      })
      .catch((error) => {
        if (active) setError(error.message);
      });
    return () => {
      active = false;
    };
  }, [token]);
  async function vote(previewId: string) {
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      await request(`/api/share/${token}`, {
        method: "POST",
        body: JSON.stringify({ previewId, name, recommendation }),
      });
      setData(await request<SharedData>(`/api/share/${token}`));
      setSaved(true);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="shared-page">
      <header className="landing-nav">
        <Brand />
        <span className="private-badge">
          <LockKeyhole size={13} /> Shared with you
        </span>
      </header>
      <main id="main" className="shared-content">
        <span className="eyebrow">YOUR OPINION WAS INVITED</span>
        <h1>
          A little help
          <br />
          <em>from someone close.</em>
        </h1>
        <p className="lead">
          Someone trusts your eye. Pick the style you like best.
          <br />
          Your vote is a little support; the choice is still theirs.
        </p>
        {error && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}
        {!data && !error && (
          <div className="loading-state">
            <Loader2 className="spin" /> Opening the shortlist…
          </div>
        )}
        {data && (
          <>
            <div className="feedback-form form-stack">
              <label className="field">Your name or nickname
                <input value={name} onChange={(event) => setName(event.target.value)} maxLength={60} autoComplete="given-name" placeholder="e.g. Sam" />
              </label>
              <label className="field">Your recommendation · optional
                <textarea value={recommendation} onChange={(event) => setRecommendation(event.target.value)} maxLength={500} placeholder="I like the shorter style. Maybe ask the stylist about daily upkeep." />
              </label>
              <p className="micro">Your name and note go to the person who shared this link. Other visitors see vote totals only. Names are self-reported; no account is needed.</p>
              {saved && <p className="success-banner" role="status">Your vote and recommendation are saved. Thank you.</p>}
            </div>
            <div className="shortlist-grid">
              {data.choices.map((choice) => (
                <article key={choice.previewId} className="choice-card">
                  <div className="choice-image">
                    <img
                      src={`/api/share/${token}/media/${choice.previewId}`}
                      alt={`Shared AI preview: ${choice.name}`}
                    />
                    <span className="image-label">AI preview</span>
                  </div>
                  <div className="choice-body">
                    <h3>{choice.name}</h3>
                    <p className="micro">
                      {choice.votes} {choice.votes === 1 ? "vote" : "votes"}
                    </p>
                    <button
                      className={`button full ${data.selected === choice.previewId ? "button-primary" : "button-secondary"}`}
                      disabled={busy || !name.trim()}
                      onClick={() => void vote(choice.previewId)}
                    >
                      {data.selected === choice.previewId ? (
                        <Check size={16} />
                      ) : (
                        <Heart size={16} />
                      )}{" "}
                      {data.selected === choice.previewId
                        ? "Update my vote & note"
                        : "I like this one"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <div className="soft-notice">
              <Heart size={20} />
              <p>
                One choice per browser. You can change your vote. This link
                expires {dateLabel(data.expiresAt)}. Please respect the owner’s
                privacy.
              </p>
            </div>
            <p className="micro centered">
              These are generated previews using a saved reference photo. They
              do not establish current appearance, fit, comfort or an exact
              colour match.
            </p>
          </>
        )}
        <div className="shared-footer">
          <Link href="/about">About previews & privacy</Link>
        </div>
      </main>
    </div>
  );
}
