export class Circle {
    loc = { x: 0, y: 0 };
    #radius = 0;

    constructor(x, y, radius) {
        this.loc.x = x;
        this.loc.y = y;
        this.#radius = radius;
    }

    get radius() { return this.#radius }
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

    get size() { return this.#size }
}

export function Intersects(obj1, obj2) {
    if (!obj1 || !obj2) return false;

    if (obj1 instanceof Circle && obj2 instanceof Circle) {
        return IntersectsCircleCircle(obj1, obj2);
    }
    if (obj1 instanceof Rect && obj2 instanceof Rect) {
        return IntersectsRectRect(obj1, obj2);
    }
    if (obj1 instanceof Circle && obj2 instanceof Rect) {
        return IntersectsRectCircle(obj2, obj1);
    }
    if (obj1 instanceof Rect && obj2 instanceof Circle) {
        return IntersectsRectCircle(obj1, obj2);
    }
}

function IntersectsCircleCircle(c1, c2) {
    const dx = c1.loc.x - c2.loc.x;
    const dy = c1.loc.y - c2.loc.y;
    const distanceSquared = dx * dx + dy * dy;
    const radiusSum = c1.radius + c2.radius;

    return distanceSquared < (radiusSum * radiusSum);
}

function IntersectsRectRect(r1, r2) {
    return r1.loc.x < r2.loc.x + r2.size.w &&
           r1.loc.x + r1.size.w > r2.loc.x &&
           r1.loc.y < r2.loc.y + r2.size.h &&
           r1.loc.y + r1.size.h > r2.loc.y;
}

function IntersectsRectCircle(rect, circle) {
    const closestX = Math.max(rect.loc.x, Math.min(circle.loc.x, rect.loc.x + rect.size.w));
    const closestY = Math.max(rect.loc.y, Math.min(circle.loc.y, rect.loc.y + rect.size.h));

    const dx = circle.loc.x - closestX;
    const dy = circle.loc.y - closestY;

    const distanceSquared = dx * dx + dy * dy;
    return distanceSquared < (circle.radius * circle.radius);
}