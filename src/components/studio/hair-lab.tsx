"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { hairPresets, isTemplateKind, kindLabels, observationKinds, templateKinds, type HairColorOptions, type TemplateKind, type TemplatePage } from "@/lib/hair-tools";
import { request } from "@/lib/browser";
import type { PreviewKind, PublicWorkspace } from "@/lib/types";
import type { PreviewRequest } from "./types";

export function HairLab({ workspace, busy, onPreview, onReference }: {
  workspace: PublicWorkspace | null; busy: boolean;
  onPreview: (input: PreviewRequest) => void; onReference: () => void;
}) {
  const [tool, setTool] = useState<PreviewKind>("hairstyle");
  return <section className="hair-lab">
    <div className="section-heading compact">
      <div><span className="eyebrow">TRY IT BEFORE THE CHANGE</span><h2>A new cut. A different colour. Still you.</h2>
        <p>Explore ideas for a wig, salon visit or a change at home. Save a few looks and ask someone close.</p></div>
    </div>
    <label className="field tool-picker">What would you like to explore?
      <select value={tool} onChange={(event) => setTool(event.target.value as PreviewKind)}>
        <optgroup label="Try a look">{[...templateKinds, "hair_color" as const].map((kind) => <option key={kind} value={kind}>{kindLabels[kind]}</option>)}</optgroup>
        <optgroup label="Optional photo observations">{observationKinds.map((kind) => <option key={kind} value={kind}>{kindLabels[kind]}</option>)}</optgroup>
      </select>
    </label>
    {!workspace?.photos.length ? <div className="add-reference-callout"><p>Save or capture your photo to open the style gallery.</p><button className="text-link" onClick={onReference}>Add my photo <ArrowRight size={14}/></button></div>
      : isTemplateKind(tool) ? <TemplateGallery key={tool} kind={tool} busy={busy} onPreview={onPreview}/>
        : tool === "hair_color" ? <HairColorPanel busy={busy} onPreview={onPreview}/>
          : <div className="observation-panel form-stack">
            <h3>{kindLabels[tool]} · a photo observation</h3>
            <p>{tool === "hair_density" ? "Use a photo with your head lowered about 45°, hair untied and the entire hairline visible in even light." : tool === "hair_length" ? "Use a front-facing photo with your hair untied and its full length visible, including the ends." : "Use three different photos: front, right and left, with the same dimensions. Turn about 45° for each side, keep your head level and your hair untied. Include your whole face and hair."}</p>
            <p className="micro">This describes visible hair in the selected photo, not hair health or future growth. It does not decide whether you need a wig, treatment or haircut. Observations stay private and cannot be added to a family link.</p>
            <button className="button button-secondary" disabled={busy} onClick={() => onPreview({ kind: tool })}>Choose photos & check {kindLabels[tool].toLowerCase()}</button>
          </div>}
  </section>;
}

function TemplateGallery({ kind, busy, onPreview }: { kind: TemplateKind; busy: boolean; onPreview: (input: PreviewRequest) => void }) {
  const [pages, setPages] = useState<(TemplatePage & { cursor?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [keepColor, setKeepColor] = useState(true);
  const [query, setQuery] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    request<TemplatePage>(`/api/templates?kind=${kind}`).then((page) => { if (active) setPages([page]); })
      .catch((error) => { if (active) setError(error.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [kind, attempt]);
  async function more() {
    const cursor = pages.at(-1)?.next;
    if (!cursor) return;
    setLoading(true); setError("");
    try { const page = await request<TemplatePage>(`/api/templates?kind=${kind}&cursor=${encodeURIComponent(cursor)}`); setPages((current) => [...current, { ...page, cursor }]); }
    catch (error) { setError((error as Error).message); }
    finally { setLoading(false); }
  }
  const templates = pages.flatMap((page) => page.templates.map((template) => ({ ...template, cursor: page.cursor })))
    .filter((item, index, all) => all.findIndex((other) => other.id === item.id) === index)
    .filter((item) => `${item.title} ${item.category}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="form-stack">
    <div className="gallery-controls">
      <label className="field">Search loaded styles<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try bob, curls, short…"/></label>
      {kind === "hairstyle" && <label className="check-row"><input type="checkbox" checked={keepColor} onChange={(event) => setKeepColor(event.target.checked)}/><span>Keep my photo’s hair colour where supported</span></label>}
    </div>
    <p className="micro">YouCam style examples · these are inspiration, not products for sale. Results vary with the source photo. You can choose a saved AI look as your starting point.</p>
    {error && <div className="error-banner" role="alert">{error}<button className="text-link" onClick={() => { setError(""); if (pages.length) void more(); else { setLoading(true); setAttempt((value) => value + 1); } }}>Try again</button></div>}
    <div className="template-grid">{templates.map((template) => <article className="template-card" key={template.id}>
      <img src={template.thumb} alt={`${template.title} style example`} loading="lazy" referrerPolicy="no-referrer"/>
      <div><span className="micro">{template.category || kindLabels[kind]}</span><h3>{template.title}</h3>
        <button className="button button-secondary full" disabled={busy} onClick={() => onPreview({ kind, templateId: template.id, templateCursor: template.cursor, keepColor: template.keepColor || keepColor })}><Sparkles size={14}/> Try this look</button></div>
    </article>)}</div>
    {!loading && !templates.length && !error && <p>No matching styles on the loaded pages. Clear the search or load more.</p>}
    {loading && <p role="status" className="loading-state"><Loader2 size={20} className="spin"/> Loading styles…</p>}
    {pages.at(-1)?.next && <button className="button button-secondary" disabled={loading} onClick={() => void more()}>Load more styles</button>}
  </div>;
}

function HairColorPanel({ busy, onPreview }: { busy: boolean; onPreview: (input: PreviewRequest) => void }) {
  const [mode, setMode] = useState<"preset" | "custom">("preset");
  const [preset, setPreset] = useState<(typeof hairPresets)[number]>("Chocolate Brown");
  const [pattern, setPattern] = useState<"full" | "ombre">("full");
  const [first, setFirst] = useState("#593b2b");
  const [second, setSecond] = useState("#c29a65");
  const [intensity, setIntensity] = useState(70);
  const [shine, setShine] = useState(30);
  const [blend, setBlend] = useState(60);
  const [offset, setOffset] = useState(0);
  const color: HairColorOptions = mode === "preset" ? { mode, preset } : { mode, pattern, colors: pattern === "full" ? [first] : [first, second], intensity, shine, blend, offset };
  return <div className="color-tool form-stack">
    <h3>Find a shade you want to explore.</h3>
    <p>Try a single colour or an ombré blend on your photo—or recolour a saved look. This is a visual idea; it cannot predict dye results or a seller’s exact shade.</p>
    <label className="field">Colour options<select value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}><option value="preset">Ready-made shades</option><option value="custom">Mix my own</option></select></label>
    {mode === "preset" ? <label className="field">Shade<select value={preset} onChange={(event) => setPreset(event.target.value as typeof preset)}>{hairPresets.map((value) => <option key={value}>{value}</option>)}</select></label>
      : <>
        <label className="field">Colour placement<select value={pattern} onChange={(event) => setPattern(event.target.value as typeof pattern)}><option value="full">Full colour</option><option value="ombre">Ombré · two colours</option></select></label>
        <div className="form-columns"><label className="field">{pattern === "full" ? "Colour" : "Top colour"}<input type="color" value={first} onChange={(event) => setFirst(event.target.value)}/></label>{pattern === "ombre" && <label className="field">End colour<input type="color" value={second} onChange={(event) => setSecond(event.target.value)}/></label>}</div>
        <label className="field">Intensity · {intensity}%<input type="range" min={0} max={100} value={intensity} onChange={(event) => setIntensity(Number(event.target.value))}/></label>
        <label className="field">Shine · {shine}%<input type="range" min={0} max={100} value={shine} onChange={(event) => setShine(Number(event.target.value))}/></label>
        {pattern === "ombre" && <><label className="field">Blend softness · {blend}%<input type="range" min={0} max={100} value={blend} onChange={(event) => setBlend(Number(event.target.value))}/></label><label className="field">Colour transition · {Math.round(offset * 100)}<input type="range" min={-0.99} max={0.99} step={0.01} value={offset} onChange={(event) => setOffset(Number(event.target.value))}/></label></>}
      </>}
    <button className="button button-primary" disabled={busy} onClick={() => onPreview({ kind: "hair_color", hairColor: color })}><Sparkles size={16}/> Try this colour</button>
  </div>;
}
