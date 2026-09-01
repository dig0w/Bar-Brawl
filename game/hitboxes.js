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
    rotation = 0; // radians

    constructor(x, y, w, h, rot = 0) {
        this.loc.x = x;
        this.loc.y = y;
        this.#size.w = w;
        this.#size.h = h;
        this.rotation = rot;
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
    const corners1 = getRectCorners(r1);
    const corners2 = getRectCorners(r2);

    // Axes to test (normals of the edges)
    const axes = [
        { x: Math.cos(r1.rotation), y: Math.sin(r1.rotation) },
        { x: -Math.sin(r1.rotation), y: Math.cos(r1.rotation) },
        { x: Math.cos(r2.rotation), y: Math.sin(r2.rotation) },
        { x: -Math.sin(r2.rotation), y: Math.cos(r2.rotation) }
    ];

    for (let axis of axes) {
        let min1 = Infinity, max1 = -Infinity;
        let min2 = Infinity, max2 = -Infinity;

        for (let p of corners1) {
            const proj = p.x * axis.x + p.y * axis.y;
            min1 = Math.min(min1, proj);
            max1 = Math.max(max1, proj);
        }
        for (let p of corners2) {
            const proj = p.x * axis.x + p.y * axis.y;
            min2 = Math.min(min2, proj);
            max2 = Math.max(max2, proj);
        }

        if (max1 < min2 || max2 < min1) {
            return { intersected: false, hitPoint: null };
        }
    }

    return {
        intersected: true,
        hitPoint: {
            x: ((r1.loc.x + r1.size.w / 2) + (r2.loc.x + r2.size.w / 2)) / 2,
            y: ((r1.loc.y + r1.size.h / 2) + (r2.loc.y + r2.size.h / 2)) / 2
        }
    };
}

function IntersectsRectCircle(rect, circle) {
    const cx = rect.loc.x + rect.size.w / 2;
    const cy = rect.loc.y + rect.size.h / 2;

    const dx = circle.loc.x - cx;
    const dy = circle.loc.y - cy;
    const cos = Math.cos(-rect.rotation);
    const sin = Math.sin(-rect.rotation);
    const localCircleX = cx + dx * cos - dy * sin;
    const localCircleY = cy + dx * sin + dy * cos;

    const closestX = Math.max(rect.loc.x, Math.min(localCircleX, rect.loc.x + rect.size.w));
    const closestY = Math.max(rect.loc.y, Math.min(localCircleY, rect.loc.y + rect.size.h));

    const distX = localCircleX - closestX;
    const distY = localCircleY - closestY;
    const intersected = (distX * distX + distY * distY) < (circle.radius * circle.radius);

    let hitPoint = null;
    if (intersected) {
        const hx = closestX - cx;
        const hy = closestY - cy;
        const rCos = Math.cos(rect.rotation);
        const rSin = Math.sin(rect.rotation);

        hitPoint = {
            x: cx + hx * rCos - hy * rSin,
            y: cy + hx * rSin + hy * rCos
        };
    }

    return { intersected, hitPoint };
}

function getRectCorners(rect) {
    const cx = rect.loc.x + rect.size.w / 2;
    const cy = rect.loc.y + rect.size.h / 2;
    const hw = rect.size.w / 2;
    const hh = rect.size.h / 2;
    const cos = Math.cos(rect.rotation);
    const sin = Math.sin(rect.rotation);

    return [
        { x: -hw, y: -hh }, { x: hw, y: -hh },
        { x: hw, y: hh }, { x: -hw, y: hh }
    ].map(p => ({
        x: cx + p.x * cos - p.y * sin,
        y: cy + p.x * sin + p.y * cos
    }));
}