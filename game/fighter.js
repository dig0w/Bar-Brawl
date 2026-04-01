import { FighterEngine } from "./engine.js";

export class Fighter {
    #engine = null;

    #size = { w: 20, h: 35 };
    #loc = { x: 0, y: 0 };
    #rot = 0; // Radians
    #vel = { x: 0, y: 0 };
    #facingRight = true;

    #groundY = 0;

    #jumpForce = 250;

    static bodyImg0 = Object.assign(new Image(), { src: "assets/bald_guy_sheet.png" });
    static bodyImg1 = Object.assign(new Image(), { src: "assets/biker_sheet.png" });
    #bodyImg = null;
    static defaultBodyAnimTimer = 10 / 60;
    static maxBodyAnimState = 3;
    #bodyAnimState = 0;
    #bodyAnimTimer = Fighter.defaultBodyAnimTimer;

    moveInput = 0;
    #punchInput = false;

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
                this.#loc.x = this.#engine.canvas.width - this.#size.w - 10;
                break;
        }
    }

    get loc() { return this.#loc; }
    get size() { return this.#size; }

    get isGrounded() { return this.#loc.y >= this.#groundY }

    Begin() {
        this.#groundY = this.#engine.groundY - this.#size.h;

        this.#loc.y = this.#groundY;
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

        // Face Opponent
        const opponent = (this.#engine.fighter0 === this) ? this.#engine.fighter1 : this.#engine.fighter0;
        this.#facingRight = this.#loc.x < opponent.loc.x;
    }

    Draw(ctx) {
        ctx.save();

        if (!this.#facingRight) {
            ctx.translate(this.#loc.x + this.#size.w / 2, 0);
            ctx.scale(-1, 1);
            ctx.translate(-(this.#loc.x + this.#size.w / 2), 0);
        }

        let frameCoords = { x: 0, y: this.#size.h };
        if ((this.#vel.x | 0) != 0 && this.isGrounded) {
            switch (this.#bodyAnimState) {
                case 0:
                    frameCoords = { x: this.#size.w, y: this.#size.h };
                    break;
                case 1:
                    frameCoords = { x: this.#size.w * 2, y: this.#size.h };
                    break;
                case 2:
                    frameCoords = { x: this.#size.w * 3, y: this.#size.h };
                    break;
            }
        }
        ctx.drawImage(this.#bodyImg, (frameCoords.x | 0), (frameCoords.y | 0), (this.#size.w | 0), (this.#size.h | 0), (this.#loc.x | 0), (this.#loc.y | 0), (this.#size.w | 0), (this.#size.h | 0));

        ctx.restore();
    }

    Jump() {
        if (this.isGrounded)
            this.#vel.y -= this.#jumpForce;
    }

    Punch() {
        this.#punchInput = true;
    }
}