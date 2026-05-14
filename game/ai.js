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
        this.#opponent = this.#engine.getOpponent(this.#pawn);

        this.#lastDistance = Math.abs(this.#opponent.loc.x - this.#pawn.loc.x);
    }

    Tick(deltaTime) {
        if (this.#engine.gameState !== "FIGHTING" || !this.#pawn || !this.#opponent) return;

        let move = 0;
        let blocking = false;

        const myX = this.#pawn.loc.x;
        const oppX = this.#opponent.loc.x;
        const distance = Math.abs(oppX - myX);
        const distanceDiff = distance - this.#lastDistance;

        const isClosingIn = distanceDiff < -.1 && ((oppX < myX && this.#opponent.vel.x > 0.1) || (oppX > myX && this.#opponent.vel.x < -0.1));
        const isInRange = distance < AIController.punchRange;
        const isJustOutsideRange = distance >= AIController.punchRange && distance < AIController.punchRange + 30;

        if (this.#opponent.isPunching && !this.#opponentWasPunching) {
            this.#reactionTimer = 0;
            this.#blockDuration = Fighter.defaultPunchAnimTimer * 2;
        }
        this.#opponentWasPunching = this.#opponent.isPunching;

        if (this.#reactionTimer > 0) this.#reactionTimer -= deltaTime;
        if (this.#blockDuration > 0 && this.#reactionTimer <= 0) this.#blockDuration -= deltaTime;

        const shouldBait = isClosingIn && !this.#opponent.isPunching && distance < AIController.punchRange + 20;

        if (this.#blockDuration > 0) {
            blocking = isInRange;
            move = 0;
        }
        else if (shouldBait) {
            move = (oppX < myX) ? 1 : -1;
            blocking = false;
        }
        else {
            move = (oppX < myX) ? -1 : 1;

            if (isInRange) {
                this.#pawn.Punch();
            }
        }

        const heightDiff = (this.#opponent.loc.y + this.#opponent.size.h * 0.2) - (this.#pawn.loc.y);
        if (isInRange && heightDiff < -10 && this.#pawn.isOnGround) this.#pawn.Jump();

        this.#pawn.moveInput = move;
        this.#pawn.SetBlocking(blocking);
        this.#lastDistance = distance;
    }

    Draw(ctx) { }

    Reset() {
        this.#pawn.moveInput = 0;
    }
}