package clashroyale.entities;

import clashroyale.core.GameEngine;
import clashroyale.models.Card;
import java.util.ArrayList;
import java.util.List;

public class Proj {
    public double x, y, tx, ty, spd;
    public Entity t;
    public boolean spl, barrel, isRoot, isFreeze, barbBarrel, miniFireball, isHeal, barbBreak, fireArea, redArea,
            poison, graveyard, delayedSplash, shouldStun, isLightBlue, isClone, isCurse;
    public boolean isGray; // For Golem death effect
    public boolean hasKnockback; // For Fireball
    public int rad, dmg, tm, life = 1000;
    public int stunDuration = 30; // Default 0.5s
    public List<Entity> chainTargets;

    public Proj(double x, double y, double tx, double ty, Entity t, double s, boolean sp, int r, int d, int tm,
            boolean bar) {
        this.x = x;
        this.y = y;
        this.tx = tx;
        this.ty = ty;
        this.t = t;
        this.spd = s;
        this.spl = sp;
        this.rad = r;
        this.dmg = d;
        this.tm = tm;
        this.barrel = bar;
        if (sp)
            life = 10;
    }

    public Proj asChain(Entity a, Entity b) {
        this.chainTargets = new ArrayList<>();
        chainTargets.add(a);
        chainTargets.add(b);
        life = 10;
        return this;
    }

    public Proj asBarbBarrel() {
        this.barbBarrel = true;
        return this;
    }

    public Proj asMiniFireball() {
        this.miniFireball = true;
        return this;
    }

    public Proj asHealEffect() {
        this.isHeal = true;
        return this;
    }

    public Proj asLightBlue() {
        this.isLightBlue = true;
        return this;
    }

    public Proj asBarbBreak() {
        this.barbBreak = true;
        this.life = 6;
        return this;
    }

    public Proj asFireArea() {
        this.fireArea = true;
        this.life = 6;
        return this;
    }

    public Proj asRedArea() {
        this.redArea = true;
        this.life = 12;
        return this;
    }

    public Proj asPoison() {
        this.poison = true;
        this.life = 240;
        return this;
    } // 4s

    public Proj asGraveyard() {
        this.graveyard = true;
        this.life = 300;
        return this;
    } // 5s

    public Proj asStun() {
        this.shouldStun = true;
        return this;
    }

    public Proj asStun(int duration) {
        this.shouldStun = true;
        this.stunDuration = duration;
        return this;
    }

    public Proj asCurse() {
        this.isCurse = true;
        return this;
    }

    public boolean isRolling;
    public List<Entity> hitEntities = new ArrayList<>();

    public Proj asRolling() {
        this.isRolling = true;
        this.life = 60; // 2 seconds roll time approx
        return this;
    }

    public void upd(GameEngine g) {
        if (chainTargets != null || barbBreak) {
            life--;
            return;
        }

        if (poison) {
            life--;
            if (life % 36 == 0) { // Damage every ~0.6s (40% faster than 1s)
                for (Entity e : g.ents) {
                    if (e.tm != tm && Math.hypot(x - e.x, y - e.y) < rad / 2.0) {
                        e.hp -= (int) (dmg * 1.8); // 80% more damage
                    }
                }
            }
            return;
        }

        if (graveyard) {
            life--;
            if (life % 18 == 0) { // Spawn every ~18 ticks to get ~16 spawns in 300 ticks
                double angle = Math.random() * Math.PI * 2;
                double dist = Math.sqrt(Math.random()) * (rad / 2.0); // Match visual radius
                g.ents.add(
                        new Troop(tm, x + Math.cos(angle) * dist, y + Math.sin(angle) * dist, g.getCard("Skeletons")));
            }
            return;
        }

        if (spl || fireArea || redArea) {
            if (isHeal) {
                life--;
                if (life == 5) {
                    for (Entity e : g.ents) {
                        if (Math.hypot(x - e.x, y - e.y) < rad + e.rad) {
                            if (e.tm == tm) {
                                if (!(e instanceof Tower) && !(e instanceof Building)) // Cannot heal buildings
                                    e.hp = Math.min(e.mhp, e.hp + 300);
                            } else
                                e.hp -= dmg;
                        }
                    }
                }
                return;
            }
            if (fireArea || redArea) {
                life--;
                if (life == (redArea ? 11 : 5)) {
                    for (Entity e : g.ents) {
                        if (e.tm != tm && Math.hypot(x - e.x, y - e.y) < rad + e.rad) {
                            e.hp -= dmg;

                            // Knockback Logic
                            if (hasKnockback && e instanceof Troop && !(e instanceof Tower)
                                    && !(e instanceof Building)) {
                                Troop tr = (Troop) e;
                                if (tr.c.n.equals("Mega Knight") || tr.c.n.equals("P.E.K.K.A")
                                        || tr.c.n.equals("Golem"))
                                    continue; // Heavy units resist knockback

                                double angle = Math.atan2(e.y - y, e.x - x);
                                tr.kbTime = 10;
                                tr.kbX = Math.cos(angle) * 6.0;
                                tr.kbY = Math.sin(angle) * 6.0;
                            }
                        }
                    }
                }
                return;
            }

            if (--life == 5) {
                for (Entity e : g.ents) {
                    if (e.tm != tm && Math.hypot(x - e.x, y - e.y) < rad + e.rad) {
                        e.hp -= dmg;
                        if (shouldStun)
                            e.st = stunDuration;
                        if (isRoot)
                            e.rt = 84;
                        if (isFreeze)
                            e.fr = 240;
                    }
                }
            }
            return;
        }

        if (barbBarrel) {
            return;
        }

        if (barrel) {
            double a = Math.atan2(ty - y, tx - x), d = Math.hypot(tx - x, ty - y);
            x += Math.cos(a) * spd;
            y += Math.sin(a) * spd;
            if (d < spd) {
                life = 0;
                Card gob = new Card("Goblins", 0, 90, 100, 2.5, 20, 0, 3, 60, 200, false, false);
                g.ents.add(new Troop(tm, x, y, gob));
                g.ents.add(new Troop(tm, x - 10, y + 10, gob));
                g.ents.add(new Troop(tm, x + 10, y + 10, gob));
            }
            return;
        }

        // Rolling Logic (Bowler)
        if (isRolling) {
            double a = Math.atan2(ty - y, tx - x);
            x += Math.cos(a) * spd;
            y += Math.sin(a) * spd;
            life--;

            // Check collisions along the path
            for (Entity e : g.ents) {
                if (e.tm != tm && !e.fly && !hitEntities.contains(e)) {
                    double dist = Math.hypot(x - e.x, y - e.y);
                    if (dist < rad + e.rad) {
                        e.hp -= dmg;
                        hitEntities.add(e);

                        // Knockback Logic
                        if (e.mass <= 300 && !(e instanceof Tower) && !(e instanceof Building)) { // Mega Knight is 200
                                                                                                  // mass (approx check)
                            if (e instanceof Troop) {
                                Troop tr = (Troop) e;
                                tr.kbTime = 10; // 0.16s knockback
                                double kbSpeed = 6.0 * (1.0 - (e.mass / 350.0));
                                tr.kbX = Math.cos(a) * kbSpeed;
                                tr.kbY = Math.sin(a) * kbSpeed;
                            }
                        }
                    }
                }
            }

            if (Math.hypot(tx - x, ty - y) < spd || life <= 0) {
                life = 0;
            }
            return;
        }

        if (t != null) {
            tx = t.x;
            ty = t.y;
        }
        double a = Math.atan2(ty - y, tx - x), d = Math.hypot(tx - x, ty - y);
        x += Math.cos(a) * spd;
        y += Math.sin(a) * spd;
        if (d < spd) {
            life = 0;
            if (delayedSplash) {
                // Explode into splash
                Proj splash = new Proj(x, y, x, y, null, 0, true, 24, dmg, tm, false); // 40% smaller radius (40 -> 24)
                if (isLightBlue)
                    splash.asLightBlue();
                splash.life = 6;
                g.projs.add(splash);
                return;
            }
            if (t != null && !miniFireball) {
                if (isCurse && t instanceof Troop) {
                    ((Troop) t).curseTime = 300; // 5 seconds
                }
                t.hp -= dmg;
                if (shouldStun)
                    t.st = stunDuration;
            }
            if (spl || miniFireball) {
                for (Entity e : g.ents)
                    if (e.tm != tm && Math.hypot(x - e.x, y - e.y) < rad + e.rad) {
                        e.hp -= dmg;
                        if (shouldStun)
                            e.st = stunDuration;
                    }
            }
        }
    }
}
