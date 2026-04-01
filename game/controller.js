import { FighterEngine } from "./engine.js";
import { Fighter } from "./fighter.js";

export class Controller {
    #engine = null;
    #pawn = null;
    #variant = 0;

    #keys = {};
    #jumpReleased = false;
    #punchReleased = false;

    constructor(engine, pawn, variant = 0) {
        if (!(engine instanceof FighterEngine))
            throw new Error(`${this.constructor.name} requires a ${FighterEngine.name} instance.`);
        if (!(pawn instanceof Fighter))
            throw new Error(`${this.constructor.name} requires a ${Fighter.name} instance.`);

        this.#engine = engine;
        this.#pawn = pawn;
        this.#variant = variant;
    }

    Begin() {
        window.addEventListener("keydown", (e) => this.#keys[e.code] = true);
        window.addEventListener("keyup", (e) => this.#keys[e.code] = false);
    }

    Tick(deltaTime) {
        let moveDir = 0;

        switch (this.#variant) {
            case 0:
                if (this.#keys["KeyA"]) moveDir -= 1;
                if (this.#keys["KeyD"]) moveDir += 1;
                this.#pawn.moveInput = moveDir;

                if (this.#keys["KeyW"] && this.#jumpReleased) {
                    this.#jumpReleased = false;
                    this.#pawn.Jump();
                } else if (!this.#keys["KeyW"]) {
                    this.#jumpReleased = true;
                }

                // if (this.#keys["Space"] && this.#punchReleased) {
                //     this.#punchReleased = false;
                //     this.#pawn.Punch();
                // } else if (!this.#keys["Space"]) {
                //     this.#punchReleased = true;
                // }
                break;
            case 1:
                if (this.#keys["ArrowLeft"]) moveDir -= 1;
                if (this.#keys["ArrowRight"]) moveDir += 1;
                this.#pawn.moveInput = moveDir;

                if (this.#keys["ArrowUp"] && this.#jumpReleased) {
                    this.#jumpReleased = false;
                    this.#pawn.Jump();
                } else if (!this.#keys["ArrowUp"]) {
                    this.#jumpReleased = true;
                }

                // if (this.#keys["Space"] && this.#punchReleased) {
                //     this.#punchReleased = false;
                //     this.#pawn.Punch();
                // } else if (!this.#keys["Space"]) {
                //     this.#punchReleased = true;
                // }
                break;
        }
    }

    Draw() { }
}