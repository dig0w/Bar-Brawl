import { FighterEngine } from "./game/engine.js";

const engine = new FighterEngine();
engine.Begin();

let lastTime = performance.now();
let bgWorker = new Worker("game/worker.js");

function DrawLoop() {
    engine.Draw();

    requestAnimationFrame(DrawLoop);
}
requestAnimationFrame(DrawLoop);

bgWorker.onmessage = function (e) {
    if (e.data.action === "TICK") {
        let now = performance.now();
        let deltaTime = (now - lastTime) / 1000;
        lastTime = now;

        if (deltaTime > 0.1) deltaTime = 0.016;

        engine.Tick(deltaTime);
    }
};

bgWorker.postMessage({ action: "START", tickRate: 60 });