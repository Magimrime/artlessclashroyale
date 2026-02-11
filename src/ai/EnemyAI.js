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
        if (this.g.gameOver) return;
        this.aiTick++;

        // Initial Delay
        if (this.aiTick < 60) return;




        // Elixir Management - Don't leak unless waiting (handled by handleFullElixir)
        if (this.p.elx >= 9.5) {
            this.handleFullElixir();
            // Return if handled to avoid logic conflict
        }

        // Defensive Logic - Analyze Threats
        // Filter threats: Player troops on our side or menacingly close (bridge)
        let threats = this.g.ents.filter(e => e.tm === 0 && e instanceof Troop);
        // Sort threats by "danger" (closer to tower = more dangerous)
        threats.sort((a, b) => a.y - b.y); // Higher Y = closer to enemy tower (at top)

        if (threats.length > 0) {
            // Pick most dangerous threat
            let primaryThreat = threats[0];

            // Do we have enough elixir to counter?
            // Simple heuristic to not dump elixir on small threats if low
            if (this.p.elx >= 2) {
                let counter = this.pickCounter(primaryThreat);
                if (counter) {
                    // Logic for placement
                    let playX = primaryThreat.x;
                    let playY = primaryThreat.y - 120; // Default defensive planting 

                    // Adjust placement based on counter type
                    if (counter.tags.includes("Building")) {
                        playX = 540 / 2; // Pull to center
                        playY = 150;
                    } else if (counter.tags.includes("Spell")) {
                        playX = primaryThreat.x;
                        playY = primaryThreat.y;
                    } else if (counter.tags.includes("Swarm")) {
                        playY = primaryThreat.y - 50; // Surround/On top
                    } else if (counter.tags.includes("DamageDealer") && primaryThreat.tags.includes("Tank")) {
                        playY = primaryThreat.y - 80; // DPS down
                    }

                    if (this.g.isValid(playY, playX, counter, 1)) {
                        this.playAI(counter, playX, playY);
                        return; // Action taken
                    }
                }
            }
        }

        // Offensive Logic - If no immediate high-priority threats
        // Build a push if high elixir
        if (this.p.elx >= 8) {
            this.playOffensivePush();
        }
    }

    pickCounter(threat) {
        // analyze threat tags
        let isWinCon = threat.tags && threat.tags.includes("WinCon");
        let isTank = threat.tags && threat.tags.includes("Tank");
        let isSwarm = threat.tags && threat.tags.includes("Swarm");
        let isAir = threat.fl;

        // Available cards
        let available = this.p.h.filter(c => c.c <= this.p.elx);

        // 1. Air Threat
        if (isAir) {
            return available.find(c => c.fl || c.rn > 20 || (c.tags && c.tags.includes("Building"))); // Ranged or Building or Flying
        }

        // 2. Swarm Threat
        if (isSwarm) {
            let aoe = available.find(c => c.tags && (c.tags.includes("AOE") || c.tags.includes("Spell")));
            if (aoe) return aoe;
            // Fallback
        }

        // 3. Win Condition (Building Targeter)
        if (isWinCon) {
            // Building > Swarm > High DPS
            let bldg = available.find(c => c.tags && c.tags.includes("Building"));
            if (bldg) return bldg;

            let swarm = available.find(c => c.tags && c.tags.includes("Swarm"));
            if (swarm) return swarm;

            let dps = available.find(c => c.tags && c.tags.includes("DamageDealer"));
            if (dps) return dps;
        }

        // 4. Tank
        if (isTank) {
            let dps = available.find(c => c.tags && (c.tags.includes("DamageDealer") || c.tags.includes("Swarm")));
            if (dps) return dps;
        }

        // 5. Generic Counters
        // Tank distracts DMG Dealer
        if (threat.tags && threat.tags.includes("DamageDealer")) {
            let tank = available.find(c => c.tags && (c.tags.includes("Tank") || c.tags.includes("Swarm")));
            if (tank) return tank;
        }

        // Default: Cheapest effective card
        return available.sort((a, b) => a.c - b.c)[0];
    }

    playOffensivePush() {
        // High Cost Card Logic (6+) -> Play in back
        let highCost = this.p.h.find(c => c.c >= 6);
        if (highCost) {
            let laneX = (Math.random() > 0.5) ? 100 : 440;
            this.playAI(highCost, laneX, 20); // Back
            return;
        }

        // Win Condition Push
        let winCon = this.p.h.find(c => c.tags && c.tags.includes("WinCon"));
        if (winCon) {
            let laneX = (Math.random() > 0.5) ? 100 : 440;
            this.playAI(winCon, laneX, 100); // Bridge/near
            // Support will be handled in next ticks by reacting to the push or generic support logic
            return;
        }

        // Generic Tank in back
        let tank = this.p.h.find(c => c.tags && c.tags.includes("Tank"));
        if (tank) {
            let laneX = (Math.random() > 0.5) ? 100 : 440;
            this.playAI(tank, laneX, 20);
            return;
        }

        // Cycle
        this.handleFullElixir();
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

    handleFullElixir() {
        // If player has units on board, standard defense logic (above) or force play logic will handle it
        let playerHasUnits = this.g.ents.some(e => e.tm === 0 && e instanceof Troop);

        if (!playerHasUnits) {
            // Player is passive.
            // 5% chance per tick to act when full
            if (Math.random() < 0.05) {
                let r = Math.random();
                if (r < 0.4) {
                    this.playCycleCard();
                } else if (r < 0.7) {
                    this.playTankInBack();
                } else {
                    // Do nothing (wait), effectively leaking.
                }
            }
        } else {
            // Player has units. We should respond.
            let threat = this.g.ents.find(e => e.tm === 0 && e instanceof Troop);
            let laneX = (threat && threat.x < 540 / 2) ? 540 / 4 : 540 * 3 / 4; // Match lane

            // Try to play something in that lane
            let c = this.p.h.find(c => c.c <= this.p.elx && c.t !== 2 && c.t !== 3);
            if (c) {
                this.playAI(c, laneX, 100);
            } else {
                this.forcePlay();
            }
        }
    }

    playCycleCard() {
        let cycle = this.p.h.find(c => c.c <= 3 && c.t !== 2); // Cheap troop
        if (cycle) {
            let x = (Math.random() > 0.5) ? 540 / 4 : 540 * 3 / 4;
            this.playAI(cycle, x, 50); // In back
        } else {
            this.forcePlay();
        }
    }

    playTankInBack() {
        let tank = this.p.h.find(c => c.hp > 1000 && c.t === 1);
        if (tank && tank.c <= this.p.elx) {
            let x = (Math.random() > 0.5) ? 540 / 4 : 540 * 3 / 4;
            this.playAI(tank, x, 20); // Way back
        } else {
            this.playCycleCard();
        }
    }

    forcePlay() {
        for (let c of this.p.h) {
            if (c.t !== 2 && c.c <= this.p.elx) {
                let playX = 540 / 2 + (Math.random() > 0.5 ? 50 : -50);
                let playY = 100;
                if (c.t === 1 && c.hp > 1000) playY = 50;
                else if (c.t === 1) playY = 400 - 60; // RIV_Y - 60

                if (this.g.isValid(playY, playX, c, 1)) {
                    this.playAI(c, playX, playY);
                    return;
                }
            }
        }
        // Spell dump
        for (let c of this.p.h) {
            if (c.t === 2 && c.c <= this.p.elx) {
                let target = (this.g.t1L.hp > 0) ? this.g.t1L : this.g.t1R;
                if (target.hp <= 0) target = this.g.t1K;
                this.playAI(c, target.x, target.y);
                return;
            }
        }
    }
}

