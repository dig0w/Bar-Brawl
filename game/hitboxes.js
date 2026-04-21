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
    const dx = c2.loc.x - c1.loc.x;
    const dy = c2.loc.y - c1.loc.y;
    const distanceSquared = dx * dx + dy * dy;
    const radiusSum = c1.radius + c2.radius;

    const intersected = distanceSquared < (radiusSum * radiusSum);

    let hitPoint = null;
    if (intersected) {
        const distance = Math.sqrt(distanceSquared);
        hitPoint = {
            x: c1.loc.x + (dx / distance) * c1.radius,
            y: c1.loc.y + (dy / distance) * c1.radius
        };
    }

    return { intersected, hitPoint };
}

function IntersectsRectRect(r1, r2) {
    const intersected = r1.loc.x < r2.loc.x + r2.size.w &&
                        r1.loc.x + r1.size.w > r2.loc.x &&
                        r1.loc.y < r2.loc.y + r2.size.h &&
                        r1.loc.y + r1.size.h > r2.loc.y;

    let hitPoint = null;
    if (intersected) {
        const xStart = Math.max(r1.loc.x, r2.loc.x);
        const xEnd = Math.min(r1.loc.x + r1.size.w, r2.loc.x + r2.size.w);
        const yStart = Math.max(r1.loc.y, r2.loc.y);
        const yEnd = Math.min(r1.loc.y + r1.size.h, r2.loc.y + r2.size.h);

        hitPoint = {
            x: (xStart + xEnd) / 2,
            y: (yStart + yEnd) / 2
        };
    }

    return { intersected, hitPoint };
}

function IntersectsRectCircle(rect, circle) {
    const closestX = Math.max(rect.loc.x, Math.min(circle.loc.x, rect.loc.x + rect.size.w));
    const closestY = Math.max(rect.loc.y, Math.min(circle.loc.y, rect.loc.y + rect.size.h));

    const dx = circle.loc.x - closestX;
    const dy = circle.loc.y - closestY;
    const distanceSquared = dx * dx + dy * dy;
    const intersected = distanceSquared < (circle.radius * circle.radius);

    return { intersected, hitPoint: intersected ? { x: closestX, y: closestY } : null };
}