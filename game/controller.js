import { FighterEngine } from "./engine.js";
import { Fighter } from "./fighter.js";

export class Controller {
    #engine = null;
    #pawn = null;
    #variant = 0;
    #remote = false;

    #keys = {};
    #gamepadIndex = -1;
    #jumpReleased = true;
    #punchReleased = true;
    #pauseReleased = true;

    #inputs = { "MoveLeft": false, "MoveRight": false, "Jump": false, "Punch": false, "Block": false, "Pause": false };

    static delayFrames = 3;
    #inputQueue = new Map();

    constructor(engine, pawn, variant = 0, gamepadIndex = -1, remote = false) {
        if (!(engine instanceof FighterEngine))
            throw new Error(`${this.constructor.name} requires a ${FighterEngine.name} instance.`);
        if (!(pawn instanceof Fighter))
            throw new Error(`${this.constructor.name} requires a ${Fighter.name} instance.`);

        this.#engine = engine;
        this.#pawn = pawn;
        this.#variant = variant;

        this.#gamepadIndex = gamepadIndex;

        this.#remote = remote;
    }

    get pawn() { return this.#pawn }
    get isRemote() { return this.#remote }

    Begin() {
        if (this.#remote) return;
        window.addEventListener("keydown", (e) => this.#keys[e.code] = true);
        window.addEventListener("keyup", (e) => this.#keys[e.code] = false);
    }

    #pollGamepad() {
        if (this.#gamepadIndex === -1) return;
        const gp = navigator.getGamepads()[this.#gamepadIndex];
        if (!gp) return;

        // Standard Gamepad Mapping (Xbox/PlayStation/General)
        // Buttons: 0=A/X, 1=B/Circle, 2=X/Square, 3=Y/Triangle, 9=Start
        const buttons = gp.buttons;
        const axes = gp.axes;
        const deadzone = 0.5;

        const leftStickX = axes[0];

        this.#inputs.MoveLeft ||= (leftStickX < -deadzone || buttons[14]?.pressed);
        this.#inputs.MoveRight ||= (leftStickX > deadzone || buttons[15]?.pressed);

        // Jump: Up on D-Pad/Stick OR the Bottom Button (A/X)
        this.#inputs.Jump ||= (buttons[0].pressed || buttons[12]?.pressed || axes[1] < -deadzone);

        // Punch: West Button (X on Xbox, Square on PS)
        this.#inputs.Punch ||= buttons[2].pressed;

        // Block: Shoulders (L1/R1) or Triggers
        this.#inputs.Block ||= (buttons[4].pressed || buttons[5].pressed || buttons[6].pressed || buttons[7].pressed);

        // Pause: Start button
        this.#inputs.Pause ||= buttons[9].pressed;
    }

    ReadInputs() {
        if (this.#remote) return;

        switch (this.#variant) {
            case 0:
                this.#inputs.MoveLeft = this.#keys["KeyA"];
                this.#inputs.MoveRight = this.#keys["KeyD"];
                this.#inputs.Jump = this.#keys["KeyW"];
                this.#inputs.Punch = this.#keys["KeyR"];
                this.#inputs.Block = this.#keys["KeyT"];
                break;
            case 1:
                this.#inputs.MoveLeft = this.#keys["ArrowLeft"];
                this.#inputs.MoveRight = this.#keys["ArrowRight"];
                this.#inputs.Jump = this.#keys["ArrowUp"];
                this.#inputs.Punch = this.#keys["KeyK"];
                this.#inputs.Block = this.#keys["KeyL"];
                break;
            case 2:
                this.#inputs.MoveLeft = this.#keys["KeyA"] || this.#keys["ArrowLeft"];
                this.#inputs.MoveRight = this.#keys["KeyD"] || this.#keys["ArrowRight"];
                this.#inputs.Jump = this.#keys["KeyW"] || this.#keys["ArrowUp"];
                this.#inputs.Punch = this.#keys["KeyR"] || this.#keys["KeyK"];
                this.#inputs.Block = this.#keys["KeyT"] || this.#keys["KeyL"];
                break;
        }

        this.#inputs.Pause = this.#keys["Escape"];
        this.#pollGamepad();

        if (this.#inputs.Pause && this.#pauseReleased) {
            this.#pauseReleased = false;
            if (!(this.#engine.gameMode === "VERSUS_LOCAL" && this.#variant == 1)) { // Avoids both controllers calling
                if (this.#engine.gamePaused) this.#engine.Resume();
                else this.#engine.Pause();
            }
        } else if (!this.#inputs.Pause) {
            this.#pauseReleased = true;
        }
    }

    GetInputMask() {
        let mask = 0;
        if (this.#inputs.MoveLeft) mask |= 1;
        if (this.#inputs.MoveRight) mask |= 2;
        if (this.#inputs.Jump) mask |= 4;
        if (this.#inputs.Punch) mask |= 8;
        if (this.#inputs.Block) mask |= 16;
        return mask;
    }

    ApplyMask(mask) {
        let moveDir = 0;
        if ((mask & 1) !== 0) moveDir -= 1;
        if ((mask & 2) !== 0) moveDir += 1;
        this.#pawn.moveInput = moveDir;

        const isJumping = (mask & 4) !== 0;
        if (isJumping && this.#jumpReleased) {
            this.#jumpReleased = false;
            this.#pawn.Jump();
        } else if (!isJumping) {
            this.#jumpReleased = true;
        }

        const isPunching = (mask & 8) !== 0;
        if (isPunching && this.#punchReleased) {
            this.#punchReleased = false;
            this.#pawn.Punch();
        } else if (!isPunching) {
            this.#punchReleased = true;
        }

        this.#pawn.SetBlocking((mask & 16) !== 0);
    }

    // Queue Management
    QueueInput(frame, mask) { this.#inputQueue.set(frame, mask); }
    GetInputForFrame(frame) { return this.#inputQueue.get(frame); }
    ClearInput(frame) { this.#inputQueue.delete(frame); }
    ClearAllInputs() { this.#inputQueue.clear(); }

    // Instant execution for OFFLINE modes
    Tick(deltaTime) {
        if (!this.#remote) {
            this.ReadInputs();
            if (!(this.#engine.gameState === "FIGHTING" || (this.#engine.gamePaused && this.#engine.isOnline && this.#remote))) {
                this.#pawn.moveInput = 0;
                this.#pawn.SetBlocking(false);
                return;
            }
            this.ApplyMask(this.GetInputMask());
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
}