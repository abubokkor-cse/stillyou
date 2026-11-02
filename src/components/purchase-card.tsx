"use client";

import { useState } from "react";
import { ExternalLink, Printer, Ruler, ShieldCheck } from "lucide-react";
import type { PublicWorkspace, Checklist } from "@/lib/types";
import { decisionQuestions, money, reviewLabel } from "@/lib/decision";
import { ProductNotes } from "./studio/product-notes";
import { dateLabel, mediaUrl } from "@/lib/browser";

const checklist: { key: keyof Checklist; title: string; detail: string }[] = [
  {
    key: "policy",
    title: "Check the exact return policy",
    detail:
      "Confirm try-on rules, return windows, final-sale exclusions and any restocking fee.",
  },
  {
    key: "measurements",
    title: "Take your cap measurements",
    detail:
      "Use a soft tape for head circumference, front-to-nape and ear-to-ear. Follow this seller's size guide.",
  },
  {
    key: "comfort",
    title: "Ask about comfort and construction",
    detail:
      "Check cap lining, adjustability, fibre care and the option of an in-person fitting.",
  },
  {
    key: "coverage",
    title: "Explore coverage or support",
    detail:
      "If relevant, ask your insurer about cranial prosthesis coverage and required documentation.",
  },
];

export function PurchaseCard({
  workspace,
  previewId,
  patch,
  save,
}: {
  workspace: PublicWorkspace;
  previewId: string;
  patch: (body: unknown) => Promise<void>;
  save: (body: unknown) => Promise<void>;
}) {
  const preview = workspace.previews.find((item) => item.id === previewId)!;
  const choice = workspace.choices.find((item) => item.id === preview.choiceId);
  const questions = decisionQuestions(workspace, previewId);
  const decision =
    workspace.decision?.previewId === previewId
      ? workspace.decision
      : undefined;
  const [error, setError] = useState("");
  return (
    <div className="purchase-card form-stack">
      <div className="purchase-choice">
        <img
          src={mediaUrl(preview.id)}
          alt={`AI preview of ${choice?.name ?? "brow shade"}`}
        />
        <div>
          <span className="eyebrow">YOUR DECISION NOTES</span>
          <h3>{choice?.name ?? "Brow preview"}</h3>
          <p className="micro">
            Based on your {dateLabel(preview.sourceDate)} photo.
          </p>
          {choice?.sellerUrl && (
            <a
              className="text-link"
              href={choice.sellerUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open product page <ExternalLink size={13} />
            </a>
          )}
        </div>
      </div>
      <div className="notice">
        <ShieldCheck size={20} />
        <div>
          <strong>
            {choice?.returnPolicy && choice.policyUrl
              ? "Your saved policy notes"
              : "Return policy not verified"}
          </strong>
          <p>
            {choice?.returnPolicy ||
              "Policies differ by seller and item. Check before paying."}
          </p>
          {choice?.policyUrl && (
            <a
              href={choice.policyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-link"
            >
              Policy source <ExternalLink size={12} />
            </a>
          )}
          {choice?.policyCheckedOn && (
            <p className="micro">
              Recorded by you on {dateLabel(choice.policyCheckedOn)}. StillYou
              has not verified this policy.
            </p>
          )}
        </div>
      </div>
      {choice && (
        <details className="policy-details no-print">
          <summary>Edit product facts & policy</summary>
          <ProductNotes choice={choice} save={save} />
        </details>
      )}
      {preview.kind === "hair" && (
        <div className="decision-card-notes">
          <h3>
            {decision
              ? "Why this is my current pick"
              : "Still considering this option"}
          </h3>
          <p>
            {decision?.reason ??
              "No final choice recorded. Compare your shortlist before deciding."}
          </p>
          <dl className="comparison-facts">
            <div>
              <dt>Item price</dt>
              <dd>
                {choice?.product?.priceMinor !== undefined
                  ? money(choice.product.priceMinor, choice.product.currency)
                  : "Not recorded"}{" "}
                · shipping and tax extra
              </dd>
            </div>
            <div>
              <dt>Shade</dt>
              <dd>{choice?.product?.shade || "Not recorded"}</dd>
            </div>
            <div>
              <dt>Cap / fibre</dt>
              <dd>
                {[choice?.product?.capSize, choice?.product?.fibre]
                  .filter(Boolean)
                  .join(" · ") || "Not recorded"}
              </dd>
            </div>
            <div>
              <dt>Preview review</dt>
              <dd>{reviewLabel(preview.review)}</dd>
            </div>
          </dl>
          {preview.review?.liked && (
            <p>
              <strong>What I like:</strong> {preview.review.liked}
            </p>
          )}
          {preview.review?.concern && (
            <p>
              <strong>My reservation:</strong> {preview.review.concern}
            </p>
          )}
          <h4>Still to confirm</h4>
          {questions.length ? (
            <ul>
              {questions.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ul>
          ) : (
            <p>
              Your recorded checks are complete. Reconfirm current seller terms
              before payment.
            </p>
          )}
        </div>
      )}
      <div>
        <div className="section-kicker">
          <Ruler size={16} />
          <span>Before you buy</span>
        </div>
        <div className="purchase-checks">
          {checklist.map((item) => (
            <label className="check-row" key={item.key}>
              <input
                type="checkbox"
                checked={
                  workspace.checklists?.[choice?.id ?? previewId]?.[item.key] ??
                  false
                }
                onChange={(event) => {
                  void patch({
                    action: "checklist",
                    previewId,
                    key: item.key,
                    value: event.target.checked,
                  }).catch((error) => setError(error.message));
                }}
              />
              <span>
                <strong>{item.title}</strong>
                <small>{item.detail}</small>
              </span>
            </label>
          ))}
        </div>
      </div>
      <div className="support-links">
        <h4>A little extra support</h4>
        <a
          href="https://www.cancer.org/cancer/managing-cancer/side-effects/hair-skin-nails/hair-loss/choosing-and-wearing-wig.html"
          target="_blank"
          rel="noopener noreferrer"
        >
          A guide to choosing and wearing a wig <ExternalLink size={14} />
        </a>
        <a
          href="https://www.cancercare.org/financial_assistance"
          target="_blank"
          rel="noopener noreferrer"
        >
          Explore financial assistance resources <ExternalLink size={14} />
        </a>
        <p className="micro">
          Availability and eligibility vary. Confirm current support directly
          with the organization.
        </p>
      </div>
      <p className="micro">
        A preview helps explore appearance. It cannot establish fit, comfort,
        cap construction, fibre feel or an exact colour match. These notes are
        not medical advice or a coverage guarantee.
      </p>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      <button
        className="button button-secondary full no-print"
        onClick={() => window.print()}
      >
        <Printer size={16} /> Print / save as PDF
      </button>
    </div>
  );
}
