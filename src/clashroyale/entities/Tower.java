package clashroyale.entities;

import clashroyale.core.GameEngine;

public class Tower extends Entity {
    public boolean kg, actv;
    public int cd;

    public Tower(int t, double x, double y, boolean k) {
        super(t, x, y, k ? 6500 : 4500, k ? 25 : 20, 10000, false, true);
        this.kg = k;
        this.actv = !k;
    }

    @Override
    public void act(GameEngine g) {
        if (fr > 0) return;
        if (st-- > 0) return;
        if (!actv) return;
        if (cd-- > 0) return;
        
        // Constants from Main need to be accessed or passed. 
        // For now I'll hardcode or access static if I make Main static constants public.
        // The original code used static final int W = 450, H = 824; RIV_Y = 337;
        // I should probably move these constants to a shared place or GameEngine.
        // For now I will use the values directly or reference Main if I make them public static there.
        // Let's assume I'll put them in a Constants class or just use magic numbers for now to match logic, 
        // or better, access them from GameEngine if I put them there.
        // The original code had them in ClashRoyaleClone class.
        // I will put them in GameEngine for now as public static constants.
        
        int W = 450; 
        int RIV_Y = 337;

        for (Entity e : g.ents) {
            if (e.tm != tm && dist(e) < 250) {
                if (!kg && ((x < W / 2 && e.x > W / 2) || (x > W / 2 && e.x < W / 2))) continue;
                if (tm == 0 && e.y < RIV_Y) continue;
                if (tm == 1 && e.y > RIV_Y) continue;
                g.projs.add(new Proj(x, y, e.x, e.y, e, 10, false, 4, 50, tm, false));
                cd = 40;
                break;
            }
        }
    }
}
 