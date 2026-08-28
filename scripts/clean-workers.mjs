/**
 * Reaps leftover Next.js/Turbopack dev processes for THIS project before
 * `next dev` starts.
 *
 * Why this exists: Turbopack spawns a `.next/dev/build/postcss.js` worker per
 * dev run. When a dev server is interrupted (IDE closed, task killed, crash)
 * its `start-server.js` and that worker can survive. Nothing ever reaps them,
 * so they accumulate across runs — this machine reached 279 stranded workers
 * holding ~1 GB, which pushed the system into swap and froze the laptop,
 * taking the IDE down with it.
 *
 * Safety: only processes whose command line points at THIS project directory
 * are considered, so other projects' dev servers and unrelated node processes
 * are never touched. This runs as `predev`, before any server of ours exists.
 */
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

if (process.platform !== "win32") {
  process.exit(0);
}

// Match on this project's own path so we never touch another project's server.
const projectDir = resolve(process.cwd());
const escapedDir = projectDir.split("'").join("''");

const ps = [
  "$ErrorActionPreference = 'SilentlyContinue'",
  "$dir = '" + escapedDir + "'",
  "$me = $PID",
  "$procs = Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Where-Object {",
  "  $_.CommandLine -and",
  "  $_.CommandLine.Contains($dir) -and",
  "  ($_.CommandLine.Contains('postcss.js') -or $_.CommandLine.Contains('start-server.js')) -and",
  "  $_.ProcessId -ne $me",
  "}",
  "$n = 0",
  "foreach ($p in $procs) {",
  "  try { Stop-Process -Id $p.ProcessId -Force -ErrorAction Stop; $n++ } catch {}",
  "}",
  "Write-Output $n",
].join("\n");

try {
  const out = execFileSync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", ps],
    { encoding: "utf8", timeout: 30000 }
  ).trim();

  const killed = Number.parseInt(out, 10);
  if (Number.isFinite(killed) && killed > 0) {
    console.log(`[clean-workers] reaped ${killed} stale dev process(es)`);
  }
} catch {
  // Never block `npm run dev` on cleanup failure.
}
