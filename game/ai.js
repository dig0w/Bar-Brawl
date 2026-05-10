import { FighterEngine } from "./engine.js";
import { Fighter } from "./fighter.js";

export class AIController {
    #engine = null;
    #pawn = null;
    #opponent = null;

    constructor(engine, pawn) {
        if (!(engine instanceof FighterEngine))
            throw new Error(`${this.constructor.name} requires a ${FighterEngine.name} instance.`);
        if (!(pawn instanceof Fighter))
            throw new Error(`${this.constructor.name} requires a ${Fighter.name} instance.`);

        this.#engine = engine;
        this.#pawn = pawn;
    }

    Begin() {
        this.#opponent = this.#engine.getOpponent(this);
    }

    Tick(deltaTime) {        
        if (this.#engine.gameState !== "FIGHTING" || !this.#pawn || !this.#opponent) return;

        const distance = Math.abs(this.#opponent.x - this.#pawn.x);
        const isToLeft = this.#opponent.x < this.#pawn.x;

        this.#pawn.moveInput = -1;
    }

    Draw(ctx) { }

    Reset() {
        this.#pawn.moveInput = 0;
    }
}