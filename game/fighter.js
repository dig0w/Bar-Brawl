import { FighterEngine } from "./engine.js";
import { Circle, Intersects, Rect } from "./hitboxes.js";

export class Fighter {
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
    static bodyImg2 = Object.assign(new Image(), { src: "assets/spidey_sheet.png" });
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

    #isCrouching = false;
    static defaultCrouchCooldown = 18 / 60;
    #crouchCooldown = 0

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

    static defaultKickAnimTimer = 8 / 60;
    static maxKickAnimState = 3;
    #kickAnimState = -1;
    #kickAnimTimer = 0;
    #kickHasHit = false;
    #kickTimer = 0;
    #startKickTrace = Fighter.defaultKickAnimTimer / 2;
    #endKickTrace = Fighter.defaultKickAnimTimer + (Fighter.defaultKickAnimTimer / 2);
    static defaultKickCooldown = 38 / 60;
    #kickCooldown = 0;

    #isBlocking = false;
    static defaultBlockCooldown = 18 / 60;
    #blockCooldown = 0;

    #isCelebrating = false;
    #isSwept = false;

    static defaultHurtAnimTimer = 14 / 60;
    #hurtAnimTimer = 0;
    static defaultHurtCooldown = 22 / 60;
    #hurtCooldown = 0;

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

    static hurtboxValues = [
        { size: { w: 6, h:  6 }, damage: 7.5 }, { size: { w: 8, h: 12 }, damage: 5.0 },  //   Head,     Chest
        { size: { w: 4, h: 10 }, damage: 3.5 }, { size: { w: 4, h: 10 }, damage: 3.5 },  // Arm Right, Arm Left
        { size: { w: 4, h: 12 }, damage: 2.5 }, { size: { w: 4, h: 12 }, damage: 2.5 }   // Leg Right, Leg Left
    ];
    static hurtboxOffsets = {
        idle: [
            { loc: { x: 16, y: 12 }, rot: 0   }, { loc: { x: 10, y: 16 }, rot:  0   },   //   Head,     Chest
            { loc: { x:  7, y: 17 }, rot: 0   }, { loc: { x: 17, y: 17 }, rot:  0   },   // Arm Right, Arm Left
            { loc: { x:  7, y: 26 }, rot: 0.7 }, { loc: { x: 15, y: 26 }, rot: -0.5 }    // Leg Right, Leg Left
        ],
        crouch: [
            { loc: { x: 17, y: 18 }, rot: 0   }, { loc: { x: 11, y: 22 }, rot:  0   },   //   Head,     Chest
            { loc: { x:  6, y: 22 }, rot: 0   }, { loc: { x: 18, y: 24 }, rot:  0   },   // Arm Right, Arm Left
            { loc: { x:  7, y: 28 }, rot: 0.9 }, { loc: { x: 15, y: 26 }, rot: -0.4 }    // Leg Right, Leg Left
        ],
        crouch_punch: [
            { loc: { x: 17, y: 18 }, rot: 0   }, { loc: { x: 11, y: 22 }, rot:  0   },   //   Head,     Chest
            { loc: { x:  6, y: 22 }, rot: 10  }, { loc: { x: 24, y: 20 }, rot: 30   },   // Arm Right, Arm Left
            { loc: { x:  7, y: 28 }, rot: 0.9 }, { loc: { x: 15, y: 26 }, rot: -0.4 }    // Leg Right, Leg Left
        ],
        crouch_kick: [
            { loc: { x: 12, y: 18 }, rot: 0   }, { loc: { x:  8, y: 20 }, rot: -0.2 },   //   Head,     Chest
            { loc: { x:  4, y: 21 }, rot: 10  }, { loc: { x: 20, y: 19 }, rot:  1.9 },   // Arm Right, Arm Left
            { loc: { x:  7, y: 28 }, rot: 0.9 }, { loc: { x: 19, y: 25 }, rot: -1.4 }    // Leg Right, Leg Left
        ],
        crouch_block: [
            { loc: { x: 17, y: 18 }, rot: 0   }, { loc: { x: 11, y: 22 }, rot:  0   },   //   Head,     Chest
            { loc: { x: 14, y: 22 }, rot: 1   }, { loc: { x: 22, y: 20 }, rot: 60   },  // Arm Right, Arm Left
            { loc: { x:  7, y: 28 }, rot: 0.9 }, { loc: { x: 15, y: 26 }, rot: -0.4 }    // Leg Right, Leg Left
        ],
        jump: [
            { loc: { x: 17, y:  8 }, rot: 0   }, { loc: { x: 11, y: 12 }, rot: 0 },      //   Head,     Chest
            { loc: { x:  8, y: 13 }, rot: 0   }, { loc: { x: 18, y: 14 }, rot: 0 },      // Arm Right, Arm Left
            { loc: { x: 10, y: 24 }, rot: 0.5 }, { loc: { x: 18, y: 24 }, rot: 0 }       // Leg Right, Leg Left
        ],
        jump_punch: [
            { loc: { x: 17, y:  8 }, rot: 0   }, { loc: { x: 11, y: 12 }, rot:  0 },     //   Head,     Chest
            { loc: { x:  6, y: 12 }, rot: 10  }, { loc: { x: 22, y: 10 }, rot: 30 },     // Arm Right, Arm Left
            { loc: { x: 10, y: 24 }, rot: 0.5 }, { loc: { x: 18, y: 24 }, rot:  0 }      // Leg Right, Leg Left
        ],
        jump_block: [
            { loc: { x: 17, y:  8 }, rot: 0   }, { loc: { x: 11, y: 12 }, rot:  0 },     //   Head,     Chest
            { loc: { x: 15, y: 10 }, rot: 1   }, { loc: { x: 23, y: 10 }, rot: 60 },     // Arm Right, Arm Left
            { loc: { x: 10, y: 24 }, rot: 0.5 }, { loc: { x: 18, y: 24 }, rot:  0 }      // Leg Right, Leg Left
        ],
        jump_kick: [
            { loc: { x: 12, y:  8 }, rot:  0   }, { loc: { x:  8, y: 12 }, rot: -0.2 },  //   Head,     Chest
            { loc: { x:  4, y: 13 }, rot: 10   }, { loc: { x: 20, y: 11 }, rot:  1.9 },  // Arm Right, Arm Left
            { loc: { x:  9, y: 23 }, rot:  0.2 }, { loc: { x: 21, y: 18 }, rot: -1.4 }   // Leg Right, Leg Left
        ],
        punch: [
            { loc: { x: 16, y: 12 }, rot:  0   }, { loc: { x: 10, y: 16 }, rot:  0   },  //   Head,     Chest
            { loc: { x:  6, y: 16 }, rot: 10   }, { loc: { x: 22, y: 14 }, rot: 30   },  // Arm Right, Arm Left
            { loc: { x:  7, y: 26 }, rot:  0.7 }, { loc: { x: 15, y: 26 }, rot: -0.5 }   // Leg Right, Leg Left
        ],
        kick: [
            { loc: { x: 10, y: 11 }, rot:  0   }, { loc: { x:  6, y: 15 }, rot: -0.2 },  //   Head,     Chest
            { loc: { x:  2, y: 16 }, rot: 10   }, { loc: { x: 18, y: 14 }, rot:  1.9 },  // Arm Right, Arm Left
            { loc: { x:  7, y: 26 }, rot:  0.2 }, { loc: { x: 19, y: 22 }, rot: -1.4 }   // Leg Right, Leg Left
        ],
        block: [
            { loc: { x: 16, y: 12 }, rot:  0   }, { loc: { x: 10, y: 16 }, rot:  0   },  //   Head,     Chest
            { loc: { x: 14, y: 14 }, rot:  1   }, { loc: { x: 22, y: 14 }, rot: 60   },  // Arm Right, Arm Left
            { loc: { x:  7, y: 26 }, rot:  0.7 }, { loc: { x: 15, y: 26 }, rot: -0.5 }   // Leg Right, Leg Left
        ],
        die: [
            { loc: { x:  6, y: 32 }, rot:  0    }, { loc: { x: 12, y: 27 }, rot: 1.57 },  //   Head,     Chest
            { loc: { x: 14, y: 32 }, rot:  1.57 }, { loc: { x: 14, y: 32 }, rot: 1.57 },  // Arm Right, Arm Left
            { loc: { x: 24, y: 28 }, rot: -1.4  }, { loc: { x: 24, y: 26 }, rot: -1.4 }   // Leg Right, Leg Left
        ]
    };
    #hurtboxes = [];
    static hitboxValues = [
        { w: 4, h: 4 }, // Punch
        { w: 4, h: 4 }  // Kick
    ];
    static hitboxOffsets = [
        { start: { x: 21, y: 22 }, end: { x: 29, y: 19 } }, // Punch
        { start: { x: 16, y: 30 }, end: { x: 29, y: 27 } }  // Kick
    ]
    static crouchHitboxOffset = { x: 0, y: 5 };
    #hitboxes = [];
    #pendingHit = null;
    static showHitboxes = false;

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

    constructor(engine = null, variant = 0) {
        if (!(engine instanceof FighterEngine))
            throw new Error(`${this.constructor.name} requires a ${FighterEngine.name} instance.`);

        this.#engine = engine;
        this.#variant = variant;

        switch (variant) {
            case 0:
                this.ChangeBodyImg(Fighter.bodyImg0);
                this.#loc.x = 10;
                break;
            case 1:
                this.ChangeBodyImg(Fighter.bodyImg1);
                this.#bodyAnimState++;

                this.#loc.x = this.#engine.canvasSize.w - this.#size.w - 1;

                this.#facingRight = false;
                break;
        }
    }

    get loc() { return this.#loc; }
    get vel() { return this.#vel; }
    get size() { return this.#size; }

    get isGrounded() { return this.#loc.y >= this.#groundY; }
    get isCrouching() { return this.#isCrouching; }
    get isPunching() { return this.#punchAnimState >= 0; }
    get isKicking() { return this.#kickAnimState >= 0; }
    get isBlocking() { return this.#isBlocking; }
    get isStunned() { return this.#hurtCooldown > 0 || this.#isSwept; }
    get zeroHealth() { return this.#health <= 0; }

    get hitboxes() { return this.#hurtboxes; }
    get health() { return this.#health; }

    get bodyImg() { return this.#bodyImg; }
    ChangeBodyImg(bodyImg) { if (bodyImg) this.#bodyImg = bodyImg; }

    Begin() {
        this.#groundY = this.#engine.groundY - this.#size.h;
        this.#loc.y = this.#groundY;

        for (const hurtbox of Fighter.hurtboxValues) {
            this.#hurtboxes.push(new Rect(0, 0, hurtbox.size.w, hurtbox.size.h));
        }
        this.#hurtboxes[0] = new Circle(0, 0, Fighter.hurtboxValues[0].size.w);
        this.#hitboxes.push(new Circle(0, 0, Fighter.hitboxValues[0].w));
        this.#hitboxes.push(new Rect(0, 0, Fighter.hitboxValues[1].w, Fighter.hitboxValues[1].h));

        this.#UpdateHitboxes();
    }

    Tick(deltaTime) {
        // Move
        const moveSpeed = 100;
        if (!this.isCrouching && !this.isPunching && !this.isKicking && !this.isBlocking && !this.isStunned) {
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

        // Crouch Cooldown
        if (this.#crouchCooldown > 0) this.#crouchCooldown -= deltaTime;

        // Punch Animation
        if (this.isPunching) {
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

                    const dx = Fighter.hitboxOffsets[0].end.x - Fighter.hitboxOffsets[0].start.x + (this.isCrouching ? Fighter.crouchHitboxOffset.x : 0);
                    const dy = Fighter.hitboxOffsets[0].end.y - Fighter.hitboxOffsets[0].start.y + (this.isCrouching ? Fighter.crouchHitboxOffset.y : 0);
                    let localX = Fighter.hitboxOffsets[0].start.x + (dx * percent);
                    let localY = Fighter.hitboxOffsets[0].start.y + (dy * percent);

                    if (!this.#facingRight) localX = this.#size.w - localX;

                    this.#hitboxes[0].loc.x = (this.#loc.x + localX) | 0;
                    this.#hitboxes[0].loc.y = (this.#loc.y + localY) | 0;

                    for (let i = 0; i < opponent.hitboxes.length; i++) {
                        const hitbox = opponent.hitboxes[i];
                        const { intersected, hitPoint } = Intersects(this.#hitboxes[0], hitbox);
                        if (intersected) {
                            this.#punchHasHit = true;
                            this.#engine.PlaySound(3 + Math.round(Math.random()), 0.9 + Math.random() * 0.2);

                            opponent.QueueDamage(i, { x: (hitPoint.x | 0), y: (hitPoint.y | 0) }, Number(this.#vel.x.toFixed(2)), 0);
                            break;
                        }
                    }
                }
            }
        } else {
            if (this.#punchCooldown > 0)
                this.#punchCooldown -= deltaTime;
        }

        // Kick Animation
        if (this.isKicking) {
            this.#kickAnimTimer -= deltaTime;

            if (this.#kickAnimTimer <= 0) {
                this.#kickAnimState++;

                if (this.#kickAnimState == Fighter.maxKickAnimState) {
                    this.#kickAnimState = -1;
                } else {
                    this.#kickAnimTimer += Fighter.defaultKickAnimTimer;
                }
            }

            if (!this.#kickHasHit) {
                this.#kickTimer += deltaTime;
                if (this.#kickTimer >= this.#startKickTrace && this.#kickTimer <= this.#endKickTrace) {
                    const percent = (this.#kickTimer - this.#startKickTrace) / (this.#endKickTrace - this.#startKickTrace);

                    const dx = Fighter.hitboxOffsets[1].end.x - Fighter.hitboxOffsets[1].start.x + (this.isCrouching ? Fighter.crouchHitboxOffset.x : 0);
                    const dy = Fighter.hitboxOffsets[1].end.y - Fighter.hitboxOffsets[1].start.y + (this.isCrouching ? Fighter.crouchHitboxOffset.y : 0);
                    let localX = Fighter.hitboxOffsets[1].start.x + (dx * percent);
                    let localY = Fighter.hitboxOffsets[1].start.y + (dy * percent);

                    if (!this.#facingRight) localX = this.#size.w - localX;

                    this.#hitboxes[1].loc.x = (this.#loc.x + localX) | 0;
                    this.#hitboxes[1].loc.y = (this.#loc.y + localY) | 0;

                    for (let i = 0; i < opponent.hitboxes.length; i++) {
                        const hitbox = opponent.hitboxes[i];
                        const { intersected, hitPoint } = Intersects(this.#hitboxes[1], hitbox);
                        if (intersected) {
                            this.#kickHasHit = true;
                            this.#engine.PlaySound(3 + Math.round(Math.random()), 0.9 + Math.random() * 0.2);

                            opponent.QueueDamage(i, { x: (hitPoint.x | 0), y: (hitPoint.y | 0) }, Number(this.#vel.x.toFixed(2)), this.isCrouching ? 2 : 1);
                            break;
                        }
                    }
                }
            }
        } else {
            if (this.#kickCooldown > 0)
                this.#kickCooldown -= deltaTime;
        }

        // Block Cooldown
        if (this.#blockCooldown > 0) this.#blockCooldown -= deltaTime;

        // Hurt Animation
        if (this.#hurtAnimTimer >= 0) this.#hurtAnimTimer -= deltaTime;
        if (this.#hurtCooldown >= 0) this.#hurtCooldown -= deltaTime;

        // Die Animation
        if (this.#dieAnimTimer >= 0 && (this.zeroHealth || this.#isSwept)) {
            this.#dieAnimTimer -= deltaTime;

            if (this.#dieAnimTimer <= 0) {
                if (this.#dieAnimState != Fighter.maxDieAnimState - 1) {
                    this.#dieAnimState++;

                    this.#dieAnimTimer = (this.#isSwept && this.#dieAnimState === Fighter.maxDieAnimState - 1) ? 0.5 : Fighter.defaultDieAnimTimer;
                } else if (this.#isSwept) {
                    this.#isSwept = false;
                    this.#dieAnimState = 0;
                }
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
        if (this.#hasJumped && this.isGrounded && !this.#isCelebrating) {
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
        const heightFactor = Math.max(0, 1 + ((this.#loc.y - y + 39) / (Fighter.shadowJump * -1.75)));
        const rx = Fighter.shadowSize.w * heightFactor;
        const ry = Fighter.shadowSize.h * heightFactor;
        const centerY = y - Fighter.shadowSize.h / 2;
        const invRx2 = 1 / (rx * rx);
        const invRy2 = 1 / (ry * ry);
        const maxPy = Math.ceil(ry);
        const maxPx = Math.ceil(rx);

        ctx.save();
        ctx.fillStyle = `rgba(0, 0, 0, ${Math.max(Fighter.shadowOpacity, Fighter.shadowOpacity * heightFactor * 0.75)})`;

        for (let py = -maxPy; py <= maxPy; py++) {
            const ny2 = (py + 0.5) * (py + 0.5) * invRy2;
            const drawY = Math.floor(centerY + py);

            for (let px = -maxPx; px <= maxPx; px++) {
                const nx2 = (px + 0.5) * (px + 0.5) * invRx2;

                if (nx2 + ny2 <= 1) {
                    ctx.fillRect(Math.floor(x + px), drawY, 1, 1);
                }
            }
        }

        ctx.restore();


        if (!this.#facingRight) {
            ctx.translate(this.#loc.x + this.#size.w / 2, 0);
            ctx.scale(-1, 1);
            ctx.translate(-(this.#loc.x + this.#size.w / 2), 0);
        }

        let frameCoords = { x: 0, y: 0 };
        if (this.zeroHealth || this.#isSwept) {
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
        } else if (this.#hurtAnimTimer > 0) {
            // Hurt Animation
            frameCoords = { x: 0, y: this.#size.h * 4 };
        } else if (this.#isCelebrating) {
            // Celebatrion Animation
            frameCoords = { x: this.#size.w * 2, y: this.#size.h * 2 };
        } else if (this.isCrouching) {
            // Crouch Animation
            if (this.isPunching) {
                // Punch Animation
                switch (this.#punchAnimState) {
                    case 0:
                    case 2:
                        frameCoords = { x: this.#size.w * 3, y: 0 };
                        break;
                    case 1:
                        frameCoords = { x: this.#size.w * 3, y: this.#size.h };
                        break;
                }
            } else if (this.isKicking) {
                // Kick Animation
                switch (this.#kickAnimState) {
                    case 0:
                    case 2:
                        frameCoords = { x: this.#size.w * 3, y: this.#size.h * 3 };
                        break;
                    case 1:
                        frameCoords = { x: this.#size.w * 3, y: this.#size.h * 4 };
                        break;
                }
            } else if (this.isBlocking) {
                // Block Animation
                frameCoords = { x: this.#size.w * 3, y: this.#size.h * 2 };
            } else {
                frameCoords = { x: this.#size.w * 3, y: 0 };
            }
        } else if (!this.isGrounded) {
            // Jump Animation
            if (this.isPunching) {
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
            } else if (this.isKicking) {
                // Kick Animation
                switch (this.#kickAnimState) {
                    case 0:
                    case 2:
                        frameCoords = { x: this.#size.w * 2, y: this.#size.h * 5 };
                        break;
                    case 1:
                        frameCoords = { x: this.#size.w * 3, y: this.#size.h * 5 };
                        break;
                }
            } else if (this.isBlocking) {
                // Block Animation
                frameCoords = { x: this.#size.w * 2, y: this.#size.h * 3 };
            } else {
                frameCoords = { x: 0, y: this.#size.h * 3 };
            }
        } else if (this.isPunching) {
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
        } else if (this.isKicking) {
            // Kick Animation
            switch (this.#kickAnimState) {
                case 0:
                case 2:
                    frameCoords = { x: 0, y: this.#size.h * 5 };
                    break;
                case 1:
                    frameCoords = { x: this.#size.w, y: this.#size.h * 5 };
                    break;
            }
        } else if (this.isBlocking) {
            // Block Animation
            frameCoords = { x: this.#size.w, y: this.#size.h * 2 };
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

        if (Fighter.showHitboxes) this.#drawDebugHitboxes(ctx);
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
        if (!this.isCrouching && !this.isPunching && !this.isKicking && !this.isBlocking && this.isGrounded && !this.isStunned) {
            this.#vel.y -= this.#jumpForce;
            this.#hasJumped = true;

            this.Idle();

            this.#engine.PlaySound(7 + (Math.random() >= 0.95 ? 1 : 0), 0.9 + Math.random() * 0.2);
        }
    }

    SetCrouching(isHeld) {
        if (!isHeld && this.#isCrouching != isHeld) {
            this.#isCrouching = isHeld;
            this.#crouchCooldown = Fighter.defaultCrouchCooldown;

            this.Idle();

            this.#engine.PlaySound(7, 0.85 + Math.random() * 0.1, 0.2);
        } else if (isHeld && !this.isCrouching && !this.isPunching && !this.isKicking && this.isGrounded && this.#crouchCooldown <= 0 && !this.isStunned) {
            this.#isCrouching = isHeld;
            this.#vel.x = 0;

            this.Idle();

            this.#engine.PlaySound(7, 0.85 + Math.random() * 0.1, 0.3);
        }
    }

    Punch() {
        if (!this.isPunching && !this.isKicking && !this.isBlocking && this.#punchCooldown <= 0 && !this.isStunned) {
            this.#punchAnimState = 0;
            this.#punchAnimTimer = Fighter.defaultPunchAnimTimer;
            if (!this.isCrouching) this.#vel.x += this.moveInput * 60;
            this.#punchTimer = 0;
            this.#punchHasHit = false;
            this.#punchCooldown = Fighter.defaultPunchCooldown;

            this.Idle();

            this.#engine.PlaySound(1 + (Math.random() >= 0.55 ? 1 : 0), 0.9 + Math.random() * 0.2);
        }
    }

    Kick() {
        if (!this.isPunching && !this.isKicking && !this.isBlocking && this.#kickCooldown <= 0 && !this.isStunned) {
            this.#kickAnimState = 0;
            this.#kickAnimTimer = Fighter.defaultKickAnimTimer;
            if (!this.isCrouching) this.#vel.x += this.moveInput * 60;
            this.#kickTimer = 0;
            this.#kickHasHit = false;
            this.#kickCooldown = Fighter.defaultKickCooldown;

            this.Idle();

            this.#engine.PlaySound(1 + (Math.random() >= 0.55 ? 1 : 0), 0.9 + Math.random() * 0.2);
        }
    }

    SetBlocking(isHeld) {
        if (!isHeld && this.#isBlocking != isHeld) {
            this.#isBlocking = isHeld;
            this.#blockCooldown = Fighter.defaultBlockCooldown;

            this.Idle();

            this.#engine.PlaySound(7, 0.85 + Math.random() * 0.1, 0.2);
        } else if (isHeld && !this.isPunching && !this.isKicking && !this.isBlocking && this.#blockCooldown <= 0 && !this.isStunned) {
            this.#isBlocking = isHeld;
            this.#vel.x = 0;

            this.Idle();

            this.#engine.PlaySound(7, 0.85 + Math.random() * 0.1, 0.3);
        }
    }

    #UpdateHitboxes() {
        let currentState = "idle";
        if (this.zeroHealth || this.#isSwept)  currentState = "die";
        else if (this.isCrouching) {
            if (this.isPunching && this.#punchAnimState == 1) currentState = "crouch_punch";
            else if (this.isBlocking) currentState = "crouch_block";
            else if (this.isKicking) currentState = "crouch_kick";
            else currentState = "crouch";
        } else if (!this.isGrounded) {
            if (this.isPunching && this.#punchAnimState == 1) currentState = "jump_punch";
            else if (this.isBlocking) currentState = "jump_block";
            else if (this.isKicking) currentState = "jump_kick";
            else currentState = "jump";
        } else if (this.isPunching && this.#punchAnimState == 1) currentState = "punch";
        else if (this.isKicking) currentState = "kick";
        else if (this.isBlocking) currentState = "block";
        const offsets = Fighter.hurtboxOffsets[currentState];

        for (let i = 0; i < this.#hurtboxes.length; i++) {
            const offset = offsets[i].loc;
            const hitbox = this.#hurtboxes[i];

            let localX = offset.x;

            if (!this.#facingRight) {
                const hitboxW = hitbox instanceof Rect ? hitbox.size.w : 0;
                localX = this.#size.w - localX - hitboxW;
            }

            hitbox.loc.x = (this.#loc.x + localX) | 0;
            hitbox.loc.y = (this.#loc.y + offset.y) | 0;
            hitbox.rotation = this.#facingRight ? offsets[i].rot : -offsets[i].rot;
        }
    }

    TakeDamage(hitboxIndex, hitPoint, hitSpeed, hitSource) {
        const relativeSpeed = (hitSpeed - this.#vel.x) * (this.#facingRight ? -1 : 1);
        const scaleFactor = Math.max(0.4, Math.min(1.8, 1 + (relativeSpeed / 150)));
        let damage = Fighter.hurtboxValues[hitboxIndex].damage * scaleFactor;

        switch (hitSource) {
            default:
            case 0: damage *= 1; break;
            case 1:
            case 2: damage *= 1.25; break;
        }

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

        if (this.isBlocking == 1) {
            knockback *= 0.6;

            this.#engine.PlaySound(5 + (Math.random() >= 0.5 ? 1 : 0), 1.2 + Math.random() * 0.2, 0.5);
        } else {
            this.#engine.PlaySound(5 + (Math.random() >= 0.5 ? 1 : 0), 0.9 + Math.random() * 0.2);

            if (hitSource === 2 && !this.isCrouching) {
                this.#isSwept = true;
                this.#dieAnimState = 0;
                this.#dieAnimTimer = Fighter.defaultDieAnimTimer;
            } else {
                this.#hurtAnimTimer = Fighter.defaultHurtAnimTimer;
                this.#hurtCooldown = Fighter.defaultHurtCooldown;
            }

            this.#bloodAnimTimer = Fighter.defaultBloodAnimTimer;
            this.#bloodAnimState = 0;
            this.#bloodLoc.x = hitPoint.x;
            this.#bloodLoc.y = hitPoint.y;
        }

        this.#health -= damage;

        this.#ghostTimer = Fighter.defaultGhostTimer;
        this.#punchAnimState = -1;
        this.#kickAnimState = -1;
        this.#vel.x += this.#facingRight ? -knockback : knockback;
        this.Idle();

        let intensity = 1;
        if (this.zeroHealth && !this.#isDead) {
            this.#health = 0;
            this.Die();
            this.#isDead = true;
            intensity = 3;
        }

        this.#engine.CameraShake(intensity, 300);
        this.#engine.SlowTime(0, 100);
    }

    QueueDamage(hitboxIndex, hitPoint, hitSpeed, hitSource) {
        this.#pendingHit = { hitboxIndex, hitPoint, hitSpeed, hitSource };
    }

    ResolvePendingDamage() {
        if (this.#pendingHit) {
            const { hitboxIndex, hitPoint, hitSpeed, hitSource } = this.#pendingHit;
            this.#pendingHit = null;
            this.TakeDamage(hitboxIndex, hitPoint, hitSpeed, hitSource);
        }
    }

    Die() {
        this.#isCrouching = false;
        this.#punchAnimState = -1;
        this.#kickAnimState = -1;
        this.#isBlocking = false;
        this.#isSwept = false;

        this.#dieAnimTimer = Fighter.defaultDieAnimTimer;
        this.#dieAnimState = 0;
    }

    async Celebrate() {
        this.#isCrouching = false;
        this.#punchAnimState = -1;
        this.#kickAnimState = -1;
        this.#isBlocking = false;
        this.#isSwept = false;
        this.#vel.x = 0;
        this.#vel.y = 0;

        await this.#engine.Wait(150);

        this.#vel.y -= this.#jumpForce;

        await this.#engine.Wait(50);
        this.#isCelebrating = true;
    }

    EndState(state) {
        this.#isCrouching = false;
        this.#punchAnimState = -1;
        this.#kickAnimState = -1;
        this.#isBlocking = false;
        this.#isSwept = false;

        switch (state) {
            case 0:
                this.#health = 0;
                this.#dieAnimState = 2;
                break;
            case 1:
                this.#isCelebrating = true;
                break;
        }
    }

    Idle() {
        if (this.#idleSfx) this.#idleSfx.StopSound(1000);

        this.#idleTimer = Fighter.defaultIdleTimer;
    }

    Reset(resetSkin = false) {
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
        this.#isCrouching = false;
        this.#punchAnimState = -1;
        this.#punchCooldown = 0;
        this.#kickAnimState = -1;
        this.#kickCooldown = 0;
        this.#isBlocking = false;
        this.#isCelebrating = false;
        this.#isSwept = false;
        this.#hurtCooldown = 0;
        this.#dieAnimState = -1;
        this.#bloodAnimState = -1;

        if (resetSkin) {
            switch (this.#variant) {
                case 0:
                    this.ChangeBodyImg(Fighter.bodyImg0);
                    break;
                case 1:
                    this.ChangeBodyImg(Fighter.bodyImg1);
                    break;
            }
        }
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

            isCrouching: this.#isCrouching,

            punchAnimState: this.#punchAnimState,
            punchAnimTimer: this.#punchAnimTimer,
            punchHasHit: this.#punchHasHit,
            punchTimer: this.#punchTimer,
            punchCooldown: this.#punchCooldown,

            kickAnimState: this.#kickAnimState,
            kickAnimTimer: this.#kickAnimTimer,
            kickHasHit: this.#kickHasHit,
            kickTimer: this.#kickTimer,
            kickCooldown: this.#kickCooldown,

            isBlocking: this.#isBlocking,
            isCelebrating: this.#isCelebrating,

            hurtAnimTimer: this.#hurtAnimTimer,
            hurtCooldown: this.#hurtCooldown,

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

        this.#isCrouching = state.isCrouching;

        this.#punchAnimState = state.punchAnimState;
        this.#punchAnimTimer = state.punchAnimTimer;
        this.#punchHasHit = state.punchHasHit;
        this.#punchTimer = state.punchTimer;
        this.#punchCooldown = state.punchCooldown;

        this.#kickAnimState = state.kickAnimState;
        this.#kickAnimTimer = state.kickAnimTimer;
        this.#kickHasHit = state.kickHasHit;
        this.#kickTimer = state.kickTimer;
        this.#kickCooldown = state.kickCooldown;

        this.#isBlocking = state.isBlocking;
        this.#isCelebrating = state.isCelebrating;

        this.#hurtAnimTimer = state.hurtAnimTimer;
        this.#hurtCooldown = state.hurtCooldown;

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


    #drawDebugHitboxes(ctx) {
        ctx.save();
        ctx.lineWidth = .5;

        ctx.strokeStyle = "rgba(0, 255, 0, 0.7)";

        const rectLimbs = [this.#hurtboxes[1], this.#hurtboxes[2], this.#hurtboxes[3], this.#hurtboxes[4], this.#hurtboxes[5]];
        for (const rect of rectLimbs) {
            ctx.save();

            const cx = rect.loc.x + rect.size.w / 2;
            const cy = rect.loc.y + rect.size.h / 2;

            ctx.translate(cx, cy);
            ctx.rotate(rect.rotation || 0);

            ctx.beginPath();
            ctx.rect(-rect.size.w / 2, -rect.size.h / 2, rect.size.w, rect.size.h);
            ctx.stroke();

            ctx.restore();
        }

        ctx.beginPath();
        ctx.arc(this.#hurtboxes[0].loc.x, this.#hurtboxes[0].loc.y, this.#hurtboxes[0].radius, 0, Math.PI * 2);
        ctx.stroke();

        if (this.#punchTimer >= this.#startPunchTrace && this.#punchTimer <= this.#endPunchTrace) {
            ctx.strokeStyle = "rgba(255, 0, 0, 0.7)";
            ctx.beginPath();
            ctx.arc(this.#hitboxes[0].loc.x, this.#hitboxes[0].loc.y, this.#hitboxes[0].radius, 0, Math.PI * 2);
            ctx.stroke();
        }

        if (this.#kickTimer >= this.#startKickTrace && this.#kickTimer <= this.#endKickTrace) {
            ctx.strokeStyle = "rgba(255, 0, 0, 0.7)";
            ctx.beginPath();
            ctx.rect(this.#hitboxes[1].loc.x, this.#hitboxes[1].loc.y, this.#hitboxes[1].size.w, this.#hitboxes[1].size.h);
            ctx.stroke();
        }

        ctx.restore();
    }
}