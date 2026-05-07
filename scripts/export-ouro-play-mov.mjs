#!/usr/bin/env node
/**
 * Encodes recordings/projects-cards-628x353.webm → H.264 MOV (~20 MiB) for submission.
 * Default output: ~/Desktop/ouro-play.mov (override with OUT=/path/foo.mov).
 *
 * Requires: npm install ffmpeg-static (devDependency).
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(path.join(__dirname, ".."));
const IN = path.join(ROOT, "recordings", "projects-cards-628x353.webm");
const OUT = process.env.OUT || path.join(homedir(), "Desktop", "ouro-play.mov");

const ffmpeg =
  path.join(ROOT, "node_modules", "ffmpeg-static", "ffmpeg") +
  (process.platform === "win32" ? ".exe" : "");

if (!fs.existsSync(ffmpeg)) {
  console.error("Missing ffmpeg-static. Run: npm install");
  process.exit(1);
}

if (!fs.existsSync(IN)) {
  console.error("Missing:", IN);
  process.exit(1);
}

/** ~21 Mbps strict CBR for 8 s ⇒ ~21 MiB raw stream (≈20 MiB on disk incl. mux slack). x264 needs even dimensions. */
const args = [
  "-y",
  "-hide_banner",
  "-loglevel",
  "error",
  "-i",
  IN,
  "-vf",
  "fps=30,scale=628:352:flags=lanczos,format=yuv420p",
  "-c:v",
  "libx264",
  "-preset",
  "veryfast",
  "-b:v",
  "21M",
  "-minrate",
  "21M",
  "-maxrate",
  "21M",
  "-bufsize",
  "10M",
  "-x264-params",
  "nal-hrd=cbr:force-cfr=1",
  "-an",
  "-movflags",
  "+faststart",
  OUT,
];

const r = spawnSync(ffmpeg, args, { stdio: "inherit" });
if (r.status !== 0) process.exit(r.status ?? 1);
console.log("Wrote", OUT, "(" + fs.statSync(OUT).size + " bytes)");
