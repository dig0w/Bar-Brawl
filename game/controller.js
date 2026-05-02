import { FighterEngine } from "./engine.js";
import { Fighter } from "./fighter.js";

export class Controller {
    #engine = null;
    #pawn = null;
    #variant = 0;
    #remote = false;

    #keys = {};
    #jumpReleased = true;
    #punchReleased = true;
    #pauseReleased = true;

    inputs = {
        "MoveLeft": false,
        "MoveRight": false,
        "Jump": false,
        "Punch": false,
        "Block": false,
        "Pause": false
    };

    #networkLatch = 0;

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

    get pawn() { return this.#pawn }

    Begin() {
        if (this.#remote) return;
        window.addEventListener("keydown", (e) => this.#keys[e.code] = true);
        window.addEventListener("keyup", (e) => this.#keys[e.code] = false);
    }

    Tick(deltaTime) {
        if (!(this.#engine.gameState === "FIGHTING" || (this.#engine.gameState === "PAUSED" && this.#engine.isOnline && this.#remote))) return;

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

            this.inputs.Pause = this.#keys["Escape"];
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

        if (this.inputs.Punch) this.#networkLatch |= 1;
        if (this.inputs.Block) this.#networkLatch |= 2;

        if (this.inputs.Pause && this.#pauseReleased) {
            this.#pauseReleased = false;
            this.#engine.SetGameState(6);
        } else if (!this.inputs.Pause) {
            this.#pauseReleased = true;
        }
    }

    Draw(ctx) { }

    Reset() {
        this.#keys = {};
        this.#jumpReleased = true;
        this.#punchReleased = true;
        this.#pauseReleased = true;

        this.#pawn.moveInput = 0;
    }

    GetInputMask() {
        const mask = this.#networkLatch;
        this.#networkLatch = 0; 
        return mask;
    }

    SetInputMask(mask) {
        this.inputs.Punch = (mask & 1) !== 0;
        this.inputs.Block = (mask & 2) !== 0;
    }
}