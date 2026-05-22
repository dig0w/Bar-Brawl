import { FighterEngine } from "./game/engine.js";

const engine = new FighterEngine();
engine.Begin();

let lastTime = performance.now();
let bgWorker = null;
let rafId = null;

// Tick
function Tick() {
    if (document.visibilityState === "hidden" && engine.isOnline) return;

    let now = performance.now();
    let deltaTime = (now - lastTime) / 1000;
    lastTime = now;

    if (deltaTime > 0.1) deltaTime = 0.016;

    engine.Tick(deltaTime);

    engine.Draw();

    rafId = requestAnimationFrame(Tick);
}

// Start loop
rafId = requestAnimationFrame(Tick);


document.addEventListener("visibilitychange", () => {
    if (!engine.isOnline) return;

    if (document.visibilityState === "hidden") {
        if (rafId) cancelAnimationFrame(rafId);

        if (!bgWorker) {
            bgWorker = new Worker("game/worker.js");

            bgWorker.onmessage = function (e) {
                if (e.data.action === "TICK") {
                    engine.Tick(e.data.deltaTime);

                    if (!engine.isOnline) {
                        if (bgWorker) {
                            bgWorker.postMessage({ action: "STOP" });
                            bgWorker.terminate();
                            bgWorker = null;
                        }

                        if (document.visibilityState === "visible") {
                            cancelAnimationFrame(rafId);
                            lastTime = performance.now();
                            rafId = requestAnimationFrame(Tick);
                        }
                    }
                }
            };
        }

        bgWorker.postMessage({ action: "START", tickRate: FighterEngine.networkTick });
        console.log("Tab hidden. Switched online sync to background worker (32 TPS).");
    } else {
        if (bgWorker) {
            bgWorker.postMessage({ action: "STOP" });
            bgWorker.terminate();
            bgWorker = null;
        }

        lastTime = performance.now();

        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(Tick);
        console.log("Tab focused. Switched back to main graphics loop.");
    }
});