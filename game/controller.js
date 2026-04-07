import { FighterEngine } from "./engine.js";
import { Fighter } from "./fighter.js";

export class Controller {
    #engine = null;
    #pawn = null;
    #variant = 0;

    #keys = {};
    #jumpReleased = false;
    #punchReleased = false;
    #blockReleased = false

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
        let inputs = {
            "MoveLeft": false,
            "MoveRight": false,
            "Jump": false,
            "Crouch": false,
            "Punch": false,
            "Block": false,
        };

        switch (this.#variant) {
            case 0:
                inputs.MoveLeft = this.#keys["KeyA"];
                inputs.MoveRight = this.#keys["KeyD"];
                inputs.Jump = this.#keys["KeyW"];
                inputs.Crouch = this.#keys["KeyS"];
                inputs.Punch = this.#keys["KeyE"];
                inputs.Block = this.#keys["KeyF"];
                break;
            case 1:
                inputs.MoveLeft = this.#keys["KeyJ"];
                inputs.MoveRight = this.#keys["KeyK"];
                inputs.Jump = this.#keys["KeyI"];
                inputs.Crouch = this.#keys["KeyL"];
                inputs.Punch = this.#keys["KeyU"];
                inputs.Block = this.#keys["KeyH"];
                break;
        }

        let moveDir = 0;
        if (inputs.MoveLeft) moveDir -= 1;
        if (inputs.MoveRight) moveDir += 1;
        this.#pawn.moveInput = moveDir;

        if (inputs.Jump && this.#jumpReleased) {
            this.#jumpReleased = false;
            this.#pawn.Jump();
        } else if (!inputs.Jump) {
            this.#jumpReleased = true;
        }

        if (inputs.Punch && this.#punchReleased) {
            this.#punchReleased = false;
            this.#pawn.Punch();
        } else if (!inputs.Punch) {
            this.#punchReleased = true;
        }

        this.#pawn.SetBlocking(inputs.Block);
    }

    Draw() { }
}