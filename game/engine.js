import { Controller } from "./controller.js";
import { Fighter } from "./fighter.js";

export class FighterEngine {
    static gravity = 980;
    static friction = .98;
    #groundY = 2;
    #worldWidth = 0;
    #timeScale = 1;

    #canvasSize = { w: 120, h: 80 };
    #canvas = null;
    #ctx = null;
    #objects = [];

    #backgroundImage = Object.assign(new Image(), { src: "assets/bar.png" });

    #fighter0 = null;
    #fighter1 = null;
    #ctrl0 = null;
    #ctrl1 = null;

    #gameState = "PRE_ROUND"; // PRE_ROUND, FIGHTING, POS_ROUND, GAME_OVER
    static maxRounds = 3;
    #rounds = 0;
    #scoreF0 = 0;
    #scoreF1 = 0;


    #timeScaleTimer = 0;

    static uiSheet = Object.assign(new Image(), { src: "assets/ui_sheet.png" });
    #redFontSheet = null;
    #greenFontSheet = null;
    static tCanvas = document.createElement("canvas");
    static tCtx = FighterEngine.tCanvas.getContext("2d");

    static defaultUiGameOverTimer = .25;
    #uiGameOverTimer = FighterEngine.defaultUiGameOverTimer;

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
    static uiFightFillColor = "#e66257";
    static uiFightOutlineColor = "#331505";

    #uiWinnerText = "";
    static defaultUiWinnerTimer = 1.3;
    #uiWinnerTimer = 0;
    static uiWinnerFillColor = "#feffff";
    static uiWinnerOutlineColor = "#545454";

    #fadeColor = "#000";
    #fadeAlpha = 0;
    #fadeDuration = 0;
    #fadeTimer = 0;
    #fadeDirection = 0; // 1 = fade to, -1 = fade from, 0 = none

    constructor() {
    }

    get gameState() { return this.#gameState; } 
    get gravity() { return FighterEngine.gravity; }
    get friction() { return FighterEngine.friction; }
    get groundY() { return this.#groundY; }
    get worldWidth() { return this.#worldWidth; }

    get canvasSize() { return this.#canvasSize; }
    get canvas() { return this.#canvas; }

    get fighter0() { return this.#fighter0; }
    get fighter1() { return this.#fighter1; }

    getScore(fighter) { return fighter == this.#fighter0 ? this.#scoreF0 : this.#scoreF1; }

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

        this.#ctrl0 = new Controller(this, this.#fighter0, 0);
        this.#objects.push(this.#ctrl0);

        this.#fighter1 = new Fighter(this, 1);
        this.#objects.push(this.#fighter1);

        this.#ctrl1 = new Controller(this, this.#fighter1, 1);
        this.#objects.push(this.#ctrl1);

        for (let i = 0; i < this.#objects.length; i++) {
            this.#objects[i].Begin();
        }

        this.#uiRoundLoc.x *= this.#canvas.width;
        this.#uiRoundLoc.y *= this.#canvas.height;

        this.#uiRoundAfterLoc.x *= this.#canvas.width;
        this.StartRound();

        FighterEngine.uiSheet.onload = () => {
            this.#redFontSheet = FighterEngine.extractChannelMask(FighterEngine.uiSheet, "r");
            this.#greenFontSheet = FighterEngine.extractChannelMask(FighterEngine.uiSheet, "g");
        }
    }

    Tick(deltaTime) {
        if (this.#timeScaleTimer >= 0) {
            this.#timeScaleTimer -= deltaTime;
            if (this.#timeScaleTimer <= 0) {
                this.#timeScale = 1;
            }
        }
        const activeDeltaTime = deltaTime * this.#timeScale;

        if (this.#gameState === "FIGHTING") {
            for (let i = this.#objects.length - 1; i >= 0; i--) {
                this.#objects[i].Tick(activeDeltaTime);
            }
        } else {
            for (let i = this.#objects.length - 1; i >= 0; i--) {
                if (!(this.#objects[i] instanceof Controller)) this.#objects[i].Tick(activeDeltaTime);
            }
        }

        if (this.#uiGameOverTimer > 0 && this.#gameState == "GAME_OVER") {
            this.#uiGameOverTimer -= deltaTime;
        } else if (this.#uiRoundTimer > 0) {
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
        } else if (this.#uiWinnerTimer > 0) {
            this.#uiWinnerTimer -= deltaTime;
        }

        if (this.#fadeDirection !== 0) {
            this.#fadeTimer += deltaTime;

            const dir = this.#fadeDirection;

            let t = this.#fadeTimer / this.#fadeDuration;
            if (t >= 1) {
                t = 1;
                this.#fadeDirection = 0;
            }

            if (dir === 1) {
                this.#fadeAlpha = t;
            } else if (dir === -1) {
                this.#fadeAlpha = 1 - t;
            }
        }
    }

    Draw() {
        // Clear the canvas
        this.#ctx.clearRect(0, 0, this.#canvas.width, this.#canvas.height);

        this.#ctx.save();
        this.#ctx.scale(2, 2);

        let scrollX = 0;

        if (this.#gameState == "GAME_OVER") {
            this.#ctx.fillStyle = "#000000";
            this.#ctx.fillRect(0, 0, this.#canvas.width, this.#canvas.height);

            const fighterMidX = (this.#fighter0.loc.x + this.#fighter1.loc.x) / 2 + (this.#fighter0.size.w / 2);
            scrollX = (this.#canvas.width / 4) - fighterMidX;
        } else if (this.#backgroundImage && this.#backgroundImage.complete) {
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

        if (this.#gameState == "GAME_OVER") {
            let fontSize = FighterEngine.uiRoundSize;
            if (this.#uiGameOverTimer > 0) {
                const percent = this.#uiGameOverTimer / Fighter.defaultUiGameOverTimer;
                fontSize *= (1 - percent);
            }

            this.DrawPixelText(this.#ctx, "Game Over", (this.#uiRoundLoc.x | 0), (this.#uiRoundLoc.y | 0), (fontSize | 0), FighterEngine.uiRoundFillColor);
        }

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
        } else if (this.#uiWinnerTimer > 0) {
            const t = FighterEngine.defaultUiWinnerTimer - this.#uiWinnerTimer;
            const stopGrowing = FighterEngine.defaultUiWinnerTimer / 2;
            let fontSize = 0;

            if (t <= stopGrowing) {
                const percent = t / stopGrowing;
                fontSize = FighterEngine.uiRoundSize * percent;
            } else {
                fontSize = FighterEngine.uiRoundSize;
            }

            this.DrawPixelText(this.#ctx, this.#uiWinnerText, (this.#uiRoundLoc.x | 0), (this.#uiRoundLoc.y | 0), (fontSize | 0), FighterEngine.uiWinnerFillColor, FighterEngine.uiWinnerOutlineColor);
        }

        if (this.#fadeAlpha > 0) {
            this.#ctx.save();
            this.#ctx.globalAlpha = this.#fadeAlpha;
            this.#ctx.fillStyle = this.#fadeColor;
            this.#ctx.fillRect(0, 0, this.#canvas.width, this.#canvas.height);
            this.#ctx.restore();
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
        if (this.#rounds == FighterEngine.maxRounds || this.#scoreF0 == FighterEngine.maxRounds - 1 || this.#scoreF1 == FighterEngine.maxRounds - 1) {
            return this.GameOver();
        }

        this.#gameState = "PRE_ROUND";

        this.#fighter0.Reset();
        this.#fighter1.Reset();

        this.#uiRoundTimer = FighterEngine.defaultUiRoundTimer;
        this.#uiRoundText = `Round ${this.#rounds + 1}`;

        this.#rounds++;
    }

    async RoundOver(loser) {
        if (!loser || (loser != this.#fighter0 && loser != this.#fighter1)) return;

        const winner = loser == this.#fighter0 ? this.#fighter1 : this.#fighter0;

        this.#ctrl0.Reset();
        this.#ctrl1.Reset();

        this.#gameState = "POS_ROUND";
        this.#uiRoundText = ``;

        await FighterEngine.wait(50);

        this.#uiWinnerTimer = FighterEngine.defaultUiWinnerTimer;
        this.#uiWinnerText = `${loser == this.#fighter0 ? "P2" : "P1"} Wins!`;

        winner.Celebrate();

        if (loser == this.fighter0) this.#scoreF1++;
        else if (loser == this.fighter1) this.#scoreF0++;

        await FighterEngine.wait(400);
        this.#timeScale = 0.1;

        await FighterEngine.wait(400);
        this.FadeTo("#000", 500);
        await FighterEngine.wait(1200);
        this.StartRound();

        this.#timeScale = 1;
        this.FadeFrom("#000", 500);
    }

    GameOver() {
        this.#gameState = "GAME_OVER";
        this.#uiGameOverTimer = FighterEngine.defaultUiGameOverTimer;
    }

    SlowTime(scale = 0.1, duration = 50) {
        this.#timeScale = scale;
        this.#timeScaleTimer = duration;
    }


    DrawPixelText(ctx, text, x, y, size = 5, fillColor = "#fff", outlineColor = "#000") {
        if (!this.#redFontSheet || !this.#greenFontSheet || size <= 0) return;

        const srcSize = { w: 8, h: 8 };
        const outSize = { w: (size * (srcSize.w / srcSize.h)) | 0, h: size };

        const spacing = 0;
        const spaceWidth = (outSize.w / 3) | 0;

        const rows = ["ABCDEFGHIJKLMNOPQRSTUVWXYZ", "0123456789.!?"]

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

            if (char === " ") {
                currentX += spaceWidth;
                continue;
            }

            let index = -1;
            let row = -1;
            do {
                row++;
                index = rows[row].indexOf(char);
            } while (index === -1 && row != rows.length - 1);

            if (index === -1) continue;

            let s = { x: index * srcSize.w, y: row * srcSize.h };

            const drawLayer = (sheet, color) => {
                FighterEngine.tCtx.clearRect(0, 0, outSize.w, outSize.h);
                FighterEngine.tCtx.globalCompositeOperation = "source-over";

                FighterEngine.tCtx.drawImage(
                    sheet,
                    s.x, s.y, srcSize.w, srcSize.h,
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

    FadeTo(color = "#000", duration = 500) {
        this.#fadeColor = color;
        this.#fadeDuration = duration / 1000;
        this.#fadeTimer = 0;
        this.#fadeDirection = 1;
        this.#fadeAlpha = 0;
    }

    FadeFrom(color = "#000", duration = 500) {
        this.#fadeColor = color;
        this.#fadeDuration = duration / 1000;
        this.#fadeTimer = 0;
        this.#fadeDirection = -1;
        this.#fadeAlpha = 1;
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

    static wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
}