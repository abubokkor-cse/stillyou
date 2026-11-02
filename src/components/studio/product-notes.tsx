"use client";
import { useState } from "react";
import type { PublicWorkspace } from "@/lib/types";

export function ProductNotes({
  choice,
  save,
  close,
}: {
  choice: PublicWorkspace["choices"][number];
  save: (data: unknown) => Promise<void>;
  close?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className="form-stack"
      onSubmit={async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setBusy(true);
        setError("");
        try {
          await save({
            action: "product",
            choiceId: choice.id,
            sellerUrl: data.get("sellerUrl"),
            priceMinor: data.get("price")
              ? Math.round(Number(data.get("price")) * 100)
              : undefined,
            currency: data.get("currency"),
            shade: data.get("shade"),
            capSize: data.get("capSize"),
            fibre: data.get("fibre"),
            returnStatus: data.get("returnStatus"),
            returnPolicy: data.get("returnPolicy"),
            policyUrl: data.get("policyUrl"),
          });
          close?.();
        } catch (error) {
          setError((error as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="muted">
        Record the exact variant you’re considering. These are your notes from
        the seller, not details inferred from the preview.
      </p>
      <label className="field">
        Exact product / variant link
        <input
          name="sellerUrl"
          type="url"
          defaultValue={choice.sellerUrl}
          placeholder="https://…"
        />
      </label>
      <div className="form-columns">
        <label className="field">
          Current item price
          <input
            name="price"
            type="number"
            min="0"
            max="1000000"
            step="0.01"
            defaultValue={
              choice.product?.priceMinor !== undefined
                ? choice.product.priceMinor / 100
                : ""
            }
            placeholder="Unknown"
          />
        </label>
        <label className="field">
          Currency
          <select
            name="currency"
            defaultValue={choice.product?.currency ?? "USD"}
          >
            {["USD", "GBP", "EUR", "CAD", "BDT"].map((currency) => (
              <option key={currency}>{currency}</option>
            ))}
          </select>
        </label>
      </div>
      <p className="micro">
        Item price only. Confirm shipping, taxes and current availability before
        payment.
      </p>
      <label className="field">
        Selected shade
        <input
          name="shade"
          maxLength={100}
          defaultValue={choice.product?.shade}
          placeholder="Exact seller shade name or code"
        />
      </label>
      <div className="form-columns">
        <label className="field">
          Cap size
          <input
            name="capSize"
            maxLength={100}
            defaultValue={choice.product?.capSize}
            placeholder="Unknown"
          />
        </label>
        <label className="field">
          Fibre / construction
          <input
            name="fibre"
            maxLength={150}
            defaultValue={choice.product?.fibre}
            placeholder="e.g. Synthetic, lace front"
          />
        </label>
      </div>
      <label className="field">
        Returns for this exact variant
        <select
          name="returnStatus"
          defaultValue={choice.product?.returnStatus ?? "unknown"}
        >
          <option value="unknown">Not yet confirmed</option>
          <option value="conditional">Returns subject to conditions</option>
          <option value="final_sale">Final sale / non-returnable</option>
        </select>
      </label>
      <label className="field">
        Return conditions
        <textarea
          name="returnPolicy"
          maxLength={1000}
          defaultValue={choice.returnPolicy}
          placeholder="Window, condition, tags, fees and item-specific exclusions."
        />
      </label>
      <label className="field">
        Return-policy source
        <input
          name="policyUrl"
          type="url"
          defaultValue={choice.policyUrl}
          placeholder="https://…"
        />
      </label>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      <p className="micro">
        Changing product facts clears your current pick for this option.
        Changing its link or shade also requires a fresh review; the saved image
        is not regenerated.
      </p>
      <button className="button button-primary full" disabled={busy}>
        {busy ? "Saving…" : "Save product facts"}
      </button>
    </form>
  );
}
