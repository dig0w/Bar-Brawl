import { FighterEngine } from "./game/engine.js";

const engine = new FighterEngine();
engine.Begin();

// Tick
let lastTime = performance.now();
function Tick() {
    let now = performance.now();
    let deltaTime = (now - lastTime) / 1000;
    lastTime = now;

    if (deltaTime > 0.1) deltaTime = 0.016;

    engine.Tick(deltaTime);

    engine.Draw();

    requestAnimationFrame(Tick);
}

// Start loop
requestAnimationFrame(Tick);