import { spawnSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
await mkdir("artifacts/live-ar", { recursive: true });
const result = spawnSync(
  "ffmpeg",
  [
    "-hide_banner",
    "-loglevel",
    "error",
    "-f",
    "lavfi",
    "-i",
    "color=c=0xf5f3ee:s=640x480:r=15:d=14",
    "-loop",
    "1",
    "-i",
    "fixtures/private/provider-samples/female_sleek_middle_part.jpg",
    "-filter_complex",
    "[1:v]scale=340:-2[portrait];[0:v][portrait]overlay=x='(W-w)/2+45*sin(t*2)':y='20+8*sin(t)':enable='not(between(t,6,8))':shortest=1",
    "-t",
    "14",
    "-pix_fmt",
    "yuv420p",
    "-f",
    "yuv4mpegpipe",
    "artifacts/live-ar/camera.y4m",
    "-y",
  ],
  { stdio: "inherit" },
);
if (result.error || result.status !== 0)
  throw new Error(
    "Install ffmpeg and download the documented provider samples before preparing the simulated camera.",
  );
