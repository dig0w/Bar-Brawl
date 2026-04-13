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
    #redFontSheet = null;
    #greenFontSheet = null;
    static tCanvas = document.createElement("canvas");
    static tCtx = FighterEngine.tCanvas.getContext("2d");

    #uiRoundText = "";
    static defaultUiRoundTimer = .75;
    #uiRoundTimer = FighterEngine.defaultUiRoundTimer;
    #uiRoundLoc = { x: .5, y: .4 };
    static uiRoundSize = 16;
    static defaultUiRoundAfterTimer = .25;
    #uiRoundAfterTimer = FighterEngine.defaultUiRoundAfterTimer;
    #uiRoundAfterLoc = { x: .5, y: 11 };
    static uiRoundAfterSize = 8;
    static uiRoundFillColor = "#feffff";
    static uiRoundOutlineColor = "#545454";

    static defaultUiFightTimer = .75;
    #uiFightTimer = 0;
    #uiFightDone = false;
    static uiFightFillColor = "#ddb918";
    static uiFightOutlineColor = "#df2817";

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

        FighterEngine.uiSheet.onload = () => {
            console.log("b");
            this.#redFontSheet = FighterEngine.extractChannelMask(FighterEngine.uiSheet, "r");
            this.#greenFontSheet = FighterEngine.extractChannelMask(FighterEngine.uiSheet, "g");
        }
        console.log("a");
        console.log(FighterEngine.redFontSheet, FighterEngine.uiSheet);
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

            if (this.#uiRoundAfterTimer <= 0) {
                this.#uiFightTimer = FighterEngine.defaultUiFightTimer;
                this.#uiFightDone = false;
            }
        } else if (this.#uiFightTimer > 0) {
            this.#uiFightTimer -= deltaTime;

            if (this.#uiFightTimer <= FighterEngine.defaultUiFightTimer / 3 && !this.#uiFightDone) {
                this.#uiFightDone = true;
                this.#gameState = "FIGHTING";
            }
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
        this.#ctx.save();

        if (this.#uiRoundTimer > 0) {
            this.DrawPixelText(this.#ctx, this.#uiRoundText, (this.#uiRoundLoc.x | 0), (this.#uiRoundLoc.y | 0), (FighterEngine.uiRoundSize | 0), FighterEngine.uiRoundFillColor, FighterEngine.uiRoundOutlineColor);
        } else if (this.#uiRoundAfterTimer > 0) {
            const percent = this.#uiRoundAfterTimer / FighterEngine.defaultUiRoundAfterTimer;

            const locX = this.#uiRoundAfterLoc.x + (this.#uiRoundLoc.x - this.#uiRoundAfterLoc.x) * percent;
            const locY = this.#uiRoundAfterLoc.y + (this.#uiRoundLoc.y - this.#uiRoundAfterLoc.y) * percent;
            const fontSize = FighterEngine.uiRoundAfterSize + (FighterEngine.uiRoundSize - FighterEngine.uiRoundAfterSize) * percent;

            this.DrawPixelText(this.#ctx, this.#uiRoundText, (locX | 0), (locY | 0), (fontSize | 0), FighterEngine.uiRoundFillColor, FighterEngine.uiRoundOutlineColor);
        } else if (this.#uiRoundText != "") {
            this.DrawPixelText(this.#ctx, this.#uiRoundText, (this.#uiRoundAfterLoc.x | 0), (this.#uiRoundAfterLoc.y | 0), (FighterEngine.uiRoundAfterSize | 0), FighterEngine.uiRoundFillColor, FighterEngine.uiRoundOutlineColor);
        }

        if (this.#uiFightTimer > 0) {
            const t = FighterEngine.defaultUiFightTimer - this.#uiFightTimer;
            const third = FighterEngine.defaultUiFightTimer / 3;
            let fontSize = 0;

            if (t <= third) {
                const percent = t / third;
                fontSize = FighterEngine.uiRoundSize * percent;

            } else if (t <= 2 * third) {
                fontSize = FighterEngine.uiRoundSize;
            } else {
                const percent = (t - 2 * third) / third;
                fontSize = FighterEngine.uiRoundSize * (1 - percent);
            }

            this.DrawPixelText(this.#ctx, "Fight!", (this.#uiRoundLoc.x | 0), (this.#uiRoundLoc.y | 0), (fontSize | 0), FighterEngine.uiFightFillColor, FighterEngine.uiFightOutlineColor);
        }

        this.#ctx.restore();
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


    DrawPixelText(ctx, text, x, y, size = 5, fillColor = "white", outlineColor = "black") {
        if (!this.#redFontSheet || !this.#greenFontSheet || size <= 0) return;

        const srcSize = { w: 8, h: 8 };
        const outSize = { w: (size * (srcSize.w / srcSize.h)) | 0, h: size };

        const spacing = 0;
        const spaceWidth = (outSize.w / 3) | 0;

        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.!? ";

        let totalWidth = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text[i].toUpperCase();
            totalWidth += (char === " ") ? spaceWidth : outSize.w;
            if (i < text.length - 1) totalWidth += spacing;
        }

        let currentX = (x - totalWidth / 2) | 0;

        FighterEngine.tCanvas.width = outSize.w;
        FighterEngine.tCanvas.height = outSize.h;
        FighterEngine.tCtx.imageSmoothingEnabled = false;

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
                sX = index * srcSize.w;
                sY = 0;
            } else {
                sX = (index - 26) * srcSize.w;
                sY = srcSize.h;
            }

            const drawLayer = (sheet, color) => {
                FighterEngine.tCtx.clearRect(0, 0, outSize.w, outSize.h);
                FighterEngine.tCtx.globalCompositeOperation = "source-over";

                FighterEngine.tCtx.drawImage(
                    sheet,
                    sX, sY, srcSize.w, srcSize.h,
                    0, 0,
                    outSize.w, outSize.h
                );

                FighterEngine.tCtx.globalCompositeOperation = "source-in";
                FighterEngine.tCtx.fillStyle = color;
                FighterEngine.tCtx.fillRect(0, 0, outSize.w, outSize.h);

                ctx.drawImage(FighterEngine.tCanvas, currentX, (y | 0));
            };
            
            drawLayer(this.#greenFontSheet, fillColor);
            drawLayer(this.#redFontSheet, outlineColor);

            currentX += outSize.w;
        }
    }

    static extractChannelMask(image, channel = "r") {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = image.width;
        canvas.height = image.height;

        ctx.drawImage(image, 0, 0);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        const ch =
            channel === "r" ? 0 :
            channel === "g" ? 1 :
            channel === "b" ? 2 :
            0;

        for (let i = 0; i < data.length; i += 4) {
            const value = data[i + ch];

            if (value > 0) {
                data[i] = 255;
                data[i + 1] = 255;
                data[i + 2] = 255;
                data[i + 3] = 255;
            } else {
                data[i + 3] = 0;
            }
        }

        ctx.putImageData(imgData, 0, 0);

        return canvas;
    }
}