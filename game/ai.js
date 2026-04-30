import { FighterEngine } from "./engine.js";
import { Fighter } from "./fighter.js";

export class AIController {
    #engine = null;
    #pawn = null;

    constructor(engine, pawn) {
        if (!(engine instanceof FighterEngine))
            throw new Error(`${this.constructor.name} requires a ${FighterEngine.name} instance.`);
        if (!(pawn instanceof Fighter))
            throw new Error(`${this.constructor.name} requires a ${Fighter.name} instance.`);

        this.#engine = engine;
        this.#pawn = pawn;
    }

    Begin() { }

    Tick(deltaTime) {        
        if (this.#engine.gameState !== "FIGHTING") return;

        const opponent = this.#engine.getOpponent(this);
        if(Math.abs(opponent.loc.x - this.#pawn.loc.x) < 29){
            this.#pawn.Punch()
        }
        if (opponent.vel.x > 50){
            this.#pawn.SetBlocking(true);
        } else {
            this.#pawn.SetBlocking(false);
        }

        this.#pawn.moveInput = -1;
    }

    Draw(ctx) { }

    Reset() {
        this.#pawn.moveInput = 0;
    }
}