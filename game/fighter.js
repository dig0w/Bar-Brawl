import { FighterEngine } from "./engine.js";
import { Circle, Rect } from "./hitboxes.js";

export class Fighter {
    static showHitboxes = true;
    #engine = null;

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

    static defaultPunchAnimTimer = 8 / 60;
    static maxPunchAnimState = 3;
    #punchAnimState = -1;
    #punchAnimTimer = Fighter.defaultPunchAnimTimer;
    static defaultPunchCooldown = 16 / 60;
    #punchCooldown = Fighter.defaultPunchCooldown;

    #isBlockHeld = false;
    static defaultBlockAnimTimer = 8 / 60;
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
    ]
    #hitboxes = [];

    constructor(engine = null, variant = 0) {
        if (!(engine instanceof FighterEngine))
            throw new Error(`${this.constructor.name} requires a ${FighterEngine.name} instance.`);

        this.#engine = engine;

        switch (variant) {
            case 0:
                this.#bodyImg = Fighter.bodyImg0;
                this.#loc.x = 10;
                break;
            case 1:
                this.#bodyImg = Fighter.bodyImg1;
                this.#loc.x = this.#engine.canvas.width - this.#size.w - 1;
                break;
        }
    }

    get loc() { return this.#loc; }
    get size() { return this.#size; }

    get isGrounded() { return this.#loc.y >= this.#groundY }

    Begin() {
        this.#groundY = this.#engine.groundY - this.#size.h;

        this.#loc.y = this.#groundY;

        this.#hitboxes = [
            new Circle(this.#loc.x + Fighter.hitboxesOffset[0].x, this.#loc.y + Fighter.hitboxesOffset[0].y, 6, "head"),
            new Rect(this.#loc.x + Fighter.hitboxesOffset[1].x, this.#loc.y + Fighter.hitboxesOffset[1].y, 9, 9, "chest"),
            new Rect(this.#loc.x + Fighter.hitboxesOffset[2].x, this.#loc.y + Fighter.hitboxesOffset[2].y, 4, 10, "arm_l"),
            new Rect(this.#loc.x + Fighter.hitboxesOffset[3].x, this.#loc.y + Fighter.hitboxesOffset[3].y, 4, 10, "arm_r"),
            new Rect(this.#loc.x + Fighter.hitboxesOffset[4].x, this.#loc.y + Fighter.hitboxesOffset[4].y, 4, 12, "leg_l"),
            new Rect(this.#loc.x + Fighter.hitboxesOffset[5].x, this.#loc.y + Fighter.hitboxesOffset[5].y, 4, 12, "leg_r")
        ];
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

        // Face Opponent
        const opponent = (this.#engine.fighter0 === this) ? this.#engine.fighter1 : this.#engine.fighter0;
        this.#facingRight = this.#loc.x < opponent.loc.x;

        for (let i = 0; i < this.#hitboxes.length; i++) {
            this.#hitboxes[i].loc.x = this.#loc.x + Fighter.hitboxesOffset[i].x;
            this.#hitboxes[i].loc.y = this.#loc.y + Fighter.hitboxesOffset[i].y;
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

        if (Fighter.showHitboxes) {
            this.#drawDebugHitboxes(ctx);
        }
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


    #drawDebugHitboxes(ctx) {
        ctx.save();
        ctx.lineWidth = 1;

        ctx.strokeStyle = "rgba(0, 255, 0, 0.7)";
        ctx.fillStyle = "rgba(0, 255, 0, 0.1)";

        const rectLimbs = [this.#hitboxes[1], this.#hitboxes[2], this.#hitboxes[3], this.#hitboxes[4], this.#hitboxes[5]];
        for (let rect of rectLimbs) {
            ctx.beginPath();
            ctx.rect(rect.loc.x, rect.loc.y, rect.size.w, rect.size.h);
            ctx.fill();
            ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(this.#hitboxes[0].loc.x, this.#hitboxes[0].loc.y, this.#hitboxes[0].radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // const fist = this.getFistHitbox();
        // if (fist) {
        //     ctx.strokeStyle = "rgba(255, 0, 0, 0.9)";
        //     ctx.fillStyle = "rgba(255, 0, 0, 0.2)";
            
        //     ctx.beginPath();
        //     ctx.arc(fist.x, fist.y, fist.radius, 0, Math.PI * 2);
        //     ctx.fill();
        //     ctx.stroke();
        // }

        ctx.restore();
    }
}