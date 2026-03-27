import { FighterEngine } from "./engine.js";
import { Fighter } from "./fighter.js";

export class Controller {
    #engine = null;
    #pawn = null;

    #keys = {};
    #jumpReleased = false;
    #punchReleased = false;

    constructor(engine, pawn) {
        if (!(engine instanceof FighterEngine))
            throw new Error(`${this.constructor.name} requires a ${FighterEngine.name} instance.`);
        if (!(pawn instanceof Fighter))
            throw new Error(`${this.constructor.name} requires a ${Fighter.name} instance.`);

        this.#engine = engine;
        this.#pawn = pawn;
    }

    Begin() {
        window.addEventListener("keydown", (e) => this.#keys[e.code] = true);
        window.addEventListener("keyup", (e) => this.#keys[e.code] = false);
    }

    Tick(deltaTime) {
        let moveDir = 0;
        if (this.#keys["ArrowLeft"] || this.#keys["KeyA"]) moveDir -= 1;
        if (this.#keys["ArrowRight"] || this.#keys["KeyD"]) moveDir += 1;
        this.#pawn.moveInput = moveDir;

        if ((this.#keys["ArrowUp"] || this.#keys["KeyW"]) && this.#jumpReleased) {
            this.#jumpReleased = false;
            this.#pawn.Jump();
        } else if (!(this.#keys["ArrowUp"] || this.#keys["KeyW"])) {
            this.#jumpReleased = true;
        }

        if (this.#keys["Space"] && this.#punchReleased) {
            this.#punchReleased = false;
            this.#pawn.Punch();
        } else if (!this.#keys["Space"]) {
            this.#punchReleased = true;
        }
    }

    Draw() { }
}