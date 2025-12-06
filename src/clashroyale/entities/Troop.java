package clashroyale.entities;

import clashroyale.core.GameEngine;
import clashroyale.models.Card;
import java.util.HashSet;
import java.util.Set;
import java.util.List;
import java.util.ArrayList;
import java.awt.geom.Point2D;
import java.awt.geom.Line2D;

public class Troop extends Entity {
    public Card c;
    public int cd;
    public Entity jt;
    public double jd;
    public boolean jp;
    public int preJump;
    public Entity lk; // Locked target (for attacking)
    public boolean atk;
    public int spT;
    public int chargeT; // Charging timer
    public boolean isClone;
    public static boolean SHOW_PATH = false;
    public static boolean SHOW_RANGE = false;
    public List<Point2D.Double> path = new ArrayList<>();

    // New Pathfinding Fields
    public double sightRange = 150.0; // How far they can "see" to get distracted
    public Entity currentTarget = null; // The entity or point we are moving towards
    public Point2D.Double moveTarget = null; // The actual coordinate we are moving to (could be a waypoint)
    public Point2D.Double currentWaypoint = null; // The intermediate waypoint we are committed to
    public boolean crossedRiver = false;

    // Stuck Detection Fields
    public Point2D.Double lastPos = new Point2D.Double(0, 0);
    public int stuckTimer = 0;
    public boolean isStuck = false;

    public int stuckDir = 0;
    public int seekingPathDir = 0; // 0=None, 1=Right, -1=Left

    // Knockback Fields
    public double kbX, kbY;
    public int kbTime;

    // Mother Witch Curse
    public int curseTime = 0;

    // Aiming Fields
    public int aimTime;
    public Entity lastTarget;

    // Prince Charge
    public double distWalked = 0;
    public boolean isCharging = false;

    public Troop(int t, double x, double y, Card c) {
        super(t, x, y, c.hp,
                c.n.equals("Skeletons") || c.n.equals("Bats") ? 6
                        : c.n.contains("Spirit") ? 8
                                : (c.n.contains("Goblins") || c.n.equals("Archers") || c.n.equals("Wall Breakers")) ? 8
                                        : (c.n.equals("Barbarians") || c.n.equals("Elite Barbarians")) ? 12
                                                : c.n.equals("Mega Knight") ? 20
                                                        : c.n.equals("P.E.K.K.A") ? 20
                                                                : c.n.equals("Sparky") || c.n.equals("Bowler") ? 18
                                                                        : c.n.equals("Cannon") ? 15
                                                                                : (c.n.contains("Dragon")
                                                                                        || c.n.equals("Lava Hound") ? 16
                                                                                                : // Baby Dragon & Lava
                                                                                                  // Hound
                                                                                                (c.n.equals("Giant")
                                                                                                        || c.n.equals(
                                                                                                                "Golem")
                                                                                                        || c.n.equals(
                                                                                                                "Elixir Golem")
                                                                                                        || c.n.equals(
                                                                                                                "Royal Giant")
                                                                                                        || c.n.equals(
                                                                                                                "Electro Giant")
                                                                                                        || c.t == 3 ? 20
                                                                                                                : // Giant
                                                                                                                  // &
                                                                                                                  // Golem
                                                                                                                (c.n.equals(
                                                                                                                        "Elixir Golemite")
                                                                                                                                ? 10
                                                                                                                                : (c.n.equals(
                                                                                                                                        "Elixir Blob")
                                                                                                                                                ? 6
                                                                                                                                                : (c.n.equals(
                                                                                                                                                        "Lava Pup")
                                                                                                                                                                ? 6
                                                                                                                                                                : 10))))),
                c.ms, c.fl, c.ar);
        this.c = c;
        // Adjust sight range based on troop type if needed
        if (c.n.equals("Princess"))
            sightRange = 400;
        if (c.n.equals("Prince"))
            rad = 12; // 20% bigger (default 10)
    }

    @Override
    public void act(GameEngine g) {
        if (fr > 0) {
            infernoTick = 0;
            chargeT = 0; // Reset charge if stunned
            return;
        }
        if (st-- > 0) {
            infernoTick = 0;
            chargeT = 0; // Reset charge if stunned
            return;
        }

        // Apply Knockback
        if (kbTime > 0) {
            x += kbX;
            y += kbY;
            kbTime--;
            // Knockback shouldn't prevent other actions like reloading, but usually stops
            // voluntary movement
        }

        if (curseTime > 0) {
            curseTime--;
        }

        // Passive Charging
        if (c.n.equals("Zappies") || c.n.equals("Sparky")) {
            int threshold = c.n.equals("Zappies") ? 72 : 180; // 1.2s or 3s
            if (chargeT < threshold)
                chargeT++;
        }

        if (hp <= 0) {
            die(g);
            return;
        }

        // Electro Giant Aura
        if (c.n.equals("Electro Giant")) {
            // Visual Effect (Electric Lining)
            if (g.aiTick % 30 == 0) { // Every 0.5 seconds (30 frames)
                boolean hit = false;
                for (Entity e : g.ents) {
                    if (e.tm != tm && dist(e) < rad + 10 + e.rad) { // 10px around circumference
                        e.hp -= 50; // Zap damage (approx)
                        e.st = 10; // Stun for 0.16s
                        hit = true;
                    }
                }
            }
        }

        // Spawn logic (Witch)
        if (c.n.equals("Witch")) {
            if (spT-- <= 0) {
                spT = 400;
                g.ents.add(new Troop(tm, x + 10, y, g.getCard("Skeletons")));
                g.ents.add(new Troop(tm, x - 10, y, g.getCard("Skeletons")));
                g.ents.add(new Troop(tm, x, y + 10, g.getCard("Skeletons")));
            }
        }

        // Jump Execution Logic
        if (jp) {
            fly = true;
            if (jt != null) {
                double dx = jt.x - x;
                double dy = jt.y - y;
                double d = Math.hypot(dx, dy);
                double jumpSpeed = c.n.equals("Mega Knight") ? 2.0 : 2.0; // Hogs jump faster

                if (d < jumpSpeed + 1) {
                    x = jt.x;
                    y = jt.y;
                    jp = false;
                    fly = false;

                    // Mega Knight Splash Damage
                    if (c.n.equals("Mega Knight")) {
                        for (Entity e : g.ents)
                            if (e.tm != tm && !e.fly && dist(e) < 60)
                                e.hp -= 120;
                    }
                } else {
                    x += (dx / d) * jumpSpeed;
                    y += (dy / d) * jumpSpeed;
                }
            } else {
                jp = false;
                fly = false;
            }
            return;
        }

        if (preJump > 0) {
            preJump--;
            if (preJump == 0 && jt != null && jt.hp > 0) {
                jp = true;
                kbTime = 0;
                jd = dist(jt);
            }
            return;
        }

        // Spirit Logic
        if (c.n.contains("Spirit") || c.n.equals("Wall Breakers")) {
            Entity t = null;
            double min = 999;
            for (Entity e : g.ents)
                if (e.tm != tm && dist(e) < 150 && (!e.fly || air)) {
                    // Wall Breakers only target buildings
                    if (c.n.equals("Wall Breakers") && !(e instanceof Tower || e instanceof Building))
                        continue;

                    double d = dist(e);
                    if (d < min) {
                        min = d;
                        t = e;
                    }
                }
            double targetHitboxRad = (t != null) ? g.getHitboxRadius(t) : 0;
            if (t != null && dist(t) < 30 + targetHitboxRad) {
                hp = 0;
                if (c.n.equals("Fire Spirit")) {
                    g.projs.add(new Proj(x, y, t.x, t.y, t, 10, false, 60, 60, tm, false).asFireArea());
                    return;
                }
                if (c.n.equals("Heal Spirit")) {
                    g.projs.add(new Proj(x, y, x, y, null, 0, true, 60, 30, tm, false).asHealEffect());
                    return;
                }
                if (c.n.equals("Wall Breakers")) {
                    // Explosion visual
                    g.projs.add(new Proj(x, y, x, y, null, 0, false, 60, 0, tm, false).asFireArea());

                    // Deal damage to buildings (560)
                    if (t instanceof Tower || t instanceof Building) {
                        t.hp -= 560;
                    }

                    // Deal area damage to troops (200) and other buildings (560)
                    for (Entity e : g.ents) {
                        if (e.tm != tm && dist(e) < 60) {
                            if (e instanceof Tower || e instanceof Building) {
                                if (e != t)
                                    e.hp -= 560; // Don't damage the primary target twice if it's in the loop
                            } else {
                                e.hp -= 200;
                            }
                        }
                    }
                    return;
                }
                int rad = 50;
                int dmg = c.d;
                boolean isIce = c.n.equals("Ice Spirit");
                boolean isElectro = c.n.equals("Electro Spirit");
                if (isElectro) {
                    Set<Entity> hit = new HashSet<>();
                    Entity curr = t;
                    for (int i = 0; i < 9; i++) {
                        if (curr == null)
                            break;
                        hit.add(curr);
                        curr.hp -= dmg;
                        curr.st = 6;
                        Entity next = null;
                        double nMin = 120;
                        for (Entity e : g.ents) {
                            if (e.tm != tm && !hit.contains(e) && curr.dist(e) < nMin) {
                                nMin = curr.dist(e);
                                next = e;
                            }
                        }
                        if (next != null)
                            g.projs.add(new Proj(curr.x, curr.y, next.x, next.y, null, 0, false, 0, 0, tm, false)
                                    .asChain(curr, next));
                        curr = next;
                    }
                } else {
                    for (Entity e : g.ents)
                        if (Math.hypot(x - e.x, y - e.y) < rad && e.tm != tm) {
                            e.hp -= dmg;
                            if (isIce)
                                e.fr = 90;
                        }
                }
                return;
            }
        }

        // 1. Distraction Check (Line of Sight)
        // Find closest enemy within sightRange that matches targeting type
        Entity distraction = null;
        double minDist = sightRange;

        for (Entity e : g.ents) {
            if (e.tm != tm && e.hp > 0) {
                // Check targeting rules
                boolean isBldg = e instanceof Tower || e instanceof Building;
                if (c.t == 1 && !isBldg)
                    continue; // Building targeter only targets buildings
                if (e.fly && !air && !c.ar)
                    continue; // Ground melee can't target air

                double d = dist(e);
                if (d < minDist) {
                    minDist = d;
                    distraction = e;
                }
            }
        }

        // 2. Target Selection
        Entity primaryTarget = null;

        // Default: Enemy Towers
        if (tm == 0) { // Player
            if (g.t2L.hp > 0 && x < GameEngine.W / 2)
                primaryTarget = g.t2L;
            else if (g.t2R.hp > 0 && x >= GameEngine.W / 2)
                primaryTarget = g.t2R;
            else
                primaryTarget = g.t2K;
        } else { // AI
            if (g.t1L.hp > 0 && x < GameEngine.W / 2)
                primaryTarget = g.t1L;
            else if (g.t1R.hp > 0 && x >= GameEngine.W / 2)
                primaryTarget = g.t1R;
            else
                primaryTarget = g.t1K;
        }

        // Target Stability Logic
        Entity newTarget = primaryTarget;
        if (distraction != null) {
            if (!checkPathBlocked(g, x, y, distraction.x, distraction.y)) {
                newTarget = distraction;
            }
        }

        if (currentTarget == null || currentTarget.hp <= 0 || (currentTarget instanceof Entity
                && ((Entity) currentTarget).rad == 0 && currentTarget != primaryTarget)) {
            currentTarget = newTarget;
            currentWaypoint = null;
        } else {
            if (distraction != null && distraction != currentTarget) {
                currentTarget = distraction;
                currentWaypoint = null;
            } else if (currentTarget == distraction) {
                // Keep it
            } else {
                if (primaryTarget != currentTarget && distraction == null) {
                    currentTarget = primaryTarget;
                    currentWaypoint = null;
                }
            }
        }

        // Bridge Logic
        if (!fly && currentTarget != null) {
            // Jump Logic (Ballistic)
            if ((c.n.equals("Hog Rider") || c.n.equals("Royal Hogs") || c.n.equals("Prince")) && !jp) {
                // Check if path crosses river
                if ((y < GameEngine.RIV_Y && currentTarget.y > GameEngine.RIV_Y)
                        || (y > GameEngine.RIV_Y && currentTarget.y < GameEngine.RIV_Y)) {
                    if (Math.abs(y - GameEngine.RIV_Y) < 40) {
                        // Check if ON BRIDGE
                        boolean onBridge = (x >= GameEngine.W / 4 - 30 && x <= GameEngine.W / 4 + 30)
                                || (x >= GameEngine.W * 3 / 4 - 30 && x <= GameEngine.W * 3 / 4 + 30);

                        if (!onBridge) {
                            // Trigger Jump
                            jp = true;
                            kbTime = 0;
                            fly = true;
                            preJump = 0;

                            // Reset Prince Charge
                            if (c.n.equals("Prince")) {
                                isCharging = false;
                                distWalked = 0;
                            }

                            // Calculate Target
                            double landingY = (y < GameEngine.RIV_Y) ? GameEngine.RIV_Y + 55 : GameEngine.RIV_Y - 55;
                            double angle = Math.atan2(currentTarget.y - y, currentTarget.x - x);

                            // Project target to landingY
                            double dy = landingY - y;
                            double dx = 0;
                            if (Math.abs(Math.tan(angle)) > 0.1) {
                                dx = dy / Math.tan(angle);
                            }

                            // Clamp horizontal jump to avoid crazy sideways jumps
                            if (dx > 80)
                                dx = 80;
                            if (dx < -80)
                                dx = -80;

                            double tx = x + dx;
                            double ty = landingY;

                            jt = new Entity(0, tx, ty, 0, 0, 0, false, false) {
                                @Override
                                public void act(GameEngine g) {
                                }
                            };
                            jd = dist(jt);
                        }
                    }
                }
            }

            // Bridge Pathing (only if not jumping)
            if (!jp && !fly) {
                boolean onOwnSide = (tm == 0 && y > GameEngine.RIV_Y) || (tm == 1 && y < GameEngine.RIV_Y);
                boolean targetOnOtherSide = (tm == 0 && currentTarget.y < GameEngine.RIV_Y)
                        || (tm == 1 && currentTarget.y > GameEngine.RIV_Y);

                if ((y < GameEngine.RIV_Y && currentTarget.y > GameEngine.RIV_Y)
                        || (y > GameEngine.RIV_Y && currentTarget.y < GameEngine.RIV_Y)) {
                    double bridgeX = (x < GameEngine.W / 2) ? GameEngine.W / 4 : GameEngine.W * 3 / 4;
                    if (currentTarget.y != GameEngine.RIV_Y || Math.abs(currentTarget.x - bridgeX) > 1) {
                        final double bx = bridgeX;
                        final double by = GameEngine.RIV_Y;
                        currentTarget = new Entity(0, bx, by, 0, 0, 0, false, false) {

                            @Override
                            public void act(GameEngine g) {
                            }
                        };
                        currentWaypoint = null;
                    }
                }
            }
        }

        // 3. Attack Logic
        lk = (currentTarget instanceof Entity && !(currentTarget.hp == 0 && currentTarget.rad == 0)) ? currentTarget
                : null;

        // Target Switching Logic for Aiming
        if (lk != lastTarget) {
            if (c.n.equals("Sparky"))
                aimTime = 0; // Only reset aimTime if target changes
            if (c.n.equals("Inferno Dragon"))
                infernoTick = 0;
            lastTarget = lk;
        }

        // Special Mega Knight Jump Check
        if (!jp && preJump == 0 && c.n.equals("Mega Knight") && lk != null && lk.hp > 0) {

            double d = dist(lk);
            if (d > 75 && d < 85) {
                preJump = 30;
                jt = lk;
                jd = d;
                return;
            }
        }

        double myHitbox = g.getHitboxRadius(this);
        double targetHitbox = (lk != null) ? g.getHitboxRadius(lk) : 0;
        double attackRange = c.rn + myHitbox + targetHitbox + 2;
        if (c.n.contains("Archer") && lk != null && lk.fly)
            attackRange += 60;

        if (lk != null && lk.hp > 0 &&

                dist(lk) <= attackRange) {
            atk = true;
            if (rt > 0 && !fly)
                return;

            boolean isChargedSpecial = (c.n.equals("Zappies") || c.n.equals("Sparky"))
                    && chargeT >= (c.n.equals("Zappies") ? 72 : 180);
            if (cd-- > 0 && !isChargedSpecial)
                return;

            // Attack Execution
            if (c.n.equals("Zappies") || c.n.equals("Sparky")) {
                int threshold = c.n.equals("Zappies") ? 72 : 180; // 1.2s or 3s
                if (chargeT < threshold)
                    return; // Still charging

                if (c.n.equals("Zappies")) {
                    chargeT = 0; // Fire!
                    Proj p = new Proj(x, y, lk.x, lk.y, lk, 12, false, 4, c.d, tm, false).asStun(6).asLightBlue();
                    g.projs.add(p);
                } else { // Sparky
                    if (aimTime < 45) { // 0.75s aiming delay
                        aimTime++;
                        return;
                    }
                    aimTime = 0; // Reset after firing
                    chargeT = 0; // Fire!

                    Proj p = new Proj(x, y, lk.x, lk.y, lk, 14, false, 40, c.d, tm, false).asLightBlue();
                    p.delayedSplash = true;
                    p.life = 100;
                    g.projs.add(p);
                    // Knockback Trigger
                    double angle = Math.atan2(y - lk.y, x - lk.x);
                    kbTime = 12; // 0.2s
                    double totalDist = 30.0;
                    double speed = totalDist / 12.0;
                    kbX = Math.cos(angle) * speed;
                    kbY = Math.sin(angle) * speed;
                }
            } else if (c.n.equals("Inferno Dragon")) {
                infernoTick++;
                int stage = infernoTick / 25;
                int mult = getInfernoMultiplier(stage);
                lk.hp -= c.d * mult;
            } else if (c.n.equals("Royal Giant")) {
                // Royal Giant shoots cannonballs
                Proj p = new Proj(x, y, lk.x, lk.y, lk, 12, false, 15, c.d, tm, false);
                g.projs.add(p);
            } else if (c.n.equals("Bowler")) {
                // Bowler rolls a rock
                double angle = Math.atan2(lk.y - y, lk.x - x);
                double dist = 140; // Roll distance (7 tiles)
                double tx = x + Math.cos(angle) * dist;
                double ty = y + Math.sin(angle) * dist;

                Proj p = new Proj(x, y, tx, ty, null, 2.33, false, 18, c.d, tm, false).asRolling();
                g.projs.add(p);
            } else if (c.n.equals("Mother Witch")) {
                // Mother Witch shoots cursed projectile
                Proj p = new Proj(x, y, lk.x, lk.y, lk, 12, false, 4, c.d, tm, false).asCurse();
                g.projs.add(p);
            } else if (c.rn > 30) {
                Proj p = new Proj(x, y, lk.x, lk.y, lk, 8, false, 4, c.d, tm, false);
                if (c.n.equals("Wizard") || c.n.equals("Witch") || c.n.equals("Baby Dragon")) {
                    p.delayedSplash = true;
                    p.spl = false;
                    p.life = 100;
                }
                g.projs.add(p);
            } else {
                if (c.n.equals("Mega Knight")) {
                    for (Entity e : g.ents)
                        if (e.tm != tm && !e.fly && e.dist(lk) < 60)
                            e.hp -= c.d;
                } else {
                    int dmg = c.d;
                    if (c.n.equals("Prince")) {
                        dmg = (int) (dmg * 0.3); // 70% reduction
                    }
                    if (isCharging) {
                        dmg *= 2; // Double damage on charge hit
                        isCharging = false;
                        distWalked = 0;
                    }
                    lk.hp -= dmg;
                }
            }

            cd = (c.n.equals("Zappies") || c.n.equals("Sparky")) ? 0 : c.rt;
            return;
        } else {
            atk = false;
            infernoTick = 0;
            cd = c.rt;
        }

        // 4. Movement Logic
        if (c.s == 0)
            return;
        if (rt > 0)
            return;

        if (currentTarget != null) {
            double tx = currentTarget.x;
            double ty = currentTarget.y;

            if (currentWaypoint != null) {
                if (Math.hypot(x - currentWaypoint.x, y - currentWaypoint.y) < 5) {
                    currentWaypoint = null;
                } else {
                    if (!checkPathBlocked(g, x, y, currentTarget.x, currentTarget.y)) {
                        currentWaypoint = null;
                    } else if (checkPathBlocked(g, x, y, currentWaypoint.x, currentWaypoint.y)) {
                        currentWaypoint = null;
                    } else {
                        tx = currentWaypoint.x;
                        ty = currentWaypoint.y;
                    }
                }
            }

            if (currentWaypoint == null) {
                Entity obstacle = getBlockingObstacle(g, x, y, tx, ty);
                boolean isBridge = Math.abs(y - GameEngine.RIV_Y) < 50;

                if (obstacle != null && !isBridge) {
                    double distToObs = dist(obstacle);
                    if (distToObs < obstacle.rad + g.getHitboxRadius(this) + 60) {

                        if (seekingPathDir == 0) {
                            if (x < GameEngine.W / 2)
                                seekingPathDir = -1;
                            else
                                seekingPathDir = 1;

                            if (x < 50)
                                seekingPathDir = 1;
                            if (x > GameEngine.W - 50)
                                seekingPathDir = -1;
                        }

                        double forwardY = (tm == 0 ? -1 : 1);

                        double wx = x + seekingPathDir * 40;
                        double wy = y + forwardY * 40;

                        if (checkPathBlocked(g, x, y, wx, wy)) {
                            wy = y;
                            if (checkPathBlocked(g, x, y, wx, wy)) {
                                wy = y - forwardY * 20;
                            }
                        }

                        if (wx < 20) {
                            wx = 20;
                            seekingPathDir = 1;
                        } else if (wx > GameEngine.W - 20) {
                            wx = GameEngine.W - 20;
                            seekingPathDir = -1;
                        }

                        currentWaypoint = new Point2D.Double(wx, wy);
                        tx = currentWaypoint.x;
                        ty = currentWaypoint.y;
                    } else {
                        seekingPathDir = 0;
                    }
                } else {
                    seekingPathDir = 0;
                }
            }

            moveTarget = new Point2D.Double(tx, ty);

            double dx = moveTarget.x - x;
            double dy = moveTarget.y - y;
            double dist = Math.hypot(dx, dy);

            if (!atk && dist > 1) {
                double movedDist = Math.hypot(x - lastPos.x, y - lastPos.y);
                if (movedDist < 0.5 * c.s) {
                    stuckTimer++;
                } else {
                    stuckTimer = 0;
                    isStuck = false;
                }
                lastPos.setLocation(x, y);

                if (stuckTimer > 40) {
                    isStuck = true;
                    if (stuckDir == 0)
                        stuckDir = (Math.random() < 0.5) ? 1 : -1;
                }
            } else {
                stuckTimer = 0;
                isStuck = false;
                stuckDir = 0;
            }

            if (isStuck) {
                dx = stuckDir;
                dy = 0;
                if (stuckTimer > 80) {
                    stuckDir *= -1;
                    stuckTimer = 41;
                }
            } else {
                if (dist > 0) {
                    dx /= dist;
                    dy /= dist;
                }
            }

            if (!atk) {
                x += dx * c.s * (isCharging ? 2.0 : 1.0); // Double speed when charging
                y += dy * c.s * (isCharging ? 2.0 : 1.0);
            }

            if (c.n.equals("Prince")) {
                distWalked += Math.hypot(dx * c.s, dy * c.s);
                if (distWalked > 20) {
                    isCharging = true;
                }
            }

            path.clear();
            path.add(moveTarget);
            if (currentWaypoint != null && lk != null) {
                path.add(new Point2D.Double(lk.x, lk.y));
            }
        }
    }

    @Override
    public void die(GameEngine g) {
        if (c.n.equals("Golem")) {
            // Spawn 2 Golemites
            spawnDeathTroops(g, GameEngine.GOLEMITE, 2, 10);
            // Death Damage (Gray Fireball)
            Proj p = new Proj(x, y, x, y, null, 0, false, 60, 259, tm, false); // Golem Death Dmg
            p.fireArea = true; // Reusing fireArea flag but will color it gray in Main
            p.isGray = true; // New flag for gray color
            p.life = 6; // 0.1s duration
            g.projs.add(p);
        } else if (c.n.equals("Golemite")) {
            // Death Damage (Small Gray Fireball)
            Proj p = new Proj(x, y, x, y, null, 0, false, 40, 53, tm, false); // Golemite Death Dmg
            p.fireArea = true;
            p.isGray = true;
            p.life = 6; // 0.1s duration
            g.projs.add(p);
        } else if (c.n.equals("Lava Hound")) {
            // Spawn 6 Lava Pups
            spawnDeathTroops(g, GameEngine.LAVA_PUP, 6, 20);
        } else if (c.n.equals("Elixir Golem")) {
            if (!isClone)
                g.giveElixir(1 - tm, 1.0);
            spawnDeathTroops(g, GameEngine.ELIXIR_GOLEMITE, 2, 10);
        } else if (c.n.equals("Elixir Golemite")) {
            if (!isClone)
                g.giveElixir(1 - tm, 0.5);
            spawnDeathTroops(g, GameEngine.ELIXIR_BLOB, 2, 8);
        } else if (c.n.equals("Elixir Blob")) {
            if (!isClone)
                g.giveElixir(1 - tm, 0.5);
        }

        if (curseTime > 0) {
            // Spawn Cursed Hog
            // Ensure card is retrieved correctly
            Card hogCard = GameEngine.CURSED_HOG;
            if (hogCard != null) {
                Troop hog = new Troop(1 - tm, x, y, hogCard); // Belongs to the killer (enemy of victim)
                g.ents.add(hog);
            }
        }
    }

    private void spawnDeathTroops(GameEngine g, Card c, int count, double offset) {
        for (int i = 0; i < count; i++) {
            double angle = (count > 2) ? i * (Math.PI * 2 / count) : (i == 0 ? Math.PI : 0); // Simple
                                                                                             // split
                                                                                             // for
                                                                                             // 2
            double px = x + (count == 2 ? (i == 0 ? -offset : offset) : Math.cos(angle) * offset);
            double py = y + (count > 2 ? Math.sin(angle) * offset : 0);

            Troop t = new Troop(tm, px, py, c);
            if (isClone) {
                t.hp = 1;
                t.mhp = 1;
                t.isClone = true;
            }
            g.ents.add(t);
        }
    }

    public boolean checkPathBlocked(GameEngine g, double x1, double y1, double x2, double y2) {
        // River Collision
        if (!fly) {
            int RIV_Y = 337;
            if ((y1 < RIV_Y && y2 > RIV_Y) || (y1 > RIV_Y && y2 < RIV_Y)) {
                // Path crosses river
                double t = (RIV_Y - y1) / (y2 - y1);
                double crossX = x1 + t * (x2 - x1);
                boolean onBridge = (crossX >= GameEngine.W / 4 - 30 && crossX <= GameEngine.W / 4 + 30)
                        || (crossX >= GameEngine.W * 3 / 4 - 30 && crossX <= GameEngine.W * 3 / 4 + 30);
                if (!onBridge)
                    return true;
            }
        }

        for (Entity e : g.ents) {
            if (e == this)
                continue;
            if (e instanceof Tower || e instanceof Building) {
                double hR = e.rad; // Visual radius
                double myR = g.getHitboxRadius(this);
                double safeDist = hR + myR + 5;
                if (Line2D.ptSegDist(x1, y1, x2, y2, e.x, e.y) < safeDist)
                    return true;
            }
        }
        return false;
    }

    public Entity getBlockingObstacle(GameEngine g, double x1, double y1, double x2, double y2) {
        Entity obstacle = null;
        double minDist = Double.MAX_VALUE;
        double myHitbox = g.getHitboxRadius(this);

        for (Entity e : g.ents) {
            if (e == this)
                continue;
            if (e.tm == tm && (e instanceof Tower || e instanceof Building)) {
                double hR = e.rad;
                double safeDist = hR + myHitbox + 5;
                if (Line2D.ptSegDist(x1, y1, x2, y2, e.x, e.y) < safeDist) {
                    double d = dist(e);
                    if (d < minDist) {
                        minDist = d;
                        obstacle = e;
                    }
                }
            }
        }
        return obstacle;
    }
}
