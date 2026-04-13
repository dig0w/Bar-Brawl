import { Controller } from "./controller.js";
import { Fighter } from "./fighter.js";

export class FighterEngine {
    static gravity = 980;
    static friction = .98;
    #groundY = 2;
    #worldWidth = 0;

    #canvasSize = { w: 120, h: 80 };
    #canvas = null;
    #ctx = null;
    #objects = [];

    #backgroundImage = Object.assign(new Image(), { src: "assets/bar.png" });

    #fighter0 = null;
    #fighter1 = null;

    static maxRounds = 3;
    #rounds = 0;

    #gameState = "PRE_ROUND"; // PRE_ROUND, FIGHTING, POS_ROUND, GAME_OVER

    static uiSheet = Object.assign(new Image(), { src: "assets/ui_sheet.png" });
    #uiRoundText = "";
    static defaultUiRoundTimer = .75;
    #uiRoundTimer = FighterEngine.defaultUiRoundTimer;
    #uiRoundLoc = { x: .5, y: .4 };
    static uiRoundSize = 16;
    static defaultUiRoundAfterTimer = .25;
    #uiRoundAfterTimer = FighterEngine.defaultUiRoundAfterTimer;
    #uiRoundAfterLoc = { x: .5, y: 11 };
    static uiRoundAfterSize = 8;

    constructor() {
    }

    get gravity() { return FighterEngine.gravity; }
    get friction() { return FighterEngine.friction; }
    get groundY() { return this.#groundY; }
    get worldWidth() { return this.#worldWidth; }

    get canvasSize() { return this.#canvasSize; }
    get canvas() { return this.#canvas; }

    get fighter0() { return this.#fighter0; }
    get fighter1() { return this.#fighter1; }

    Begin() {
        this.#canvas = document.getElementById("game-canvas");

        this.#canvas.width = this.#canvasSize.w * 2;
        this.#canvas.height = this.#canvasSize.h * 2;

        this.#ctx = this.#canvas.getContext("2d");
        this.#ctx.imageSmoothingEnabled = false;

        this.#groundY = this.#canvasSize.h - this.#groundY;
        this.#worldWidth = this.#canvasSize.w;

        this.#fighter0 = new Fighter(this, 0);
        this.#objects.push(this.#fighter0);

        const ctrl0 = new Controller(this, this.#fighter0, 0);
        this.#objects.push(ctrl0);

        this.#fighter1 = new Fighter(this, 1);
        this.#objects.push(this.#fighter1);

        const ctrl1 = new Controller(this, this.#fighter1, 1);
        this.#objects.push(ctrl1);

        for (let i = 0; i < this.#objects.length; i++) {
            this.#objects[i].Begin();
        }

        this.#uiRoundLoc.x *= this.#canvas.width;
        this.#uiRoundLoc.y *= this.#canvas.height;
        this.#uiRoundAfterLoc.x *= this.#canvas.width;
        this.StartRound();
    }

    Tick(deltaTime) {
        if (this.#gameState === "FIGHTING") {
            for (let i = this.#objects.length - 1; i >= 0; i--) {
                this.#objects[i].Tick(deltaTime);
            }
        } else {
            for (let i = this.#objects.length - 1; i >= 0; i--) {
                if (!(this.#objects[i] instanceof Controller)) this.#objects[i].Tick(deltaTime);
            }
        }

        if (this.#uiRoundTimer > 0) {
            this.#uiRoundTimer -= deltaTime;

            if (this.#uiRoundTimer <= 0) {
                this.#uiRoundAfterTimer = FighterEngine.defaultUiRoundAfterTimer;
            }
        } else if (this.#uiRoundAfterTimer > 0) {
            this.#uiRoundAfterTimer -= deltaTime;
        } else {

        }
    }

    Draw() {
        // Clear the canvas
        this.#ctx.clearRect(0, 0, this.#canvas.width, this.#canvas.height);

        this.#ctx.save();
        this.#ctx.scale(2, 2);

        let scrollX = 0;
        if (this.#backgroundImage && this.#backgroundImage.complete) {
            const scale = this.#canvasSize.h / this.#backgroundImage.height;
            this.#worldWidth = this.#backgroundImage.width * scale;

            const fighterMidX = (this.fighter0.loc.x + this.fighter1.loc.x) / 2 + this.fighter0.size.w / 2;
            const viewPercent = Math.max(0, Math.min(1, fighterMidX / this.#canvasSize.w));

            const extraWidth = this.#worldWidth - this.#canvasSize.w;
            scrollX = -(extraWidth * viewPercent);

            this.#ctx.drawImage(this.#backgroundImage, (scrollX | 0), 0, (this.#worldWidth | 0), (this.#canvasSize.h | 0));
        }

        this.#ctx.save();
        this.#ctx.translate((scrollX | 0), 0);

        for (let i = 0; i < this.#objects.length; i++) {
            this.#objects[i].Draw(this.#ctx);
        }

        this.#ctx.restore();
        
        for (let i = 0; i < this.#objects.length; i++) {
            if (this.#objects[i].DrawUI) this.#objects[i].DrawUI(this.#ctx);
        }

        this.#ctx.restore();

        if (this.#uiRoundTimer > 0) {
            this.DrawPixelText(this.#ctx, this.#uiRoundText, (this.#uiRoundLoc.x | 0), (this.#uiRoundLoc.y | 0), (FighterEngine.uiRoundSize | 0));
        } else if (this.#uiRoundAfterTimer > 0) {
            const percent = this.#uiRoundAfterTimer / FighterEngine.defaultUiRoundAfterTimer;

            const locX = this.#uiRoundAfterLoc.x + (this.#uiRoundLoc.x - this.#uiRoundAfterLoc.x) * percent;
            const locY = this.#uiRoundAfterLoc.y + (this.#uiRoundLoc.y - this.#uiRoundAfterLoc.y) * percent;
            const fontSize = FighterEngine.uiRoundAfterSize + (FighterEngine.uiRoundSize - FighterEngine.uiRoundAfterSize) * percent;

            this.DrawPixelText(this.#ctx, this.#uiRoundText, (locX | 0), (locY | 0), (fontSize | 0));
        } else if (this.#uiRoundText != "") {
            this.DrawPixelText(this.#ctx, this.#uiRoundText, (this.#uiRoundAfterLoc.x | 0), (this.#uiRoundAfterLoc.y | 0), (FighterEngine.uiRoundAfterSize | 0));
        }
    }

    DestroyObject(obj) {
        const index = this.#objects.indexOf(obj);
        if (index !== -1) {
            this.#objects[index] = null;
            this.#objects.splice(index, 1);
        }
    }

    StartRound() {
        if (this.#rounds == FighterEngine.maxRounds) {
            // Game Over
        }

        this.#gameState = "PRE_ROUND";

        this.#fighter0.Reset(); 
        this.#fighter1.Reset();

        this.#uiRoundTimer = FighterEngine.defaultUiRoundTimer;
        this.#uiRoundText = `Round ${this.#rounds + 1}`;

        this.#rounds++;
    }

    RoundOver() {
        this.#gameState = "POS_ROUND";

        this.#uiRoundText = ``;
    }

    GameOver() {
        this.#gameState = "GAME_OVER";
        return;
    }


    DrawPixelText(ctx, text, x, y, size = 5) {
        const srcW = 8;
        const srcH = 8;

        const outH = size;
        const outW = (size * (srcW / srcH)) | 0;

        const spacing = 1;
        const spaceWidth = (outW / 3) | 0;

        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.!? ";

        let totalWidth = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text[i].toUpperCase();
            totalWidth += (char === " ") ? spaceWidth : outW;
            if (i < text.length - 1) totalWidth += spacing;
        }

        let currentX = (x - totalWidth / 2) | 0;

        for (let i = 0; i < text.length; i++) {
            if (i != 0) currentX += spacing;
            const char = text[i].toUpperCase();
            const index = alphabet.indexOf(char);

            if (index === -1) continue;

            if (char === " ") {
                currentX += spaceWidth;
                continue;
            }

            let sX, sY;
            if (index < 26) {
                sX = index * srcW;
                sY = 0;
            } else {
                sX = (index - 26) * srcW;
                sY = srcH;
            }

            ctx.drawImage(
                FighterEngine.uiSheet,
                sX, sY, srcW, srcH,
                currentX, (y | 0),
                outW, outH
            );

            currentX += outW;
        }
    }
}
