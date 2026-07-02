import { FighterEngine } from "./engine.js";

export class Menu {
    #engine = null;

    #keys = {};
    #lastKeys = {};

    #mouse = { x: 0, y: 0 };
    #mouseHovering = false;

    #gamepadKeys = {};
    #lastGamepadBtns = {};
    #stickThreshold = 0.5;
    #cooldown = 0;

    static logoImage = Object.assign(new Image(), { src: "assets/logo.png" });

    static menusOptions = [
        ["START", "VERSUS"],
        ["LOCAL", "ONLINE", "BACK"],
        ["HOST", "JOIN", "BACK"],
        ["cCODE", "BACK"],
        ["iCODE", "BACK"],
        ["AAA", "BBB", "CCC", "BACK"],
        ["RESUME", "QUIT"],
    ];
    #menuIndex = 0;
    #options = ["START", "VERSUS"];
    #selectedIndex = 0;
    #canSelect = true;

    static optionsSize = 8;
    static optionsMargin = 4;
    static optionsWidth = 32;
    #optionsStartY;
    #optionsXpos;

    static defaultCopyTimer = .3;
    #copyTimer = 0;

    #inputString = "";
    #isInputActive = false;

    static defaultFadeTimer = .1;
    #fadeAlpha = 1;
    fadeTimer = 0;
    fadeDirection = 0; // 1 = fade to, -1 = fade from, 0 = none

    constructor(engine) {
        if (!(engine instanceof FighterEngine))
            throw new Error(`${this.constructor.name} requires a ${FighterEngine.name} instance.`);

        this.#engine = engine;

        this.#optionsStartY = this.#engine.canvas.height / 1.7;
        this.#optionsXpos = this.#engine.canvas.width / 2;
    }

    Begin() {
        window.addEventListener("keydown", (e) => this.#keys[e.code] = true);
        window.addEventListener("keyup", (e) => this.#keys[e.code] = false);

        this.#engine.canvas.addEventListener("mousemove", (e) => {
            const rect = this.#engine.canvas.getBoundingClientRect();

            this.#mouse.x = (e.clientX - rect.left) / (rect.width / this.#engine.canvas.width);
            this.#mouse.y = (e.clientY - rect.top) / (rect.height / this.#engine.canvas.height);
        });

        this.#engine.canvas.addEventListener("mousedown", () => {
            if (this.#mouseHovering) this.#handleSelection();
        });

        window.addEventListener("keydown", (e) => {
            if (!this.#isInputActive) return;

            if (e.key === "Enter") {
                this.#isInputActive = false;

                if(this.#inputString.length === 5) this.#engine.Join(this.#inputString);
            } else if (e.key === "Backspace") {
                this.#inputString = this.#inputString.slice(0, -1);
            } else if (e.key.length === 1 && this.#inputString.length < 5) {
                if (/[a-zA-Z0-9]/.test(e.key)) {
                    this.#inputString += e.key.toUpperCase();
                }
            }
        });

        window.addEventListener("paste", (e) => {
            if (!this.#isInputActive) return;

            const pasteData = (e.clipboardData || window.clipboardData).getData("text");
            this.#inputString = this.#inputString.slice(0, -1);
            
            const cleanPaste = pasteData.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
            const spaceLeft = 5 - this.#inputString.length;
            if (spaceLeft > 0) {
                this.#inputString += cleanPaste.substring(0, spaceLeft);
            }

            e.preventDefault();
        });
    }

    #isPressed(keyCode, gpBtn) { return (this.#keys[keyCode] && !this.#lastKeys[keyCode]) || (this.#gamepadKeys[gpBtn] && !this.#lastGamepadBtns[gpBtn]); }

    #pollGamepad() {
        const gp = navigator.getGamepads()[0];
        if (!gp) return;

        this.#gamepadKeys = {};

        if (gp.buttons[12].pressed) this.#gamepadKeys["UP"] = true;
        if (gp.buttons[13].pressed) this.#gamepadKeys["DOWN"] = true;
        if (gp.buttons[0].pressed) this.#gamepadKeys["CONFIRM"] = true;
        if (gp.buttons[1].pressed) this.#gamepadKeys["BACK"] = true;
        if (gp.buttons[9].pressed) this.#gamepadKeys["BACK"] = true;

        if (this.#cooldown <= 0) {
            if (gp.axes[1] < -this.#stickThreshold) {
                this.#gamepadKeys["UP"] = true;
                this.#cooldown = 0.2;
            } else if (gp.axes[1] > this.#stickThreshold) {
                this.#gamepadKeys["DOWN"] = true;
                this.#cooldown = 0.2;
            }
        } else {
            this.#cooldown -= 0.016;
        }
    }

    Tick(deltaTime) {
        if (this.fadeTimer > 0) {
            this.fadeTimer -= deltaTime;
            if (this.fadeTimer < 0) this.fadeTimer = 0;
        }

        if ((this.#engine.gameState !== "MENU" && !this.#engine.gamePaused) || !this.#canSelect) return;

        this.#pollGamepad();

        if (this.#isPressed("ArrowUp", "UP")) {
            this.#selectedIndex = (this.#selectedIndex - 1 + this.#options.length) % this.#options.length;
        }

        if (this.#isPressed("ArrowDown", "DOWN")) {
            this.#selectedIndex = (this.#selectedIndex + 1) % this.#options.length;
        }

        if (this.#isPressed("Enter", "CONFIRM") || this.#isPressed("Space", "CONFIRM")) {
            this.#handleSelection();
        }

        if (this.#isPressed("Escape", "BACK")) {
            this.Back();
        }

        this.#lastKeys = { ...this.#keys };
        this.#lastGamepadBtns = { ...this.#gamepadKeys };

        this.#mouseHovering = false;
        this.#options.forEach((text, i) => {
            const yPos = this.#optionsStartY + (i * (Menu.optionsSize + Menu.optionsMargin)) + 3;

            if (this.#mouse.x > this.#optionsXpos - Menu.optionsWidth && this.#mouse.x < this.#optionsXpos + Menu.optionsWidth &&
                this.#mouse.y > yPos - 6 && this.#mouse.y < yPos + 6) {
                this.#selectedIndex = i;

                this.#mouseHovering = true;
            }
        });

        if (this.#mouseHovering) {
            this.#engine.canvas.style.cursor = "pointer";

            if (this.#options[this.#selectedIndex].startsWith("i")) this.#engine.canvas.style.cursor = "text";
        } else {
            this.#engine.canvas.style.cursor = "default";
        }

        if (this.#copyTimer > 0) this.#copyTimer -= deltaTime;
    }

    #handleSelection() {
        if ((this.#engine.gameState !== "MENU" && !this.#engine.gamePaused) || !this.#canSelect) return;

        const choice = this.#options[this.#selectedIndex];

        switch (choice) {
            case "START":
                this.StartGame(0, 1);
                break;
            case "VERSUS":
                this.ToMenu(1);
                break;
            case "LOCAL":
                this.StartGame(1);
                break;
            case "ONLINE":
                this.ToMenu(2);
                this.#engine.loadLibs();
                break;
            case "HOST":
                this.#engine.Host();
                this.ToMenu(3);
                break;
            case "cCODE":
                navigator.clipboard.writeText(this.#engine.sessionCode);
                this.#copyTimer = Menu.defaultCopyTimer;
                break;
            case "JOIN":
                this.ToMenu(4);
                this.#inputString = "";
                break;
            case "iCODE":
                this.#isInputActive = true;

                if(this.#inputString.length === 5) {
                    this.#isInputActive = false;
                    this.#engine.Join(this.#inputString);
                }
                break;
            case "BACK":
            case "RESUME":
                this.Back();
                break;
            case "QUIT":
                this.StartGame(-1, 0);
                break;
        }
    }

    Draw(ctx) {
        if (this.fadeTimer > 0) {
            let t = 1 - (this.fadeTimer / Menu.defaultFadeTimer);

            this.#fadeAlpha = (this.fadeDirection === -1) ? t : 1 - t;
        } else {
            this.#fadeAlpha = (this.fadeDirection === -1 || this.fadeDirection === 0) ? 1 : 0;
        }

        ctx.globalAlpha = this.#fadeAlpha;

        ctx.fillStyle = "#00000055";
        ctx.fillRect(0, 0, this.#engine.canvas.width, this.#engine.canvas.height);

        if (this.#engine.gameState === "MENU") {
            ctx.drawImage(Menu.logoImage, this.#optionsXpos - Menu.logoImage.width / 2, (this.#engine.canvas.height / 4) - Menu.logoImage.height / 2);
        }
        if (this.#engine.gamePaused && !this.#engine.isOnline) this.#engine.DrawPixelText(ctx, "Paused", this.#optionsXpos, (this.#engine.canvas.height / 4), 16, FighterEngine.uiRoundFillColor, FighterEngine.uiRoundOutlineColor);

        this.#options.forEach((text, i) => {
            const isSelected = i === this.#selectedIndex;
            const yPos = this.#optionsStartY + (i * (Menu.optionsSize + Menu.optionsMargin));

            let displayText = text;
            let isSpecial = false;

            // Handle special formatting
            if (text.startsWith("c")) {
                isSpecial = true;
                displayText = this.#copyTimer > 0 ? "COPIED!" : (this.#engine.sessionCode || "NO CODE");
            } else if (text.startsWith("i")) {
                isSpecial = true;
                displayText = this.#inputString + (this.#isInputActive && Date.now() % 1000 < 500 && this.#inputString.length < 5 ? "_" : "");
                if (displayText === "" && !this.#isInputActive) displayText = "ENTER CODE";
            }

            if (isSpecial) {
                ctx.fillStyle = isSelected ? "#222222" : "#111111";
                const rectW = Menu.optionsWidth * 2;
                ctx.fillRect(this.#optionsXpos - Menu.optionsWidth, yPos - 1, rectW, Menu.optionsSize + 2);
            }

            this.#engine.DrawPixelText(ctx, displayText, this.#optionsXpos, yPos, Menu.optionsSize, isSelected ? "#ffffff" : "#666666", "#00000000");
        });

        ctx.globalAlpha = 1;
    }

    Reset() {
        this.#keys = {};
        this.#lastKeys = {};

        // this.#mouse = { x: 0, y: 0 };
        this.#canSelect = true;

        this.ToMenu(0);
    }

    ToMenu(i) {
        this.#menuIndex = i;
        this.#selectedIndex = 0;
        this.#options = Menu.menusOptions[this.#menuIndex];
    }

    Back() {
        let i;
        switch (this.#menuIndex) {
            case 2:
                i = 1;
                break;
            case 3:
            case 4:
                i = 2;
                this.#engine.Disconnect();
                break;
            case 6:
                this.#canSelect = false;
                this.#engine.Resume();
                return;
                break;
            default:
                if (this.#engine.gamePaused) i = 6;
                else i = 0;
                break;
        }

        this.ToMenu(i);
    }

    async StartGame(mode, state = 2) {
        this.#canSelect = false;

        await FighterEngine.wait(400);
        this.#engine.Fade("#000", 500);
        await FighterEngine.wait(1200);
        this.#engine.SetGameState(state, mode);

        this.#engine.Fade("#000", 500, -1);
    }
}