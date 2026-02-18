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

        this.seed = 12345; // Default seed
        this.nextEntityId = 1;

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
        this.debugEnemyElixir = false;

        this.allCards = [
            new Card("Knight", 3, 1000, 30, 1.5, 20, 0, 15, 60, 150, false, false),
            new Card("Archers", 3, 200, 25, 1.5, 100, 0, 3, 60, 180, false, true),
            new Card("Giant", 5, 3000, 150, 0.8, 20, 1, 500, 90, 150, false, false),
            new Card("Fireball", 4, 0, 200, 0, 0, 2, 0, 0, 0, false, true),
            new Card("Mini PEKKA", 4, 900, 300, 1.6, 20, 0, 15, 60, 150, false, false),
            new Card("Zap", 2, 0, 60, 0, 0, 2, 0, 0, 0, false, true),
            new Card("Skeletons", 1, 20, 40, 1.6, 6, 0, 2, 22, 150, false, false),
            new Card("Musketeer", 4, 500, 150, 1.5, 140, 0, 10, 60, 220, false, true),
            new Card("Cannon", 3, 700, 100, 0, 120, 3, 10000, 100, 120, false, false),
            new Card("Mega Knight", 7, 3000, 500, 1.2, 22, 0, 200, 100, 200, false, false),
            new Card("P.E.K.K.A", 7, 4000, 980, 0.5, 22, 0, 200, 120, 200, false, false),
            new Card("Skeleton Army", 3, 20, 40, 1.6, 6, 0, 2, 10, 150, false, false),
            new Card("Barbarians", 5, 600, 150, 1.2, 18, 0, 10, 90, 180, false, false),
            new Card("Goblin Barrel", 3, 0, 0, 0, 0, 2, 0, 0, 0, false, false),
            new Card("Royale Delivery", 3, 0, 0, 0, 0, 2, 0, 0, 0, false, false),
            new Card("Vines", 2, 0, 20, 0, 0, 2, 0, 0, 0, false, true),
            new Card("Freeze", 4, 0, 5, 0, 0, 2, 0, 0, 0, false, true),
            new Card("Fire Spirit", 1, 230, 0, 2.0, 12, 0, 2, 10, 150, false, true),
            new Card("Ice Spirit", 1, 230, 8, 2.0, 12, 0, 2, 10, 150, false, true),
            new Card("Electro Spirit", 1, 230, 8, 2.0, 12, 0, 2, 10, 150, false, true),
            new Card("Heal Spirit", 1, 230, 8, 2.0, 12, 0, 2, 10, 150, false, true),
            new Card("Arrows", 3, 0, 120, 0, 0, 2, 0, 0, 0, false, true),
            new Card("Minions", 3, 190, 50, 1.6, 12, 0, 3, 40, 150, true, true),
            new Card("Goblins", 2, 90, 100, 1.7, 12, 0, 2, 60, 150, false, false),
            new Card("Spear Goblins", 2, 110, 50, 2.0, 90, 0, 2, 50, 180, false, true),
            new Card("Bats", 2, 67, 67, 2.5, 10, 0, 2, 60, 150, true, true),
            new Card("Poison", 4, 0, 3000, 0, 200, 2, 0, 0, 0, false, true),
            new Card("Wizard", 5, 700, 230, 1.5, 100, 0, 10, 84, 220, false, true),
            new Card("Witch", 5, 800, 111, 1.5, 100, 0, 10, 42, 220, false, true),
            new Card("Graveyard", 5, 0, 0, 0, 33, 2, 0, 0, 0, false, true),
            new Card("Mega Minion", 3, 700, 250, 1.5, 20, 0, 200, 60, 150, true, true),
            new Card("Minion Horde", 5, 190, 50, 1.6, 12, 0, 6, 40, 150, true, true),
            new Card("Baby Dragon", 4, 1000, 130, 1.5, 80, 0, 10, 80, 180, true, true),
            new Card("Inferno Dragon", 4, 1070, 1, 1.5, 50, 0, 4, 1, 150, true, true),
            new Card("Inferno Tower", 5, 1400, 1, 0.4, 120, 3, 30 * 60, 1, 120, false, true),
            new Card("Golem", 8, 5120, 312, 0.8, 25, 1, 1000, 150, 200, false, false),
            new Card("Lava Hound", 7, 3581, 53, 0.8, 100, 1, 4000, 78, 180, true, false),
            new Card("Elixir Golem", 3, 1569, 253, 0.66, 25, 1, 4000, 117, 200, false, false),
            new Card("Elite Barbarians", 6, 1341, 318, 1.4, 18, 0, 15, 60, 180, false, false),
            new Card("Elixir Collector", 6, 1070, 0, 0, 0, 3, 93 * 60, 1, 120, false, false),
            new Card("Zappies", 4, 250, 55, 1.2, 70, 0, 10, 126, 150, false, true),
            new Card("Sparky", 6, 2000, 1500, 0.8, 90, 0, 2000, 300, 150, false, false),
            new Card("Mirror", 1, 0, 0, 0, 0, 2, 0, 0, 0, false, true),
            new Card("Clone", 3, 0, 0, 0, 0, 2, 0, 0, 0, false, true),
            new Card("Wall Breakers", 2, 230, 560, 4.0, 12, 1, 4, 60, 150, false, false),
            new Card("Royal Giant", 6, 4500, 390, 0.8, 120, 1, 500, 102, 200, false, false),
            new Card("Electro Giant", 7, 4500, 150, 0.8, 20, 1, 150, 90, 150, false, false),
            new Card("Bowler", 5, 2000, 200, 0.8, 100, 0, 180, 150, 150, false, false),
            new Card("Hog Rider", 4, 1600, 264, 2.0, 20, 1, 300, 60, 150, false, false),
            new Card("Royal Hogs", 5, 695, 68, 2.0, 20, 1, 150, 60, 120, false, false),
            new Card("Prince", 5, 1615, 325, 1.2, 20, 0, 120, 60, 150, false, false),
            new Card("Mother Witch", 4, 532, 133, 1.2, 110, 0, 10, 72, 150, false, true),
            new Card("The Log", 2, 0, 268, 0, 0, 2, 0, 0, 0, false, true),
            new Card("Barbarian Barrel", 2, 0, 200, 0, 0, 2, 0, 0, 0, false, false),
            new Card("Royal Recruits", 7, 500, 110, 1.5, 23, 0, 20, 78, 150, false, false),
            new Card("Dark Prince", 4, 1000, 200, 1.2, 20, 0, 120, 60, 150, false, false),
            new Card("Crate", 2, 300, 0, 0, 0, 3, 1800, 0, 0, false, false),
            new Card("Ice Golem", 2, 1100, 70, 0.8, 12, 1, 150, 60, 150, false, false)
        ];

        // Apply Stat Adjustments
        this.allCards.forEach(c => {
            if (c.n !== "Mother Witch") c.hp = Math.floor(c.hp * 1.30);

            // Global reductions
            c.hp = Math.floor(c.hp / 2);
            c.s = c.s / 2;

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

            // Global reductions
            c.hp = Math.floor(c.hp / 2);
            c.s = c.s / 2;
        });

        this.enemyAI = null;
        this.isMultiplayer = false;
    }

    setMultiplayer(enabled) {
        this.isMultiplayer = enabled;
    }

    setSeed(s) {
        this.seed = s;
    }

    random() {
        // Mulberry32
        let t = this.seed += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    exportState() {
        return {
            t: this.aiTick,
            el1: this.p1.elx,
            el2: this.p2.elx,
            // Sync Hands (Card Names)
            h1: this.p1.h.map(c => c.n),
            h2: this.p2.h.map(c => c.n),

            // Sync Game Over
            ov: this.over,
            tie: this.tiebreaker,
            win: this.win, // if available

            ents: this.ents.map(e => ({
                id: e.id,
                n: e.c ? e.c.n : (e.constructor.name), // Name or Class
                x: Math.round(e.x),
                y: Math.round(e.y),
                hp: Math.round(e.hp),
                mhp: e.mhp,
                tm: e.tm,
                // Visual flags
                st: e.st, // Status effects?
                fr: e.fr, // Freeze?
                rt: e.rt, // Root?
                // Animation flags
                atk: e.atk || false,
                cd: e.cd || 0,
                spT: e.spT || 0,
                sh: e.shield || 0,
                msh: e.maxShield || 0
            })),

            projs: this.projs.map(p => ({
                x: Math.round(p.x),
                y: Math.round(p.y),
                tx: Math.round(p.tx),
                ty: Math.round(p.ty),
                tm: p.tm,
                r: p.rad,
                // Flags for rendering
                log: p.isLog,
                roll: p.isRolling,
                poi: p.poison,
                gy: p.graveyard,
                heal: p.isHeal
            }))
        };
    }

    importState(data, flip) {
        // 1. Strict Packet Ordering: Ignore older or duplicate states
        if (data.t <= this.aiTick) {
            // console.warn(`Skipping stale packet: In ${data.t} <= Cur ${this.aiTick}`);
            return;
        }

        this.aiTick = data.t;
        this.over = data.ov;
        this.tiebreaker = data.tie;
        if (data.win !== undefined) this.win = data.win;

        // Sync Elixir and Hand
        if (flip) {
            this.p1.elx = data.el2;
            this.p2.elx = data.el1;
            // Sync Hands: P1 (Client) gets Host P2's hand
            this.syncHand(this.p1, data.h2);
            this.syncHand(this.p2, data.h1);
        } else {
            this.p1.elx = data.el1;
            this.p2.elx = data.el2;
            this.syncHand(this.p1, data.h1);
            this.syncHand(this.p2, data.h2);
        }

        const serverIds = new Set();

        // ENTITIES
        data.ents.forEach(sEnt => {
            // 2. Strict ID Type Enforcing
            let id = Number(sEnt.id);
            serverIds.add(id);

            let local = this.ents.find(e => e.id === id);

            let tx = sEnt.x;
            let ty = sEnt.y;
            let tm = sEnt.tm;

            if (flip) {
                tx = this.W - tx;
                ty = 800 - ty;
                tm = 1 - tm;
            }

            if (local) {
                // Update existing
                // TELEPORT to latest state (no interpolation)
                local.x = tx;
                local.y = ty;
                local._hp = sEnt.hp;
                local.tm = tm;
                local.st = sEnt.st;
                local.fr = sEnt.fr;
                local.rt = sEnt.rt;

                // Anim flags
                local.atk = sEnt.atk;
                local.cd = sEnt.cd;
                local.spT = sEnt.spT;
                if (local.shield !== undefined) {
                    local.shield = sEnt.sh;
                    local.maxShield = sEnt.msh;
                }
            } else {
                // Create new
                // Check if it's a Tower (Special handling for persistent IDs)
                if (sEnt.n === "Tower") {
                    // Try to find matching tower by position if ID mismatch (shouldn't happen with strict IDs but safe fallback)
                    let existing = this.ents.find(e => e instanceof Tower && Math.hypot(e.x - tx, e.y - ty) < 20);
                    if (existing) {
                        existing.id = id; // Sync ID
                        existing._hp = sEnt.hp;
                    }
                } else {
                    let c = this.getCard(sEnt.n);
                    if (c) {
                        let t = new Troop(tm, tx, ty, c);
                        t.id = id;
                        t._hp = sEnt.hp;
                        t.mhp = sEnt.mhp;
                        t.atk = sEnt.atk;
                        t.cd = sEnt.cd;
                        t.spT = sEnt.spT;
                        if (t.shield !== undefined) {
                            t.shield = sEnt.sh;
                            t.maxShield = sEnt.msh;
                        }
                        this.ents.push(t);
                    } else if (sEnt.n === "Building") {
                        // Generic fallback (rare)
                        let b = new Building(tm, tx, ty, this.getCard("Cannon"));
                        b.id = id;
                        this.ents.push(b);
                    }
                }
            }
        });

        // Remove dead/missing
        // Filter out entities that are NOT in the server's list
        this.ents = this.ents.filter(e => {
            return serverIds.has(e.id);
        });

        // PROJECTILES (Visual Sync)
        this.projs = []; // Clear local projs
        if (data.projs) {
            data.projs.forEach(p => {
                let tx = p.x;
                let ty = p.y;
                let ttx = p.tx;
                let tty = p.ty;
                let tm = p.tm;

                if (flip) {
                    tx = this.W - tx;
                    ty = 800 - ty;
                    ttx = this.W - ttx;
                    tty = 800 - tty;
                    tm = 1 - tm;
                }

                this.projs.push({
                    x: tx, y: ty, tx: ttx, ty: tty, tm: tm, rad: p.r,
                    isLog: p.log, isRolling: p.roll, poison: p.poi, graveyard: p.gy, isHeal: p.heal
                });
            });
        }
    }

    syncHand(p, cardNames) {
        if (!cardNames) return;
        // Reconstruct hand from names
        // We reuse existing card objects if possible to avoid flicker? 
        // Or just replace.
        // Replace is easier.
        p.h = cardNames.map(n => this.getCard(n)).filter(c => c);
    }

    spawnRemote(cardName, x, y, team) {
        // Transform coordinates for local view
        // Incoming (x, y) is from opponent's perspective (they are bottom 0..800 relative)
        let rx = this.W - x;
        let ry = 800 - y;

        // Validation for Player 2 (Remote)
        let p = (team === 1) ? this.p2 : this.p1; // Usually team is 1 for opponent

        // Find card in hand
        let card = p.h.find(c => c.n === cardName);
        if (!card) {
            card = this.getCard(cardName);
        }

        if (card) {
            // Placement Validation
            // ry, rx is correct for isValid(y, x, ...)?
            // isValid(y, x, c, tm)
            if (!this.isValid(ry, rx, card, team)) {
                console.warn("Invalid Remote Placement rejected");
                return;
            }

            // Check Elixir
            if (p.elx >= card.c) {
                p.elx -= card.c;
                this.addU(team, card, rx, ry);

                // Cycle Card
                let idx = p.h.indexOf(card);
                if (idx > -1) {
                    p.h.splice(idx, 1);
                    p.pile.push(card);
                    p.h.push(p.pile.shift());
                }
            }
        }
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
            cheatPressed: this.cheatPressed,
            myDeck: this.myDeck.map(c => c.n),
            debugView: this.debugView,
            debugEnemyElixir: this.debugEnemyElixir,
            enemyDeckSelection: this.enemyDeckSelection.map(c => c.n),
            unlockedCards: this.unlockedCards.map(c => c.n)
        };
        const json = JSON.stringify(data, null, 4);
        localStorage.setItem('clash_royale_save', json);

        // Sync to bin/save.json via server
        fetch('/api/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: json
        }).catch(err => console.warn("Failed to sync save to server:", err));
    }

    loadProgress() {
        // Try to load from server first, then fallback to local storage
        fetch('/api/load')
            .then(res => {
                if (res.ok) return res.json();
                throw new Error("No server save");
            })
            .then(data => {
                this.applySaveData(data);
            })
            .catch(() => {
                // Fallback to localStorage
                let json = localStorage.getItem('clash_royale_save');
                if (json) {
                    try {
                        this.applySaveData(JSON.parse(json));
                    } catch (e) {
                        console.error("Failed to load local save", e);
                    }
                }
            });
    }

    applySaveData(data) {
        this.gamesWon = data.gamesWon || 0;
        this.gamesPlayed = data.gamesPlayed || 0;
        this.cheated = data.cheated || false;
        this.cheatPressed = data.cheatPressed || false; // New field
        this.debugView = data.debugView || false;
        this.debugEnemyElixir = data.debugEnemyElixir || false;

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
    }

    deleteProgress() {
        localStorage.removeItem('clash_royale_save');
        fetch('/api/delete', { method: 'POST' }).catch(err => console.warn("Failed to delete server save:", err));
    }

    hasSaveFile() {
        return localStorage.getItem('clash_royale_save') !== null; // Visual check uses local, async load handles server
    }

    reset(enemyDeck) {
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
        this.nextEntityId = 0;

        this.p1.pile = [...this.myDeck];
        // Shuffle p1 pile
        for (let i = this.p1.pile.length - 1; i > 0; i--) {
            const j = Math.floor(this.random() * (i + 1));
            [this.p1.pile[i], this.p1.pile[j]] = [this.p1.pile[j], this.p1.pile[i]];
        }
        this.p1.h = [];
        for (let i = 0; i < 4; i++) this.p1.h.push(this.p1.pile.shift());

        this.enemyAI = new EnemyAI(this);

        this.p2.pile = [];
        if (enemyDeck && enemyDeck.length > 0) {
            // Use provided enemy deck
            enemyDeck.forEach(n => {
                let c = this.getCard(n);
                if (c) this.p2.pile.push(c);
            });
            // Fallback if deck incomplete?
            if (this.p2.pile.length < 8) {
                // Fill with random?
                let pool = [...this.allCards];
                while (this.p2.pile.length < 8) {
                    let c = pool[Math.floor(this.random() * pool.length)];
                    if (!this.p2.pile.includes(c)) this.p2.pile.push(c);
                }
            }
        } else {
            // Enemy Deck: Random 8 cards from unlocked cards (or all cards if not enough)
            let enemyPool = [...this.unlockedCards];
            if (enemyPool.length < 8) enemyPool = [...this.allCards]; // Fallback

            // Shuffle pool
            for (let i = enemyPool.length - 1; i > 0; i--) {
                const j = Math.floor(this.random() * (i + 1));
                [enemyPool[i], enemyPool[j]] = [enemyPool[j], enemyPool[i]];
            }

            // Pick top 8
            for (let i = 0; i < 8; i++) this.p2.pile.push(enemyPool[i]);
        }

        // Shuffle p2 pile (important for fair draw order even if deck is known)
        for (let i = this.p2.pile.length - 1; i > 0; i--) {
            const j = Math.floor(this.random() * (i + 1));
            [this.p2.pile[i], this.p2.pile[j]] = [this.p2.pile[j], this.p2.pile[i]];
        }

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

    isValid(y, x, c, tm) {
        if (c.n === "The Log" || c.n === "Barbarian Barrel") {
            // Log/BarbBarrel must be placed on player's side (roughly) unless tower down
            // P1 (tm=0) plays on bottom (y > RIV_Y), P2 (tm=1) plays on top (y < RIV_Y)

            if (tm === 0) {
                // Player Logic
                if (this.t2L.hp <= 0 && x < this.W / 2 && y >= 200) return true; // Pocket Left
                if (this.t2R.hp <= 0 && x > this.W / 2 && y >= 200) return true; // Pocket Right
                if (y < this.RIV_Y + 40) return false;
                return true;
            } else {
                // Enemy Logic
                if (this.t1L.hp <= 0 && x < this.W / 2 && y <= this.H - 200) return true; // Pocket Left
                if (this.t1R.hp <= 0 && x > this.W / 2 && y <= this.H - 200) return true; // Pocket Right
                if (y > this.RIV_Y - 40) return false;
                return true;
            }
        }
        if (c.t === 2 || c.n === "Goblin Barrel") return true;

        if (tm === 0) {
            if (y >= this.RIV_Y + 40) return true;
            if (c.t === 3 && y > this.RIV_Y - 40 && y < this.RIV_Y + 40) return false;
            if (this.t2L && this.t2L.hp <= 0 && x < this.W / 2 && y >= 200) return true;
            if (this.t2R && this.t2R.hp <= 0 && x > this.W / 2 && y >= 200) return true;
            return false;
        } else {
            // Enemy placement
            if (y <= this.RIV_Y - 40) return true;
            if (c.t === 3 && y > this.RIV_Y - 40 && y < this.RIV_Y + 40) return false;
            if (this.t1L && this.t1L.hp <= 0 && x < this.W / 2 && y <= this.H - 200) return true;
            if (this.t1R && this.t1R.hp <= 0 && x > this.W / 2 && y <= this.H - 200) return true;
            return false;
        }
    }

    getHitboxRadius(e) {
        if (e instanceof Tower) return e.rad / 1.5;
        if (e instanceof Building) return e.rad / 1.5;
        if (e instanceof Troop) return e.rad;
        return e.rad / 2.0;
    }

    getVisualRadius(c) {
        if (c.n === "Cannon") return 25;
        if (c.n === "Crate") return 14;
        if (c.t === 3) return 20;
        return 18;
    }

    getSpellRadius(c) {
        if (c.n === "Arrows" || c.n === "Poison" || c.n === "Graveyard" || c.n === "Freeze") return { type: 'circle', val: 80 };
        if (c.n === "Vines") return { type: 'circle', val: 80 };
        if (c.n === "Zap") return { type: 'circle', val: 50 };
        if (c.n === "Fireball" || c.n === "Royal Delivery" || c.n === "Rocket" || c.n === "Giant Snowball") return { type: 'circle', val: 60 };
        if (c.n === "The Log") return { type: 'rect', w: 70, h: 20 }; // Visual approximation
        if (c.n === "Barbarian Barrel") return { type: 'rect', w: 44, h: 20 };
        if (c.n === "Goblin Barrel") return { type: 'circle', val: 40 }; // Impact radius approx
        if (c.n === "Clone") return { type: 'circle', val: 90 };
        if (c.n === "Tornado") return { type: 'circle', val: 110 };
        if (c.n === "Heal Spirit") return { type: 'circle', val: 0 };
        if (c.n === "Ice Spirit" || c.n === "Electro Spirit" || c.n === "Fire Spirit") return { type: 'circle', val: 0 };

        // Default for other spells
        if (c.t === 2) return { type: 'circle', val: 60 };

        return null;
    }

    playCard(p, card, x, y, team) {
        if (!card) return;

        let cardToPlay = card;
        let cost = card.c;
        let isMirror = false;

        if (card.n === "Mirror") {
            if (!p.lastPlayedCard) return;
            cardToPlay = p.lastPlayedCard;
            cost = cardToPlay.c + 1;
            isMirror = true;
        }

        // Elixir Check
        if (p.elx < cost) return;

        // Building Placement Check (Don't place on top of buildings)
        if (cardToPlay.t === 3) {
            let newVisualRad = this.getVisualRadius(cardToPlay);
            for (let e of this.ents) {
                if (e instanceof Tower || e instanceof Building) {
                    if (Math.hypot(x - e.x, y - e.y) < e.rad + newVisualRad + 3) return;
                }
            }
        }

        // Valid Area Check
        if (!this.isValid(y, x, cardToPlay, team)) return;

        // Deduct Elixir
        p.elx -= cost;

        // Apply Mirror Boost (5% HP/Dmg)
        if (isMirror) {
            let boostedCard = Object.assign(Object.create(Object.getPrototypeOf(cardToPlay)), cardToPlay);
            boostedCard.hp = Math.floor(cardToPlay.hp * 1.05);
            boostedCard.d = Math.floor(cardToPlay.d * 1.05);
            this.addU(team, boostedCard, x, y);
        } else {
            this.addU(team, cardToPlay, x, y);
        }

        // Update Last Plays
        if (card.n !== "Mirror") p.lastPlayedCard = card;
        else p.lastPlayedCard = cardToPlay;

        // Update Mirror Cost in Deck (Visual only really)
        // We need to find the Mirror card instance in the game to update its cost?
        // Or just update the one in hand?
        // The one in hand is `card`.
        if (card.n === "Mirror" && p.lastPlayedCard) {
            card.c = p.lastPlayedCard.c + 1;
        } else if (p.lastPlayedCard) {
            // Find Mirror in this player's hand or pile to update its cost
            // This is a bit tricky if multiple mirrors exist but standard game has 1.
            let m = p.h.find(c => c.n === "Mirror") || p.pile.find(c => c.n === "Mirror");
            if (m) m.c = p.lastPlayedCard.c + 1;
        }

        // Cycle Card
        // We use indexOf because we expect `card` to be the actual object from the hand
        let idx = p.h.indexOf(card);
        if (idx > -1) {
            p.h.splice(idx, 1);
            p.pile.push(card);
            p.h.push(p.pile.shift());
        }
    }

    spawn(x, y) {
        if (this.tiebreaker) return;
        if (!this.sel || y > this.H - 120) return;

        // Local Player (Team 0)
        this.playCard(this.p1, this.sel, x, y, 0);

        // Clear selection if played
        // Check if card was actually removed from hand to confirm play
        if (!this.p1.h.includes(this.sel)) {
            this.sel = null;
        }
    }

    addU(tm, c, x, y) {
        if (c.n === "Goblin Barrel") {
            this.projs.push(new Proj(tm === 0 ? this.W / 2 : this.W / 2, tm === 0 ? this.H : 0, x, y, null, 15, false, 10, 0, tm, true));
        } else if (c.n === "Royale Delivery") {
            let shape = this.getSpellRadius(c);
            let rad = shape && shape.type === 'circle' ? shape.val : 60;
            this.projs.push(new Proj(x, y, x, y, null, 0, false, rad, 50, tm, false).asBrownArea());
            let recruit = this.getCard("Royal Recruits");
            this.ents.push(new Troop(tm, x, y, recruit));
        } else if (c.n === "Poison") {
            let shape = this.getSpellRadius(c); // Returns val: 100
            let rad = shape && shape.type === 'circle' ? shape.val : 100;
            this.projs.push(new Proj(x, y, x, y, null, 0, true, rad, 25, tm, false).asPoison());
        } else if (c.n === "Graveyard") {
            let shape = this.getSpellRadius(c); // Returns val: 100
            let rad = shape && shape.type === 'circle' ? shape.val : 100;
            this.projs.push(new Proj(x, y, x, y, null, 0, true, rad, 0, tm, false).asGraveyard());
        } else if (c.n === "The Log") {
            // Log rolls 280px (User requested).
            // Speed: 2.66
            let dist = 280;
            let ty = (tm === 0) ? y - dist : y + dist;
            let p = new Proj(x, y, x, ty, null, 2.66, false, 60, Math.floor(c.d * 0.8), tm, false).asLog();
            this.projs.push(p);
        } else if (c.n === "Barbarian Barrel") {
            // 3x shorter than log (303 / 3 = 101)
            let dist = 101;
            let ty = (tm === 0) ? y - dist : y + dist;
            let p = new Proj(x, y, x, ty, null, 2.66, false, 60, Math.floor(c.d), tm, false).asBarbBarrelLog();
            this.projs.push(p);
        } else if (c.n === "Clone") {
            let shape = this.getSpellRadius(c);
            let rad = shape && shape.type === 'circle' ? shape.val : 90;
            let p = new Proj(x, y, x, y, null, 0, true, rad, 0, tm, false);
            p.life = 5;
            p.isClone = true;
            this.projs.push(p);

            let toClone = [];
            for (let e of this.ents) {
                if (e instanceof Troop && e.tm === tm && Math.hypot(e.x - x, e.y - y) < rad && !e.isClone && !(e instanceof Building) && !(e instanceof Tower)) {
                    toClone.push(e);
                }
            }
            for (let t of toClone) {
                let clone = new Troop(tm, t.x + 20, t.y, t.c);
                clone.hp = 1;
                clone.mhp = 1;
                clone.isClone = true;
                if (t.c.n === "Royal Recruits") {
                    clone.shield = 1;
                    clone.maxShield = 1;
                }
                this.ents.push(clone);
            }
        } else if (c.t === 2) {
            let shape = this.getSpellRadius(c);
            let rad = shape && shape.type === 'circle' ? shape.val : 60;
            let dmg = c.d;
            if (c.n === "Zap") { dmg = 150; }
            if (c.n === "Vines") { dmg = 20; }
            if (c.n === "Freeze") { dmg = 5; }
            if (c.n === "Arrows") { dmg = 120; }

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
                this.ents.push(new Troop(tm, x + this.random() * 50 - 25, y + this.random() * 50 - 25, this.getCard("Minions")));
        } else if (c.n === "Skeleton Army") {
            for (let i = 0; i < 15; i++)
                this.ents.push(new Troop(tm, x + this.random() * 60 - 30, y + this.random() * 60 - 30, this.getCard("Skeletons")));
        } else if (c.n === "Bats") {
            for (let i = 0; i < 5; i++)
                this.ents.push(new Troop(tm, x + this.random() * 40 - 20, y + this.random() * 40 - 20, c));
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
        // Assign IDs to any new entities
        for (let e of this.ents) {
            if (!e.id) e.id = this.nextEntityId++;
        }

        let elapsed = Date.now() - this.gameStart;
        let remaining = 180000 - elapsed; // 3 minutes
        if (remaining <= 60000 && !this.isDoubleElixir) { // 1 minute left
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
        this.p2.elx = Math.min(10, this.p2.elx + rate * 0.85); // 15% slower than player

        this.aiTick++;

        this.t1K.actv = (this.t1K.hp < this.t1K.mhp) || (this.t1L.hp <= 0) || (this.t1R.hp <= 0);
        this.t2K.actv = (this.t2K.hp < this.t2K.mhp) || (this.t2L.hp <= 0) || (this.t2R.hp <= 0);

        if (this.enemyAI && !this.isMultiplayer) this.enemyAI.update();

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
                            dx = this.random() - 0.5;
                            dy = this.random() - 0.5;
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
                        dx = this.random() - 0.5;
                        dy = this.random() - 0.5;
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

    spawnTroop(team, x, y, card) {
        if (!card) return;
        this.ents.push(new Troop(team, x, y, card));
    }

    handleCrateDeath(building) {
        let rand = Math.floor(this.random() * 3);
        if (rand === 0) {
            // Spawn 3 Skeletons
            let skelCard = this.getCard("Skeletons");
            for (let i = 0; i < 3; i++) {
                this.ents.push(new Troop(building.tm, building.x + (i - 1) * 10, building.y, skelCard));
            }
        } else if (rand === 1) {
            // Spawn Spirit
            let spirits = ["Fire Spirit", "Ice Spirit", "Electro Spirit", "Heal Spirit"];
            let sName = spirits[Math.floor(this.random() * spirits.length)];
            this.ents.push(new Troop(building.tm, building.x, building.y, this.getCard(sName)));
        } else {
            // Explode (240 dmg, 60 radius)
            this.projs.push(new Proj(building.x, building.y, building.x, building.y, null, 0, false, 60, 240, building.tm, false).asFireArea());
        }
    }
}
