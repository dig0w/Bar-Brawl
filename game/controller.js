import { FighterEngine } from "./engine.js";
import { Fighter } from "./fighter.js";

export class Controller {
    #engine = null;
    #pawn = null;
    #variant = 0;
    #remote = false;

    #keys = {};
    #jumpReleased = false;
    #punchReleased = false;

    inputs = {
        "MoveLeft": false,
        "MoveRight": false,
        "Jump": false,
        "Punch": false,
        "Block": false,
    };

    constructor(engine, pawn, variant = 0, remote = false) {
        if (!(engine instanceof FighterEngine))
            throw new Error(`${this.constructor.name} requires a ${FighterEngine.name} instance.`);
        if (!(pawn instanceof Fighter))
            throw new Error(`${this.constructor.name} requires a ${Fighter.name} instance.`);

        this.#engine = engine;
        this.#pawn = pawn;
        this.#variant = variant;

        this.#remote = remote;
    }

    Begin() {
        if (this.#remote) return;
        window.addEventListener("keydown", (e) => this.#keys[e.code] = true);
        window.addEventListener("keyup", (e) => this.#keys[e.code] = false);
    }

    Tick(deltaTime) {
        if (this.#engine.gameState !== "FIGHTING") return;

        if (!this.#remote) {
            switch (this.#variant) {
                case 0:
                    this.inputs.MoveLeft = this.#keys["KeyA"];
                    this.inputs.MoveRight = this.#keys["KeyD"];
                    this.inputs.Jump = this.#keys["KeyW"];
                    this.inputs.Punch = this.#keys["KeyR"];
                    this.inputs.Block = this.#keys["KeyT"];
                    break;
                case 1:
                    this.inputs.MoveLeft = this.#keys["ArrowLeft"];
                    this.inputs.MoveRight = this.#keys["ArrowRight"];
                    this.inputs.Jump = this.#keys["ArrowUp"];
                    this.inputs.Punch = this.#keys["KeyK"];
                    this.inputs.Block = this.#keys["KeyL"];
                    break;
                case 2:
                    this.inputs.MoveLeft = this.#keys["KeyA"] || this.#keys["ArrowLeft"];
                    this.inputs.MoveRight = this.#keys["KeyD"] || this.#keys["ArrowRight"];
                    this.inputs.Jump = this.#keys["KeyW"] || this.#keys["ArrowUp"];
                    this.inputs.Punch = this.#keys["KeyR"] || this.#keys["KeyK"];
                    this.inputs.Block = this.#keys["KeyT"] || this.#keys["KeyL"];
                    break;
            }
        }

        let moveDir = 0;
        if (this.inputs.MoveLeft) moveDir -= 1;
        if (this.inputs.MoveRight) moveDir += 1;
        this.#pawn.moveInput = moveDir;

        if (this.inputs.Jump && this.#jumpReleased) {
            this.#jumpReleased = false;
            this.#pawn.Jump();
        } else if (!this.inputs.Jump) {
            this.#jumpReleased = true;
        }

        if (this.inputs.Punch && this.#punchReleased) {
            this.#punchReleased = false;
            this.#pawn.Punch();
        } else if (!this.inputs.Punch) {
            this.#punchReleased = true;
        }

        this.#pawn.SetBlocking(this.inputs.Block);
    }

    Draw(ctx) { }

    Reset() {
        this.#keys = {};
        this.#jumpReleased = false;
        this.#punchReleased = false;

        this.#pawn.moveInput = 0;
    }

    GetInputMask() {
        let mask = 0;
        if (this.inputs.MoveLeft) mask |= 1;
        if (this.inputs.MoveRight) mask |= 2;
        if (this.inputs.Jump) mask |= 4;
        if (this.inputs.Punch) mask |= 8;
        if (this.inputs.Block) mask |= 16;

        return mask;
    }

    SetInputMask(mask) {
        this.inputs.MoveLeft = (mask & 1) !== 0;
        this.inputs.MoveRight = (mask & 2) !== 0;
        this.inputs.Jump = (mask & 4) !== 0;
        this.inputs.Punch = (mask & 8) !== 0;
        this.inputs.Block = (mask & 16) !== 0;
    }
}