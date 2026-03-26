import { Controller } from "./controller.js";
import { Fighter } from "./fighter.js";

export class FighterEngine {
    static gravity = 980;
    static friction = .98;
    #groundY = 16;
    #wallX = 0;

    #canvas = null;
    #ctx = null;
    #objects = [];

    constructor() {
    }

    get gravity() { return FighterEngine.gravity; }
    get friction() { return FighterEngine.friction; }
    get wallX() { return this.#wallX; }
    get groundY() { return this.#groundY; }

    get canvas() { return this.#canvas; }

    Begin() {
        this.#canvas = document.getElementById("game-canvas");
        this.#ctx = this.#canvas.getContext("2d");

        this.#wallX = this.#canvas.width;
        this.#groundY = this.#canvas.height - this.#groundY;

        const fighter1 = new Fighter(this);
        this.#objects.push(fighter1);

        const ctrl1 = new Controller(this, fighter1);
        this.#objects.push(ctrl1);

        for (let i = 0; i < this.#objects.length; i++) {
            this.#objects[i].Begin();
        }
    }

    Tick(deltaTime) {
        for (let i = this.#objects.length - 1; i >= 0; i--) {
            this.#objects[i].Tick(deltaTime);
        }
    }

    Draw() {
        // Clear the canvas
        this.#ctx.clearRect(0, 0, this.#canvas.width, this.#canvas.height);

        this.#ctx.fillStyle = "#cccccc";
        this.#ctx.fillRect(0, 0, this.#canvas.width, this.#canvas.height);

        for (let i = 0; i < this.#objects.length; i++) {
            this.#objects[i].Draw(this.#ctx);
        }
    }

    DestroyObject(obj) {
        const index = this.#objects.indexOf(obj);
        if (index !== -1) {
            this.#objects[index] = null;
            this.#objects.splice(index, 1);
        }
    }

    CheckCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
            rect1.x + rect1.width > rect2.x &&
            rect1.y < rect2.y + rect2.height &&
            rect1.y + rect1.height > rect2.y;
    }
}