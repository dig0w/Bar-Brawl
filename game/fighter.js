import { FighterEngine } from "./engine.js";

export class Fighter {
    #engine = null;

    #size = { w: 16, h: 16 };
    #loc = { x: 0, y: 0 };
    #rot = 0; // Radians
    #vel = { x: 0, y: 0 };

    #groundY = 0;
    #wallX = 0;

    #jumpForce = 250;

    #bodyImg0 = Object.assign(new Image(), { src: "assets/fighter1_body_0.png" });
    #bodyImg1 = Object.assign(new Image(), { src: "assets/fighter1_body_1.png" });
    #bodyImg2 = Object.assign(new Image(), { src: "assets/fighter1_body_2.png" });
    static defaultBodyAnimTimer = 10 / 60;
    #bodyAnimState = false;
    #bodyAnimTimer = Fighter.defaultBodyAnimTimer;

    #headImg0 = Object.assign(new Image(), { src: "assets/fighter1_head_0.png" });
    #headImg1 = Object.assign(new Image(), { src: "assets/fighter1_head_1.png" });
    static defaultHeadAnimTimer0 = 200 / 60;
    static defaultHeadAnimTimer1 = 20 / 60;
    #headAnimState = false;
    #headAnimTimer = Fighter.defaultHeadAnimTimer0;

    #armsImg0 = Object.assign(new Image(), { src: "assets/fighter1_arms_0.png" });
    #armsImg1 = Object.assign(new Image(), { src: "assets/fighter1_arms_1.png" });
    #armsImg2 = Object.assign(new Image(), { src: "assets/fighter1_arms_2.png" });
    static defaultArmsAnimTimer = 10 / 60;
    #armsAnimState = false;
    #armsAnimTimer = Fighter.defaultArmsAnimTimer;

    moveInput = 0;
    #punchInput = false;

    constructor(engine = null) {
        if (!(engine instanceof FighterEngine))
            throw new Error(`${this.constructor.name} requires a ${FighterEngine.name} instance.`);

        this.#engine = engine;
    }

    Begin() {
        this.#wallX = this.#engine.wallX - this.#size.w;
        this.#groundY = this.#engine.groundY - this.#size.h;
    }

    Tick(deltaTime) {
        // Move
        const moveSpeed = 100;
        this.#vel.x += this.moveInput * moveSpeed * deltaTime;

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
        if (this.#loc.x > this.#wallX) {
            this.#loc.x = this.#wallX;
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
            this.#bodyAnimState = !this.#bodyAnimState;
            this.#bodyAnimTimer += Fighter.defaultBodyAnimTimer;
        }

        // Head Animation
        this.#headAnimTimer -= deltaTime;
        if (this.#headAnimTimer <= 0) {
            this.#headAnimState = !this.#headAnimState;
            this.#headAnimTimer += this.#headAnimState ? Fighter.defaultHeadAnimTimer1 : Fighter.defaultHeadAnimTimer0;
        }

        // Arms Animation
        if (this.#punchInput) {
            this.#armsAnimTimer -= deltaTime;
            if (this.#armsAnimTimer <= 0) {
                this.#punchInput = false;
                this.#armsAnimTimer += Fighter.defaultArmsAnimTimer;
            }
        }
    }

    Draw(ctx) {
        // Body
        ctx.drawImage((this.moveInput != 0 || (this.#vel.x | 0) != 0) ? (this.#bodyAnimState ? this.#bodyImg2 : this.#bodyImg1) : this.#bodyImg0,
            (this.#loc.x | 0), (this.#loc.y | 0), (this.#size.w | 0), (this.#size.h | 0));

        // Head
        ctx.drawImage(this.#headAnimState ? this.#headImg1 : this.#headImg0, (this.#loc.x | 0), (this.#loc.y | 0), (this.#size.w | 0), (this.#size.h | 0));

        // Arms
        ctx.drawImage(this.#punchInput ? (this.#armsAnimState ? this.#armsImg2 : this.#armsImg1) : this.#armsImg0, (this.#loc.x | 0), (this.#loc.y | 0), (this.#size.w | 0), (this.#size.h | 0));
    }

    Jump() {
        if (this.#loc.y < this.#groundY) return;
        this.#vel.y -= this.#jumpForce;
    }

    Punch() {
        this.#punchInput = true;
        this.#armsAnimState = !this.#armsAnimState;
    }
}