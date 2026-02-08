export default class Entity {
    constructor(t, x, y, h, r, m, fly, air) {
        this.tm = t;
        this.x = x;
        this.y = y;
        this.hp = h;
        this.mhp = h;
        this.rad = r;
        this.mass = m;
        this.fly = fly;
        this.air = air;
        this.lx = x;
        this.ly = y;

        // Status effects
        this.st = 0; // stun
        this.fr = 0; // freeze
        this.rt = 0; // root
        this.infernoTick = 0;
        this.stuckFrames = 0;
    }

    act(g) {
        // Abstract method
    }

    die(g) {
        // Abstract method
    }

    dist(e) {
        return Math.hypot(this.x - e.x, this.y - e.y);
    }

    getInfernoMultiplier(stage) {
        if (stage <= 0) return 1;
        return 2 * this.getInfernoMultiplier(stage - 1);
    }
}
