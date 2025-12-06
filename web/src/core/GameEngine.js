import Player from './Player.js';
import Card from '../models/Card.js';
import Entity from '../entities/Entity.js';
import Troop from '../entities/Troop.js';
import Building from '../entities/Building.js';
import Tower from '../entities/Tower.js';
import Proj from '../entities/Proj.js';
import EnemyAI from '../ai/EnemyAI.js';

export default class GameEngine {
    constructor() {
        this.W = 540;
        this.H = 960;
        this.RIV_Y = 400;

        this.p1 = null;
        this.p2 = null;
        this.ents = [];
        this.projs = [];
        this.t1K = null; this.t1L = null; this.t1R = null;
        this.t2K = null; this.t2L = null; this.t2R = null;
        this.over = false;
        this.win = 0;
        this.aiTick = 0;
        this.gameStart = 0;
        this.isDoubleElixir = false;
        this.tiebreaker = false;
        this.doubleElixirAnim = 0;
        this.unlockedCards = [];
        this.myDeck = [];
        this.sel = null;
        this.cheated = false;
        this.gamesPlayed = 0;
        this.gamesWon = 0;
        this.enemyDeckSelection = [];
        this.debugView = false;

        this.allCards = [
            new Card("Knight", 3, 800, 30, 1.5, 20, 0, 15, 60, 150, false, false),
            new Card("Archers", 3, 200, 25, 2, 100, 0, 3, 60, 180, false, true),
            new Card("Giant", 5, 2000, 150, 0.8, 20, 1, 500, 90, 150, false, false),
            new Card("Fireball", 4, 0, 200, 0, 0, 2, 0, 0, 0, false, true),
            new Card("Mini PEKKA", 4, 900, 300, 1.8, 20, 0, 15, 60, 150, false, false),
            new Card("Zap", 2, 0, 60, 0, 0, 2, 0, 0, 0, false, true),
            new Card("Skeletons", 1, 5, 40, 2.0, 6, 0, 2, 22, 150, false, false),
            new Card("Musketeer", 4, 500, 150, 1.5, 140, 0, 10, 60, 220, false, true),
            new Card("Cannon", 3, 700, 100, 0, 120, 3, 10000, 100, 120, false, false),
            new Card("Mega Knight", 7, 2300, 500, 1.2, 22, 0, 200, 100, 200, false, false),
            new Card("P.E.K.K.A", 7, 3000, 980, 0.5, 22, 0, 200, 120, 200, false, false),
            new Card("Skeleton Army", 3, 5, 40, 2.0, 6, 0, 2, 10, 150, false, false),
            new Card("Barbarians", 5, 600, 150, 1.2, 18, 0, 10, 90, 180, false, false),
            new Card("Goblin Barrel", 3, 0, 0, 0, 0, 2, 0, 0, 0, false, false),
            new Card("Barbarian Barrel", 2, 0, 0, 0, 0, 2, 0, 0, 0, false, false),
            new Card("Vines", 2, 0, 20, 0, 0, 2, 0, 0, 0, false, true),
            new Card("Freeze", 4, 0, 5, 0, 0, 2, 0, 0, 0, false, true),
            new Card("Fire Spirit", 1, 90, 0, 2.0, 12, 0, 2, 10, 150, false, true),
            new Card("Ice Spirit", 1, 110, 8, 2.0, 12, 0, 2, 10, 150, false, true),
            new Card("Electro Spirit", 1, 110, 8, 2.0, 12, 0, 2, 10, 150, false, true),
            new Card("Heal Spirit", 1, 110, 8, 2.0, 12, 0, 2, 10, 150, false, true),
            new Card("Arrows", 3, 0, 120, 0, 0, 2, 0, 0, 0, false, true),
            new Card("Minions", 3, 190, 50, 2.0, 12, 0, 3, 40, 150, true, true),
            new Card("Goblins", 2, 90, 100, 2.5, 12, 0, 2, 60, 150, false, false),
            new Card("Spear Goblins", 2, 110, 50, 2.5, 90, 0, 2, 50, 180, false, true),
            new Card("Bats", 2, 67, 67, 2.5, 10, 0, 2, 60, 150, true, false),
            new Card("Poison", 4, 0, 600, 0, 200, 2, 0, 0, 0, false, true),
            new Card("Wizard", 5, 598, 230, 1.5, 100, 0, 10, 84, 220, false, true),
            new Card("Witch", 5, 696, 111, 1.5, 100, 0, 10, 42, 220, false, true),
            new Card("Graveyard", 5, 0, 0, 0, 33, 2, 0, 0, 0, false, true),
            new Card("Mega Minion", 3, 700, 250, 1.6, 20, 0, 200, 60, 150, true, false),
            new Card("Minion Horde", 5, 190, 50, 2.0, 12, 0, 6, 40, 150, true, true),
            new Card("Baby Dragon", 4, 1000, 130, 1.5, 80, 0, 10, 80, 180, true, true),
            new Card("Inferno Dragon", 4, 1070, 1, 1.5, 50, 0, 4, 1, 150, true, true),
            new Card("Inferno Tower", 5, 1400, 1, 0.4, 120, 3, 30 * 60, 1, 120, false, false),
            new Card("Golem", 8, 5120, 312, 0.8, 25, 1, 1000, 150, 200, false, false),
            new Card("Lava Hound", 7, 3581, 53, 0.8, 100, 1, 4000, 78, 180, true, false),
            new Card("Elixir Golem", 3, 1569, 253, 0.66, 25, 1, 4000, 117, 200, false, false),
            new Card("Elite Barbarians", 6, 1341, 318, 1.4, 18, 0, 15, 60, 180, false, false),
            new Card("Elixir Collector", 6, 1070, 0, 0, 0, 3, 93 * 60, 1, 120, false, false),
            new Card("Zappies", 4, 250, 55, 1.2, 70, 0, 10, 126, 150, false, true),
            new Card("Sparky", 6, 2000, 1500, 0.8, 90, 0, 2000, 300, 150, false, false),
            new Card("Mirror", 1, 0, 0, 0, 0, 2, 0, 0, 0, false, true),
            new Card("Clone", 3, 0, 0, 0, 0, 2, 0, 0, 0, false, true),
            new Card("Wall Breakers", 2, 140, 560, 2.0, 12, 1, 4, 60, 150, false, false),
            new Card("Royal Giant", 6, 1600, 390, 0.8, 120, 1, 500, 102, 200, false, false),
            new Card("Electro Giant", 7, 2000, 150, 0.8, 20, 1, 500, 90, 150, false, false),
            new Card("Bowler", 5, 1600, 200, 0.8, 100, 0, 180, 150, 150, false, false),
            new Card("Hog Rider", 4, 1408, 264, 2.0, 20, 1, 300, 60, 150, false, false),
            new Card("Royal Hogs", 5, 695, 68, 2.0, 20, 1, 150, 60, 120, false, false),
            new Card("Prince", 5, 1615, 325, 1.2, 20, 0, 120, 60, 150, false, false),
            new Card("Mother Witch", 4, 532, 133, 1.2, 110, 0, 10, 72, 150, false, true),
            new Card("The Log", 2, 0, 268, 0, 0, 2, 0, 0, 0, false, true),
            new Card("Royal Recruits", 7, 440, 110, 1.5, 23, 0, 20, 78, 150, false, false)
        ];

        // Apply Stat Adjustments
        this.allCards.forEach(c => {
            if (c.n !== "Mother Witch") c.hp = Math.floor(c.hp * 1.30);
            if (c.s > 0) c.s = c.s * 0.75; // 25% slower
            if (c.t === 2) { // Spell
                if (c.n === "Fireball") c.d = Math.floor(c.d * 1.60);
                else c.d = Math.floor(c.d * 1.30);
            }
        });

        this.tokens = [
            new Card("Golemite", 0, 1039, 50, 0.8, 20, 0, 10, 60, 150, false, false),
            new Card("Lava Pup", 0, 134, 45, 2.0, 60, 0, 6, 60, 150, true, true),
            new Card("Elixir Golemite", 0, 762, 40, 0.66, 20, 0, 10, 60, 150, false, false),
            new Card("Elixir Blob", 0, 360, 20, 0.66, 20, 0, 6, 60, 150, false, false),
            new Card("Cursed Hog", 0, 520, 50, 2.0, 20, 1, 10, 60, 150, false, false)
        ];

        // Apply Stat Adjustments to Tokens
        this.tokens.forEach(c => {
            if (c.n !== "Mother Witch") c.hp = Math.floor(c.hp * 1.30);
            if (c.s > 0) c.s = c.s * 0.75;
        });

        this.enemyAI = null;
    }

    giveElixir(teamToGive, amount) {
        if (teamToGive === 0) this.p1.elx = Math.min(10, this.p1.elx + amount);
        else this.p2.elx = Math.min(10, this.p2.elx + amount);
    }

    initCollection() {
        this.cheated = false;
        this.unlockedCards = [];
        this.myDeck = [];
        let pool = [...this.allCards];
        // Shuffle
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }

        for (let i = 0; i < Math.min(9, pool.length); i++)
            this.unlockedCards.push(pool[i]);
        for (let i = 0; i < Math.min(8, this.unlockedCards.length); i++)
            this.myDeck.push(this.unlockedCards[i]);
    }

    unlockRandomCard() {
        let locked = this.allCards.filter(c => !this.unlockedCards.includes(c));
        if (locked.length === 0) return null;
        let c = locked[Math.floor(Math.random() * locked.length)];
        this.unlockedCards.push(c);
        this.saveProgress();
        return c;
    }

    unlockAllCards() {
        this.unlockedCards = [...this.allCards];
        this.saveProgress();
    }

    saveProgress() {
        let data = {
            gamesWon: this.gamesWon,
            gamesPlayed: this.gamesPlayed,
            cheated: this.cheated,
            myDeck: this.myDeck.map(c => c.n),
            debugView: this.debugView,
            enemyDeckSelection: this.enemyDeckSelection.map(c => c.n),
            unlockedCards: this.unlockedCards.map(c => c.n)
        };
        localStorage.setItem('clash_royale_save', JSON.stringify(data));
    }

    loadProgress() {
        let json = localStorage.getItem('clash_royale_save');
        if (!json) return;
        try {
            let data = JSON.parse(json);
            this.gamesWon = data.gamesWon || 0;
            this.gamesPlayed = data.gamesPlayed || 0;
            this.cheated = data.cheated || false;
            this.debugView = data.debugView || false;

            this.myDeck = [];
            if (data.myDeck) {
                data.myDeck.forEach(n => {
                    let c = this.getCard(n);
                    if (c) this.myDeck.push(c);
                });
            }

            this.enemyDeckSelection = [];
            if (data.enemyDeckSelection) {
                data.enemyDeckSelection.forEach(n => {
                    let c = this.getCard(n);
                    if (c) this.enemyDeckSelection.push(c);
                });
            }

            this.unlockedCards = [];
            if (data.unlockedCards) {
                data.unlockedCards.forEach(n => {
                    let c = this.getCard(n);
                    if (c && !this.unlockedCards.includes(c)) this.unlockedCards.push(c);
                });
            }

            // Sanity check
            this.myDeck.forEach(c => {
                if (!this.unlockedCards.includes(c)) this.unlockedCards.push(c);
            });
        } catch (e) {
            console.error("Failed to load save", e);
        }
    }

    deleteProgress() {
        localStorage.removeItem('clash_royale_save');
    }

    hasSaveFile() {
        return localStorage.getItem('clash_royale_save') !== null;
    }

    reset() {
        this.p1 = new Player(0);
        this.p2 = new Player(1);
        this.ents = [];
        this.projs = [];
        this.sel = null;
        this.over = false;
        this.aiTick = 0;
        this.gameStart = Date.now();
        this.isDoubleElixir = false;
        this.tiebreaker = false;
        this.doubleElixirAnim = 0;

        this.p1.pile = [...this.myDeck];
        // Shuffle p1 pile
        for (let i = this.p1.pile.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.p1.pile[i], this.p1.pile[j]] = [this.p1.pile[j], this.p1.pile[i]];
        }
        this.p1.h = [];
        for (let i = 0; i < 4; i++) this.p1.h.push(this.p1.pile.shift());

        this.enemyAI = new EnemyAI(this);

        // Enemy Deck: Random 8 cards from unlocked cards (or all cards if not enough)
        this.p2.pile = [];
        let enemyPool = [...this.unlockedCards];
        if (enemyPool.length < 8) enemyPool = [...this.allCards]; // Fallback

        // Shuffle pool
        for (let i = enemyPool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [enemyPool[i], enemyPool[j]] = [enemyPool[j], enemyPool[i]];
        }

        // Pick top 8
        for (let i = 0; i < 8; i++) this.p2.pile.push(enemyPool[i]);

        this.p2.h = [];
        for (let i = 0; i < 4; i++) this.p2.h.push(this.p2.pile.shift());

        this.t1K = new Tower(0, this.W / 2, this.H - 230, true);
        this.ents.push(this.t1K);
        this.t1L = new Tower(0, this.W / 4, this.H - 310, false);
        this.ents.push(this.t1L);
        this.t1R = new Tower(0, this.W * 3 / 4, this.H - 310, false);
        this.ents.push(this.t1R);

        this.t2K = new Tower(1, this.W / 2, 70, true);
        this.ents.push(this.t2K);
        this.t2L = new Tower(1, this.W / 4, 150, false);
        this.ents.push(this.t2L);
        this.t2R = new Tower(1, this.W * 3 / 4, 150, false);
        this.ents.push(this.t2R);
    }

    isValid(y, x, c) {
        if (c.n === "The Log") {
            // Log must be placed on player's side (roughly)
            if (y < this.RIV_Y + 40) return false;
            return true;
        }
        if (c.t === 2 || c.n === "Goblin Barrel") return true;
        if (y >= this.RIV_Y + 40) return true;
        if (c.t === 3 && y > this.RIV_Y - 40 && y < this.RIV_Y + 40) return false;
        if (this.t2L && this.t2L.hp <= 0 && x < this.W / 2 && y >= 200) return true; // Updated to 200
        if (this.t2R && this.t2R.hp <= 0 && x > this.W / 2 && y >= 200) return true; // Updated to 200
        return false;
    }

    getHitboxRadius(e) {
        if (e instanceof Tower) return e.rad / 1.5;
        if (e instanceof Building) return e.rad / 1.5;
        if (e instanceof Troop) return e.rad;
        return e.rad / 2.0;
    }

    getVisualRadius(c) {
        if (c.n === "Cannon") return 25;
        if (c.t === 3) return 20;
        return 18;
    }

    spawn(x, y) {
        if (this.tiebreaker) return;
        if (!this.sel || y > this.H - 120) return;

        let cardToPlay = this.sel;
        let cost = this.sel.c;
        let isMirror = false;

        if (this.sel.n === "Mirror") {
            if (!this.p1.lastPlayedCard) return;
            cardToPlay = this.p1.lastPlayedCard;
            cost = cardToPlay.c + 1;
            isMirror = true;
        }

        if (this.p1.elx < cost) return;

        if (cardToPlay.t === 3) {
            let newVisualRad = this.getVisualRadius(cardToPlay);
            for (let e of this.ents) {
                if (e instanceof Tower || e instanceof Building) {
                    if (Math.hypot(x - e.x, y - e.y) < e.rad + newVisualRad + 3) return;
                }
            }
        }

        if (!this.isValid(y, x, cardToPlay)) return;
        this.p1.elx -= cost;

        // Apply Mirror Boost (5% HP/Dmg)
        if (isMirror) {
            // Create a temporary boosted card object
            let boostedCard = Object.assign(Object.create(Object.getPrototypeOf(cardToPlay)), cardToPlay);
            boostedCard.hp = Math.floor(cardToPlay.hp * 1.05);
            boostedCard.d = Math.floor(cardToPlay.d * 1.05);
            this.addU(0, boostedCard, x, y);
        } else {
            this.addU(0, cardToPlay, x, y);
        }

        if (this.sel.n !== "Mirror") this.p1.lastPlayedCard = this.sel;
        else this.p1.lastPlayedCard = cardToPlay;

        // Update Mirror Card Cost
        let mirrorCard = this.allCards.find(c => c.n === "Mirror");
        if (mirrorCard && this.p1.lastPlayedCard) {
            mirrorCard.c = this.p1.lastPlayedCard.c + 1;
        }

        let idx = this.p1.h.indexOf(this.sel);
        if (idx > -1) {
            this.p1.h.splice(idx, 1);
            this.p1.pile.push(this.sel);
            this.p1.h.push(this.p1.pile.shift());
        }
        this.sel = null;
    }

    addU(tm, c, x, y) {
        if (c.n === "Goblin Barrel") {
            this.projs.push(new Proj(tm === 0 ? this.W / 2 : this.W / 2, tm === 0 ? this.H : 0, x, y, null, 15, false, 10, 0, tm, true));
        } else if (c.n === "Barbarian Barrel") {
            this.projs.push(new Proj(x, y, x, y, null, 0, false, 60, 50, tm, false).asRedArea());
            let barb = new Card("Barbarians", 0, 600, 150, 1.2, 18, 0, 10, 90, 180, false, false);
            this.ents.push(new Troop(tm, x, y, barb));
        } else if (c.n === "Poison") {
            this.projs.push(new Proj(x, y, x, y, null, 0, true, 200, 5, tm, false).asPoison());
        } else if (c.n === "Graveyard") {
            this.projs.push(new Proj(x, y, x, y, null, 0, true, 200, 0, tm, false).asGraveyard());
        } else if (c.n === "Graveyard") {
            this.projs.push(new Proj(x, y, x, y, null, 0, true, 200, 0, tm, false).asGraveyard());
        } else if (c.n === "The Log") {
            // Log rolls 10.1 tiles. 1 tile ~ 30px. 10.1 * 30 = 303px.
            // Speed: 2.5x slower than 10 => 4.
            let dist = 303;
            let ty = (tm === 0) ? y - dist : y + dist;
            let p = new Proj(x, y, x, ty, null, 4, false, 60, Math.floor(c.d * 0.8), tm, false).asLog();
            this.projs.push(p);
        } else if (c.n === "Clone") {
            let p = new Proj(x, y, x, y, null, 0, true, 90, 0, tm, false);
            p.life = 5;
            p.isClone = true;
            this.projs.push(p);

            let toClone = [];
            for (let e of this.ents) {
                if (e instanceof Troop && e.tm === tm && Math.hypot(e.x - x, e.y - y) < 90 && !e.isClone && !(e instanceof Building) && !(e instanceof Tower)) {
                    toClone.push(e);
                }
            }
            for (let t of toClone) {
                let clone = new Troop(tm, t.x + 20, t.y, t.c);
                clone.hp = 1;
                clone.mhp = 1;
                clone.isClone = true;
                this.ents.push(clone);
            }
        } else if (c.t === 2) {
            let rad = 60, dmg = c.d;
            if (c.n === "Zap") { rad = 40; dmg = 150; }
            if (c.n === "Vines") { rad = 80; dmg = 20; }
            if (c.n === "Freeze") { rad = 100; dmg = 5; }
            if (c.n === "Arrows") { rad = 100; dmg = 120; }
            let p = new Proj(x, y, x, y, null, 0, true, rad, dmg, tm, false);
            if (c.n === "Zap") p.asStun();
            if (c.n === "Vines") p.isRoot = true;
            if (c.n === "Freeze") p.isFreeze = true;
            if (c.n === "Fireball") p.hasKnockback = true;
            this.projs.push(p);
        } else if (["Archers", "Spear Goblins", "Wall Breakers"].includes(c.n)) {
            this.ents.push(new Troop(tm, x - 15, y, c));
            this.ents.push(new Troop(tm, x + 15, y, c));
            if (c.n.includes("Spear")) this.ents.push(new Troop(tm, x, y + 15, c));
        } else if (["Skeletons", "Goblins"].includes(c.n)) {
            this.ents.push(new Troop(tm, x, y - 10, c));
            this.ents.push(new Troop(tm, x - 10, y + 10, c));
            this.ents.push(new Troop(tm, x + 10, y + 10, c));
        } else if (c.n === "Minions") {
            this.ents.push(new Troop(tm, x, y - 10, c));
            this.ents.push(new Troop(tm, x - 10, y + 10, c));
            this.ents.push(new Troop(tm, x + 10, y + 10, c));
        } else if (c.n === "Minion Horde") {
            for (let i = 0; i < 6; i++)
                this.ents.push(new Troop(tm, x + Math.random() * 50 - 25, y + Math.random() * 50 - 25, this.getCard("Minions")));
        } else if (c.n === "Skeleton Army") {
            for (let i = 0; i < 15; i++)
                this.ents.push(new Troop(tm, x + Math.random() * 60 - 30, y + Math.random() * 60 - 30, this.getCard("Skeletons")));
        } else if (c.n === "Bats") {
            for (let i = 0; i < 5; i++)
                this.ents.push(new Troop(tm, x + Math.random() * 40 - 20, y + Math.random() * 40 - 20, c));
        } else if (c.n === "Barbarians") {
            this.ents.push(new Troop(tm, x - 12, y - 12, c));
            this.ents.push(new Troop(tm, x + 12, y - 12, c));
            this.ents.push(new Troop(tm, x - 12, y + 12, c));
            this.ents.push(new Troop(tm, x + 12, y + 12, c));
        } else if (c.n === "Elite Barbarians") {
            this.ents.push(new Troop(tm, x - 10, y, c));
            this.ents.push(new Troop(tm, x + 10, y, c));
        } else if (c.n === "Zappies") {
            this.ents.push(new Troop(tm, x - 10, y, c));
            this.ents.push(new Troop(tm, x + 10, y, c));
            this.ents.push(new Troop(tm, x, y + 10, c));
        } else if (c.n === "Mega Knight") {
            this.ents.push(new Troop(tm, x, y, c));
            for (let e of this.ents)
                if (e.tm !== tm && !e.fly && Math.hypot(e.x - x, e.y - y) < 100)
                    e.hp -= 100;
        } else if (c.t === 3) {
            this.ents.push(new Building(tm, x, y, c));
        } else if (c.n === "Royal Hogs") {
            this.ents.push(new Troop(tm, x - 30, y, c));
            this.ents.push(new Troop(tm, x - 10, y, c));
            this.ents.push(new Troop(tm, x + 10, y, c));
            this.ents.push(new Troop(tm, x + 30, y, c));
        } else if (c.n === "Royal Recruits") {
            let offsets = [-150, -90, -30, 30, 90, 150];
            for (let off of offsets) {
                this.ents.push(new Troop(tm, x + off, y, c));
            }
        } else {
            this.ents.push(new Troop(tm, x, y, c));
        }
    }

    getCard(n) {
        let c = this.allCards.find(c => c.n === n);
        if (c) return c;
        c = this.tokens.find(c => c.n === n);
        if (c) return c;
        return this.allCards[0];
    }

    endGame(winner) {
        if (this.over) return;
        this.over = true;
        this.win = winner;
        this.gamesPlayed++;
        if (this.win === 0) this.gamesWon++;
        this.saveProgress();
    }

    upd() {
        let elapsed = Date.now() - this.gameStart;
        let remaining = 300000 - elapsed;
        if (remaining <= 120000 && !this.isDoubleElixir) {
            this.isDoubleElixir = true;
            this.doubleElixirAnim = 300;
        }
        if (remaining <= 0) {
            remaining = 0;
            this.tiebreaker = true;
        }

        if (this.doubleElixirAnim > 0) this.doubleElixirAnim--;

        if (this.t1K.hp <= 0 || this.t2K.hp <= 0) {
            this.endGame(this.t1K.hp <= 0 ? 1 : 0);
            return;
        }

        if (this.tiebreaker) {
            this.ents = this.ents.filter(e => e instanceof Tower);
            let t1Count = (this.t1K.hp > 0 ? 1 : 0) + (this.t1L.hp > 0 ? 1 : 0) + (this.t1R.hp > 0 ? 1 : 0);
            let t2Count = (this.t2K.hp > 0 ? 1 : 0) + (this.t2L.hp > 0 ? 1 : 0) + (this.t2R.hp > 0 ? 1 : 0);

            if (t1Count !== t2Count) {
                this.endGame(t1Count > t2Count ? 0 : 1);
                return;
            }

            for (let e of this.ents) {
                if (e instanceof Tower) {
                    e.hp -= 10;
                    if (e.hp <= 0) {
                        this.endGame(e.tm === 0 ? 1 : 0);
                        return;
                    }
                }
            }
        }

        let rate = this.isDoubleElixir ? 0.02 : 0.01;
        this.p1.elx = Math.min(10, this.p1.elx + rate);
        this.p2.elx = Math.min(10, this.p2.elx + rate);

        this.aiTick++;

        this.t1K.actv = (this.t1K.hp < this.t1K.mhp) || (this.t1L.hp <= 0) || (this.t1R.hp <= 0);
        this.t2K.actv = (this.t2K.hp < this.t2K.mhp) || (this.t2L.hp <= 0) || (this.t2R.hp <= 0);

        if (this.enemyAI) this.enemyAI.update();

        // Stuck Push
        for (let e of this.ents) {
            if (e instanceof Tower || e instanceof Building || e.fly) continue;
            for (let b of this.ents) {
                if (b instanceof Tower) {
                    let hR = this.getHitboxRadius(b);
                    let cR = hR * 0.25;
                    let iB = hR - cR;
                    let cx = Math.max(b.x - iB, Math.min(b.x + iB, e.x));
                    let cy = Math.max(b.y - iB, Math.min(b.y + iB, e.y));
                    let dx = e.x - cx;
                    let dy = e.y - cy;
                    let dist = Math.hypot(dx, dy);

                    if (dist === 0 && Math.abs(e.x - b.x) < iB && Math.abs(e.y - b.y) < iB) {
                        let dL = Math.abs(e.x - (b.x - iB)), dR = Math.abs(e.x - (b.x + iB));
                        let dT = Math.abs(e.y - (b.y - iB)), dB = Math.abs(e.y - (b.y + iB));
                        let min = Math.min(Math.min(dL, dR), Math.min(dT, dB));
                        if (min === dL) dx = -1;
                        else if (min === dR) dx = 1;
                        else if (min === dT) dy = -1;
                        else dy = 1;
                        dist = 0.1;
                    }

                    let req = cR + this.getHitboxRadius(e) + 3;
                    if (dist < req) {
                        let pen = req - dist;
                        let pushSpeed = pen / 12.0;
                        if (dist > 0) {
                            e.x += (dx / dist) * pushSpeed;
                            e.y += (dy / dist) * pushSpeed;
                        } else {
                            e.x += dx * pushSpeed;
                            e.y += dy * pushSpeed;
                        }
                    }
                } else if (b instanceof Building) {
                    let dist = e.dist(b);
                    let combinedHitbox = this.getHitboxRadius(e) + this.getHitboxRadius(b);
                    if (dist < combinedHitbox) {
                        let dx = e.x - b.x;
                        let dy = e.y - b.y;
                        let len = Math.hypot(dx, dy);
                        if (len === 0) { dx = 1; dy = 0; len = 1; }
                        e.x += (dx / len) * 2.0;
                        e.y += (dy / len) * 2.0;
                    }
                }
            }
        }

        // Physics
        for (let i = 0; i < this.ents.length; i++) {
            let a = this.ents[i];
            for (let j = i + 1; j < this.ents.length; j++) {
                let b = this.ents[j];
                if (a.fly !== b.fly) continue;

                let aIsTower = a instanceof Tower;
                let bIsTower = b instanceof Tower;

                if (aIsTower || bIsTower) {
                    let t = aIsTower ? a : b;
                    let u = aIsTower ? b : a;
                    if (u instanceof Tower) continue;

                    let hR = this.getHitboxRadius(t);
                    let cR = hR * 0.25;
                    let iB = hR - cR;
                    let cx = Math.max(t.x - iB, Math.min(t.x + iB, u.x));
                    let cy = Math.max(t.y - iB, Math.min(t.y + iB, u.y));
                    let dx = u.x - cx, dy = u.y - cy;
                    let dist = Math.hypot(dx, dy);
                    let req = cR + this.getHitboxRadius(u);

                    if (dist < req) {
                        let pen = req - dist;
                        if (dist === 0) {
                            dx = Math.random() - 0.5;
                            dy = Math.random() - 0.5;
                            dist = 0.1;
                        }
                        u.x += (dx / dist) * pen;
                        u.y += (dy / dist) * pen;
                    }
                    continue;
                }

                let aIsBuilding = a instanceof Building;
                let bIsBuilding = b instanceof Building;
                let radA = aIsBuilding ? this.getHitboxRadius(a) : a.rad;
                let radB = bIsBuilding ? this.getHitboxRadius(b) : b.rad;

                let dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy, r = radA + radB;
                if (d2 < r * r) {
                    let d = Math.sqrt(d2);
                    let pen = r - d;
                    if (d === 0) {
                        d = 0.1;
                        dx = Math.random() - 0.5;
                        dy = Math.random() - 0.5;
                    }

                    if (a.mass > b.mass) {
                        b.x -= (dx / d) * pen;
                        b.y -= (dy / d) * pen;
                    } else if (b.mass > a.mass) {
                        a.x += (dx / d) * pen;
                        a.y += (dy / d) * pen;
                    } else {
                        let halfPen = pen / 2.0;
                        a.x += (dx / d) * halfPen;
                        a.y += (dy / d) * halfPen;
                        b.x -= (dx / d) * halfPen;
                        b.y -= (dy / d) * halfPen;
                    }
                }
            }
        }

        for (let i = 0; i < this.ents.length; i++) {
            let e = this.ents[i];
            if (e.fr > 0) e.fr--;
            if (e.rt > 0) e.rt--;

            if (!(e instanceof Tower) && !(e instanceof Building)) {
                let visualR = e.rad;
                e.x = Math.max(visualR, Math.min(this.W - visualR, e.x));
                e.y = Math.max(visualR, Math.min(this.H - 140 - visualR, e.y));
                if (e.y + visualR > this.RIV_Y - 15 && e.y - visualR < this.RIV_Y + 15 && !e.fly) {
                    if (!((e.x >= this.W / 4 - 25 && e.x <= this.W / 4 + 25) || (e.x >= this.W * 3 / 4 - 25 && e.x <= this.W * 3 / 4 + 25))) {
                        e.y = e.y < this.RIV_Y ? this.RIV_Y - 15 - visualR : this.RIV_Y + 15 + visualR;
                    }
                }
            }
            if (e.fr <= 0 && e.hp > 0) e.act(this);
            if (e.hp <= 0) {
                e.die(this);
                this.ents.splice(i, 1);
                i--;
            }
        }

        for (let i = 0; i < this.projs.length; i++) {
            let p = this.projs[i];
            p.upd(this);
            if (p.life <= 0) {
                this.projs.splice(i, 1);
                i--;
            }
        }
    }

    // Placeholder for render, will be handled in Main.js or a separate Renderer
    render(ctx) {
        // ...
    }
}
