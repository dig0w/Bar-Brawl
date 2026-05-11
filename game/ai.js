import { FighterEngine } from "./engine.js";
import { Fighter } from "./fighter.js";

export class AIController {
    #engine = null;
    #pawn = null;
    #opponent = null;

    static punchRange = 20;

    #lastDistance;
    #punchTimer = 0;
    #opponentWasPunching = false;

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

        this.#lastDistance = Math.abs(this.#opponent.loc.x - this.#pawn.loc.x);
    }

    Tick(deltaTime) {
        if (this.#engine.gameState !== "FIGHTING" || !this.#pawn || !this.#opponent) return;

        let move = 0;
        let blocking = false;

        const distance = Math.abs(this.#opponent.loc.x - this.#pawn.loc.x);
        const distanceDiff = distance - this.#lastDistance;

        const isClosingIn = distanceDiff < -.1 && ((this.#opponent.loc.x < this.#pawn.loc.x && this.#opponent.vel.x > 0.1) || (this.#opponent.loc.x > this.#pawn.loc.x && this.#opponent.vel.x < -0.1));

        // should calculate opponent state (attacking, defending)
        // defending - distance = big, or increasing
        // attacking - distance = small, or decreasing
        const oppAttacking = isClosingIn || distance < AIController.punchRange;

        // should calculate hit height to aim for the head
        const heightDiff = (this.#opponent.loc.y + this.#opponent.size.h * 0.2) - (this.#pawn.loc.y);

        // if (this.#punchTimer > 0) this.#punchTimer -= deltaTime;
        // if (this.#opponent.isPunching && this.#punchTimer < 0) this.#punchTimer = Fighter.defaultPunchAnimTimer;

        if (this.#opponent.isPunching && !this.#opponentWasPunching) {
            this.#punchTimer = Fighter.defaultPunchAnimTimer;
        }
        this.#opponentWasPunching = this.#opponent.isPunching;

        if (this.#punchTimer > 0) this.#punchTimer -= deltaTime;

        // ai should choose state oposite to opponents state
        if (oppAttacking && this.#punchTimer > 0) {
            // Defend
            console.log("Defending");
            blocking = distance < AIController.punchRange;
            move = 0;
        } else {
            // Attack
            console.log("Attacking");
            blocking = false;
            move = (this.#opponent.loc.x < this.#pawn.loc.x) ? -1 : 1;

            if (distance < AIController.punchRange) this.#pawn.Punch();
        }

        this.#pawn.moveInput = move;
        this.#pawn.SetBlocking(blocking);

        this.#lastDistance = distance;
    }

    Draw(ctx) { }

    Reset() {
        this.#pawn.moveInput = 0;
    }
}