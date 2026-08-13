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
    #hasJumped = false;

    static bodyImg0 = Object.assign(new Image(), { src: "assets/bald_sheet.png" });
    static bodyImg1 = Object.assign(new Image(), { src: "assets/biker_sheet.png" });
    #bodyImg = null;
    static defaultBodyAnimTimer = 20 / 60;
    static maxBodyAnimState = 2;
    #bodyAnimState = 0;
    #bodyAnimTimer = Fighter.defaultBodyAnimTimer;

    moveInput = 0;
    static defaultWalkingAnimTimer = 8 / 60;
    static maxWalkingAnimState = 3;
    #walkingAnimState = 0;
    #walkingAnimTimer = Fighter.defaultWalkingAnimTimer;

    static defaultPunchAnimTimer = 6 / 60;
    static maxPunchAnimState = 3;
    #punchAnimState = -1;
    #punchAnimTimer = 0;

    #punchHasHit = false;
    #punchTimer = 0;
    #startPunchTrace = Fighter.defaultPunchAnimTimer / 2;
    #endPunchTrace = Fighter.defaultPunchAnimTimer + (Fighter.defaultPunchAnimTimer / 2);
    static defaultPunchCooldown = 18 / 60;
    #punchCooldown = 0;

    #isBlocking = false;

    #celebrating = false;

    static defaultPunchedAnimTimer = 14 / 60;
    #punchedAnimTimer = 0;
    static defaultPunchedCooldown = 22 / 60;
    #punchedCooldown = 0;

    static defaultDieAnimTimer = 10 / 60;
    static maxDieAnimState = 3;
    #dieAnimState = 0;
    #dieAnimTimer = 0;

    static bloodImg = Object.assign(new Image(), { src: "assets/blood_sheet.png" });
    static bloodSize = { w: 16, h: 16 };
    static defaultBloodAnimTimer = 8 / 60;
    static maxBloodAnimState = 3;
    #bloodAnimTimer = 0;
    #bloodAnimState = -1;
    #bloodLoc = { x: 0, y: 0 };

    static shadowSize = { w: 12, h: 2 };
    static shadowOpacity = 0.2;
    static shadowJump = 25;

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
    // static hitboxesDamage = [2000, 2000, 2000, 2000, 2000, 2000];
    static maxHealth = 100;
    #health = Fighter.maxHealth;
    #isDead = false;
    static defaultGhostTimer = 4 / 60;
    #ghostHealth = 100;
    #ghostTimer = 0;
    static healthBarSize = { w: 41, h: 5 };
    static healthBarStartPos = { x: 0, y: 16 };
    static healthBarLoc = { x: 3, y: 5 };

    static winsBarSize = { w: 11, h: 2 };
    static winsBarStartPos = { x: 0, y: 21 };
    static winsBarLoc = { x: 5, y: 10 };

    #iconStartPos = { x: 5, y: 5 };
    static iconStartSize = { w: 21, h: 21 };
    static iconSize = { w: 9, h: 9 };

    static defaultIdleTimer = 2;
    #idleTimer = 0;
    #idleSfx = null;

    #networkHitReport = 0;

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
                break;
            case 1:
                this.#bodyImg = Fighter.bodyImg1;
                this.#bodyAnimState++;

                this.#loc.x = this.#engine.canvasSize.w - this.#size.w - 1;

                this.#facingRight = false;

                this.#fistHitBoxOffsetStart = Fighter.fistHitBoxOffsetStart1;
                this.#fistHitBoxOffsetEnd = Fighter.fistHitBoxOffsetEnd1;
                break;
        }
    }

    get loc() { return this.#loc; }
    get vel() { return this.#vel; }
    get size() { return this.#size; }

    get isGrounded() { return this.#loc.y >= this.#groundY; }
    get isPunching() { return this.#punchAnimState >= 0; }
    get isBlocking() { return this.#isBlocking; }
    get isStunned() { return this.#punchedCooldown > 0; }

    get hitboxes() { return this.#hitboxes; }
    get health() { return this.#health; }

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
        if (!this.isPunching && !this.isBlocking) {
            this.#vel.x += this.moveInput * moveSpeed * deltaTime;
        }

        // Gravity
        let gravityMultiplier = 1.0;
        if (!this.isGrounded) {
            if (Math.abs(this.#vel.y) < 50) { 
                gravityMultiplier = 0.7;
            } else if (this.#vel.y > 0) {
                gravityMultiplier = 1.8;
            }
        }

        this.#vel.y += (this.#engine.gravity * gravityMultiplier) * deltaTime;

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
        const opponent = this.#engine.getOpponent(this);
        this.#facingRight = this.#loc.x < opponent.loc.x;

        // Update Hitboxes
        this.#UpdateHitboxes();

        // Body Animation
        this.#bodyAnimTimer -= deltaTime;
        if (this.#bodyAnimTimer <= 0) {
            this.#bodyAnimState = (this.#bodyAnimState == Fighter.maxBodyAnimState - 1 && Math.random() > .9) ? 2 : (this.#bodyAnimState + 1) % Fighter.maxBodyAnimState;
            this.#bodyAnimTimer += Fighter.defaultBodyAnimTimer;
        }

        // Walking Animation
        const moveIntensity = Math.abs(this.#vel.x) / moveSpeed;
        this.#walkingAnimTimer -= deltaTime * (1.0 + (moveIntensity * 1.0));
        if (this.#walkingAnimTimer <= 0) {
            this.#walkingAnimState = (this.#walkingAnimState + 1) % Fighter.maxWalkingAnimState;
            this.#walkingAnimTimer += Fighter.defaultWalkingAnimTimer;

            if (this.#walkingAnimState > 0 && (this.#vel.x | 0) != 0) {
                this.#engine.PlaySound(9 + (Math.random() >= 0.75 ? 1 : 0), 0.95 + Math.random() * 0.1, 0.1);
            }
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
                        const { intersected, hitPoint } = Intersects(this.#fistHitBox, hitbox);
                        if (intersected) {
                            this.#punchHasHit = true;

                            this.#engine.PlaySound(3 + Math.round(Math.random()), 0.9 + Math.random() * 0.2);

                            opponent.TakeDamage(i, { x: (hitPoint.x | 0), y: (hitPoint.y | 0)}, Number(this.#vel.x.toFixed(2)));
                            break;
                        }
                    }
                }
            }
        } else {
            if (this.#punchCooldown > 0)
                this.#punchCooldown -= deltaTime;
        }

        // Punched Animation
        if (this.#punchedAnimTimer >= 0) this.#punchedAnimTimer -= deltaTime;
        if (this.#punchedCooldown >= 0) this.#punchedCooldown -= deltaTime;

        // Die Animation
        if (this.#dieAnimTimer >= 0 && this.#health <= 0) {
            this.#dieAnimTimer -= deltaTime;
            if (this.#dieAnimTimer <= 0 && this.#dieAnimState != Fighter.maxDieAnimState - 1) {
                this.#dieAnimState = (this.#dieAnimState + 1) % Fighter.maxDieAnimState;
                this.#dieAnimTimer += Fighter.defaultDieAnimTimer;
            }
        }

        // Blood Animation
        if (this.#bloodAnimTimer >= 0 && this.#bloodAnimState >= 0) {
            this.#bloodAnimTimer -= deltaTime;
            if (this.#bloodAnimTimer <= 0) {
                this.#bloodAnimState = (this.#bloodAnimState == Fighter.maxBloodAnimState - 1) ? -1 : (this.#bloodAnimState + 1) % Fighter.maxBloodAnimState;
                this.#bloodAnimTimer += Fighter.defaultBloodAnimTimer;
            }
        }

        // Health Bar Animation
        if (this.#ghostTimer > 0) {
            this.#ghostTimer -= deltaTime;
        } else if (this.#ghostHealth > this.#health) {
            this.#ghostHealth -= 20 * deltaTime;
            if (this.#ghostHealth < this.#health) this.#ghostHealth = this.#health;
        }

        // Land Sound
        if (this.#hasJumped && this.isGrounded && !this.#celebrating) {
            this.#engine.PlaySound(9, 0.7 + Math.random() * 0.2, 0.8);
            this.#hasJumped = false;
        }

        // Idle Sound
        if (this.#idleTimer > 0 && this.#engine.gameState === "FIGHTING") {
            this.#idleTimer -= deltaTime;

            if (this.#idleTimer <= 0) {
                const isLowHealth = this.#health <= (Fighter.maxHealth / 4);

                const pitch = isLowHealth ? 1.2 + Math.random() * 0.2 : 0.9 + Math.random() * 0.2;

                const volume = isLowHealth ? 0.8 : 0.4;

                this.#idleSfx = this.#engine.PlaySound(11, pitch, volume, true, 3000);
            }
        }
        if (this.#idleSfx && this.#engine.gameState !== "FIGHTING") {
            this.#idleSfx.StopSound(1000);
        }
    }

    Draw(ctx) {
        ctx.save();

        // Shadow
        const y = this.#engine.groundY;
        const x = this.#loc.x + (this.#size.w / 2) + ((Fighter.shadowSize.w / 2 - 2) * (this.#facingRight ? -1 : 1));
        const heightFactor = Math.max(0, 1 + ((this.#loc.y - y + 39) / (Fighter.shadowJump * 2)));

        ctx.save();
        ctx.beginPath();

        ctx.fillStyle = `rgba(0, 0, 0, ${Fighter.shadowOpacity * heightFactor})`;

        ctx.ellipse(x, y - Fighter.shadowSize.h / 2, Fighter.shadowSize.w * heightFactor, Fighter.shadowSize.h * heightFactor, 0, 0, Math.PI * 2);
        
        ctx.fill();
        ctx.restore();


        if (!this.#facingRight) {
            ctx.translate(this.#loc.x + this.#size.w / 2, 0);
            ctx.scale(-1, 1);
            ctx.translate(-(this.#loc.x + this.#size.w / 2), 0);
        }

        let frameCoords = { x: 0, y: 0 };
        if (this.#health <= 0) {
            // Die Animations
            switch (this.#dieAnimState) {
                case 0:
                    frameCoords = { x: 0, y: this.#size.h * 4 };
                    break;
                case 1:
                    frameCoords = { x: this.#size.w, y: this.#size.h * 4 };
                    break;
                case 2:
                    frameCoords = { x: this.#size.w * 2, y: this.#size.h * 4 };
                    break;
            }
        } else if (this.#punchedAnimTimer > 0) {
            // Punched Animation
            frameCoords = { x: 0, y: this.#size.h * 4 };
        } else if (this.#punchAnimState > 0 && this.isGrounded) {
            // Punch Animation
            switch (this.#punchAnimState) {
                case 0:
                case 2:
                    frameCoords = { x: 0, y: 0 };
                    break;
                case 1:
                    frameCoords = { x: 0, y: this.#size.h * 2 };
                    break;
            }
        } else if (this.isBlocking && this.isGrounded) {
            // Block Animation
            frameCoords = { x: this.#size.w, y: this.#size.h * 2 };
        } else if (this.#celebrating) {
            // Celebatrion Animation
            frameCoords = { x: this.#size.w * 2, y: this.#size.h * 2 };
        } else if (!this.isGrounded) {
            // Jump Animation
            if (this.#punchAnimState > 0) {
                // Punch Animation
                switch (this.#punchAnimState) {
                    case 0:
                    case 2:
                        frameCoords = { x: 0, y: this.#size.h * 3 };
                        break;
                    case 1:
                        frameCoords = { x: this.#size.w, y: this.#size.h * 3 };
                        break;
                }
            } else if (this.isBlocking) {
                // Block Animation
                frameCoords = { x: this.#size.w * 2, y: this.#size.h * 3 };
            } else {
                frameCoords = { x: 0, y: this.#size.h * 3 };
            }
        } else if ((this.#vel.x | 0) != 0) {
            // Walking Animation
            switch (this.#walkingAnimState) {
                case 0:
                    frameCoords = { x: 0, y: this.#size.h };
                    break;
                case 1:
                    frameCoords = { x: this.#size.w, y: this.#size.h };
                    break;
                case 2:
                        frameCoords = { x: this.#size.w * 2, y: this.#size.h };
                    break;
            }
        } else {
            // Body Animation
            switch (this.#bodyAnimState) {
                case 0:
                    frameCoords = { x: 0, y: 0 };
                    break;
                case 1:
                    frameCoords = { x: this.#size.w, y: 0 };
                    break;
                case 2:
                    frameCoords = { x: this.#size.w * 2, y: 0 };
                    break;
            }
        }

        ctx.drawImage(this.#bodyImg, (frameCoords.x | 0), (frameCoords.y | 0), (this.#size.w | 0), (this.#size.h | 0), (this.#loc.x | 0), (this.#loc.y | 0), (this.#size.w | 0), (this.#size.h | 0));

        ctx.restore();

        // Blood Animation
        if (this.#bloodAnimState >= 0) {
            switch (this.#bloodAnimState) {
                case 0:
                    frameCoords = { x: 0, y: 0 };
                    break;
                case 1:
                    frameCoords = { x: Fighter.bloodSize.w, y: 0 };
                    break;
                case 2:
                    frameCoords = { x: Fighter.bloodSize.w * 2, y: 0 };
                    break;
            }

            ctx.drawImage(Fighter.bloodImg, (frameCoords.x | 0), (frameCoords.y | 0), (Fighter.bloodSize.w | 0), (Fighter.bloodSize.h | 0), (this.#bloodLoc.x - Fighter.bloodSize.w / 2 | 0), (this.#bloodLoc.y - Fighter.bloodSize.h / 2 | 0), (Fighter.bloodSize.w | 0), (Fighter.bloodSize.h | 0));
        }
    }

    DrawUI(ctx) {
        if (this.#engine.gameState != "PRE_ROUND" && this.#engine.gameState != "FIGHTING" && this.#engine.gameState != "POS_ROUND") return;

        const isVariantZero = this.#variant == 0;

        // Health Bar
        const healthPercent = this.#health / Fighter.maxHealth;
        const ghostPercent = this.#ghostHealth / Fighter.maxHealth;

        const locX = (isVariantZero ? Fighter.healthBarLoc.x : this.#engine.canvasSize.w - Fighter.healthBarSize.w - Fighter.healthBarLoc.x);

        ctx.save();
        if (!isVariantZero) {
            ctx.translate(locX + Fighter.healthBarSize.w / 2, 0);
            ctx.scale(-1, 1);
            ctx.translate(-(locX + Fighter.healthBarSize.w / 2), 0);
        }

        // Empty Bar
        ctx.drawImage(FighterEngine.uiSheet, (Fighter.healthBarStartPos.x | 0), (Fighter.healthBarStartPos.y | 0), (Fighter.healthBarSize.w | 0), (Fighter.healthBarSize.h | 0),
                    (locX | 0), (Fighter.healthBarLoc.y | 0), (Fighter.healthBarSize.w | 0), (Fighter.healthBarSize.h | 0));

        // Ghost Bar
        const ghostWidth = (Fighter.healthBarSize.w * ghostPercent) | 0;
        ctx.save();
        ctx.beginPath();
        for (let y = 0; y < Fighter.healthBarSize.h; y++) {
            ctx.rect(locX | 0, (Fighter.healthBarLoc.y + y) | 0, ghostWidth - y | 0, 1);
        }
        ctx.closePath();
        ctx.clip();

        ctx.drawImage(FighterEngine.uiSheet, (Fighter.healthBarSize.w * 2 + Fighter.healthBarStartPos.x | 0), (Fighter.healthBarStartPos.y | 0), (ghostWidth | 0), (Fighter.healthBarSize.h | 0),
                    (locX | 0), (Fighter.healthBarLoc.y | 0), (ghostWidth | 0), (Fighter.healthBarSize.h | 0));
        ctx.restore();

        // Filled Bar
        const fillWidth = (Fighter.healthBarSize.w * healthPercent) | 0;
        ctx.save();
        ctx.beginPath();
        for (let y = 0; y < Fighter.healthBarSize.h; y++) {
            ctx.rect(locX | 0, (Fighter.healthBarLoc.y + y) | 0, fillWidth - y | 0, 1);
        }
        ctx.closePath();
        ctx.clip();

        ctx.drawImage(FighterEngine.uiSheet, (Fighter.healthBarSize.w + Fighter.healthBarStartPos.x), (Fighter.healthBarStartPos.y | 0), (fillWidth | 0), (Fighter.healthBarSize.h | 0),
                    (locX | 0), (Fighter.healthBarLoc.y | 0), (fillWidth | 0), (Fighter.healthBarSize.h | 0));
        ctx.restore();

        // Wins Bar
        const winPercent = this.#engine.getScore(this) / (FighterEngine.maxRounds - 1);
        const locXw = (isVariantZero ? Fighter.winsBarLoc.x : this.#engine.canvasSize.w - Fighter.healthBarSize.w - 1);

        // Empty Bar
        ctx.drawImage(FighterEngine.uiSheet, (Fighter.winsBarStartPos.x | 0), (Fighter.winsBarStartPos.y | 0), (Fighter.winsBarSize.w | 0), (Fighter.winsBarSize.h | 0),
                    (locXw | 0), (Fighter.winsBarLoc.y | 0), (Fighter.winsBarSize.w | 0), (Fighter.winsBarSize.h | 0));

        // Filled Bar
        const fillWidthw = (Fighter.winsBarSize.w * winPercent) | 0;
        ctx.drawImage(FighterEngine.uiSheet, (Fighter.winsBarSize.w + Fighter.winsBarStartPos.x | 0), (Fighter.winsBarStartPos.y | 0), (fillWidthw | 0), (Fighter.winsBarSize.h | 0),
                    (locXw | 0), (Fighter.winsBarLoc.y | 0), (fillWidthw | 0), (Fighter.winsBarSize.h | 0));

        // Fighter Icon
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(this.#bodyImg, (this.#iconStartPos.x | 0), (this.#iconStartPos.y | 0), Fighter.iconStartSize.w, Fighter.iconStartSize.h,
                    ((locX + 1) | 0), 0, Fighter.iconSize.w, Fighter.iconSize.h);
        ctx.imageSmoothingEnabled = false;

        ctx.restore();
    }

    Jump() {
        if (!this.isPunching && !this.isBlocking && this.isGrounded && !this.isStunned) {
            this.#vel.y -= this.#jumpForce;
            this.#hasJumped = true;

            this.Idle();

            this.#engine.PlaySound(7 + (Math.random() >= 0.95 ? 1 : 0), 0.9 + Math.random() * 0.2);
        }
    }

    Punch() {
        if (!this.isPunching && !this.isBlocking && this.#punchCooldown <= 0 && !this.isStunned) {
            this.#punchAnimState = 0;
            this.#punchAnimTimer = Fighter.defaultPunchAnimTimer;
            this.#vel.x += this.moveInput * 60;
            this.#punchTimer = 0;
            this.#punchHasHit = false;
            this.#punchCooldown = Fighter.defaultPunchCooldown;

            this.Idle();

            this.#engine.PlaySound(1 + (Math.random() >= 0.55 ? 1 : 0), 0.9 + Math.random() * 0.2);
        }
    }

    SetBlocking(isHeld) {
        if (!isHeld && this.#isBlocking != isHeld) {
            this.#isBlocking = isHeld;

            this.Idle();

            this.#engine.PlaySound(7, 0.85 + Math.random() * 0.1, 0.2);
        } else if (isHeld && !this.isPunching && !this.isBlocking && !this.isStunned) {
            this.#isBlocking = isHeld;
            this.#vel.x = 0;

            this.Idle();

            this.#engine.PlaySound(7, 0.85 + Math.random() * 0.1, 0.3);
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

    TakeDamage(hitboxIndex, hitPoint, hitSpeed) {
        const relativeSpeed = (hitSpeed - this.#vel.x) * (this.#facingRight ? -1 : 1);
        const scaleFactor = Math.max(0.4, Math.min(1.8, 1 + (relativeSpeed / 150)));
        let damage = Fighter.hitboxesDamage[hitboxIndex] * scaleFactor;

        const cubicInterp = (x, p1, p2) => {
            const t = Math.max(0, Math.min(1, (x - p1.x) / (p2.x - p1.x)));
            const smoothT = t * t * (3 - 2 * t);
            return p1.y + (p2.y - p1.y) * smoothT;
        };

        let knockback = 800;
        if (relativeSpeed < -20) {
            knockback = cubicInterp(relativeSpeed, { x: -74, y: 30 }, { x: -20, y: 135 });
        } else if (relativeSpeed < 0) {
            knockback = cubicInterp(relativeSpeed, { x: -20, y: 135 }, { x: 0, y: 800 })
        } else if (relativeSpeed < 20) {
            knockback = cubicInterp(relativeSpeed, { x: 0, y: 800 }, { x: 20, y: 255 })
        } else {
            knockback = cubicInterp(relativeSpeed, { x: 20, y: 255 }, { x: 74, y: 150 })
        }

        this.#ghostTimer = Fighter.defaultGhostTimer;

        if (this.isBlocking == 1) {
            damage *= 0.2;
            knockback *= 0.6;

            this.#engine.PlaySound(5 + (Math.random() >= 0.5 ? 1 : 0), 1.2 + Math.random() * 0.2, 0.5);
        } else {
            this.#engine.PlaySound(5 + (Math.random() >= 0.5 ? 1 : 0), 0.9 + Math.random() * 0.2);

            this.#punchedAnimTimer = Fighter.defaultPunchedAnimTimer;
            this.#punchedCooldown = Fighter.defaultPunchedCooldown;
            this.#bloodAnimTimer = Fighter.defaultBloodAnimTimer;
            this.#bloodAnimState = 0;
            this.#bloodLoc.x = hitPoint.x;
            this.#bloodLoc.y = hitPoint.y;
        }

        this.#health -= damage;

        this.#punchAnimState = -1;

        this.#vel.x += this.#facingRight ? -knockback : knockback;

        this.Idle();

        let intensity = 1;
        if (this.#health <= 0 && !this.#isDead) {
            this.#health = 0;
            this.Die();
            this.#isDead = true;
            intensity = 3;
        }

        this.#engine.CameraShake(intensity, 300);
        this.#engine.SlowTime(0, 100);
    }

    Die() {
        this.#engine.RoundOver(this);

        this.#punchAnimState = -1;
        this.#isBlocking = false;

        this.#dieAnimTimer = Fighter.defaultDieAnimTimer;
        this.#dieAnimState = 0;
    }

    async Celebrate() {
        this.#punchAnimState = -1;
        this.#isBlocking = false;
        this.#vel.x = 0;
        this.#vel.y = 0;

        await this.#engine.Wait(150);

        this.#vel.y -= this.#jumpForce;

        await this.#engine.Wait(50);
        this.#celebrating = true;
    }

    Idle() {
        if (this.#idleSfx) this.#idleSfx.StopSound(1000);

        this.#idleTimer = Fighter.defaultIdleTimer;
    }

    Reset() {
        if (this.#variant == 0) this.#loc.x = 10;
        else this.#loc.x = this.#engine.canvasSize.w - this.#size.w - 1;
        
        this.#loc.y = this.#groundY;

        this.#vel.x = 0;
        this.#vel.y = 0;

        this.#facingRight = this.#variant == 0;

        this.#health = Fighter.maxHealth;
        this.#isDead = false;
        this.#ghostHealth = this.#health;

        this.moveInput = 0;
        this.#hasJumped = false;
        this.#punchAnimState = -1;
        this.#punchCooldown = 0;
        this.#isBlocking = false;
        this.#celebrating = false;
        this.#punchedCooldown = 0;
        this.#dieAnimState = -1;
        this.#bloodAnimState = -1;
    }


    // Captures every field that affects simulation or visible presentation
    SerializeState() {
        return {
            loc: { x: this.#loc.x, y: this.#loc.y },
            vel: { x: this.#vel.x, y: this.#vel.y },
            facingRight: this.#facingRight,

            moveInput: this.moveInput,

            bodyAnimState: this.#bodyAnimState,
            bodyAnimTimer: this.#bodyAnimTimer,
            walkingAnimState: this.#walkingAnimState,
            walkingAnimTimer: this.#walkingAnimTimer,

            punchAnimState: this.#punchAnimState,
            punchAnimTimer: this.#punchAnimTimer,
            punchHasHit: this.#punchHasHit,
            punchTimer: this.#punchTimer,
            punchCooldown: this.#punchCooldown,

            isBlocking: this.#isBlocking,
            celebrating: this.#celebrating,

            punchedAnimTimer: this.#punchedAnimTimer,
            punchedCooldown: this.#punchedCooldown,

            dieAnimState: this.#dieAnimState,
            dieAnimTimer: this.#dieAnimTimer,

            bloodAnimTimer: this.#bloodAnimTimer,
            bloodAnimState: this.#bloodAnimState,
            bloodLoc: { x: this.#bloodLoc.x, y: this.#bloodLoc.y },

            health: this.#health,
            isDead: this.#isDead,
            ghostHealth: this.#ghostHealth
        };
    }

    // Restores a state produced by SerializeState()
    ApplyState(state) {
        if (!state) return;

        this.#loc.x = state.loc.x;
        this.#loc.y = state.loc.y;
        this.#vel.x = state.vel.x;
        this.#vel.y = state.vel.y;
        this.#facingRight = state.facingRight;

        this.moveInput = state.moveInput;

        this.#bodyAnimState = state.bodyAnimState;
        this.#bodyAnimTimer = state.bodyAnimTimer;
        this.#walkingAnimState = state.walkingAnimState;
        this.#walkingAnimTimer = state.walkingAnimTimer;

        this.#punchAnimState = state.punchAnimState;
        this.#punchAnimTimer = state.punchAnimTimer;
        this.#punchHasHit = state.punchHasHit;
        this.#punchTimer = state.punchTimer;
        this.#punchCooldown = state.punchCooldown;

        this.#isBlocking = state.isBlocking;
        this.#celebrating = state.celebrating;

        this.#punchedAnimTimer = state.punchedAnimTimer;
        this.#punchedCooldown = state.punchedCooldown;

        this.#dieAnimState = state.dieAnimState;
        this.#dieAnimTimer = state.dieAnimTimer;

        this.#bloodAnimTimer = state.bloodAnimTimer;
        this.#bloodAnimState = state.bloodAnimState;
        this.#bloodLoc.x = state.bloodLoc.x;
        this.#bloodLoc.y = state.bloodLoc.y;

        this.#health = state.health;
        this.#isDead = state.isDead;
        this.#ghostHealth = state.ghostHealth;

        // Hitboxes are derived from loc/facing, so just rebuild them
        this.#UpdateHitboxes();
    }
}
