import Troop from './Troop.js';
import Card from '../models/Card.js';
import Tower from './Tower.js';
import Building from './Building.js';

export default class Proj {
    constructor(x, y, tx, ty, t, s, sp, r, d, tm, bar) {
        this.x = x;
        this.y = y;
        this.tx = tx;
        this.ty = ty;
        this.t = t; // Target entity
        this.spd = s;
        this.spl = sp; // Splash?
        this.rad = r;
        this.dmg = d;
        this.tm = tm;
        this.barrel = bar;
        this.life = sp ? 10 : 1000;

        // Flags
        this.isRoot = false;
        this.isFreeze = false;
        this.barbBarrel = false;
        this.miniFireball = false;
        this.isHeal = false;
        this.barbBreak = false;
        this.fireArea = false;
        this.redArea = false;
        this.brownArea = false;
        this.poison = false;
        this.graveyard = false;
        this.delayedSplash = false;
        this.shouldStun = false;
        this.isLightBlue = false;
        this.isClone = false;
        this.isCurse = false;
        this.isGray = false;
        this.hasKnockback = false;
        this.isRolling = false;

        this.stunDuration = 30;
        this.chainTargets = null;
        this.hitEntities = [];
    }

    asChain(a, b) {
        this.chainTargets = [a, b];
        this.life = 10;
        return this;
    }

    asBarbBarrel() { this.barbBarrel = true; return this; }
    asMiniFireball() { this.miniFireball = true; return this; }
    asHealEffect() { this.isHeal = true; return this; }
    asLightBlue() { this.isLightBlue = true; return this; }
    asBarbBreak() { this.barbBreak = true; this.life = 6; return this; }
    asFireArea() { this.fireArea = true; this.life = 6; return this; }
    asRedArea() { this.redArea = true; this.life = 12; return this; }
    asBrownArea() { this.brownArea = true; this.life = 12; return this; }
    asPoison() { this.poison = true; this.life = 240; return this; }
    asGraveyard() { this.graveyard = true; this.life = 300; return this; }
    asStun(duration = 30) { this.shouldStun = true; this.stunDuration = duration; return this; }
    asCurse() { this.isCurse = true; return this; }
    asRolling() { this.isRolling = true; this.life = 60; return this; }

    asLog() { this.isLog = true; this.asRolling(); this.life = 110; return this; }
    asBarbBarrelLog() { this.isLog = true; this.barbBarrelLog = true; this.asRolling(); return this; }

    upd(g) {
        if (this.chainTargets || this.barbBreak) {
            this.life--;
            return;
        }

        if (this.poison) {
            this.life--;
            if (this.life % 36 === 0) {
                for (let e of g.ents) {
                    if (e.tm !== this.tm && Math.hypot(this.x - e.x, this.y - e.y) < this.rad) {
                        e.hp -= Math.floor(this.dmg * 1.8);
                    }
                }
            }
            return;
        }

        if (this.graveyard) {
            this.life--;
            if (this.life % 18 === 0) {
                let angle = Math.random() * Math.PI * 2;
                let dist = Math.sqrt(Math.random()) * (this.rad);
                g.ents.push(new Troop(this.tm, this.x + Math.cos(angle) * dist, this.y + Math.sin(angle) * dist, g.getCard("Skeletons")));
            }
            return;
        }

        if (this.spl || this.fireArea || this.redArea || this.brownArea) {
            if (this.isHeal) {
                this.life--;
                if (this.life === 5) {
                    for (let e of g.ents) {
                        if (Math.hypot(this.x - e.x, this.y - e.y) < this.rad + e.rad) {
                            if (e.tm === this.tm) {
                                if (!(e instanceof Tower) && !(e instanceof Building))
                                    e.hp = Math.min(e.mhp, e.hp + 300);
                            } else {
                                e.hp -= this.dmg;
                            }
                        }
                    }
                }
                return;
            }

            if (this.fireArea || this.redArea || this.brownArea) {
                this.life--;
                if (this.life === ((this.redArea || this.brownArea) ? 11 : 5)) {
                    for (let e of g.ents) {
                        if (e.tm !== this.tm && Math.hypot(this.x - e.x, this.y - e.y) < this.rad + e.rad) {
                            e.hp -= this.dmg;
                            if (this.hasKnockback && e instanceof Troop && !(e instanceof Tower) && !(e instanceof Building)) {
                                if (["Mega Knight", "P.E.K.K.A", "Golem"].includes(e.c.n)) continue;
                                let angle = Math.atan2(e.y - this.y, e.x - this.x);
                                e.kbTime = 10;
                                e.kbX = Math.cos(angle) * 6.0;
                                e.kbY = Math.sin(angle) * 6.0;
                            }
                        }
                    }
                }
                return;
            }

            this.life--;
            if (this.life === 5) {
                for (let e of g.ents) {
                    if (e.tm !== this.tm && Math.hypot(this.x - e.x, this.y - e.y) < this.rad + e.rad) {
                        e.hp -= this.dmg;
                        if (this.shouldStun) e.st = this.stunDuration;
                        if (this.isRoot) e.rt = 84;
                        if (this.isFreeze) e.fr = 240;
                    }
                }
            }
            return;
        }

        if (this.barbBarrel) return;

        if (this.barrel) {
            let a = Math.atan2(this.ty - this.y, this.tx - this.x);
            let d = Math.hypot(this.tx - this.x, this.ty - this.y);
            this.x += Math.cos(a) * this.spd;
            this.y += Math.sin(a) * this.spd;
            if (d < this.spd) {
                this.life = 0;
                let gob = g.getCard("Goblins") || new Card("Goblins", 0, 90, 100, 1.7, 12, 0, 2, 60, 200, false, false);
                g.ents.push(new Troop(this.tm, this.x, this.y, gob));
                g.ents.push(new Troop(this.tm, this.x - 10, this.y + 10, gob));
                g.ents.push(new Troop(this.tm, this.x + 10, this.y + 10, gob));
            }
            return;
        }

        if (this.isRolling) {
            let a = Math.atan2(this.ty - this.y, this.tx - this.x);
            this.x += Math.cos(a) * this.spd;
            this.y += Math.sin(a) * this.spd;
            this.life--;

            for (let e of g.ents) {
                if (e.tm !== this.tm && !e.fly && !this.hitEntities.includes(e)) {
                    let hit = false;
                    if (this.isLog) {
                        // Rectangular collision
                        // Log width ~60 (was 120), Depth ~20 (was 40)
                        let w = this.barbBarrelLog ? 44 : 70;
                        let h = 20;
                        // Simple AABB check since log moves vertically mostly
                        if (Math.abs(this.x - e.x) < w / 2 + e.rad && Math.abs(this.y - e.y) < h / 2 + e.rad) {
                            hit = true;
                        }
                    } else {
                        let dist = Math.hypot(this.x - e.x, this.y - e.y);
                        if (dist < this.rad + e.rad) hit = true;
                    }

                    if (hit) {
                        e.hp -= this.dmg;
                        this.hitEntities.push(e);
                        if (!this.barbBarrelLog && e.mass <= 300 && !(e instanceof Tower) && !(e instanceof Building)) {
                            if (e instanceof Troop) {
                                e.kbTime = 10;
                                let kbSpeed = 6.0 * (1.0 - (e.mass / 350.0));
                                e.kbX = Math.cos(a) * kbSpeed;
                                e.kbY = Math.sin(a) * kbSpeed;
                            }
                        }
                    }
                }
            }

            if (Math.hypot(this.tx - this.x, this.ty - this.y) < this.spd || this.life <= 0) {
                this.life = 0;
                if (this.barbBarrelLog) {
                    let barb = g.getCard("Barbarians");
                    g.ents.push(new Troop(this.tm, this.x, this.y, barb));
                }
            }
            return;
        }

        if (this.t) {
            this.tx = this.t.x;
            this.ty = this.t.y;
        }
        let a = Math.atan2(this.ty - this.y, this.tx - this.x);
        let d = Math.hypot(this.tx - this.x, this.ty - this.y);
        this.x += Math.cos(a) * this.spd;
        this.y += Math.sin(a) * this.spd;

        if (d < this.spd) {
            this.life = 0;
            if (this.delayedSplash) {
                let splash = new Proj(this.x, this.y, this.x, this.y, null, 0, true, 24, this.dmg, this.tm, false);
                if (this.isLightBlue) splash.asLightBlue();
                splash.life = 6;
                g.projs.push(splash);
                return;
            }
            if (this.t && !this.miniFireball) {
                if (this.isCurse && this.t instanceof Troop) {
                    this.t.curseTime = 300;
                }
                this.t.hp -= this.dmg;
                if (this.shouldStun) this.t.st = this.stunDuration;
            }
            if (this.spl || this.miniFireball) {
                for (let e of g.ents) {
                    if (e.tm !== this.tm && Math.hypot(this.x - e.x, this.y - e.y) < this.rad + e.rad) {
                        e.hp -= this.dmg;
                        if (this.shouldStun) e.st = this.stunDuration;
                    }
                }
            }
        }
    }
}
