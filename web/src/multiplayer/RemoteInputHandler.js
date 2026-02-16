export default class RemoteInputHandler {
    constructor(gameEngine) {
        this.eng = gameEngine;
    }

    handleSpawn(cardName, x, y, team) {
        // Transform coordinates for local view
        // Incoming (x, y) is from opponent's perspective (they are bottom 0..800 relative)
        let rx = this.eng.W - x;
        let ry = 800 - y;

        // Validation for Player 2 (Remote)
        let p = (team === 1) ? this.eng.p2 : this.eng.p1; // Usually team is 1 for opponent

        // Robustly find the card by name
        let card = p.h.find(c => c.n === cardName);
        if (!card) {
            console.warn(`Card ${cardName} not found in remote hand`);
            return;
        }

        // Delegate to the Engine's unified playCard logic
        this.eng.playCard(p, card, rx, ry, team);
    }
}
