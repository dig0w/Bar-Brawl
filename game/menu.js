import { FighterEngine } from "./engine.js";

export class Menu {
    #engine = null;

    #keys = {};
    #lastKeys = {};

    #mouse = { x: 0, y: 0 };
    #mouseHovering = false;

    static menusOptions = [
        ["START", "VERSUS", "OPTIONS"],
        ["LOCAL", "HOST", "JOIN", "BACK"],
        ["AAA", "BBB", "CCC", "BACK"]
    ];
    #menuIndex = 0;
    #options = ["START", "VERSUS", "OPTIONS"];
    #selectedIndex = 0;

    static optionsSize = 8;
    static optionsMargin = 4;
    static optionsWidth = 32;
    #optionsStartY;
    #optionsXpos;

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
    }

    #isJustPressed(code) {
        return this.#keys[code] && !this.#lastKeys[code];
    }

    Tick(deltaTime) {
        if (this.#isJustPressed("ArrowUp") || this.#isJustPressed("KeyW")) {
            this.#selectedIndex = (this.#selectedIndex - 1 + this.#options.length) % this.#options.length;
        }

        if (this.#isJustPressed("ArrowDown") || this.#isJustPressed("KeyS")) {
            this.#selectedIndex = (this.#selectedIndex + 1) % this.#options.length;
        }

        if (this.#isJustPressed("Enter") || this.#isJustPressed("Space")) {
            this.#handleSelection();
        }

        if (this.#isJustPressed("Escape") || this.#isJustPressed("Backspace")) {
            this.ToMenu(0);
        }

        this.#lastKeys = { ...this.#keys };

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
        } else {
            this.#engine.canvas.style.cursor = "default";
        }
    }

    async #handleSelection() {
        const choice = this.#options[this.#selectedIndex];

        switch (choice) {
            case "START":
                await FighterEngine.wait(400);
                this.#engine.FadeTo("#000", 500);
                await FighterEngine.wait(1200);
                this.#engine.SetGameState(2, 0);

                this.#engine.FadeFrom("#000", 500);
                break;
            case "VERSUS":
                this.ToMenu(1);
                break;
            case "OPTIONS":
                this.ToMenu(2);
                break;
            case "LOCAL":
                await FighterEngine.wait(400);
                this.#engine.FadeTo("#000", 500);
                await FighterEngine.wait(1200);
                this.#engine.SetGameState(2, 1);

                this.#engine.FadeFrom("#000", 500);
                break;
            case "HOST":
                await FighterEngine.wait(400);
                this.#engine.FadeTo("#000", 500);
                await FighterEngine.wait(1200);
                this.#engine.SetGameState(2, 2);

                this.#engine.FadeFrom("#000", 500);
                break;
            case "JOIN":
                await FighterEngine.wait(400);
                this.#engine.FadeTo("#000", 500);
                await FighterEngine.wait(1200);
                this.#engine.SetGameState(2, 3);

                this.#engine.FadeFrom("#000", 500);
                break;
            case "":
                break;
            case "BACK":
                this.#menuIndex = 0;
                this.#selectedIndex = 0;
                this.#options = Menu.menusOptions[this.#menuIndex];
                break;
        }
    }

    Draw(ctx) {
        ctx.fillStyle = "#00000055";
        ctx.fillRect(0, 0, this.#engine.canvas.width, this.#engine.canvas.height);

        this.#engine.DrawPixelText(ctx, "Crazy Title!", this.#optionsXpos, (this.#engine.canvas.height / 4), 16, "#e66257", "#331505");

        this.#options.forEach((text, i) => {
            const isSelected = i === this.#selectedIndex;
            const yPos = this.#optionsStartY + (i * (Menu.optionsSize + Menu.optionsMargin));

            this.#engine.DrawPixelText(ctx, text, this.#optionsXpos, yPos, Menu.optionsSize, isSelected ? "#ffffff" : "#666666", "#00000000");
        });
    }

    Reset() {
        this.#keys = {};
        this.#lastKeys = {};

        // this.#mouse = { x: 0, y: 0 };

        this.ToMenu(0);
    }

    ToMenu(i) {
        this.#menuIndex = i;
        this.#selectedIndex = 0;
        this.#options = Menu.menusOptions[this.#menuIndex];
    }
}