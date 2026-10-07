import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const wranglerCli = fileURLToPath(
  import.meta.resolve("wrangler/bin/wrangler.js"),
);

function runWrangler(args) {
  const result = spawnSync(process.execPath, [wranglerCli, ...args], {
    cwd: projectRoot,
    stdio: "inherit",
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

runWrangler([
  "d1",
  "migrations",
  "apply",
  "DB",
  "--remote",
  "--config",
  "cloudflare/wrangler.jsonc",
]);

// The Cloudflare Vite build writes .wrangler/deploy/config.json so Wrangler
// selects the generated Worker bundle and client assets automatically.
runWrangler(["deploy"]);
