import { FighterEngine } from "./engine.js";
import { Fighter } from "./fighter.js";

export class AIController {
    #engine = null;
    #pawn = null;
    #opponent = null;

    static punchRange = 20;
    static wallMargin = 15;

    #lastDistance;

    #opponentWasPunching = false;
    #reactionTimer = 0;
    #blockDuration = 0;

    #difficulty = 1; // 0 = easiest, 1 = hardest

    constructor(engine, pawn, difficulty = 0.5) {
        if (!(engine instanceof FighterEngine))
            throw new Error(`${this.constructor.name} requires a ${FighterEngine.name} instance.`);
        if (!(pawn instanceof Fighter))
            throw new Error(`${this.constructor.name} requires a ${Fighter.name} instance.`);

        this.#engine = engine;
        this.#pawn = pawn;
        this.#difficulty = Math.max(0, Math.min(1, difficulty));
    }

    get #reactionDelay() { return 0.4 - this.#difficulty * 0.4; } // 0.4s -   0s
    get #blockChance() { return 0.2 + this.#difficulty * 0.8; }   //  20% - 100%
    get #baitChance() { return 0.1 + this.#difficulty * 0.6; }    //  10% -  70%
    get #missChance() { return 0.5 - this.#difficulty * 0.5; }    //  50% -   0%

    Begin() {
        this.#opponent = this.#engine.getOpponent(this.#pawn);
        this.#lastDistance = Math.abs(this.#opponent.loc.x - this.#pawn.loc.x);
    }

    Tick(deltaTime) {
        if (this.#engine.gameState !== "FIGHTING" || !this.#pawn || !this.#opponent) return;

        let move = 0;
        let blocking = false;

        const myX = this.#pawn.loc.x;
        const myRight = myX + this.#pawn.size.w;
        const oppX = this.#opponent.loc.x;
        const distance = Math.abs(oppX - myX);
        const distanceDiff = distance - this.#lastDistance;

        const worldWidth = this.#engine.worldWidth;
        const nearLeftWall  = myX < AIController.wallMargin;
        const nearRightWall = myRight > worldWidth - AIController.wallMargin;
        const wallEscapeDir = nearLeftWall ? 1 : nearRightWall ? -1 : 0;

        const isClosingIn = distanceDiff < -.1 && ((oppX < myX && this.#opponent.vel.x > 0.1) || (oppX > myX && this.#opponent.vel.x < -0.1));
        const isInRange = distance < AIController.punchRange;

        if (this.#opponent.isPunching && !this.#opponentWasPunching) {
            this.#reactionTimer = this.#reactionDelay;
            this.#blockDuration = Fighter.defaultPunchAnimTimer * 2;
        }
        this.#opponentWasPunching = this.#opponent.isPunching;

        if (this.#reactionTimer > 0) this.#reactionTimer -= deltaTime;
        if (this.#blockDuration > 0 && this.#reactionTimer <= 0) this.#blockDuration -= deltaTime;

        const shouldBait = isClosingIn && !this.#opponent.isPunching && distance < AIController.punchRange + 20 && (this.#difficulty === 1 || Math.random() < this.#baitChance);

        if (wallEscapeDir !== 0) {
            // Cornered
            move = wallEscapeDir;
            blocking = false;
        } else if (this.#blockDuration > 0 && this.#reactionTimer <= 0) {
            // Defending
            blocking = isInRange && (this.difficulty === 1 || Math.random() < this.#blockChance);
            move = 0;
        } else if (shouldBait) {
            // Baiting
            move = (oppX < myX) ? 1 : -1;
            blocking = false;
        } else if (this.difficulty === 1 || Math.random() >= this.#missChance) {
            // Attacking
            move = (oppX < myX) ? -1 : 1;

            if (isInRange) this.#pawn.Punch();
        }

        const heightDiff = (this.#opponent.loc.y + this.#opponent.size.h * 0.2) - (this.#pawn.loc.y);
        if (isInRange && heightDiff < -10 && this.#pawn.isGrounded) this.#pawn.Jump();

        this.#pawn.moveInput = move;
        this.#pawn.SetBlocking(blocking);
        this.#lastDistance = distance;
    }

    Draw(ctx) { }

    Reset() {
        this.#pawn.moveInput = 0;
    }
}