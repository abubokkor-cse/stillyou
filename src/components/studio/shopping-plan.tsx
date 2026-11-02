"use client";
import { useState } from "react";
import { Check, SlidersHorizontal } from "lucide-react";
import type { Currency, ShoppingPreferences } from "@/lib/types";
import { money, priorities } from "@/lib/decision";

export function ShoppingPlan({
  value,
  save,
}: {
  value?: ShoppingPreferences;
  save: (data: unknown) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState(value?.priorities ?? []);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <section className="shopping-plan">
      <div className="plan-heading">
        <div>
          <span className="eyebrow">YOUR DECISION, YOUR CRITERIA</span>
          <h2>What matters to you?</h2>
          <p>
            {value?.priorities.length
              ? value.priorities
                  .map((id) => priorities.find((item) => item.id === id)?.label)
                  .join(" · ")
              : "Start with what you want from your wig. There is no universal best choice."}
            {value?.budgetMinor !== undefined &&
              ` · ${money(value.budgetMinor, value.currency)} budget`}
          </p>
        </div>
        <button
          className="button button-secondary button-small"
          onClick={() => {
            setSelected(value?.priorities ?? []);
            setEditing(!editing);
          }}
        >
          <SlidersHorizontal size={14} />
          {editing ? "Close" : value ? "Edit priorities" : "Set priorities"}
        </button>
      </div>
      {editing && (
        <form
          className="form-stack plan-form"
          onSubmit={async (event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            setError("");
            setBusy(true);
            try {
              await save({
                action: "preferences",
                priorities: selected,
                currency: data.get("currency") as Currency,
                budgetMinor: data.get("budget")
                  ? Math.round(Number(data.get("budget")) * 100)
                  : undefined,
              });
              setEditing(false);
            } catch (error) {
              setError((error as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="priority-options">
            {priorities.map((item) => (
              <button
                type="button"
                key={item.id}
                aria-pressed={selected.includes(item.id)}
                className={`priority-chip ${selected.includes(item.id) ? "selected" : ""}`}
                onClick={() =>
                  setSelected(
                    selected.includes(item.id)
                      ? selected.filter((id) => id !== item.id)
                      : [...selected, item.id],
                  )
                }
              >
                {selected.includes(item.id) && <Check size={13} />} {item.label}
              </button>
            ))}
          </div>
          <div className="form-columns">
            <label className="field">
              Item budget (optional)
              <input
                type="number"
                name="budget"
                min="0"
                max="1000000"
                step="0.01"
                defaultValue={
                  value?.budgetMinor !== undefined
                    ? value.budgetMinor / 100
                    : ""
                }
                placeholder="e.g. 250"
              />
              <span>Shipping and tax may be extra.</span>
            </label>
            <label className="field">
              Currency
              <select name="currency" defaultValue={value?.currency ?? "USD"}>
                {["USD", "GBP", "EUR", "CAD", "BDT"].map((currency) => (
                  <option key={currency}>{currency}</option>
                ))}
              </select>
            </label>
          </div>
          {error && (
            <p className="inline-error" role="alert">
              {error}
            </p>
          )}
          <button className="button button-primary" disabled={busy}>
            {busy ? "Saving…" : "Save my priorities"}
          </button>
        </form>
      )}
    </section>
  );
}
