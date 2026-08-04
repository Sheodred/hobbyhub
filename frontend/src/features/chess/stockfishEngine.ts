export interface StockfishEngine {
  getBestMove(fen: string, depth: number): Promise<string>;
  terminate(): void;
}

// The engine communicates over the UCI text protocol via postMessage - see
// https://github.com/nmrugg/stockfish.js. Vendored as a static file (see
// scripts/copy-stockfish.js) since a Web Worker loads it by URL, not as a
// bundled module.
export function createStockfishEngine(): StockfishEngine {
  const worker = new Worker("/stockfish/stockfish-18-lite-single.js");
  let readyPromise: Promise<void> | null = null;

  function ensureReady(): Promise<void> {
    if (!readyPromise) {
      readyPromise = new Promise((resolve) => {
        function onMessage(event: MessageEvent<string>) {
          if (event.data === "readyok") {
            worker.removeEventListener("message", onMessage);
            resolve();
          }
        }
        worker.addEventListener("message", onMessage);
        worker.postMessage("uci");
        worker.postMessage("isready");
      });
    }
    return readyPromise;
  }

  async function getBestMove(fen: string, depth: number): Promise<string> {
    await ensureReady();
    return new Promise((resolve) => {
      function onMessage(event: MessageEvent<string>) {
        const line = event.data;
        if (typeof line === "string" && line.startsWith("bestmove")) {
          worker.removeEventListener("message", onMessage);
          resolve(line.split(" ")[1]);
        }
      }
      worker.addEventListener("message", onMessage);
      worker.postMessage(`position fen ${fen}`);
      worker.postMessage(`go depth ${depth}`);
    });
  }

  function terminate() {
    worker.terminate();
  }

  return { getBestMove, terminate };
}
