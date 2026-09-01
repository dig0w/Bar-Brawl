import { FighterEngine } from "./engine.js";
import { Fighter } from "./fighter.js";

export class AIController {
    #engine = null;
    #pawn = null;
    #opponent = null;

    static attackRange = 20;
    static wallMargin = 15;

    #lastDistance;

    #opponentWasAttacking = false;
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
        let crouching = false;

        const myX = this.#pawn.loc.x;
        const myRight = myX + this.#pawn.size.w;
        const oppX = this.#opponent.loc.x;
        const distance = Math.abs(oppX - myX);
        const distanceDiff = distance - this.#lastDistance;

        const worldWidth = this.#engine.worldWidth;
        const nearLeftWall = myX < AIController.wallMargin;
        const nearRightWall = myRight > worldWidth - AIController.wallMargin;
        const wallEscapeDir = nearLeftWall ? 1 : nearRightWall ? -1 : 0;

        const isClosingIn = distanceDiff < -.1 && ((oppX < myX && this.#opponent.vel.x > 0.1) || (oppX > myX && this.#opponent.vel.x < -0.1));
        const isInAttackRange = distance < AIController.attackRange;

        const isOpponentAttacking = this.#opponent.isPunching || this.#opponent.isKicking;

        if (isOpponentAttacking && !this.#opponentWasAttacking) {
            this.#reactionTimer = this.#reactionDelay;
            this.#blockDuration = Fighter.defaultPunchAnimTimer * 2;
        }
        this.#opponentWasAttacking = isOpponentAttacking;

        if (this.#reactionTimer > 0) this.#reactionTimer -= deltaTime;
        if (this.#blockDuration > 0 && this.#reactionTimer <= 0) this.#blockDuration -= deltaTime;

        const shouldBait = isClosingIn && !isOpponentAttacking && distance < AIController.attackRange + 20 && (this.#difficulty === 1 || Math.random() < this.#baitChance);

        if (wallEscapeDir !== 0) {
            // Cornered
            move = wallEscapeDir;
        } else if (this.#blockDuration > 0 && this.#reactionTimer <= 0) {
            // Defending
            blocking = isInAttackRange && (this.#difficulty === 1 || Math.random() < this.#blockChance);
            if (blocking && this.#opponent.isCrouching) crouching = true; // Crouch block to defend sweeps
        } else if (shouldBait) {
            // Baiting
            move = (oppX < myX) ? 1 : -1;
        } else if (this.#difficulty === 1 || Math.random() >= this.#missChance) {
            // Attacking
            move = (oppX < myX) ? -1 : 1;

            if (isInAttackRange) {
                // Decide attack type
                const doSweep = isInAttackRange && Math.random() > 0.6;

                if (doSweep) {
                    crouching = true;
                    this.#pawn.Kick();
                } else if (isInAttackRange && Math.random() > 0.5) {
                    this.#pawn.Punch();
                } else {
                    this.#pawn.Kick();
                }
            }
        }

        const heightDiff = (this.#opponent.loc.y + this.#opponent.size.h * 0.2) - (this.#pawn.loc.y);
        if (isInAttackRange && heightDiff < -10 && this.#pawn.isGrounded) this.#pawn.Jump();

        this.#pawn.moveInput = move;
        this.#pawn.SetCrouching(crouching);
        this.#pawn.SetBlocking(blocking);
        this.#lastDistance = distance;
    }

    Reset() {
        this.#pawn.moveInput = 0;
    }
}