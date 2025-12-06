package clashroyale.entities;

import clashroyale.core.GameEngine;

public abstract class Entity {
    public int tm, st, fr, rt;
    public double x, y, hp, mhp, rad, mass;
    public boolean fly, air;
    public double lx, ly;
    public int stuckFrames;
    public int infernoTick = 0;

    public Entity(int t, double x, double y, double h, double r, double m, boolean fly, boolean air) {
        this.tm = t;
        this.x = x;
        this.y = y;
        this.hp = this.mhp = h;
        this.rad = r;
        this.mass = m;
        this.fly = fly;
        this.air = air;
        this.lx = x;
        this.ly = y;
    }

    public abstract void act(GameEngine g);
    public void die(GameEngine g) {}

    public double dist(Entity e) {
        return Math.hypot(x - e.x, y - e.y);
    }

    public int getInfernoMultiplier(int stage) {
        if (stage <= 0) return 1;
        return 2 * getInfernoMultiplier(stage - 1);
    }
}
