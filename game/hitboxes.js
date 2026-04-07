export class Circle {
    loc = { x: 0, y: 0 };
    #radius = 0;

    constructor(x, y, radius) {
        this.loc.x = x;
        this.loc.y = y;
        this.#radius = radius;
    }

    get radius() { return this.#radius; }
}

export class Rect {
    loc = { x: 0, y: 0 };
    #size = { w: 0, h: 0 };

    constructor(x, y, w, h) {
        this.loc.x = x;
        this.loc.y = y;
        this.#size.w = w;
        this.#size.h = h;
    }

    get size() { return this.#size; }
}