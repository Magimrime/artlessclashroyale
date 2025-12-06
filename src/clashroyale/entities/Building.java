package clashroyale.entities;

import clashroyale.core.GameEngine;
import clashroyale.models.Card;

public class Building extends Entity {
    public Card c;
    public int cd;
    public Entity lk;
    public boolean atk;

    public Building(int t, double x, double y, Card c) {
        super(t, x, y, c.hp, c.n.equals("Cannon") ? 15 : 20, 10000, false, false);
        this.c = c;
    }

    @Override
    public void act(GameEngine g) {
        if (fr > 0) { infernoTick = 0; return; }
        if (st-- > 0) { infernoTick = 0; return; }

        // Lifetime decay
        hp -= mhp / c.ms; // Use c.ms (lifetime in frames)
        if (hp <= 0) {
            if (c.n.equals("Elixir Collector")) {
                g.giveElixir(tm, 1.0); // Give 1 elixir on death
            }
            return;
        }

        // Elixir Collector Logic
        if (c.n.equals("Elixir Collector")) {
            // 13 seconds = 13 * 60 = 780 frames
            infernoTick++;
            if (infernoTick >= 780) {
                g.giveElixir(tm, 1.0);
                infernoTick = 0;
            }
            return; // Pump doesn't attack
        }

        if (lk != null) {
            if (lk.hp <= 0 || dist(lk) > c.si) { lk = null; atk = false; infernoTick = 0; }
        }

        if (!atk) {
            double min = 9999;
            Entity best = null;
            for (Entity e : g.ents) {
                if (e.tm != tm) {
                    if (e.fly && !c.ar) continue; // Cannot hit air if not air-targeting
                    double d = dist(e);
                    if (d < min && d < c.si) { min = d; best = e; }
                }
            }
            if (best != null) lk = best;
        }

        double myHitbox = g.getHitboxRadius(this);
        double targetHitbox = (lk != null) ? g.getHitboxRadius(lk) : 0;
        double attackRange = c.rn + myHitbox + targetHitbox + 2;

        if (lk != null && dist(lk) <= attackRange) {
            atk = true;
            if (cd-- > 0) return;
            
            // Attack
            if (c.n.equals("Inferno Tower")) {
                infernoTick++;
                int stage = infernoTick / 25;
                int mult = getInfernoMultiplier(stage);
                
                int dmg = c.d * mult;
                lk.hp -= dmg;
            } else {
                g.projs.add(new Proj(x, y, lk.x, lk.y, lk, 8, false, 4, c.d, tm, false));
            }
            cd = c.rt;
        } else {
            atk = false;
            infernoTick = 0;
            cd = c.rt;
        }
    }
}
