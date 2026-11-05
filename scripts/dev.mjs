/**
 * Starts `next dev` from the project's CANONICAL on-disk path.
 *
 * Why this exists: on Windows a shell can hand us the project path with a
 * lowercase drive letter (`d:\...` — VS Code's integrated terminal and cmd.exe
 * both do this). Next's JS side keeps that casing (it normalises with plain
 * fs.realpathSync, which does not fix drive-letter case), while Turbopack's
 * native side sees files at their real `D:\...` path. Turbopack compares paths
 * case-sensitively, so the project's own files stop looking like they are
 * inside the root, and resolution walks to the PARENT folder:
 *
 *   Error: Can't resolve 'tailwindcss' in 'd:\1abc-Personal Projects'
 *   FATAL: An unexpected Turbopack error occurred ... Next.js package not found
 *
 * Left running, the retries climbed until the process hit "JavaScript heap out
 * of memory" and the native allocator failed too — which took the whole laptop
 * down (2026-11-05). Started from `D:\...` the same project is fine.
 *
 * fs.realpathSync.native returns the canonical casing, so every path Next and
 * Turbopack derive from cwd agrees.
 */
import { spawn } from "node:child_process";
import { realpathSync } from "node:fs";
import { createRequire } from "node:module";

const canonical = realpathSync.native(process.cwd());
if (canonical !== process.cwd()) {
  console.log(`[dev] normalised project path casing -> ${canonical}`);
}

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next", { paths: [canonical] });

const child = spawn(process.execPath, [nextBin, "dev", ...process.argv.slice(2)], {
  cwd: canonical,
  stdio: "inherit",
  env: { ...process.env, INIT_CWD: canonical, PWD: canonical },
});

const forward = (sig) => () => child.kill(sig);
process.on("SIGINT", forward("SIGINT"));
process.on("SIGTERM", forward("SIGTERM"));
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
