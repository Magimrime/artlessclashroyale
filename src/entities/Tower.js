import Entity from './Entity.js';
import Proj from './Proj.js';

export default class Tower extends Entity {
    constructor(t, x, y, k) {
        super(t, x, y, k ? 4767 : 3300, k ? 25 : 20, 10000, false, true);
        this.kg = k; // King Tower?
        this.actv = !k; // Active?
        this.cd = 0; // Cooldown
    }

    act(g) {
        if (this.fr > 0) return;
        if (this.st-- > 0) return;
        if (!this.actv) return;
        if (this.cd-- > 0) return;

        const W = 540; // Default width
        const RIV_Y = 400; // Default river Y

        for (let e of g.ents) {
            if (e.tm !== this.tm && this.dist(e) < 250) {
                // King Tower activation logic
                if (!this.kg && ((this.x < W / 2 && e.x > W / 2) || (this.x > W / 2 && e.x < W / 2))) continue;
                if (this.tm === 0 && e.y < RIV_Y) continue;
                if (this.tm === 1 && e.y > RIV_Y) continue;

                g.projs.push(new Proj(this.x, this.y, e.x, e.y, e, 10, false, 4, 50, this.tm, false));
                this.cd = 40;
                break;
            }
        }
    }
}
