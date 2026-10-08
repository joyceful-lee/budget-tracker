// Regenerates assets/sprites/*.png from the vector art in tools/sprite-art.js.
// Usage: node tools/build-sprites.mjs [path-to-chrome-or-edge]
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const browsers = [
  process.argv[2],
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium"
].filter(Boolean);
const browser = browsers.find((p) => existsSync(p));
if (!browser) throw new Error("No Chrome or Edge found; pass its path as the first argument.");

const page = pathToFileURL(join(root, "tools", "sprite-builder.html")).href;
const dom = execFileSync(browser, [
  "--headless=new",
  "--disable-gpu",
  "--allow-file-access-from-files",
  "--virtual-time-budget=60000",
  "--dump-dom",
  page
], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

const match = dom.match(/<pre id="out">([^<]+)<\/pre>/);
if (!match) throw new Error("Sprite builder produced no output:\n" + (dom.match(/<p id="status">[^<]*/) || [dom.slice(0, 500)])[0]);

const sprites = JSON.parse(match[1]);
const outDir = join(root, "assets", "sprites");
mkdirSync(outDir, { recursive: true });
for (const [name, url] of Object.entries(sprites)) {
  writeFileSync(join(outDir, name + ".png"), Buffer.from(url.split(",")[1], "base64"));
}
console.log("Wrote " + Object.keys(sprites).length + " sprites to assets/sprites");
