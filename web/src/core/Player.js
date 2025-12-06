export default class Player {
    constructor(t) {
        this.tm = t; // team (0=player, 1=enemy)
        this.elx = 5;
        this.h = []; // hand
        this.pile = []; // draw pile
        this.lastPlayedCard = null;
    }
}
