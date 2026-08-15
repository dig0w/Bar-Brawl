import { FighterEngine } from "./game/game.min.js";

const fixedDeltaTime = 1 / 60;

const engine = new FighterEngine();
engine.Begin();

function DrawLoop() {
    engine.Draw();

    requestAnimationFrame(DrawLoop);
}
requestAnimationFrame(DrawLoop);


let bgWorker = new Worker("game/worker.js");

bgWorker.onmessage = function (e) {
    if (e.data.action === "TICK") {
        engine.Tick(fixedDeltaTime);
    }
};

bgWorker.postMessage({ action: "START", tickRate: 60 });