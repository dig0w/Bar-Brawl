import { FighterEngine } from "./engine.js";
import { Circle, Intersects, Rect } from "./hitboxes.js";

export class Fighter {
    static showHitboxes = false;
    #engine = null;
    #variant = -1;

    #size = { w: 32, h: 39 };
    #loc = { x: 0, y: 0 };
    #vel = { x: 0, y: 0 };
    #facingRight = true;

    #groundY = 0;

    #jumpForce = 250;

    static bodyImg0 = Object.assign(new Image(), { src: "assets/bald_sheet.png" });
    static bodyImg1 = Object.assign(new Image(), { src: "assets/biker_sheet.png" });
    #bodyImg = null;
    static defaultBodyAnimTimer = 10 / 60;
    static maxBodyAnimState = 3;
    #bodyAnimState = 0;
    #bodyAnimTimer = Fighter.defaultBodyAnimTimer;

    moveInput = 0;

    static defaultPunchAnimTimer = 6 / 60;
    static maxPunchAnimState = 3;
    #punchAnimState = -1;
    #punchAnimTimer = Fighter.defaultPunchAnimTimer;

    #punchHasHit = false;
    #punchTimer = 0;
    #startPunchTrace = Fighter.defaultPunchAnimTimer / 2;
    #endPunchTrace = Fighter.defaultPunchAnimTimer + (Fighter.defaultPunchAnimTimer / 2);
    static defaultPunchCooldown = 12 / 60;
    #punchCooldown = Fighter.defaultPunchCooldown;

    #isBlockHeld = false;
    static defaultBlockAnimTimer = 6 / 60;
    static maxBlockAnimState = 3;
    #blockAnimState = -1;
    #blockAnimTimer = Fighter.defaultBlockAnimTimer;

    static hitboxesOffset = [
        { x: 15, y: 12 },
        { x: 10, y: 18 },
        { x: 9, y: 18 },
        { x: 16, y: 18 },
        { x: 12, y: 26 },
        { x: 15, y: 26 }
    ];
    #hitboxes = [];
    static fistHitBoxOffsetStart0 = { x: 21, y: 23 };
    static fistHitBoxOffsetEnd0 = { x: 29, y: 20 };
    static fistHitBoxOffsetStart1 = { x: 22, y: 21 };
    static fistHitBoxOffsetEnd1 = { x: 29, y: 18 };
    #fistHitBoxOffsetStart = null;
    #fistHitBoxOffsetEnd = null;
    #fistHitBox = null;

    static hitboxesDamage = [15, 10, 7, 7, 5, 5];
    static maxHealth = 100;
    #health = Fighter.maxHealth;
    static defaultGhostTimer = 4 / 60;
    #ghostHealth = 100;
    #ghostTimer = Fighter.defaultGhostTimer;
    static healthBar = Object.assign(new Image(), { src: "assets/health_bar.png" });
    static healthBarSize = { w: 41, h: 5 };
    static healthBarLoc = { x: 3, y: 5 };

    static iconImg0 = Object.assign(new Image(), { src: "assets/bald_icon.png" });
    static iconImg1 = Object.assign(new Image(), { src: "assets/biker_icon.png" });
    #iconImg = null;

    #roundsWon = 0;
    static winsBar = Object.assign(new Image(), { src: "assets/wins_bar.png" });
    static winsBarSize = { w: 11, h: 2 };
    static winsBarLoc = { x: 5, y: 10 };

    constructor(engine = null, variant = 0) {
        if (!(engine instanceof FighterEngine))
            throw new Error(`${this.constructor.name} requires a ${FighterEngine.name} instance.`);

        this.#engine = engine;
        this.#variant = variant;

        switch (variant) {
            case 0:
                this.#bodyImg = Fighter.bodyImg0;
                this.#loc.x = 10;

                this.#fistHitBoxOffsetStart = Fighter.fistHitBoxOffsetStart0;
                this.#fistHitBoxOffsetEnd = Fighter.fistHitBoxOffsetEnd0;

                this.#iconImg = Fighter.iconImg0;
                break;
            case 1:
                this.#bodyImg = Fighter.bodyImg1;
                this.#loc.x = this.#engine.canvas.width - this.#size.w - 1;

                this.#facingRight = false;

                this.#fistHitBoxOffsetStart = Fighter.fistHitBoxOffsetStart1;
                this.#fistHitBoxOffsetEnd = Fighter.fistHitBoxOffsetEnd1;

                this.#iconImg = Fighter.iconImg1;
                break;
        }
    }

    get loc() { return this.#loc }
    get size() { return this.#size }

    get isGrounded() { return this.#loc.y >= this.#groundY }

    get hitboxes() { return this.#hitboxes }

    Begin() {
        this.#groundY = this.#engine.groundY - this.#size.h;
        this.#loc.y = this.#groundY;

        this.#hitboxes = [
            new Circle(0, 0, 6),    // Head
            new Rect(0, 0, 9, 9),   // Chest
            new Rect(0, 0, 4, 10),  // Arm Left
            new Rect(0, 0, 4, 10),  // Arm Right
            new Rect(0, 0, 4, 12),  // Leg Left
            new Rect(0, 0, 4, 12)   // Leg Right
        ];
        this.#fistHitBox = new Circle(0, 0, 4);

        this.#UpdateHitboxes();
    }

    Tick(deltaTime) {
        // Move
        const moveSpeed = 100;
        if (this.#punchAnimState < 0 && this.#blockAnimState < 0) {
            this.#vel.x += this.moveInput * moveSpeed * deltaTime;
        }

        // Gravity
        this.#vel.y += this.#engine.gravity * deltaTime;

        // Friction
        const friction = Math.pow(this.#engine.friction, deltaTime * 60);
        this.#vel.x *= friction * (this.moveInput == 0 ? .8 : 1);
        this.#vel.y *= friction;

        // Apply
        this.#loc.y += this.#vel.y * deltaTime;
        this.#loc.x += this.#vel.x * deltaTime;


        // X Bounds
        const maxBoundary = this.#engine.worldWidth - this.#size.w;
        if (this.#loc.x > maxBoundary) {
            this.#loc.x = maxBoundary;
            this.#vel.x = 0;
        }
        if (this.#loc.x < 0) {
            this.#loc.x = 0;
            this.#vel.x = 0;
        }

        // Y Bounds
        if (this.#loc.y > this.#groundY) {
            this.#loc.y = this.#groundY;
            this.#vel.y = 0;
        }
        if (this.#loc.y < 0) {
            this.#loc.y = 0;
            this.#vel.y = 0;
        }

        // Face Opponent
        const opponent = (this.#engine.fighter0 === this) ? this.#engine.fighter1 : this.#engine.fighter0;
        this.#facingRight = this.#loc.x < opponent.loc.x;

        // Update Hitboxes
        this.#UpdateHitboxes();

        // Body Animation
        const moveIntensity = Math.abs(this.#vel.x) / moveSpeed;
        this.#bodyAnimTimer -= deltaTime * (1.0 + (moveIntensity * 1.0));
        if (this.#bodyAnimTimer <= 0) {
            this.#bodyAnimState = (this.#bodyAnimState + 1) % Fighter.maxBodyAnimState;
            this.#bodyAnimTimer += Fighter.defaultBodyAnimTimer;
        }

        // Punch Animation
        if (this.#punchAnimState >= 0) {
            this.#punchAnimTimer -= deltaTime;

            if (this.#punchAnimTimer <= 0) {
                this.#punchAnimState++;

                if (this.#punchAnimState == Fighter.maxPunchAnimState) {
                    this.#punchAnimState = -1;
                } else {
                    this.#punchAnimTimer += Fighter.defaultPunchAnimTimer;
                }
            }

            if (!this.#punchHasHit) {
                this.#punchTimer += deltaTime;
                if (this.#punchTimer >= this.#startPunchTrace && this.#punchTimer <= this.#endPunchTrace) {
                    const percent = (this.#punchTimer - this.#startPunchTrace) / (this.#endPunchTrace - this.#startPunchTrace);

                    const dx = this.#fistHitBoxOffsetEnd.x - this.#fistHitBoxOffsetStart.x;
                    const dy = this.#fistHitBoxOffsetEnd.y - this.#fistHitBoxOffsetStart.y;
                    let localX = this.#fistHitBoxOffsetStart.x + (dx * percent);
                    let localY = this.#fistHitBoxOffsetStart.y + (dy * percent);

                    if (!this.#facingRight) localX = this.#size.w - localX;

                    this.#fistHitBox.loc.x = (this.#loc.x + localX) | 0;
                    this.#fistHitBox.loc.y = (this.#loc.y + localY) | 0;

                    for (let i = 0; i < opponent.hitboxes.length; i++) {
                        const hitbox = opponent.hitboxes[i];
                        if (Intersects(this.#fistHitBox, hitbox)) {
                            this.#punchHasHit = true;

                            opponent.TakeDamage(Fighter.hitboxesDamage[i]);
                            break;
                        }
                    }
                }
            }
        } else {
            if (this.#punchCooldown > 0)
                this.#punchCooldown -= deltaTime;
        }

        // Block Animation
        if (this.#blockAnimState >= 0) {
            this.#blockAnimTimer -= deltaTime;

            if (this.#blockAnimTimer <= 0) {
                if (this.#blockAnimState != 1 || (this.#blockAnimState == 1 && !this.#isBlockHeld))
                    this.#blockAnimState++;

                if (this.#blockAnimState == Fighter.maxBlockAnimState) {
                    this.#blockAnimState = -1;
                } else {
                    this.#blockAnimTimer += Fighter.defaultBlockAnimTimer;
                }
            }
        }

        // Health Bar Animation
        if (this.#ghostTimer > 0) {
            this.#ghostTimer -= deltaTime;
        } else if (this.#ghostHealth > this.#health) {
            this.#ghostHealth -= 20 * deltaTime;
            if (this.#ghostHealth < this.#health) this.#ghostHealth = this.#health;
        }
    }

    Draw(ctx) {
        ctx.save();

        if (!this.#facingRight) {
            ctx.translate(this.#loc.x + this.#size.w / 2, 0);
            ctx.scale(-1, 1);
            ctx.translate(-(this.#loc.x + this.#size.w / 2), 0);
        }

        let frameCoords = { x: 0, y: 0 };
        if (this.#punchAnimState >= 0) {
            // Punch Animation
            switch (this.#punchAnimState) {
                case 0:
                case 2:
                    frameCoords = { x: this.#size.w * 3, y: 0 };
                    break;
                case 1:
                    frameCoords = { x: this.#size.w * 4, y: 0 };
                    break;
            }
        } else if (this.#blockAnimState >= 0) {
            // Block Animation
            switch (this.#blockAnimState) {
                case 0:
                case 2:
                    frameCoords = { x: this.#size.w * 3, y: 0 };
                    break;
                case 1:
                    frameCoords = { x: this.#size.w * 5, y: 0 };
                    break;
            }
        } else {
            // Body Animation
            if ((this.#vel.x | 0) != 0 && this.isGrounded) {
                switch (this.#bodyAnimState) {
                    case 0:
                        frameCoords = { x: this.#size.w, y: 0 };
                        break;
                    case 1:
                        frameCoords = { x: 0, y: 0 };
                        break;
                    case 2:
                        frameCoords = { x: this.#size.w * 2, y: 0 };
                        break;
                }
            }
        }

        ctx.drawImage(this.#bodyImg, (frameCoords.x | 0), (frameCoords.y | 0), (this.#size.w | 0), (this.#size.h | 0), (this.#loc.x | 0), (this.#loc.y | 0), (this.#size.w | 0), (this.#size.h | 0));

        ctx.restore();

        if (Fighter.showHitboxes) this.#drawDebugHitboxes(ctx);
    }

    DrawUI(ctx) {
        const isVariantZero = this.#variant == 0;

        // Health Bar
        const healthPercent = this.#health / Fighter.maxHealth;
        const ghostPercent = this.#ghostHealth / Fighter.maxHealth;

        const locX = (isVariantZero ? Fighter.healthBarLoc.x : this.#engine.canvas.width - Fighter.healthBarSize.w - Fighter.healthBarLoc.x);

        ctx.save();
        if (!isVariantZero) {
            ctx.translate(locX + Fighter.healthBarSize.w / 2, 0);
            ctx.scale(-1, 1);
            ctx.translate(-(locX + Fighter.healthBarSize.w / 2), 0);
        }

        // Empty Bar
        ctx.drawImage(Fighter.healthBar, 0, 0, (Fighter.healthBarSize.w | 0), (Fighter.healthBarSize.h | 0),
                    (locX | 0), (Fighter.healthBarLoc.y | 0), (Fighter.healthBarSize.w | 0), (Fighter.healthBarSize.h | 0));

        // Ghost Bar
        const ghostWidth = (Fighter.healthBarSize.w * ghostPercent) | 0;
        ctx.drawImage(Fighter.healthBar, 0, (Fighter.healthBarSize.h * 2 | 0), (ghostWidth | 0), (Fighter.healthBarSize.h | 0),
                    (locX | 0), (Fighter.healthBarLoc.y | 0), (ghostWidth | 0), (Fighter.healthBarSize.h | 0));

        // Filled Bar
        const fillWidth = (Fighter.healthBarSize.w * healthPercent) | 0;
        ctx.drawImage(Fighter.healthBar, 0, (Fighter.healthBarSize.h | 0), (fillWidth | 0), (Fighter.healthBarSize.h | 0),
                    (locX | 0), (Fighter.healthBarLoc.y | 0), (fillWidth | 0), (Fighter.healthBarSize.h | 0));

        // Fighter Icon
        ctx.drawImage(this.#iconImg, 0, 0, 9, 9,
                    ((locX + 1) | 0), 0, 9, 9);

        // Wins Bar
        const winPercent = this.#roundsWon / (FighterEngine.maxRounds - 1);
        const locXw = (isVariantZero ? Fighter.winsBarLoc.x : this.#engine.canvas.width - Fighter.healthBarSize.w - 1);

        // Empty Bar
        ctx.drawImage(Fighter.winsBar, 0, 0, (Fighter.winsBarSize.w | 0), (Fighter.winsBarSize.h | 0),
                    (locXw | 0), (Fighter.winsBarLoc.y | 0), (Fighter.winsBarSize.w | 0), (Fighter.winsBarSize.h | 0));
        
        // Filled Bar
        const fillWidthw = (Fighter.winsBarSize.w * winPercent) | 0;
        ctx.drawImage(Fighter.winsBar, 0, (Fighter.winsBarSize.h | 0), (fillWidthw | 0), (Fighter.winsBarSize.h | 0),
                    (locXw | 0), (Fighter.winsBarLoc.y | 0), (fillWidthw | 0), (Fighter.winsBarSize.h | 0));

        ctx.restore();
    }

    Jump() {
        if (this.#punchAnimState < 0 && this.#blockAnimState < 0 && this.isGrounded)
            this.#vel.y -= this.#jumpForce;
    }

    Punch() {
        if (this.#punchAnimState < 0 && this.#blockAnimState < 0 && this.isGrounded && this.#punchCooldown <= 0) {
            this.#punchAnimState = 0;
            this.#punchAnimTimer = Fighter.defaultPunchAnimTimer;
            this.#vel.x += this.moveInput * 60;
            this.#punchTimer = 0;
            this.#punchHasHit = false;
            this.#punchCooldown = Fighter.defaultPunchCooldown;
        }
    }

    SetBlocking(isHeld) {
        this.#isBlockHeld = isHeld;

        if (this.#isBlockHeld && this.#punchAnimState < 0 && this.#blockAnimState < 0 && this.isGrounded) {
            this.#blockAnimState = 0;
            this.#blockAnimTimer = Fighter.defaultBlockAnimTimer;
            this.#vel.x = 0;
        }
    }

    #UpdateHitboxes() {
        for (let i = 0; i < this.#hitboxes.length; i++) {
            const offset = Fighter.hitboxesOffset[i];
            const hitbox = this.#hitboxes[i];

            let localX = offset.x;

            if (!this.#facingRight) {
                const hitboxW = hitbox instanceof Rect ? hitbox.size.w : 0;
                localX = this.#size.w - localX - hitboxW;
            }

            hitbox.loc.x = (this.#loc.x + localX) | 0;
            hitbox.loc.y = (this.#loc.y + offset.y) | 0;
        }
    }

    TakeDamage(damage) {
        let knockback = 300;

        if (this.#blockAnimState == 1) {
            damage *= 0.2;
            knockback = knockback * 0.4;
        }

        this.#health -= damage;

        this.#punchAnimState = -1;

        this.#vel.x += this.#facingRight ? -knockback : knockback;

        this.#ghostTimer = Fighter.defaultGhostTimer;

        if (this.#health <= 0) {
            this.#health = 0;
            this.Die();
        }
    }

    Die() {

    }

    Reset() {
        if (this.#variant == 0) this.#loc.x = 10;
        else this.#loc.x = this.#engine.canvas.width - this.#size.w - 1;
        
        this.#loc.y = this.#groundY;

        this.#vel.x = 0;
        this.#vel.y = 0;

        this.#facingRight = this.#variant == 0;
    }


    #drawDebugHitboxes(ctx) {
        ctx.save();
        ctx.lineWidth = .5;

        ctx.strokeStyle = "rgba(0, 255, 0, 0.7)";

        const rectLimbs = [this.#hitboxes[1], this.#hitboxes[2], this.#hitboxes[3], this.#hitboxes[4], this.#hitboxes[5]];
        for (let rect of rectLimbs) {
            ctx.beginPath();
            ctx.rect(rect.loc.x, rect.loc.y, rect.size.w, rect.size.h);
            ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(this.#hitboxes[0].loc.x, this.#hitboxes[0].loc.y, this.#hitboxes[0].radius, 0, Math.PI * 2);
        ctx.stroke();

        if (this.#punchTimer >= this.#startPunchTrace && this.#punchTimer <= this.#endPunchTrace) {
            ctx.strokeStyle = "rgba(255, 0, 0, 0.7)";
            ctx.beginPath();
            ctx.arc(this.#fistHitBox.loc.x, this.#fistHitBox.loc.y, this.#fistHitBox.radius, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }
}