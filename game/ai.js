import { FighterEngine } from "./engine.js";
import { Fighter } from "./fighter.js";

export class AIController {
    #engine = null;
    #pawn = null;
    #opponent = null;

    static punchRange = 20;

    #lastDistance;

    #opponentWasPunching = false;
    #reactionTimer = 0;
    #blockDuration = 0;

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
        const isInRange = distance < AIController.punchRange;

        // should calculate opponent state (attacking, defending)
        // defending - distance = big, or increasing
        // attacking - distance = small, or decreasing

        // Opponent Punching
        if (this.#opponent.isPunching && !this.#opponentWasPunching) {
            this.#reactionTimer = Fighter.defaultPunchAnimTimer * 0;
            this.#blockDuration = Fighter.defaultPunchAnimTimer * 2;
        }
        this.#opponentWasPunching = this.#opponent.isPunching;

        if (this.#reactionTimer > 0) this.#reactionTimer -= deltaTime;
        if (this.#blockDuration > 0 && this.#reactionTimer <= 0) this.#blockDuration -= deltaTime;

        // should calculate hit height to aim for the head
        const heightDiff = (this.#opponent.loc.y + this.#opponent.size.h * 0.2) - (this.#pawn.loc.y);
        const shouldJump = heightDiff < -10;
        if (isInRange && shouldJump) this.#pawn.Jump();

        // ai should choose state oposite to opponents state
        if ((isClosingIn || isInRange) && this.#reactionTimer <= 0 && this.#blockDuration > 0) {
            // Defend
            console.log("Defending");
            blocking = isInRange;
            move = 0;
        } else {
            // Attack
            console.log("Attacking");
            blocking = false;
            move = (this.#opponent.loc.x < this.#pawn.loc.x) ? -1 : 1;

            if (isInRange) this.#pawn.Punch();
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