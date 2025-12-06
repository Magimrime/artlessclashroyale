package clashroyale.models;

public class Card {
    public String n;
    public int c, d, rt, t;
    public double s, rn, ms, hp, si;
    public boolean fl, ar;

    public Card(String n, int c, double h, int d, double s, double r, int t, double m, int rt, double si, boolean f, boolean a) {
        this.n = n;
        this.c = c;
        this.hp = h;
        this.d = d;
        this.s = s;
        this.rn = r;
        this.t = t;
        this.ms = m;
        this.rt = rt;
        this.si = si;
        this.fl = f;
        this.ar = a;
    }
}
