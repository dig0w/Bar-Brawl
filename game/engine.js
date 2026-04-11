import { Controller } from "./controller.js";
import { Fighter } from "./fighter.js";

export class FighterEngine {
    static gravity = 980;
    static friction = .98;
    #groundY = 2;
    #worldWidth = 0;

    #canvas = null;
    #ctx = null;
    #objects = [];

    #backgroundImage = Object.assign(new Image(), { src: "assets/bar.png" });

    #fighter0 = null;
    #fighter1 = null;

    static maxRounds = 3;
    #rounds = 0;

    #gameState = "PRE_ROUND"; // PRE_ROUND, FIGHTING, POS_ROUND, GAME_OVER

    #uiRoundText = "";
    static defaultUiRoundTimer = 1;
    #uiRoundTimer = FighterEngine.defaultUiRoundTimer;
    #uiRoundLoc = { x: .5, y: .4 };
    static defaultUiRoundAfterTimer = .5;
    #uiRoundAfterTimer = FighterEngine.defaultUiRoundAfterTimer;
    #uiRoundAfterLoc = { x: .5, y: 5 };

    constructor() {
    }

    get gravity() { return FighterEngine.gravity; }
    get friction() { return FighterEngine.friction; }
    get groundY() { return this.#groundY; }
    get worldWidth() { return this.#worldWidth; }

    get canvas() { return this.#canvas; }

    get fighter0() { return this.#fighter0; }
    get fighter1() { return this.#fighter1; }

    Begin() {
        this.#canvas = document.getElementById("game-canvas");
        this.#ctx = this.#canvas.getContext("2d");
        this.#ctx.imageSmoothingEnabled = false;

        this.#groundY = this.#canvas.height - this.#groundY;
        this.#worldWidth = this.#canvas.width;

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
        }

        if (this.#uiRoundTimer > 0) {
            this.#uiRoundTimer -= deltaTime;

            if (this.#uiRoundTimer <= 0) {
                this.#uiRoundAfterTimer = FighterEngine.defaultUiRoundAfterTimer;
            }
        }

        if (this.#uiRoundAfterTimer > 0) {
            this.#uiRoundAfterTimer -= deltaTime;
        }
    }

    Draw() {
        // Clear the canvas
        this.#ctx.clearRect(0, 0, this.#canvas.width, this.#canvas.height);

        let scrollX = 0;
        if (this.#backgroundImage && this.#backgroundImage.complete) {
            const scale = this.#canvas.height / this.#backgroundImage.height;
            this.#worldWidth = this.#backgroundImage.width * scale;

            const fighterMidX = (this.fighter0.loc.x + this.fighter1.loc.x) / 2 + this.fighter0.size.w / 2;
            const viewPercent = Math.max(0, Math.min(1, fighterMidX / this.#canvas.width));

            const extraWidth = this.#worldWidth - this.#canvas.width;
            scrollX = -(extraWidth * viewPercent);

            this.#ctx.drawImage(this.#backgroundImage, (scrollX | 0), 0, (this.#worldWidth | 0), (this.#canvas.height | 0));
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

        if (this.#uiRoundTimer > 0) {
            this.#ctx.textAlign = "center";
            this.#ctx.textBaseline = "middle";

            this.#ctx.font = "bold 16px 'Courier New', monospace"; 
            this.#ctx.fillStyle = "white";
            this.#ctx.strokeStyle = "black";
            this.#ctx.lineWidth = 2;

            this.#ctx.strokeText(this.#uiRoundText, this.#uiRoundLoc.x, this.#uiRoundLoc.y);
            this.#ctx.fillText(this.#uiRoundText, this.#uiRoundLoc.x, this.#uiRoundLoc.y);
        }

        if (this.#uiRoundAfterTimer > 0) {
            // Interpolate start position to end pos
            // and font sizes
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
        this.#uiRoundText = `Round ${this.#rounds}`;

        this.#rounds++;
    }

    RoundOver() {
        this.#gameState = "POS_ROUND";
    }

    GameOver() {
        this.#gameState = "GAME_OVER";
        return;
    }
}
