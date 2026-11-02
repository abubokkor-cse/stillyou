"use client";
import { useState } from "react";
import { Download, Share2 } from "lucide-react";
import { mediaUrl } from "@/lib/browser";

export function SaveLook({ id, name }: { id: string; name: string }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return <div className="save-look">
    <a className="text-link" href={`${mediaUrl(id)}?download=1`} download={`stillyou-ai-preview-${id}.jpg`}><Download size={15}/> Download photo</a>
    <button className="text-link" disabled={busy} onClick={async () => {
      setMessage(""); setBusy(true);
      try {
        const response = await fetch(mediaUrl(id));
        if (!response.ok) throw new Error("Could not open this image. Try again.");
        const file = new File([await response.blob()], `stillyou-ai-preview-${id}.jpg`, { type: "image/jpeg" });
        if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: name, text: `StillYou AI preview: ${name}. A style idea, not an exact product or dye result.` });
        else setMessage("Download the photo to send it, or use Invite an opinion from your shortlist to collect votes.");
      } catch (error) { if ((error as Error).name !== "AbortError") setMessage((error as Error).message); }
      finally { setBusy(false); }
    }}><Share2 size={15}/> Share photo</button>
    {message && <p className="micro" role="status">{message}</p>}
  </div>;
}
