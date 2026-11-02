"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  CircleHelp,
  Copy,
  Heart,
  Leaf,
  Link2,
  Loader2,
  LockKeyhole,
  ScanFace,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";
import type { PublicWorkspace, SharedShortlist } from "@/lib/types";
import { dateLabel, request } from "@/lib/browser";
import { Brand } from "./brand";
import { Dialog } from "./dialog";
import { PhotoForm } from "./photo-form";
import { ReferenceSection } from "./studio/reference-section";
import { ExploreSection } from "./studio/explore-section";
import { DecisionBoard } from "./studio/decision-board";
import { ShoppingPlan } from "./studio/shopping-plan";
import { PreviewReview } from "./studio/preview-review";
import { ProductNotes } from "./studio/product-notes";
import { PreviewResults } from "./studio/preview-results";
import type { PreviewRequest } from "./studio/types";
import { PurchaseCard } from "./purchase-card";
import { LiveTryOn } from "./live-try-on";
import { canLayer, isImagePreview, previewName } from "@/lib/hair-tools";

type View = "reference" | "explore" | "shortlist";
type WorkspaceResponse = { workspace: PublicWorkspace; previewId?: string };
const navigation = [
  { id: "reference", label: "Your reference", icon: ScanFace },
  { id: "explore", label: "Explore possibilities", icon: Leaf },
  { id: "shortlist", label: "Compare & choose", icon: Heart },
] as const;

export function Studio() {
  const [workspace, setWorkspace] = useState<PublicWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [view, setView] = useState<View>("reference");
  const [tab, setTab] = useState<"hair" | "brows" | "hat" | "styles">("hair");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [choiceForm, setChoiceForm] = useState<{
    kind: "hair" | "hat";
    name: string;
  }>();
  const [previewRequest, setPreviewRequest] = useState<PreviewRequest>();
  const [compareId, setCompareId] = useState<string>();
  const [purchaseId, setPurchaseId] = useState<string>();
  const [liveId, setLiveId] = useState<string>();
  const [productId, setProductId] = useState<string>();
  const [shareOpen, setShareOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [votes, setVotes] = useState<SharedShortlist>();
  const [browColor, setBrowColor] = useState("#574237");

  useEffect(() => {
    let active = true;
    void request<{ workspace: PublicWorkspace | null; previewReady: boolean }>(
      "/api/workspace",
    )
      .then((data) => {
        if (active) {
          setWorkspace(data.workspace);
          setConnected(data.previewReady);
        }
      })
      .catch((error) => {
        if (active) setError(error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const pending =
    workspace?.previews
      .filter((item) => ["starting", "running"].includes(item.state))
      .map((item) => item.id)
      .join(",") ?? "";
  useEffect(() => {
    if (!pending) return;
    let active = true;
    let working = false;
    const poll = async () => {
      if (working) return;
      working = true;
      try {
        for (const id of pending.split(",")) {
          const data = await request<WorkspaceResponse>(`/api/previews/${id}`, {
            method: "POST",
          });
          if (active) setWorkspace(data.workspace);
        }
      } catch (error) {
        if (active) setError((error as Error).message);
      } finally {
        working = false;
      }
    };
    const interval = setInterval(() => void poll(), 5000);
    const stop = setTimeout(() => clearInterval(interval), 180_000);
    return () => {
      active = false;
      clearInterval(interval);
      clearTimeout(stop);
    };
  }, [pending]);

  const shareToken = workspace?.share?.token;
  useEffect(() => {
    if (!shareToken || view !== "shortlist") return;
    let active = true;
    const update = () =>
      request<SharedShortlist>(`/api/share/${shareToken}`)
        .then((data) => {
          if (active) setVotes(data);
        })
        .catch(() => {});
    void update();
    const interval = setInterval(() => void update(), 15_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [shareToken, view]);

  async function ensureWorkspace() {
    if (workspace) return workspace;
    const data = await request<WorkspaceResponse>("/api/workspace", {
      method: "POST",
    });
    setWorkspace(data.workspace);
    return data.workspace;
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function patch(body: unknown) {
    const data = await request<WorkspaceResponse>("/api/workspace", {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    setWorkspace(data.workspace);
  }

  async function saveDecision(body: unknown) {
    await ensureWorkspace();
    const data = await request<WorkspaceResponse>("/api/decision", {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    setWorkspace(data.workspace);
  }

  const productChoice = workspace?.choices.find(
    (choice) => choice.id === productId,
  );
  const baseline = workspace?.photos.find(
    (photo) => photo.id === workspace.baselineId,
  );
  const expiresOn = workspace
    ? dateLabel(workspace.expiresAt)
    : "30 days after you start";
  const successful =
    workspace?.previews.filter(
      (preview) => preview.state === "success" && isImagePreview(preview.kind),
    ) ?? [];
  const shortlist = successful.filter((preview) =>
    workspace?.shortlist.includes(preview.id),
  );
  const compare = workspace?.previews.find(
    (preview) => preview.id === compareId,
  );
  const compareChoice = workspace?.choices.find(
    (choice) => choice.id === compare?.choiceId,
  );

  async function openPhoto() {
    await ensureWorkspace();
    setPhotoOpen(true);
  }
  async function openChoice(name = "") {
    await ensureWorkspace();
    setChoiceForm({ kind: tab === "hat" ? "hat" : "hair", name });
  }
  function choosePreview(input: PreviewRequest) {
    if (!baseline) {
      setError("Save a reference photo first, then come back to this choice.");
      setView("reference");
      return;
    }
    setPreviewRequest({ ...input, sourceId: baseline.id });
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <div className="sidebar-label">YOUR OWN LITTLE SPACE</div>
        <nav aria-label="Your workspace">
          {navigation.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${view === item.id ? "active" : ""}`}
              onClick={() => setView(item.id)}
              aria-current={view === item.id ? "page" : undefined}
            >
              <item.icon size={19} strokeWidth={1.7} />
              <span>{item.label}</span>
              {item.id === "shortlist" && !!shortlist.length && (
                <span className="nav-count">{shortlist.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <Leaf size={24} strokeWidth={1.2} />
          <p>
            No rush.
            <br />
            No right way.
            <br />
            <em>Just your way.</em>
          </p>
        </div>
        <div className="sidebar-bottom">
          <Link href="/about">
            <CircleHelp size={17} /> A little guidance
          </Link>
          <button onClick={() => setPrivacyOpen(true)}>
            <LockKeyhole size={17} /> Your privacy & photos
          </button>
          <span>Made with care, for you.</span>
        </div>
      </aside>
      <div className="app-main">
        <header className="app-topbar">
          <div>
            <span>Your space</span>
            <ChevronRight size={13} />
            <strong>
              {navigation.find((item) => item.id === view)?.label}
            </strong>
          </div>
          <span className="private-badge">
            <LockKeyhole size={13} /> Private by default
          </span>
        </header>
        <main id="main" className="workspace-content">
          <div className="workspace-heading">
            <div>
              <span className="eyebrow">
                {view === "reference"
                  ? "A FAMILIAR PLACE TO BEGIN"
                  : view === "explore"
                    ? "SMALL STEPS. NEW POSSIBILITIES."
                    : "THE ONES THAT FEEL LIKE YOU"}
              </span>
              <h1>
                {view === "reference"
                  ? "Start with you."
                  : view === "explore"
                    ? "Find a little familiar."
                    : "From possibilities to a decision."}
              </h1>
              <p>
                {view === "reference"
                  ? "A photo you like. A reference you can always come back to."
                  : view === "explore"
                    ? "Something similar, something different. There’s room for both."
                    : "Compare the real trade-offs, explain your choice, and keep the questions that matter."}
              </p>
            </div>
            {view === "shortlist" && shortlist.length > 0 && (
              <button
                className="button button-primary"
                onClick={() => setShareOpen(true)}
              >
                <Users size={16} /> Invite an opinion
              </button>
            )}
          </div>
          <div className="progress-path" aria-label="Your steps">
            <span className={baseline ? "complete" : "current"}>
              <i>{baseline ? <Check size={12} /> : "1"}</i> Save your reference
            </span>
            <b />
            <span
              className={
                view === "explore"
                  ? "current"
                  : successful.length
                    ? "complete"
                    : ""
              }
            >
              <i>{successful.length ? <Check size={12} /> : "2"}</i> Explore
              possibilities
            </span>
            <b />
            <span className={view === "shortlist" ? "current" : ""}>
              <i>3</i> Choose with care
            </span>
          </div>
          {error && (
            <div className="error-banner" role="alert">
              <span>{error}</span>
              <button
                className="icon-button"
                onClick={() => setError("")}
                aria-label="Dismiss message"
              >
                <X size={16} />
              </button>
            </div>
          )}
          {loading ? (
            <div className="loading-state">
              <Loader2 className="spin" /> Opening your space…
            </div>
          ) : (
            <>
              {view === "reference" && (
                <ShoppingPlan
                  value={workspace?.preferences}
                  save={saveDecision}
                />
              )}
              {view === "reference" && (
                <ReferenceSection
                  workspace={workspace}
                  expiresOn={expiresOn}
                  busy={busy}
                  onAddPhoto={() => void run(openPhoto)}
                  onExplore={() => setView("explore")}
                  onSelectPhoto={(photoId) =>
                    void run(() => patch({ action: "baseline", photoId }))
                  }
                />
              )}
              {view === "explore" && (
                <ExploreSection
                  workspace={workspace}
                  tab={tab}
                  busy={busy}
                  browColor={browColor}
                  onTab={setTab}
                  onReference={() => setView("reference")}
                  onAddChoice={(name) => void run(() => openChoice(name))}
                  onPreview={choosePreview}
                  onBrowColor={setBrowColor}
                />
              )}
              {view === "shortlist" &&
                (workspace ? (
                  <DecisionBoard
                    workspace={workspace}
                    votes={votes}
                    save={saveDecision}
                    onExplore={() => setView("explore")}
                    onShare={() => setShareOpen(true)}
                    onReview={setCompareId}
                    onLive={setLiveId}
                    onProduct={setProductId}
                    onPurchase={setPurchaseId}
                    onToggle={(previewId) =>
                      void run(() => patch({ action: "shortlist", previewId }))
                    }
                  />
                ) : (
                  <div className="shortlist-empty">
                    <Heart size={34} />
                    <h2>Start with your photo and priorities.</h2>
                    <p>
                      Then preview a few wigs and compare the trade-offs here.
                    </p>
                    <button
                      className="button button-primary"
                      onClick={() => setView("reference")}
                    >
                      Start my decision
                    </button>
                  </div>
                ))}
              {view !== "shortlist" && !!workspace?.previews.length && (
                <PreviewResults
                  workspace={workspace}
                  busy={busy}
                  onCompare={setCompareId}
                  onLive={setLiveId}
                  onToggle={(previewId) =>
                    void run(() => patch({ action: "shortlist", previewId }))
                  }
                  onReference={() => setView("reference")}
                  onPoll={(id) =>
                    void run(async () => {
                      const data = await request<WorkspaceResponse>(
                        `/api/previews/${id}`,
                        { method: "POST" },
                      );
                      setWorkspace(data.workspace);
                    })
                  }
                />
              )}
            </>
          )}
          <footer className="workspace-footer">
            <span>
              <Leaf size={14} /> A familiar reflection. A little more choice.
            </span>
            <Link href="/about">
              Privacy & preview limits <ArrowUpRightIcon />
            </Link>
          </footer>
        </main>
      </div>

      <Dialog
        open={photoOpen}
        title="A familiar starting point"
        onClose={() => setPhotoOpen(false)}
      >
        {photoOpen && (
          <PhotoForm
            expiresOn={expiresOn}
            onSubmit={async (data) => {
              const result = await request<WorkspaceResponse>("/api/photos", {
                method: "POST",
                body: data,
              });
              setWorkspace(result.workspace);
              setPhotoOpen(false);
              setView("explore");
            }}
          />
        )}
      </Dialog>
      <Dialog
        open={!!choiceForm}
        title={`Add a ${choiceForm?.kind === "hat" ? "hat" : "wig"} reference`}
        onClose={() => setChoiceForm(undefined)}
      >
        {choiceForm && (
          <PhotoForm
            reference
            kind={choiceForm.kind}
            initialName={choiceForm.name}
            expiresOn={expiresOn}
            onSubmit={async (data) => {
              const result = await request<WorkspaceResponse>("/api/choices", {
                method: "POST",
                body: data,
              });
              setWorkspace(result.workspace);
              setChoiceForm(undefined);
            }}
          />
        )}
      </Dialog>
      <Dialog
        open={!!previewRequest}
        title="One new possibility"
        onClose={() => {
          if (!busy) setPreviewRequest(undefined);
        }}
      >
        {previewRequest && (
          <form
            className="form-stack"
            onSubmit={(event) => {
              event.preventDefault();
              void run(async () => {
                const result = await request<WorkspaceResponse>(
                  "/api/previews",
                  {
                    method: "POST",
                    body: JSON.stringify({ ...previewRequest, consent: true }),
                  },
                );
                setWorkspace(result.workspace);
                setPreviewRequest(undefined);
              });
            }}
          >
            <p className="muted">
              This will use your selected photo as the starting point. The
              result is a visual impression, not a fit or colour guarantee.
            </p>
            <label className="field">
              Photo for this preview
              <select
              value={previewRequest.inputPreviewId ? `look:${previewRequest.inputPreviewId}` : previewRequest.sourceId}
                onChange={(event) => {
                  const look = event.target.value.startsWith("look:") ? successful.find((item) => item.id === event.target.value.slice(5)) : undefined;
                  setPreviewRequest({ ...previewRequest, sourceId: look?.sourceId ?? event.target.value, inputPreviewId: look?.id });
                }}
              >
                {workspace?.photos.map((photo) => (
                  <option key={photo.id} value={photo.id}>
                    {dateLabel(photo.takenOn)}
                    {photo.id === baseline?.id ? " · saved reference" : ""}
                  </option>
                ))}
                {canLayer(previewRequest.kind) && successful.length > 0 && <optgroup label="Saved AI looks · further edits may add differences">
                  {successful.map((look) => <option key={look.id} value={`look:${look.id}`}>{previewName(look, workspace?.choices)} · AI look</option>)}
                </optgroup>}
              </select>
            </label>
            {previewRequest.inputPreviewId && <p className="micro">This edits an AI-generated look. Your original remains available for comparison. Further edits can add differences and are style experiments, even when based on a wig preview.</p>}
            {["hair_type", "hair_frizz"].includes(previewRequest.kind) && <>
              <p className="micro">Above: choose your front-facing photo. Below: choose two different side views with the same dimensions.</p>
              {["Right-facing photo", "Left-facing photo"].map((label, index) => <label className="field" key={label}>{label}
                <select required value={previewRequest.anglePhotoIds?.[index] ?? ""} onChange={(event) => {
                  const ids = [...(previewRequest.anglePhotoIds ?? ["", ""])]; ids[index] = event.target.value;
                  setPreviewRequest({ ...previewRequest, anglePhotoIds: ids });
                }}><option value="">Choose a saved side photo</option>{workspace?.photos.map((photo, photoIndex) => <option key={photo.id} value={photo.id} disabled={photo.id === previewRequest.sourceId || photo.id === previewRequest.anglePhotoIds?.[1 - index]}>Photo {photoIndex + 1} · {dateLabel(photo.takenOn)}</option>)}</select>
              </label>)}
              <p className="micro">Need side photos? Close this dialog and add or capture them under Your reference.</p>
            </>}
            {previewRequest.kind === "hat" && (
              <>
                <label className="field">
                  Hat rendering option
                  <select
                    value={previewRequest.hatGender ?? "female"}
                    onChange={(event) =>
                      setPreviewRequest({
                        ...previewRequest,
                        hatGender: event.target.value as "female" | "male",
                      })
                    }
                  >
                    <option value="female">Feminine presentation</option>
                    <option value="male">Masculine presentation</option>
                  </select>
                </label>
                <p className="micro">
                  The hat renderer currently provides these two options. It may
                  also change clothing and background. This does not predict
                  appearance without hair.
                </p>
              </>
            )}
            <label className="check-row">
              <input type="checkbox" required />
              <span>
                I agree to send the selected photo
                {["hair_type", "hair_frizz"].includes(previewRequest.kind) ? " and both side photos" : ""}
                {["hair", "hat"].includes(previewRequest.kind)
                  ? " and reference image"
                  : ""}{" "}
                to the AI processing provider for this preview. I understand
                generated details may differ.
              </span>
            </label>
            {!connected && (
              <p className="inline-error">
                The preview service is not connected yet.
              </p>
            )}
            {error && (
              <p className="inline-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="button button-primary full"
              disabled={busy || !connected}
            >
              {busy ? (
                <Loader2 className="spin" size={17} />
              ) : (
                <Sparkles size={17} />
              )}{" "}
              {busy ? "Starting your preview…" : "Create my preview"}
            </button>
          </form>
        )}
      </Dialog>
      <Dialog
        open={!!compare}
        title={compare ? previewName(compare, compareChoice ? [compareChoice] : []) : "Your preview"}
        onClose={() => setCompareId(undefined)}
      >
        {compare && workspace && (
          <PreviewReview
            key={compare.id}
            workspace={workspace}
            previewId={compare.id}
            save={saveDecision}
            toggle={() => patch({ action: "shortlist", previewId: compare.id })}
          />
        )}
      </Dialog>
      <Dialog
        open={!!productChoice}
        title={`Product facts · ${productChoice?.name ?? ""}`}
        onClose={() => setProductId(undefined)}
      >
        {productChoice && (
          <ProductNotes
            key={productChoice.id}
            choice={productChoice}
            save={saveDecision}
            close={() => setProductId(undefined)}
          />
        )}
      </Dialog>
      <Dialog
        open={!!liveId}
        title="Try your wig live"
        onClose={() => setLiveId(undefined)}
      >
        {workspace && liveId && (
          <LiveTryOn workspace={workspace} initialPreviewId={liveId} />
        )}
      </Dialog>
      <Dialog
        open={!!purchaseId}
        title="Before you buy"
        onClose={() => setPurchaseId(undefined)}
      >
        {workspace && purchaseId && (
          <PurchaseCard
            workspace={workspace}
            previewId={purchaseId}
            patch={patch}
            save={saveDecision}
          />
        )}
      </Dialog>
      <Dialog
        open={shareOpen}
        title="A trusted second opinion"
        onClose={() => setShareOpen(false)}
      >
        <div className="form-stack">
          <p className="muted">
            Share the generated previews currently in your shortlist and their
            choice names. Your original photos and private notes are not
            included. Friends enter a name to vote and can leave a recommendation that only you can read.
          </p>
          {workspace?.share && (
            <div className="share-link-box">
              <label className="field">
                Your family link
                <input
                  readOnly
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}/share/${workspace.share.token}`}
                  onFocus={(event) => event.target.select()}
                />
              </label>
              <button
                className="button button-secondary"
                onClick={() =>
                  void run(async () => {
                    await navigator.clipboard.writeText(
                      `${window.location.origin}/share/${workspace.share!.token}`,
                    );
                    setCopied(true);
                  })
                }
              >
                <Copy size={15} />
                {copied ? "Copied" : "Copy link"}
              </button>
              <p className="micro">
                Expires {dateLabel(workspace.share.expiresAt)}. Adding a new
                favourite does not update this shared selection; create a new
                link to include it.
              </p>
              <button
                className="text-link danger"
                onClick={() =>
                  void run(async () => {
                    const data = await request<WorkspaceResponse>(
                      "/api/share",
                      { method: "DELETE" },
                    );
                    setWorkspace(data.workspace);
                    setVotes(undefined);
                    setCopied(false);
                  })
                }
                disabled={busy}
              >
                Revoke this link
              </button>
            </div>
          )}
          <form
            className="form-stack"
            onSubmit={(event) => {
              event.preventDefault();
              void run(async () => {
                const data = await request<WorkspaceResponse>("/api/share", {
                  method: "POST",
                  body: JSON.stringify({ consent: true }),
                });
                setWorkspace(data.workspace);
                setVotes(undefined);
                setCopied(false);
              });
            }}
          >
            <label className="check-row">
              <input type="checkbox" required />
              <span>
                I understand anyone with the link can view or save these
                generated photos and vote. The link expires within seven days; I
                can revoke it sooner.
              </span>
            </label>
            <button
              className="button button-primary full"
              disabled={busy || !shortlist.length}
            >
              <Link2 size={17} />
              {workspace?.share ? "Create a new link" : "Create family link"}
            </button>
          </form>
          {error && (
            <p className="inline-error" role="alert">
              {error}
            </p>
          )}
        </div>
      </Dialog>
      <Dialog
        open={privacyOpen}
        title="Your photos, your control"
        onClose={() => setPrivacyOpen(false)}
      >
        <div className="form-stack">
          <div className="notice">
            <LockKeyhole size={21} />
            <p>
              This browser’s private cookie opens your workspace. Clearing that
              cookie removes your access. Your workspace expires {expiresOn}.
            </p>
          </div>
          <p className="muted">
            Delete your workspace to remove its saved photos, reference images,
            previews, notes, family feedback and links. This cannot be undone. Copies
            already saved by someone else cannot be recalled.
          </p>
          <Link href="/about" className="text-link">
            Read about storage and AI processing <ArrowRight size={14} />
          </Link>
          {workspace && (
            <form
              className="form-stack"
              onSubmit={(event) => {
                event.preventDefault();
                void run(async () => {
                  await request("/api/workspace", { method: "DELETE" });
                  setWorkspace(null);
                  setVotes(undefined);
                  setPrivacyOpen(false);
                  setView("reference");
                });
              }}
            >
              <label className="check-row">
                <input type="checkbox" required />
                <span>Delete all my saved photos and this workspace.</span>
              </label>
              <button className="button button-danger" disabled={busy}>
                <Trash2 size={16} /> Delete my workspace
              </button>
            </form>
          )}
          {error && (
            <p className="inline-error" role="alert">
              {error}
            </p>
          )}
        </div>
      </Dialog>
    </div>
  );
}

function ArrowUpRightIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
    >
      <path d="M3 9L9 3M3 3H9V9" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}
