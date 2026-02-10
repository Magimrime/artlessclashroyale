import Card from '../models/Card.js';
import Entity from '../entities/Entity.js';
import Troop from '../entities/Troop.js';

export default class EnemyAI {
    constructor(g) {
        this.g = g;
        this.p = g.p2;
        this.aiTick = 0;
    }

    generateDeck() {
        let deck = [];
        let pool = [...this.g.allCards];

        if (this.g.enemyDeckSelection.length > 0) {
            deck.push(...this.g.enemyDeckSelection);
        }

        if (!this.hasWinCondition(deck)) {
            let winCon = this.findCard(pool, c => c.t === 1 && c.n !== "Miner" && c.n !== "Goblin Barrel");
            if (winCon) this.addCard(deck, winCon);
        }

        while (this.countType(deck, 2) < 2) {
            let spell = this.findCard(pool, c => c.t === 2);
            if (spell) this.addCard(deck, spell);
            else break;
        }

        if (!this.hasCheapOrMiniTank(deck)) {
            let cheap = this.findCard(pool, c => c.c <= 2 || (c.hp > 800 && c.c <= 4));
            if (cheap) this.addCard(deck, cheap);
        }

        if (!this.hasRanged(deck)) {
            let ranged = this.findCard(pool, c => c.rn > 2 && c.t === 0);
            if (ranged) this.addCard(deck, ranged);
        }

        if (!this.hasBuilding(deck)) {
            let building = this.findCard(pool, c => c.t === 3);
            if (building) this.addCard(deck, building);
        }

        if (!this.hasAreaDamage(deck)) {
            let splash = this.findCard(pool, c => c.ar);
            if (splash) this.addCard(deck, splash);
        }

        while (deck.length < 8) {
            if (pool.length === 0) break;
            let random = pool[Math.floor(Math.random() * pool.length)];
            this.addCard(deck, random);
        }

        this.p.pile = [...deck];
        this.p.h = [];
        // Shuffle pile
        for (let i = this.p.pile.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.p.pile[i], this.p.pile[j]] = [this.p.pile[j], this.p.pile[i]];
        }

        for (let i = 0; i < 4 && this.p.pile.length > 0; i++) {
            this.p.h.push(this.p.pile.shift());
        }
    }

    hasWinCondition(deck) { return deck.some(c => c.t === 1); }
    countType(deck, type) { return deck.filter(c => c.t === type).length; }
    hasCheapOrMiniTank(deck) { return deck.some(c => c.c <= 2 || (c.hp > 800 && c.c <= 4)); }
    hasRanged(deck) { return deck.some(c => c.rn > 2 && c.t === 0); }
    hasBuilding(deck) { return deck.some(c => c.t === 3); }
    hasAreaDamage(deck) { return deck.some(c => c.ar); }

    findCard(pool, condition) {
        let candidates = pool.filter(condition);
        if (candidates.length === 0) return null;
        return candidates[Math.floor(Math.random() * candidates.length)];
    }

    addCard(deck, c) {
        if (!deck.includes(c)) deck.push(c);
    }

    update() {
        if (this.g.over || this.g.tiebreaker) return;
        this.aiTick++;

        // Elixir Collector
        if (this.p.elx >= 6) {
            let pump = this.getAICard("Elixir Collector");
            if (pump) {
                if (this.g.t1K.hp > 2000) {
                    this.playAI(pump, 540 / 2 + (Math.random() > 0.5 ? 20 : -20), 30);
                    return;
                }
            }
        }

        // Clone
        if (this.p.elx >= 3) {
            let clone = this.getAICard("Clone");
            if (clone) {
                let bestTarget = null;
                let maxCount = 0;
                for (let e of this.g.ents) {
                    if (e.tm === 1 && e instanceof Troop && !e.isClone) {
                        let count = 0;
                        for (let neighbor of this.g.ents) {
                            if (neighbor.tm === 1 && neighbor instanceof Troop && !neighbor.isClone && e.dist(neighbor) < 80) {
                                count++;
                            }
                        }
                        if (count >= 2 && count > maxCount) {
                            maxCount = count;
                            bestTarget = e;
                        }
                    }
                }
                if (bestTarget) {
                    this.playAI(clone, bestTarget.x, bestTarget.y);
                    return;
                }
            }
        }

        // Tank Support
        let tank = this.getTankInHand();
        if (tank && this.p.elx < 9.5) {
            let tankOnField = this.getTankOnField();
            if (tankOnField) {
                let support = this.getSupportCard();
                if (support && this.p.elx >= support.c) {
                    this.playAI(support, tankOnField.x, tankOnField.y - 40);
                    return;
                }
            }
        }

        // Force Play
        if (this.p.elx >= 9.5) {
            let played = false;
            for (let c of this.p.h) {
                if (c.t !== 2 && c.c <= this.p.elx) {
                    let playX = 540 / 2 + (Math.random() > 0.5 ? 50 : -50);
                    let playY = 100;
                    if (c.t === 1 && c.hp > 1000) playY = 50;
                    else if (c.t === 1) playY = 400 - 60; // RIV_Y - 60

                    if (this.g.isValid(playY, playX, c)) {
                        this.playAI(c, playX, playY);
                        played = true;
                        break;
                    }
                }
            }

            if (!played) {
                for (let c of this.p.h) {
                    if (c.t === 2 && c.c <= this.p.elx) {
                        let target = (this.g.t1L.hp > 0) ? this.g.t1L : this.g.t1R;
                        if (target.hp <= 0) target = this.g.t1K;
                        this.playAI(c, target.x, target.y);
                        played = true;
                        break;
                    }
                }
            }
        }

        // Defense
        if (this.aiTick % 60 === 0) {
            let threats = this.g.ents.filter(e => e.tm === 0 && e instanceof Troop && e.y < 400 + 50);
            if (threats.length > 0 && this.p.elx >= 3) {
                let threat = threats[0];
                let counter = null;
                for (let c of this.p.h) {
                    if (c.c <= this.p.elx && c.t !== 2 && c.t !== 3) {
                        counter = c;
                        break;
                    }
                }
                if (counter) {
                    this.playAI(counter, threat.x, threat.y - 40);
                    return;
                }
            }
        }
    }

    getTankInHand() { return this.p.h.find(c => c.hp > 2000 && c.t === 1); }
    getTankOnField() { return this.g.ents.find(e => e.tm === 1 && e.hp > 1000 && e instanceof Troop); }
    getSupportCard() { return this.p.h.find(c => (c.rn > 3 || c.ar) && c.c <= 5); }
    getAICard(name) { return this.p.h.find(c => c.n === name); }

    playAI(c, x, y) {
        if (c.t !== 2 && c.n !== "Goblin Barrel" && y > 400 - 40) return;
        this.p.elx -= c.c;
        this.g.addU(1, c, x, y);

        let idx = this.p.h.indexOf(c);
        if (idx > -1) {
            this.p.h.splice(idx, 1);
            this.p.pile.push(c);
            this.p.h.push(this.p.pile.shift());
        }
    }
}
