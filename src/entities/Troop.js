import Entity from './Entity.js';
import Proj from './Proj.js';
import GameEngine from '../core/GameEngine.js'; // Be careful with circular dependency here. 
// Ideally GameEngine should be passed in methods, not imported if possible, or use dynamic import/dependency injection.
// But since we need GameEngine constants (W, H, RIV_Y), we might need it.
// Actually, GameEngine constants are static in Java. In JS we can export them separately or use a Constants file.
// For now, I will hardcode constants or expect them to be available.
// I'll define constants at the top of this file for now to match GameEngine.

const W = 540;
const H = 960;
const RIV_Y = 400;

export default class Troop extends Entity {
    constructor(t, x, y, c) {
        let mass = 10;
        if (["Skeletons", "Bats"].includes(c.n)) mass = 6;
        else if (c.n.includes("Spirit")) mass = 8;
        else if (["Goblins", "Archers", "Wall Breakers"].some(n => c.n.includes(n))) mass = 8;
        else if (["Barbarians", "Elite Barbarians"].includes(c.n)) mass = 12;
        else if (c.n === "Mega Knight" || c.n === "P.E.K.K.A") mass = 20;
        else if (c.n === "Sparky" || c.n === "Bowler") mass = 18;
        else if (c.n === "Cannon") mass = 15;
        else if (c.n.includes("Dragon") || c.n === "Lava Hound") mass = 16;
        else if (["Giant", "Golem", "Elixir Golem", "Royal Giant", "Electro Giant"].includes(c.n) || c.t === 3) mass = 20;
        else if (c.n === "Elixir Golemite") mass = 10;
        else if (c.n === "Elixir Blob" || c.n === "Lava Pup") mass = 6;
        else if (c.n === "Royal Recruits") mass = 12;

        // Parent constructor calls this.hp = h, which invokes the setter.
        // We need _hp to be set there.
        super(t, x, y, c.hp, mass, mass, c.fl, c.ar);

        this.c = c;
        this.cd = 0;
        this.jt = null;
        this.jd = 0;
        this.jp = false;
        this.preJump = 0;
        this.lk = null;
        this.atk = false;
        this.spT = 0;
        this.chargeT = 0;
        this.isClone = false;
        this.path = [];

        this.sightRange = 150.0;
        this.currentTarget = null;
        this.moveTarget = null;
        this.currentWaypoint = null;
        this.crossedRiver = false;

        this.lastPos = { x: 0, y: 0 };
        this.stuckTimer = 0;
        this.isStuck = false;
        this.stuckDir = 0;
        this.seekingPathDir = 0;

        this.kbX = 0;
        this.kbY = 0;
        this.kbTime = 0;

        this.curseTime = 0;
        this.aimTime = 0;
        this.lastTarget = null;

        this.distWalked = 0;
        this.isCharging = false;

        // Shield Init
        this.shield = 0;
        this.maxShield = 0;
        if (c.n === "Royal Recruits") {
            this.shield = 199;
            this.maxShield = 199;
        }

        if (c.n === "Princess") this.sightRange = 400;
        if (c.n === "Prince") this.rad = 12;
    }

    get hp() {
        return this._hp;
    }

    set hp(val) {
        if (this._hp === undefined) {
            this._hp = val;
            return;
        }
        let dmg = this._hp - val;
        if (dmg > 0 && this.shield > 0) {
            // Damage to shield
            if (dmg >= this.shield) {
                this.shield = 0;
            } else {
                this.shield -= dmg;
            }
            // Health is protected (stays same)
        } else {
            this._hp = val;
        }
    }

    act(g) {
        if (this.fr > 0) {
            this.infernoTick = 0;
            this.chargeT = 0;
            return;
        }
        if (this.st-- > 0) {
            this.infernoTick = 0;
            this.chargeT = 0;
            return;
        }

        if (this.kbTime > 0) {
            this.x += this.kbX;
            this.y += this.kbY;
            this.kbTime--;
        }

        if (this.curseTime > 0) this.curseTime--;

        if (["Zappies", "Sparky"].includes(this.c.n)) {
            let threshold = this.c.n === "Zappies" ? 72 : 180;
            if (this.chargeT < threshold) this.chargeT++;
        }

        if (this.hp <= 0) {
            this.die(g);
            return;
        }

        // Electro Giant Aura
        if (this.c.n === "Electro Giant") {
            // User requested 5x slower aura cooldown. Base was 30, so 30 * 5 = 150.
            if (g.aiTick % 150 === 0) {
                for (let e of g.ents) {
                    // User requested 2x larger aura (reverting from 4x).
                    if (e.tm !== this.tm && this.dist(e) < (this.rad + 10 + e.rad) * 2.0) {
                        e.hp -= 50;
                        e.st = 10;
                    }
                }
            }
        }

        // Witch Spawn
        if (this.c.n === "Witch") {
            if (this.spT-- <= 0) {
                this.spT = 400;
                g.ents.push(new Troop(this.tm, this.x + 10, this.y, g.getCard("Skeletons")));
                g.ents.push(new Troop(this.tm, this.x - 10, this.y, g.getCard("Skeletons")));
                g.ents.push(new Troop(this.tm, this.x, this.y + 10, g.getCard("Skeletons")));
            }
        }

        // Jump
        if (this.jp) {
            this.fly = true;
            if (this.jt) {
                let dx = this.jt.x - this.x;
                let dy = this.jt.y - this.y;
                let d = Math.hypot(dx, dy);
                let jumpSpeed = 2.0;

                if (d < jumpSpeed + 1) {
                    this.x = this.jt.x;
                    this.y = this.jt.y;
                    this.jp = false;
                    this.fly = false;

                    if (this.c.n === "Mega Knight") {
                        for (let e of g.ents)
                            if (e.tm !== this.tm && !e.fly && this.dist(e) < 60)
                                e.hp -= 120;
                    }
                } else {
                    this.x += (dx / d) * jumpSpeed;
                    this.y += (dy / d) * jumpSpeed;
                }
            } else {
                this.jp = false;
                this.fly = false;
            }
            return;
        }

        if (this.preJump > 0) {
            this.preJump--;
            if (this.preJump === 0 && this.jt && this.jt.hp > 0) {
                this.jp = true;
                this.kbTime = 0;
                this.jd = this.dist(this.jt);
            }
            return;
        }

        // Spirit Logic
        if (this.c.n.includes("Spirit") || this.c.n === "Wall Breakers") {
            let t = null;
            let min = 999;
            for (let e of g.ents) {
                if (e.tm !== this.tm && this.dist(e) < 150 && (!e.fly || this.air)) {
                    if (this.c.n === "Wall Breakers" && !(e.constructor.name === "Tower" || e.constructor.name === "Building")) continue;
                    let d = this.dist(e);
                    if (d < min) {
                        min = d;
                        t = e;
                    }
                }
            }
            let targetHitboxRad = (t) ? g.getHitboxRadius(t) : 0;
            if (t && this.dist(t) < 30 + targetHitboxRad) {
                this.hp = 0;
                if (this.c.n === "Fire Spirit") {
                    g.projs.push(new Proj(this.x, this.y, t.x, t.y, t, 10, false, 60, 60, this.tm, false).asFireArea());
                    return;
                }
                if (this.c.n === "Heal Spirit") {
                    g.projs.push(new Proj(this.x, this.y, this.x, this.y, null, 0, true, 60, 30, this.tm, false).asHealEffect());
                    return;
                }
                if (this.c.n === "Wall Breakers") {
                    g.projs.push(new Proj(this.x, this.y, this.x, this.y, null, 0, false, 60, 0, this.tm, false).asFireArea());
                    if (t.constructor.name === "Tower" || t.constructor.name === "Building") t.hp -= 560;
                    for (let e of g.ents) {
                        if (e.tm !== this.tm && this.dist(e) < 60) {
                            if (e.constructor.name === "Tower" || e.constructor.name === "Building") {
                                if (e !== t) e.hp -= 560;
                            } else {
                                e.hp -= 200;
                            }
                        }
                    }
                    return;
                }
                let rad = 50;
                let dmg = this.c.d;
                let isIce = this.c.n === "Ice Spirit";
                let isElectro = this.c.n === "Electro Spirit";

                if (isElectro) {
                    let hit = new Set();
                    let curr = t;
                    for (let i = 0; i < 9; i++) {
                        if (!curr) break;
                        hit.add(curr);
                        curr.hp -= dmg;
                        curr.st = 6;
                        let next = null;
                        let nMin = 120;
                        for (let e of g.ents) {
                            if (e.tm !== this.tm && !hit.has(e) && curr.dist(e) < nMin) {
                                nMin = curr.dist(e);
                                next = e;
                            }
                        }
                        if (next) g.projs.push(new Proj(curr.x, curr.y, next.x, next.y, null, 0, false, 0, 0, this.tm, false).asChain(curr, next));
                        curr = next;
                    }
                } else {
                    for (let e of g.ents)
                        if (Math.hypot(this.x - e.x, this.y - e.y) < rad && e.tm !== this.tm) {
                            e.hp -= dmg;
                            if (isIce) e.fr = 90;
                        }
                }
                return;
            }
        }

        // 1 & 2. Find Target
        this.findTarget(g);

        // Bridge Logic
        if (!this.fly && this.currentTarget) {
            if (["Hog Rider", "Royal Hogs", "Prince"].includes(this.c.n) && !this.jp) {
                if ((this.y < RIV_Y && this.currentTarget.y > RIV_Y) || (this.y > RIV_Y && this.currentTarget.y < RIV_Y)) {
                    if (Math.abs(this.y - RIV_Y) < 40) {
                        let onBridge = (this.x >= W / 4 - 30 && this.x <= W / 4 + 30) || (this.x >= W * 3 / 4 - 30 && this.x <= W * 3 / 4 + 30);
                        if (!onBridge) {
                            this.jp = true;
                            this.kbTime = 0;
                            this.fly = true;
                            this.preJump = 0;
                            if (this.c.n === "Prince") {
                                this.isCharging = false;
                                this.distWalked = 0;
                            }
                            let landingY = (this.y < RIV_Y) ? RIV_Y + 55 : RIV_Y - 55;
                            let angle = Math.atan2(this.currentTarget.y - this.y, this.currentTarget.x - this.x);
                            let dy = landingY - this.y;
                            let dx = 0;
                            if (Math.abs(Math.tan(angle)) > 0.1) dx = dy / Math.tan(angle);
                            if (dx > 80) dx = 80;
                            if (dx < -80) dx = -80;

                            this.jt = { x: this.x + dx, y: landingY, hp: 1 }; // Dummy target
                            this.jd = this.dist(this.jt);
                        }
                    }
                }
            }

            if (!this.jp && !this.fly) {
                if ((this.y < RIV_Y && this.currentTarget.y > RIV_Y) || (this.y > RIV_Y && this.currentTarget.y < RIV_Y)) {
                    let bridgeX = (this.x < W / 2) ? W / 4 : W * 3 / 4;
                    if (this.currentTarget.y !== RIV_Y || Math.abs(this.currentTarget.x - bridgeX) > 1) {
                        this.currentTarget = { x: bridgeX, y: RIV_Y, hp: 1, rad: 0 }; // Dummy
                        this.currentWaypoint = null;
                    }
                }
            }
        }

        // 3. Attack Logic
        this.lk = (this.currentTarget && this.currentTarget.hp > 0 && this.currentTarget.rad !== 0) ? this.currentTarget : null;

        if (this.lk !== this.lastTarget) {
            if (this.c.n === "Sparky") this.aimTime = 0;
            if (this.c.n === "Inferno Dragon") this.infernoTick = 0;
            this.lastTarget = this.lk;
        }

        if (!this.jp && this.preJump === 0 && this.c.n === "Mega Knight" && this.lk && this.lk.hp > 0) {
            let d = this.dist(this.lk);
            if (d > 75 && d < 85) {
                this.preJump = 30;
                this.jt = this.lk;
                this.jd = d;
                return;
            }
        }

        let myHitbox = g.getHitboxRadius(this);
        let targetHitbox = (this.lk) ? g.getHitboxRadius(this.lk) : 0;
        let attackRange = this.c.rn + myHitbox + targetHitbox + 2;
        if (this.c.n.includes("Archer") && this.lk && this.lk.fly) attackRange += 60;

        if (this.lk && this.lk.hp > 0 && this.dist(this.lk) <= attackRange) {
            this.atk = true;
            if (this.rt > 0 && !this.fly) return;

            let isChargedSpecial = ["Zappies", "Sparky"].includes(this.c.n) && this.chargeT >= (this.c.n === "Zappies" ? 72 : 180);
            if (this.cd-- > 0 && !isChargedSpecial) return;

            if (["Zappies", "Sparky"].includes(this.c.n)) {
                let threshold = this.c.n === "Zappies" ? 72 : 180;
                if (this.chargeT < threshold) return;

                if (this.c.n === "Zappies") {
                    this.chargeT = 0;
                    g.projs.push(new Proj(this.x, this.y, this.lk.x, this.lk.y, this.lk, 12, false, 4, this.c.d, this.tm, false).asStun(6).asLightBlue());
                } else {
                    if (this.aimTime < 45) {
                        this.aimTime++;
                        return;
                    }
                    this.aimTime = 0;
                    this.chargeT = 0;
                    let p = new Proj(this.x, this.y, this.lk.x, this.lk.y, this.lk, 14, false, 40, this.c.d, this.tm, false).asLightBlue();
                    p.delayedSplash = true;
                    p.life = 100;
                    g.projs.push(p);

                    let angle = Math.atan2(this.y - this.lk.y, this.x - this.lk.x);
                    this.kbTime = 12;
                    let speed = 30.0 / 12.0;
                    this.kbX = Math.cos(angle) * speed;
                    this.kbY = Math.sin(angle) * speed;
                }
            } else if (this.c.n === "Inferno Dragon") {
                this.infernoTick++;
                let stage = Math.floor(this.infernoTick / 25);
                let mult = this.getInfernoMultiplier(stage);
                this.lk.hp -= this.c.d * mult;
            } else if (this.c.n === "Royal Giant") {
                g.projs.push(new Proj(this.x, this.y, this.lk.x, this.lk.y, this.lk, 12, false, 15, this.c.d, this.tm, false));
            } else if (this.c.n === "Bowler") {
                let angle = Math.atan2(this.lk.y - this.y, this.lk.x - this.x);
                let dist = 140;
                let tx = this.x + Math.cos(angle) * dist;
                let ty = this.y + Math.sin(angle) * dist;
                g.projs.push(new Proj(this.x, this.y, tx, ty, null, 2.33, false, 18, this.c.d, this.tm, false).asRolling());
            } else if (this.c.n === "Mother Witch") {
                g.projs.push(new Proj(this.x, this.y, this.lk.x, this.lk.y, this.lk, 12, false, 4, this.c.d, this.tm, false).asCurse());
            } else if (this.c.rn > 30) {
                let p = new Proj(this.x, this.y, this.lk.x, this.lk.y, this.lk, 8, false, 4, this.c.d, this.tm, false);
                if (["Wizard", "Witch", "Baby Dragon"].includes(this.c.n)) {
                    p.delayedSplash = true;
                    p.spl = false;
                    p.life = 100;
                }
                g.projs.push(p);
            } else {
                if (this.c.n === "Mega Knight") {
                    for (let e of g.ents)
                        if (e.tm !== this.tm && !e.fly && e.dist(this.lk) < 60)
                            e.hp -= this.c.d;
                } else {
                    let dmg = this.c.d;
                    if (this.c.n === "Prince") dmg = Math.floor(dmg * 0.3);
                    if (this.isCharging) {
                        if (this.c.n === "Knight") dmg = Math.floor(dmg * 1.5);
                        else dmg *= 2;
                        this.isCharging = false;
                        this.distWalked = 0;
                    }
                    this.lk.hp -= dmg;
                }
            }
            this.cd = ["Zappies", "Sparky"].includes(this.c.n) ? 0 : this.c.rt;
            return;
        } else {
            this.atk = false;
            this.infernoTick = 0;
            this.cd = this.c.rt;
        }

        // 4. Movement
        if (this.c.s === 0) return;
        if (this.rt > 0) return;

        if (this.currentTarget) {
            let tx = this.currentTarget.x;
            let ty = this.currentTarget.y;

            if (this.currentWaypoint) {
                if (Math.hypot(this.x - this.currentWaypoint.x, this.y - this.currentWaypoint.y) < 5) {
                    this.currentWaypoint = null;
                } else {
                    if (!this.checkPathBlocked(g, this.x, this.y, this.currentTarget.x, this.currentTarget.y)) {
                        this.currentWaypoint = null;
                    } else if (this.checkPathBlocked(g, this.x, this.y, this.currentWaypoint.x, this.currentWaypoint.y)) {
                        this.currentWaypoint = null;
                    } else {
                        tx = this.currentWaypoint.x;
                        ty = this.currentWaypoint.y;
                    }
                }
            }

            if (!this.currentWaypoint) {
                let obstacle = this.getBlockingObstacle(g, this.x, this.y, tx, ty);
                let isBridge = Math.abs(this.y - RIV_Y) < 50;

                if (obstacle && !isBridge) {
                    if (this.dist(obstacle) < obstacle.rad + g.getHitboxRadius(this) + 60) {
                        if (this.seekingPathDir === 0) {
                            this.seekingPathDir = (this.x < W / 2) ? -1 : 1;
                            if (this.x < 50) this.seekingPathDir = 1;
                            if (this.x > W - 50) this.seekingPathDir = -1;
                        }

                        let forwardY = (this.tm === 0 ? -1 : 1);
                        let wx = this.x + this.seekingPathDir * 40;
                        let wy = this.y + forwardY * 40;

                        if (this.checkPathBlocked(g, this.x, this.y, wx, wy)) {
                            wy = this.y;
                            if (this.checkPathBlocked(g, this.x, this.y, wx, wy)) {
                                wy = this.y - forwardY * 20;
                            }
                        }

                        if (wx < 20) { wx = 20; this.seekingPathDir = 1; }
                        else if (wx > W - 20) { wx = W - 20; this.seekingPathDir = -1; }

                        this.currentWaypoint = { x: wx, y: wy };
                        tx = this.currentWaypoint.x;
                        ty = this.currentWaypoint.y;
                    } else {
                        this.seekingPathDir = 0;
                    }
                } else {
                    this.seekingPathDir = 0;
                }
            }

            this.moveTarget = { x: tx, y: ty };
            let dx = this.moveTarget.x - this.x;
            let dy = this.moveTarget.y - this.y;
            let dist = Math.hypot(dx, dy);

            if (!this.atk && dist > 1) {
                let movedDist = Math.hypot(this.x - this.lastPos.x, this.y - this.lastPos.y);
                if (movedDist < 0.5 * this.c.s) this.stuckTimer++;
                else {
                    this.stuckTimer = 0;
                    this.isStuck = false;
                }
                this.lastPos = { x: this.x, y: this.y };

                if (this.stuckTimer > 40) {
                    this.isStuck = true;
                    if (this.stuckDir === 0) this.stuckDir = (Math.random() < 0.5) ? 1 : -1;
                }
            } else {
                this.stuckTimer = 0;
                this.isStuck = false;
                this.stuckDir = 0;
            }

            if (this.isStuck) {
                dx = this.stuckDir;
                dy = 0;
                if (this.stuckTimer > 80) {
                    this.stuckDir *= -1;
                    this.stuckTimer = 41;
                }
            } else {
                if (dist > 0) {
                    dx /= dist;
                    dy /= dist;
                }
            }

            if (!this.atk) {
                this.x += dx * this.c.s * (this.isCharging ? 2.0 : 1.0);
                this.y += dy * this.c.s * (this.isCharging ? 2.0 : 1.0);
            }

            if (this.c.n === "Prince" || this.c.n === "Knight") {
                this.distWalked += Math.hypot(dx * this.c.s, dy * this.c.s);
                if (this.distWalked > 20) this.isCharging = true;
            }

            this.path = [this.moveTarget];
            if (this.currentWaypoint && this.lk) this.path.push({ x: this.lk.x, y: this.lk.y });
        }
    }

    die(g) {
        if (this.c.n === "Golem") {
            this.spawnDeathTroops(g, g.getCard("Golemite") || { n: "Golemite", hp: 1039, ms: 25, fl: false, ar: false }, 2, 10);
            let p = new Proj(this.x, this.y, this.x, this.y, null, 0, false, 60, 259, this.tm, false);
            p.fireArea = true; p.isGray = true; p.life = 6;
            g.projs.push(p);
        } else if (this.c.n === "Golemite") {
            let p = new Proj(this.x, this.y, this.x, this.y, null, 0, false, 40, 53, this.tm, false);
            p.fireArea = true; p.isGray = true; p.life = 6;
            g.projs.push(p);
        } else if (this.c.n === "Lava Hound") {
            this.spawnDeathTroops(g, g.getCard("Lava Pup") || { n: "Lava Pup", hp: 134, ms: 50, fl: true, ar: false }, 6, 20);
        } else if (this.c.n === "Elixir Golem") {
            if (!this.isClone) g.giveElixir(1 - this.tm, 1.0);
            this.spawnDeathTroops(g, g.getCard("Elixir Golemite") || { n: "Elixir Golemite", hp: 762, ms: 25, fl: false, ar: false }, 2, 10);
        } else if (this.c.n === "Elixir Golemite") {
            if (!this.isClone) g.giveElixir(1 - this.tm, 0.5);
            this.spawnDeathTroops(g, g.getCard("Elixir Blob") || { n: "Elixir Blob", hp: 360, ms: 15, fl: false, ar: false }, 2, 8);
        } else if (this.c.n === "Elixir Blob") {
            if (!this.isClone) g.giveElixir(1 - this.tm, 0.5);
        }

        if (this.curseTime > 0) {
            let hogCard = g.getCard("Cursed Hog") || { n: "Cursed Hog", hp: 520, ms: 20, fl: false, ar: false };
            g.ents.push(new Troop(1 - this.tm, this.x, this.y, hogCard));
        }
    }

    spawnDeathTroops(g, c, count, offset) {
        for (let i = 0; i < count; i++) {
            let angle = (count > 2) ? i * (Math.PI * 2 / count) : (i === 0 ? Math.PI : 0);
            let px = this.x + (count === 2 ? (i === 0 ? -offset : offset) : Math.cos(angle) * offset);
            let py = this.y + (count > 2 ? Math.sin(angle) * offset : 0);
            let t = new Troop(this.tm, px, py, c);
            if (this.isClone) {
                t.hp = 1;
                t.mhp = 1;
                t.isClone = true;
            }
            g.ents.push(t);
        }
    }

    checkPathBlocked(g, x1, y1, x2, y2) {
        if (!this.fly) {
            if ((y1 < RIV_Y && y2 > RIV_Y) || (y1 > RIV_Y && y2 < RIV_Y)) {
                let t = (RIV_Y - y1) / (y2 - y1);
                let crossX = x1 + t * (x2 - x1);
                let onBridge = (crossX >= W / 4 - 30 && crossX <= W / 4 + 30) || (crossX >= W * 3 / 4 - 30 && crossX <= W * 3 / 4 + 30);
                if (!onBridge) return true;
            }
        }

        for (let e of g.ents) {
            if (e === this) continue;
            if (e.constructor.name === "Tower" || e.constructor.name === "Building") {
                if (e.tm !== this.tm) continue;
                let hR = e.rad;
                let myR = g.getHitboxRadius(this);
                let safeDist = hR + myR + 5;
                if (this.ptSegDist(x1, y1, x2, y2, e.x, e.y) < safeDist) return true;
            }
        }
        return false;
    }

    getBlockingObstacle(g, x1, y1, x2, y2) {
        let obstacle = null;
        let minDist = Number.MAX_VALUE;
        let myHitbox = g.getHitboxRadius(this);

        for (let e of g.ents) {
            if (e === this) continue;
            if (e.constructor.name === "Tower" || e.constructor.name === "Building") {
                if (e.tm !== this.tm) continue;
                let hR = e.rad;
                let safeDist = hR + myHitbox + 5;
                let d = this.ptSegDist(x1, y1, x2, y2, e.x, e.y);
                if (d < safeDist) {
                    let distToObj = this.dist(e);
                    if (distToObj < minDist) {
                        minDist = distToObj;
                        obstacle = e;
                    }
                }
            }
        }
        return obstacle;
    }

    findTarget(g) {
        // 1. Distraction Check
        let distraction = null;
        let minDist = this.sightRange;

        for (let e of g.ents) {
            if (e.tm !== this.tm && e.hp > 0) {
                let isBldg = e.constructor.name === "Tower" || e.constructor.name === "Building";
                if (this.c.t === 1 && !isBldg) continue;
                // Fix: Check if target is flying and if I can attack air.
                // this.air (from c.ar) dictates if I can attack air.
                // If target flies (e.fly) and I CANNOT attack air (!this.air), skip.
                if (e.fly && !this.air) continue;

                let d = this.dist(e);
                if (d < minDist) {
                    minDist = d;
                    distraction = e;
                }
            }
        }

        // 2. Primary Target Selection (Tower)
        let primaryTarget = null;
        if (this.tm === 0) {
            if (g.t2L.hp > 0 && this.x < W / 2) primaryTarget = g.t2L;
            else if (g.t2R.hp > 0 && this.x >= W / 2) primaryTarget = g.t2R;
            else primaryTarget = g.t2K;
        } else {
            if (g.t1L.hp > 0 && this.x < W / 2) primaryTarget = g.t1L;
            else if (g.t1R.hp > 0 && this.x >= W / 2) primaryTarget = g.t1R;
            else primaryTarget = g.t1K;
        }

        let newTarget = primaryTarget;
        if (distraction) {
            // Only switch to distraction if path is NOT blocked by friendly building
            if (!this.checkPathBlocked(g, this.x, this.y, distraction.x, distraction.y)) {
                newTarget = distraction;
            }
        }

        if (!this.currentTarget || this.currentTarget.hp <= 0 || (this.currentTarget.rad === 0 && this.currentTarget !== primaryTarget)) {
            this.currentTarget = newTarget;
            this.currentWaypoint = null;
        } else {
            if (distraction && distraction !== this.currentTarget) {
                this.currentTarget = distraction;
                this.currentWaypoint = null;
            } else if (this.currentTarget === distraction) {
                // Keep
            } else {
                if (primaryTarget !== this.currentTarget && !distraction) {
                    this.currentTarget = primaryTarget;
                    this.currentWaypoint = null;
                }
            }
        }
    }

    ptSegDist(x1, y1, x2, y2, px, py) {
        let x21 = x2 - x1;
        let y21 = y2 - y1;
        let xP1 = px - x1;
        let yP1 = py - y1;
        let t = (xP1 * x21 + yP1 * y21) / (x21 * x21 + y21 * y21);
        if (t < 0) t = 0;
        if (t > 1) t = 1;
        let dx = px - (x1 + t * x21);
        let dy = py - (y1 + t * y21);
        return Math.hypot(dx, dy);
    }
}
