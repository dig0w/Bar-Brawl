import { FighterEngine } from "./engine.js";
import { Fighter } from "./fighter.js";

export class Controller {
    #engine = null;
    #pawn = null;
    #variant = 0;
    #remote = false;

    #keys = {};
    #gamepadIndex = -1;

    #inputs = {
        "MoveLeft":  { pressed: false, released: true, flag:  1, action: null },
        "MoveRight": { pressed: false, released: true, flag:  2, action: null },
        "Jump":      { pressed: false, released: true, flag:  4, action: () => this.#pawn.Jump() },
        "Crouch":    { pressed: false, released: true, flag:  8, action: null },
        "Punch":     { pressed: false, released: true, flag: 16, action: () => this.#pawn.Punch() },
        "Kick":      { pressed: false, released: true, flag: 32, action: () => this.#pawn.Kick() },
        "Block":     { pressed: false, released: true, flag: 64, action: null },
        "Pause":     { pressed: false, released: true, flag: -1, action: null }
    };

    static maxInputsSequence = 10;
    #sequence = [];
    #sequenceCombos = [
        { sequence: ["Jump", "Jump", "MoveLeft", "MoveLeft", "MoveRight", "MoveRight"], action: () => {
            if (this.#pawn.bodyImg != Fighter.bodyImg2) {
                this.#pawn.ChangeBodyImg(Fighter.bodyImg2);
                this.#engine.PlaySound(0, 2, 1.5);
            }
        } }
    ];

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

        // Move: Left/Right on D-Pad/Stick
        this.#inputs.MoveLeft.pressed ||= (leftStickX < -deadzone || buttons[14]?.pressed);
        this.#inputs.MoveRight.pressed ||= (leftStickX > deadzone || buttons[15]?.pressed);

        // Jump: Up on D-Pad/Stick OR the Bottom Button
        this.#inputs.Jump.pressed ||= (buttons[0].pressed || buttons[12]?.pressed || axes[1] < -deadzone);
        // Crouch: Down on D-Pad/Stick
        this.#inputs.Crouch.pressed ||= (buttons[13]?.pressed || leftStickY > deadzone);

        // Punch: West Button
        this.#inputs.Punch.pressed ||= buttons[2].pressed;
        // Kick: Up Button
        this.#inputs.Kick.pressed ||= buttons[3].pressed;
        // Block: Shoulders or Triggers
        this.#inputs.Block.pressed ||= (buttons[4].pressed || buttons[5].pressed || buttons[6].pressed || buttons[7].pressed);

        // Pause: Start button
        this.#inputs.Pause.pressed ||= buttons[9].pressed;
    }

    ReadInputs() {
        if (this.#remote) return;

        switch (this.#variant) {
            case 0:
                this.#inputs.MoveLeft.pressed = this.#keys["KeyA"];
                this.#inputs.MoveRight.pressed = this.#keys["KeyD"];
                this.#inputs.Jump.pressed = this.#keys["KeyW"];
                this.#inputs.Crouch.pressed = this.#keys["KeyS"];
                this.#inputs.Punch.pressed = this.#keys["KeyR"];
                this.#inputs.Kick.pressed = this.#keys["KeyT"];
                this.#inputs.Block.pressed = this.#keys["KeyY"];
                break;
            case 1:
                this.#inputs.MoveLeft.pressed = this.#keys["ArrowLeft"];
                this.#inputs.MoveRight.pressed = this.#keys["ArrowRight"];
                this.#inputs.Jump.pressed = this.#keys["ArrowUp"];
                this.#inputs.Crouch.pressed = this.#keys["ArrowDown"];
                this.#inputs.Punch.pressed = this.#keys["KeyK"];
                this.#inputs.Kick.pressed = this.#keys["KeyL"];
                this.#inputs.Block.pressed = this.#keys["Semicolon"];
                break;
            case 2:
                this.#inputs.MoveLeft.pressed = this.#keys["KeyA"] || this.#keys["ArrowLeft"];
                this.#inputs.MoveRight.pressed = this.#keys["KeyD"] || this.#keys["ArrowRight"];
                this.#inputs.Jump.pressed = this.#keys["KeyW"] || this.#keys["ArrowUp"];
                this.#inputs.Crouch.pressed = this.#keys["KeyS"] || this.#keys["ArrowDown"];
                this.#inputs.Punch.pressed = this.#keys["KeyR"] || this.#keys["KeyK"];
                this.#inputs.Kick.pressed = this.#keys["KeyT"] || this.#keys["KeyL"];
                this.#inputs.Block.pressed = this.#keys["KeyY"] || this.#keys["Semicolon"];
                break;
        }

        this.#inputs.Pause.pressed = this.#keys["Escape"];
        this.#pollGamepad();

        if (this.#inputs.Pause.pressed && this.#inputs.Pause.released) {
            this.#inputs.Pause.released = false;
            if (!(this.#engine.gameMode === "VERSUS_LOCAL" && this.#variant == 1)) { // Avoids both controllers calling
                if (this.#engine.gamePaused) this.#engine.Resume();
                else this.#engine.Pause();
            }
        } else if (!this.#inputs.Pause.pressed) {
            this.#inputs.Pause.released = true;
        }
    }

    GetInputMask() {
        let mask = 0;

        for (const [name, input] of Object.entries(this.#inputs)) {
            if (input.flag <= 0) continue;

            if (input.pressed) mask |= input.flag;
        }

        return mask;
    }

    ApplyMask(mask) {
        let moveDir = 0;
        if ((mask & this.#inputs.MoveLeft.flag) !== 0) moveDir -= 1;
        if ((mask & this.#inputs.MoveRight.flag) !== 0) moveDir += 1;
        this.#pawn.moveInput = moveDir;

        let sequenceUpdated = false;

        for (const [name, input] of Object.entries(this.#inputs)) {
            if (input.flag <= 0) continue;

            const isActive = (mask & input.flag) !== 0;

            if (isActive && input.released) {
                input.released = false;
                this.#pushToSequence(name);
                sequenceUpdated = true;

                if (input.action) input.action();
            } else if (!isActive) {
                input.released = true;
            }
        }

        this.#pawn.SetCrouching((mask & this.#inputs.Crouch.flag) !== 0);
        this.#pawn.SetBlocking((mask & this.#inputs.Block.flag) !== 0);

        if (sequenceUpdated) {
            for (const combo of this.#sequenceCombos) {
                const len = combo.sequence.length;
                if (this.#sequence.length < len) continue;

                const recentInputs = this.#sequence.slice(-len);
                const matches = combo.sequence.every((input, index) => input === recentInputs[index]);

                if (matches) {
                    if (combo.action) combo.action();

                    this.ClearSequence();
                    break;
                }
            }
        }
    }

    // Queue Management
    QueueInput(frame, mask) { this.#inputQueue.set(frame, mask); }
    GetInputForFrame(frame) { return this.#inputQueue.get(frame); }
    ClearInput(frame) { this.#inputQueue.delete(frame); }
    ClearAllInputs() { this.#inputQueue.clear(); }

    // Sequence Management
    ClearSequence() { this.#sequence = []; }

    #pushToSequence(inputName) {
        this.#sequence.push(inputName);
        if (this.#sequence.length > Controller.maxInputsSequence) {
            this.#sequence.shift();
        }
    }

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

    Reset() {
        this.#keys = {};

        for (const [name, input] of Object.entries(this.#inputs)) {
            input.released = true;
        }

        this.#sequence = [];
        this.#pawn.moveInput = 0;
    }
}