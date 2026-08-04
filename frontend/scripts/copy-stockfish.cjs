// Vendors the Stockfish WASM engine into public/ so it's servable as a
// plain static file (a Web Worker loads it by URL - see docs/adr - it
// can't be bundled by Vite like a normal import). Runs as postinstall so
// it's reproduced by `npm ci`/`npm install` everywhere (Docker build, CI,
// local dev) rather than committing a ~7MB binary to git.
const fs = require("fs");
const path = require("path");

const ENGINE_BASENAME = "stockfish-18-lite-single";
const SRC_DIR = path.join(__dirname, "..", "node_modules", "stockfish", "bin");
const DEST_DIR = path.join(__dirname, "..", "public", "stockfish");

fs.mkdirSync(DEST_DIR, { recursive: true });

for (const ext of [".js", ".wasm"]) {
  const src = path.join(SRC_DIR, ENGINE_BASENAME + ext);
  const dest = path.join(DEST_DIR, ENGINE_BASENAME + ext);
  fs.copyFileSync(src, dest);
}

console.log(`Vendored Stockfish engine (${ENGINE_BASENAME}) into public/stockfish/`);
