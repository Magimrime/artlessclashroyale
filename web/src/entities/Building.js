import Entity from './Entity.js';
import Proj from './Proj.js';
// Troop import removed to avoid circular dependency

export default class Building extends Entity {
    constructor(t, x, y, c) {
        let radius = (c.n === "Cannon") ? 15 : 20;
        if (c.n === "Crate") radius = 14;
        super(0, t, x, y, c.hp, radius, 10000, false, false);
        this.c = c;
        this.cd = 0;
        this.lk = null;
        this.atk = false;
    }

    act(g) {
        if (this.fr > 0) { this.infernoTick = 0; return; }
        if (this.st-- > 0) { this.infernoTick = 0; return; }

        // Lifetime decay
        this.hp -= this.mhp / this.c.ms;
        if (this.hp <= 0) {
            // Death Logic handled via die(g) called by GameEngine
            return;
        }

        // Elixir Collector Logic
        if (this.c.n === "Elixir Collector") {
            this.infernoTick++;
            if (this.infernoTick >= 780) {
                g.giveElixir(this.tm, 1.0);
                this.infernoTick = 0;
            }
            return;
        }

        if (this.lk) {
            if (this.lk.hp <= 0 || this.dist(this.lk) > this.c.si) {
                this.lk = null;
                this.atk = false;
                this.infernoTick = 0;
            }
        }

        if (!this.atk) {
            let min = 9999;
            let best = null;
            for (let e of g.ents) {
                if (e.tm !== this.tm) {
                    if (e.fly && !this.c.ar) continue;
                    let d = this.dist(e);
                    if (d < min && d < this.c.si) {
                        min = d;
                        best = e;
                    }
                }
            }
            if (best) this.lk = best;
        }

        let myHitbox = g.getHitboxRadius(this);
        let targetHitbox = (this.lk) ? g.getHitboxRadius(this.lk) : 0;
        let attackRange = this.c.rn + myHitbox + targetHitbox + 2;

        if (this.lk && this.dist(this.lk) <= attackRange) {
            this.atk = true;
            if (this.cd-- > 0) return;

            // Attack
            if (this.c.n === "Inferno Tower") {
                this.infernoTick++;
                let stage = Math.floor(this.infernoTick / 25);
                let mult = this.getInfernoMultiplier(stage);
                let dmg = this.c.d * mult;
                this.lk.hp -= dmg;
            } else {
                g.projs.push(new Proj(this.x, this.y, this.lk.x, this.lk.y, this.lk, 8, false, 4, this.c.d, this.tm, false));
            }
            this.cd = this.c.rt;
        } else {
            this.atk = false;
            this.infernoTick = 0;
            this.cd = this.c.rt;
        }
    }

    die(g) {
        if (this.c.n === "Elixir Collector") {
            g.giveElixir(this.tm, 1.0);
        } else if (this.c.n === "Crate") {
            g.handleCrateDeath(this);
        }
    }
}
