export default class Card {
    constructor(n, c, h, d, s, r, t, m, rt, si, f, a, tags = []) {
        this.n = n;   // name
        this.c = c;   // cost
        this.hp = h;  // health
        this.d = d;   // damage
        this.s = s;   // speed
        this.rn = r;  // range
        this.t = t;   // type (0=troop, 1=building_targeter, 2=spell, 3=building)
        this.ms = m;  // mass/lifetime
        this.rt = rt; // reload time
        this.si = si; // sight range / size
        this.fl = f;  // flying
        this.ar = a;  // air targeting
        this.tags = tags;
    }
}
