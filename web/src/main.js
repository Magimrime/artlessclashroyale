import GameEngine from './core/GameEngine.js';
import Troop from './entities/Troop.js';
import Tower from './entities/Tower.js';
import Building from './entities/Building.js';


// --- DEBUG ERROR HANDLER ---
window.logError = function (msg) {
    const log = document.getElementById('debug-log');
    if (log) {
        log.style.display = 'block';
        const div = document.createElement('div');
        div.className = 'log-error';
        div.textContent = msg;
        log.appendChild(div);
    }
    console.error(msg);
};

window.onerror = function (msg, url, lineNo, columnNo, error) {
    const string = msg.toLowerCase();
    const substring = "script error";
    if (string.indexOf(substring) > -1) {
        window.logError('Script Error: See Console for details');
    } else {
        window.logError(`Error: ${msg} \nAt: ${lineNo}:${columnNo}`);
    }
    return false;
};
// ---------------------------

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const W = 540;
const H = 960;
const RIV_Y = 400;

const State = {
    TITLE: 'TITLE',
    DECK: 'DECK',
    CNT: 'CNT',
    PLAY: 'PLAY',
    OVER: 'OVER',
    NEW_CARD: 'NEW_CARD',
    CHEAT: 'CHEAT',
    RESUME_PROMPT: 'RESUME_PROMPT',
    DEBUG_MENU: 'DEBUG_MENU',
    ENEMY_DECK: 'ENEMY_DECK'
};

class Main {
    constructor() {
        this.state = State.TITLE;
        this.t0 = 0;
        this.scrollY = 0;
        this.eng = new GameEngine();

        this.scale = 1.0;
        this.xOffset = 0;
        this.yOffset = 0;

        this.mouse = { x: -100, y: -100 };
        this.cheatOptionVisible = true;
        this.justUnlocked = null;

        // UI Rects
        this.playBtn = { x: 0, y: 0, w: 120, h: 50 };
        this.deckBtn = { x: 0, y: 0, w: 120, h: 50 };
        this.exitBtn = { x: 0, y: 0, w: 120, h: 50 };
        this.backBtn = { x: 0, y: 0, w: 120, h: 50 };
        this.continueBtn = { x: 0, y: 0, w: 120, h: 50 };
        this.resumeYesBtn = { x: 0, y: 0, w: 120, h: 50 };
        this.resumeNoBtn = { x: 0, y: 0, w: 120, h: 50 };
        this.yesBtn = { x: 0, y: 0, w: 120, h: 50 };
        this.noBtn = { x: 0, y: 0, w: 120, h: 50 };
        this.debugBtn = { x: 0, y: 0, w: 53, h: 26 };
        this.debugToggleBtn = { x: 0, y: 0, w: 200, h: 50 };
        this.enemyDeckBtn = { x: 0, y: 0, w: 200, h: 50 };
        this.cardRects = [];
        this.nextCardRect = { x: W - 60, y: H - 105, w: 60, h: 105 };
        this.cardOffsets = [0, 0, 0, 0]; // For hover animation

        this.init();
    }

    init() {
        this.playBtn = { x: W / 2 - 60, y: H / 2 + 40 - 120, w: 120, h: 50 };
        this.deckBtn = { x: W / 2 - 60, y: H / 2 + 100 - 120, w: 120, h: 50 };
        this.exitBtn = { x: W / 2 - 60, y: H / 2 + 40 - 120 + 100, w: 120, h: 50 };
        this.backBtn = { x: W / 2 - 60, y: H - 120, w: 120, h: 50 };
        this.continueBtn = { x: W / 2 - 60, y: H - 120, w: 120, h: 50 };
        this.resumeYesBtn = { x: W / 2 - 130, y: H / 2, w: 120, h: 50 };
        this.resumeNoBtn = { x: W / 2 + 10, y: H / 2, w: 120, h: 50 };
        this.yesBtn = { x: W / 2 - 130, y: H / 2, w: 120, h: 50 };
        this.noBtn = { x: W / 2 + 10, y: H / 2, w: 120, h: 50 };
        this.debugBtn = { x: W - 59, y: 0, w: 53, h: 26 };
        this.debugToggleBtn = { x: W / 2 - 110, y: H / 2 - 60, w: 220, h: 50 };
        this.enemyDeckBtn = { x: W / 2 - 110, y: H / 2 + 20, w: 220, h: 50 };
        this.visitorCount = "...";

        // Fetch Visitor Count
        fetch('https://api.counterapi.dev/v1/clash-royale-clone-gemini/visits/up')
            .then(res => res.json())
            .then(data => {
                this.visitorCount = data.count;
            })
            .catch(err => {
                console.error("Counter Error:", err);
                this.visitorCount = "Err";
            });

        let cardPanelY = H - 100;
        let cardAreaW = W - 60;
        let cardW = (cardAreaW - 30) / 4;
        for (let i = 0; i < 4; i++) {
            this.cardRects.push({ x: 6 + i * (cardW + 6), y: cardPanelY, w: cardW, h: 95 });
        }

        canvas.width = W;
        canvas.height = H;

        this.resize();
        window.addEventListener('resize', () => this.resize());

        canvas.addEventListener('mousedown', (e) => this.handleInput(e));
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const mx = (e.clientX - rect.left) * (W / rect.width);
            const my = (e.clientY - rect.top) * (H / rect.height);
            this.mouse = { x: mx, y: my };
        });
        canvas.addEventListener('wheel', (e) => {
            if (this.state === State.DECK || this.state === State.ENEMY_DECK) {
                this.scrollY += Math.sign(e.deltaY) * 20;
                let listSize = (this.state === State.DECK) ? this.eng.unlockedCards.length : this.eng.allCards.length;
                let maxScroll = Math.max(0, (Math.floor(listSize / 3) + 2) * 80 + 150 - H);
                if (this.scrollY < 0) this.scrollY = 0;
                if (this.scrollY > maxScroll) this.scrollY = maxScroll;
            }
        });

        if (this.eng.hasSaveFile()) {
            this.state = State.RESUME_PROMPT;
        } else {
            this.eng.initCollection();
        }

        requestAnimationFrame(() => this.loop());
    }

    resize() {
        const winW = window.innerWidth;
        const winH = window.innerHeight;
        const sw = winW / W;
        const sh = winH / H;
        this.scale = Math.min(sw, sh);
        canvas.style.width = `${W * this.scale}px`;
        canvas.style.height = `${H * this.scale}px`;
    }

    handleInput(e) {
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * (W / rect.width);
        const my = (e.clientY - rect.top) * (H / rect.height);
        this.handle(mx, my);
    }

    contains(rect, x, y) {
        return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
    }

    handle(x, y) {
        if (this.state === State.RESUME_PROMPT) {
            if (this.contains(this.resumeYesBtn, x, y)) {
                this.eng.loadProgress();
                this.cheatOptionVisible = !this.eng.cheated;
                this.state = State.TITLE;
            } else if (this.contains(this.resumeNoBtn, x, y)) {
                this.eng.deleteProgress();
                this.eng.initCollection();
                this.cheatOptionVisible = true;
                this.state = State.TITLE;
            }
        } else if (this.state === State.TITLE) {
            if (this.contains(this.playBtn, x, y)) {
                if (this.eng.myDeck.length === 8) {
                    this.state = State.CNT;
                    this.t0 = Date.now();
                    this.eng.reset();
                }
            } else if (this.contains(this.deckBtn, x, y)) {
                this.state = State.DECK;
            } else if (!this.eng.cheatPressed && x > W - 53 && y < 26) {
                this.eng.cheatPressed = true;
                this.eng.saveProgress();
                this.state = State.CHEAT;
            } else if (this.eng.cheated && x > W - 53 && y < 26) {
                this.state = State.DEBUG_MENU;
            }
        } else if (this.state === State.CHEAT) {
            if (this.contains(this.yesBtn, x, y)) {
                this.eng.unlockAllCards();
                this.eng.cheated = true;
                this.eng.saveProgress();
                this.cheatOptionVisible = false;
                this.state = State.DECK;
            } else if (this.contains(this.noBtn, x, y)) {
                this.cheatOptionVisible = false;
                this.state = State.TITLE;
            }
        } else if (this.state === State.DECK) {
            if (this.contains(this.backBtn, x, y)) {
                this.state = State.TITLE;
                this.scrollY = 0;
            } else {
                let cols = 3;
                let margin = 20;
                let cardW = (W - (cols + 1) * margin) / cols;
                let cardH = 60;
                for (let i = 0; i < this.eng.unlockedCards.length; i++) {
                    let row = Math.floor(i / cols);
                    let col = i % cols;
                    let cx = margin + col * (cardW + margin);
                    let cy = 100 + row * (cardH + margin) - this.scrollY;
                    if (cy > H || cy + cardH < 0) continue;

                    if (this.contains({ x: cx, y: cy, w: cardW, h: cardH }, x, y)) {
                        let c = this.eng.unlockedCards[i];
                        let idx = this.eng.myDeck.indexOf(c);
                        if (idx > -1) this.eng.myDeck.splice(idx, 1);
                        else if (this.eng.myDeck.length < 8) this.eng.myDeck.push(c);
                        this.eng.saveProgress();
                    }
                }
            }
        } else if (this.state === State.DEBUG_MENU) {
            if (this.contains(this.debugToggleBtn, x, y)) {
                this.eng.debugView = !this.eng.debugView;
                // Troop.SHOW_PATH = this.eng.debugView; // Handle static via instance or global if needed
            } else if (this.contains(this.enemyDeckBtn, x, y)) {
                this.state = State.ENEMY_DECK;
                this.scrollY = 0;
            } else if (this.contains(this.backBtn, x, y)) {
                this.state = State.TITLE;
            }
        } else if (this.state === State.ENEMY_DECK) {
            if (this.contains(this.backBtn, x, y)) {
                this.state = State.DEBUG_MENU;
            } else {
                let cols = 3;
                let margin = 20;
                let cardW = (W - (cols + 1) * margin) / cols;
                let cardH = 60;
                for (let i = 0; i < this.eng.allCards.length; i++) {
                    let row = Math.floor(i / cols);
                    let col = i % cols;
                    let cx = margin + col * (cardW + margin);
                    let cy = 100 + row * (cardH + margin) - this.scrollY;
                    if (cy > H || cy + cardH < 0) continue;

                    if (this.contains({ x: cx, y: cy, w: cardW, h: cardH }, x, y)) {
                        let c = this.eng.allCards[i];
                        let idx = this.eng.enemyDeckSelection.indexOf(c);
                        if (idx > -1) this.eng.enemyDeckSelection.splice(idx, 1);
                        else if (this.eng.enemyDeckSelection.length < 8) this.eng.enemyDeckSelection.push(c);
                        this.eng.saveProgress();
                    }
                }
            }
        } else if (this.state === State.PLAY) {
            if (y > H - 130) {
                if (this.eng.p1) {
                    for (let i = 0; i < 4; i++) {
                        if (i < this.eng.p1.h.length) {
                            if (this.contains(this.cardRects[i], x, y)) {
                                this.eng.sel = this.eng.p1.h[i];
                            }
                        }
                    }
                }
            } else {
                this.eng.spawn(x, y);
            }
        } else if (this.state === State.OVER && this.contains(this.exitBtn, x, y)) {
            if (this.eng.win === 0) {
                let newC = this.eng.unlockRandomCard();
                if (newC) {
                    this.justUnlocked = newC;
                    this.state = State.NEW_CARD;
                } else {
                    this.state = State.TITLE;
                }
            } else {
                this.state = State.TITLE;
            }
        } else if (this.state === State.NEW_CARD && this.contains(this.continueBtn, x, y)) {
            this.state = State.TITLE;
        }
    }

    loop() {
        // Hide loading screen on first successful loop
        const loader = document.getElementById('loading-overlay');
        if (loader && loader.style.opacity !== '0') {
            loader.style.opacity = '0';
            setTimeout(() => loader.style.display = 'none', 500);
        }

        const now = Date.now();
        if (this.state === State.CNT && now - this.t0 > 3000) {
            this.state = State.PLAY;
            this.eng.gameStart = now;
        }

        // Update Card Hover Animations
        if (this.state === State.PLAY) {
            for (let i = 0; i < 4; i++) {
                let target = 0;
                let rect = this.cardRects[i];
                // Check if mouse is within the card's horizontal bounds and roughly near the bottom
                if (this.mouse.x >= rect.x && this.mouse.x <= rect.x + rect.w && this.mouse.y >= rect.y - 50) {
                    target = 40; // Slide up by 40px
                }
                // Smooth interpolation (Lerp)
                this.cardOffsets[i] += (target - this.cardOffsets[i]) * 0.2;
            }
        }

        if (this.state === State.PLAY) {
            this.eng.upd();
            if (this.eng.over) {
                this.state = State.OVER;
            }
        }
        this.render();
        requestAnimationFrame(() => this.loop());
    }

    render() {
        ctx.fillStyle = '#66BB6A';
        ctx.fillRect(0, 0, W, H);

        if (this.state === State.RESUME_PROMPT) {
            ctx.fillStyle = '#66BB6A';
            ctx.fillRect(0, 0, W, H);
            this.drawCenteredString("Resume previous game?", W / 2, H / 2 - 75, "bold 30px Arial", "#004000");
            this.drawBtn(this.resumeYesBtn, "YES", "#32CD32");
            this.drawBtn(this.resumeNoBtn, "NO", "#FF6347");
            return;
        }

        if (this.state === State.TITLE) {
            ctx.fillStyle = '#66BB6A';
            ctx.fillRect(0, 0, W, H);

            // Draw Visitor Count
            ctx.fillStyle = "#006400";
            ctx.font = "bold 12px Arial";
            ctx.textAlign = "left";
            ctx.fillText(`${this.visitorCount}`, 10, 20);
            ctx.textAlign = "center";

            this.drawCenteredString("Clash Clone", W / 2, H / 2 - 50 - 120, "bold 40px Arial", "#006400");

            let validDeck = this.eng.myDeck.length === 8;
            this.drawBtn(this.playBtn, "PLAY", validDeck ? "#32CD32" : "gray");
            if (!validDeck) {
                this.drawCenteredString("Build a deck of 8 cards!", W / 2, this.playBtn.y - 10, "12px Arial", "red");
            }
            this.drawBtn(this.deckBtn, "DECK", "#FFA500");

            this.drawCenteredString(`Cards Unlocked: ${this.eng.unlockedCards.length}/${this.eng.allCards.length}`, W / 2, H - 150 - 120, "italic 14px Arial", "#2E8B57");
            this.drawCenteredString(`Wins: ${this.eng.gamesWon} | Matches: ${this.eng.gamesPlayed}`, W / 2, H - 130 - 120, "italic 14px Arial", "#2E8B57");

            if (!this.eng.cheatPressed) {
                ctx.fillStyle = "rgba(0,100,0,0.5)";
                ctx.font = "10px Arial";
                ctx.fillText("cheat", W - 43, 16);
            } else if (this.eng.cheated) {
                ctx.fillStyle = "rgba(0,100,0,0.5)";
                ctx.font = "10px Arial";
                ctx.fillText("debug", W - 49, 16);
            }

            this.drawCenteredString("by Oliver Zhou", W / 2, H - 20, "10px Arial", "rgba(0, 100, 0, 0.5)");
            return;
        }

        if (this.state === State.CHEAT) {
            ctx.fillStyle = "rgba(0,0,0,0.8)";
            ctx.fillRect(0, 0, W, H);
            this.drawCenteredString("Unlock all cards?", W / 2, H / 2 - 50, "bold 30px Arial", "white");
            this.drawBtn(this.yesBtn, "YES", "green");
            this.drawBtn(this.noBtn, "NO", "red");
            return;
        }

        if (this.state === State.DECK) {
            ctx.fillStyle = "#e0f0e0";
            ctx.fillRect(0, 0, W, H);
            let cols = 3;
            let margin = 20;
            let cardW = (W - (cols + 1) * margin) / cols;
            let cardH = 60;

            for (let i = 0; i < this.eng.unlockedCards.length; i++) {
                let c = this.eng.unlockedCards[i];
                let selected = this.eng.myDeck.includes(c);
                let row = Math.floor(i / cols);
                let col = i % cols;
                let cx = margin + col * (cardW + margin);
                let cy = 100 + row * (cardH + margin) - this.scrollY;
                if (cy > H || cy + cardH < 0) continue;

                ctx.fillStyle = selected ? "#32CD32" : "#A9A9A9";
                this.drawRoundRect(cx, cy, cardW, cardH, 10, true, true);
                this.drawCenteredString(c.n, cx + cardW / 2, cy + cardH / 2, "bold 11px Arial", "white");
                this.drawElixirCost(cx - 5, cy - 5, c.c);
            }

            ctx.fillStyle = "#81C784";
            ctx.fillRect(0, 0, W, 90);
            this.drawCenteredString(`Build Deck (${this.eng.myDeck.length}/8)`, W / 2, 50, "bold 30px Arial", "#006400");

            let sum = this.eng.myDeck.reduce((a, b) => a + b.c, 0);
            let avg = this.eng.myDeck.length ? (sum / this.eng.myDeck.length).toFixed(1) : 0;
            ctx.fillStyle = "#800080";
            ctx.font = "italic 16px Arial";
            ctx.textAlign = "right";
            ctx.fillText(`Avg Elixir: ${avg}`, W - 20, 80);

            this.drawBtn(this.backBtn, "BACK", "#FF6347");
            return;
        }

        if (this.state === State.DEBUG_MENU) {
            ctx.fillStyle = '#66BB6A';
            ctx.fillRect(0, 0, W, H);
            this.drawBtn(this.debugToggleBtn, "SHOW PATH/RANGE", this.eng.debugView ? "#32CD32" : "#FF6347");
            this.drawBtn(this.enemyDeckBtn, "BUILD ENEMY DECK", "#FFA500");
            this.drawBtn(this.backBtn, "BACK", "#FF6347");
            return;
        }

        if (this.state === State.ENEMY_DECK) {
            ctx.fillStyle = "#282828";
            ctx.fillRect(0, 0, W, H);
            let cols = 3;
            let margin = 20;
            let cardW = (W - (cols + 1) * margin) / cols;
            let cardH = 60;

            for (let i = 0; i < this.eng.allCards.length; i++) {
                let c = this.eng.allCards[i];
                let selected = this.eng.enemyDeckSelection.includes(c);
                let row = Math.floor(i / cols);
                let col = i % cols;
                let cx = margin + col * (cardW + margin);
                let cy = 100 + row * (cardH + margin) - this.scrollY;
                if (cy > H || cy + cardH < 0) continue;

                ctx.fillStyle = selected ? "#00c800" : "#646464";
                ctx.fillRect(cx, cy, cardW, cardH);
                ctx.strokeStyle = "black";
                ctx.strokeRect(cx, cy, cardW, cardH);
                this.drawCenteredString(c.n, cx + cardW / 2, cy + cardH / 2, "bold 11px Arial", "white");
                this.drawElixirCost(cx - 5, cy - 5, c.c);
            }

            ctx.fillStyle = "#282828";
            ctx.fillRect(0, 0, W, 90);
            this.drawCenteredString(`Enemy Deck (${this.eng.enemyDeckSelection.length}/8)`, W / 2, 50, "bold 30px Arial", "white");
            this.drawBtn(this.backBtn, "BACK", "red");
            return;
        }

        if (this.state === State.NEW_CARD) {
            ctx.fillStyle = "#e0f0e0";
            ctx.fillRect(0, 0, W, H);
            this.drawCenteredString("NEW CARD", W / 2, 150, "bold 30px Arial", "#006400");
            this.drawCenteredString("UNLOCKED!", W / 2, 190, "bold 30px Arial", "#006400");

            if (this.justUnlocked) {
                let cardW = 140, cardH = 180;
                let cx = (W - cardW) / 2;
                let cy = (H - cardH) / 2;

                ctx.fillStyle = "white";
                this.drawRoundRect(cx, cy, cardW, cardH, 15, true, true);

                this.drawCenteredString(this.justUnlocked.n, cx + cardW / 2, cy + cardH / 2, "bold 18px Arial", "black");
                this.drawElixirCost(cx - 10, cy - 10, this.justUnlocked.c);
            }
            this.drawBtn(this.continueBtn, "CONTINUE", "#32CD32");
            return;
        }

        // GAMEPLAY RENDER
        ctx.fillStyle = "#3296ff";
        ctx.fillRect(0, RIV_Y - 15, W, 30);
        ctx.fillStyle = "#8b4513";
        ctx.fillRect(W / 4 - 25, RIV_Y - 18, 50, 36);
        ctx.fillRect(W * 3 / 4 - 25, RIV_Y - 18, 50, 36);

        if (this.state === State.PLAY && this.eng.sel && this.eng.sel.t !== 2) {
            // Draw invalid area (red tint)
            ctx.fillStyle = "rgba(255, 0, 0, 0.4)";

            // Top Half (Always invalid) - Area behind towers/King
            ctx.fillRect(0, 0, W, 200); // Updated to 200

            // Bottom Left Enemy Side (Invalid if Left Tower alive)
            if (this.eng.t2L && this.eng.t2L.hp > 0) {
                ctx.fillRect(0, 200, W / 2, RIV_Y - 200); // Updated start to 200
            }

            // Bottom Right Enemy Side (Invalid if Right Tower alive)
            if (this.eng.t2R && this.eng.t2R.hp > 0) {
                ctx.fillRect(W / 2, 200, W / 2, RIV_Y - 200); // Updated start to 200
            }

            // HOVER PREVIEW (Ghost Unit & Range)
            if (this.eng.sel && this.mouse.y < H - 120) {
                let c = this.eng.sel;
                let spellShape = this.eng.getSpellRadius(c);
                let canAfford = this.eng.p1.elx >= c.c;

                ctx.globalAlpha = 0.6;
                if (spellShape) {
                    // Animated Dashed Border Style
                    let time = Date.now() / 50; // Speed of animation

                    ctx.fillStyle = canAfford ? "rgba(255, 255, 255, 0.2)" : "rgba(100, 100, 100, 0.2)";
                    ctx.strokeStyle = "white"; // Always white for visibility
                    ctx.lineWidth = 3;
                    ctx.setLineDash([10, 10]);
                    ctx.lineDashOffset = -time; // Animate march

                    if (spellShape.type === 'circle') {
                        ctx.beginPath();
                        ctx.arc(this.mouse.x, this.mouse.y, spellShape.val, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.stroke();
                    } else if (spellShape.type === 'rect') {
                        ctx.beginPath();
                        ctx.rect(this.mouse.x - spellShape.w / 2, this.mouse.y - spellShape.h / 2, spellShape.w, spellShape.h);
                        ctx.fill();
                        ctx.stroke();
                    }

                    // Reset Dash
                    ctx.setLineDash([]);
                    ctx.lineWidth = 1;

                    // Center marker
                    ctx.fillStyle = "white";
                    ctx.beginPath();
                    ctx.arc(this.mouse.x, this.mouse.y, 4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = "black";
                    ctx.stroke();
                } else {
                    // Normal Unit/Building Ghost
                    let range = c.rn || 0;
                    let radius = this.eng.getVisualRadius(c); // Use dynamic radius

                    // Draw Range Circle
                    if (range > 0) {
                        ctx.beginPath();
                        ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
                        ctx.lineWidth = 2;
                        ctx.setLineDash([5, 5]);
                        ctx.arc(this.mouse.x, this.mouse.y, range, 0, Math.PI * 2);
                        ctx.stroke();
                        ctx.setLineDash([]);
                        ctx.lineWidth = 1;
                    }

                    // Draw Ghost Unit Body
                    ctx.fillStyle = canAfford ? "#3296ff" : "#888"; // Blue if affordable, gray if not
                    ctx.beginPath();
                    ctx.arc(this.mouse.x, this.mouse.y, radius, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.globalAlpha = 1.0;
            }
        }

        // Projectiles
        for (let p of this.eng.projs) {
            if (p.barrel) {
                ctx.fillStyle = "#643200";
            } else if (p.fireArea) {
                let size = p.rad * 2;
                if (p.isGray) {
                    ctx.fillStyle = "rgba(100, 100, 100, 0.7)";
                    ctx.beginPath(); ctx.arc(p.x, p.y, size / 2, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = "lightgray";
                    ctx.beginPath(); ctx.arc(p.x, p.y, size / 4, 0, Math.PI * 2); ctx.fill();
                } else {
                    ctx.fillStyle = "rgba(255, 69, 0, 0.7)";
                    ctx.beginPath(); ctx.arc(p.x, p.y, size / 2, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = "yellow";
                    ctx.beginPath(); ctx.arc(p.x, p.y, size / 4, 0, Math.PI * 2); ctx.fill();
                }
            } else if (p.isHeal) {
                ctx.fillStyle = "rgba(0, 255, 0, 0.6)";
            } else if (p.redArea) {
                ctx.fillStyle = "rgba(255, 0, 0, 0.6)";
            } else if (p.brownArea) {
                ctx.fillStyle = "rgba(139, 69, 19, 0.6)";
            } else if (p.poison) {
                ctx.fillStyle = "rgba(0, 128, 0, 0.4)";
                let size = p.rad;
                ctx.beginPath(); ctx.arc(p.x, p.y, size / 2, 0, Math.PI * 2); ctx.fill();
            } else if (p.graveyard) {
                ctx.fillStyle = "rgba(0, 0, 139, 0.4)";
                let size = p.rad;
                ctx.beginPath(); ctx.arc(p.x, p.y, size / 2, 0, Math.PI * 2); ctx.fill();
            } else if (p.isLightBlue) {
                ctx.fillStyle = "#64c8ff";
            } else if (p.isClone) {
                ctx.fillStyle = "rgba(0, 255, 255, 0.4)";
            } else if (p.isRolling) {
                if (p.isLog) {
                    ctx.fillStyle = "#8b4513"; // Brown
                    // Render as rectangle
                    let w = p.barbBarrelLog ? 44 : 70;
                    let h = 20;
                    ctx.fillRect(p.x - w / 2, p.y - h / 2, w, h);
                    // ctx.strokeStyle = "black";
                    // ctx.strokeRect(p.x - w / 2, p.y - h / 2, w, h);
                    continue; // Skip default circle render
                }
                ctx.fillStyle = "#640096";
            } else {
                ctx.fillStyle = p.spl ? (p.rad < 10 ? "cyan" : "orange") : "lightgray";
            }

            if (!p.fireArea && !p.poison && !p.graveyard) {
                let size = p.rad * 2;
                if (!p.spl && !p.barrel && !p.redArea && !p.brownArea && !p.isHeal && !p.barbBreak && !p.isRolling) size = 8;
                ctx.beginPath(); ctx.arc(p.x, p.y, size / 2, 0, Math.PI * 2); ctx.fill();
            }

            if (p.chainTargets) {
                ctx.strokeStyle = "cyan";
                ctx.beginPath();
                for (let i = 0; i < p.chainTargets.length - 1; i++) {
                    let e1 = p.chainTargets[i];
                    let e2 = p.chainTargets[i + 1];
                    if (e1 && e2) {
                        ctx.moveTo(e1.x, e1.y);
                        ctx.lineTo(e2.x, e2.y);
                    }
                }
                ctx.stroke();
            }
        }

        // Entities (Shadows/Effects first)
        for (let e of this.eng.ents) {
            if (e instanceof Troop) {
                if (e.chargeT > 0) {
                    ctx.fillStyle = `rgba(100, 200, 255, ${0.6 + 0.2 * Math.sin(e.chargeT * 0.2)})`;
                    let r = e.rad + 5;
                    ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, Math.PI * 2); ctx.stroke();
                }
                if (e.c.n === "Electro Giant") {
                    ctx.strokeStyle = "rgba(0, 255, 255, 0.4)";
                    // Match the logical radius: (rad + 10) * 2.0 approx
                    let r = (e.rad + 10) * 2.0;
                    ctx.lineWidth = 2;
                    ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, Math.PI * 2); ctx.stroke();
                    ctx.lineWidth = 1;
                }
            }

            // Inferno Beams
            let isInferno = false;
            let target = null;
            let ticks = e.infernoTick;

            if (e instanceof Troop && e.c.n === "Inferno Dragon" && e.atk) {
                isInferno = true; target = e.lk;
            } else if (e instanceof Building && e.c.n === "Inferno Tower" && e.atk) {
                isInferno = true; target = e.lk;
            }

            if (isInferno && target) {
                let width = 2 + (ticks / 20.0);
                if (width > 8) width = 8;
                ctx.lineWidth = width;
                let green = Math.max(0, 165 - ticks);
                ctx.strokeStyle = `rgb(255, ${green}, 0)`;
                ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(target.x, target.y); ctx.stroke();
                ctx.lineWidth = 1;
            }

            // Shadows
            if (e.fly || (e instanceof Troop && e.jp)) {
                let visualR = e.rad;
                let shadowOffset = 20;
                if (e instanceof Troop && e.jp && e.jt) {
                    let totalDist = e.jd;
                    let currentDist = e.dist(e.jt);
                    let progress = 1.0 - (currentDist / totalDist);
                    let jumpHeight = 50.0 * Math.sin(progress * Math.PI);
                    shadowOffset = jumpHeight + 10;
                }
                ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
                ctx.beginPath(); ctx.arc(e.x, e.y + shadowOffset, visualR, 0, Math.PI * 2); ctx.fill();
            }
        }

        // Debug Path
        if (this.eng.debugView) {
            ctx.strokeStyle = "white";
            for (let e of this.eng.ents) {
                if (e instanceof Troop && e.path.length > 0) {
                    ctx.beginPath();
                    let prevX = e.x, prevY = e.y;
                    for (let p of e.path) {
                        ctx.moveTo(prevX, prevY);
                        ctx.lineTo(p.x, p.y);
                        prevX = p.x; prevY = p.y;
                    }
                    ctx.stroke();
                }
            }
        }

        // Draw Entities
        for (let e of this.eng.ents) if (!e.fly) this.drawEntityBody(e);
        for (let e of this.eng.ents) if (e.fly) this.drawEntityBody(e);

        // Status Effects
        for (let e of this.eng.ents) {
            if (e instanceof Troop && e.curseTime > 0) {
                ctx.fillStyle = "rgba(128, 0, 128, 0.4)";
                let r = e.rad + 5;
                ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = "magenta";
                ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, Math.PI * 2); ctx.stroke();
                ctx.lineWidth = 1;
            }
        }

        if (this.eng.debugView) {
            ctx.strokeStyle = "rgba(255, 255, 0, 0.2)";
            for (let e of this.eng.ents) {
                if (e instanceof Troop) {
                    let r = e.sightRange;
                    ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, Math.PI * 2); ctx.stroke();
                    ctx.strokeStyle = "rgba(255, 165, 0, 0.6)";
                    let ar = e.c.rn;
                    if (ar > 0) { ctx.beginPath(); ctx.arc(e.x, e.y, ar, 0, Math.PI * 2); ctx.stroke(); }
                }
            }
        }

        // Gameplay UI
        if (this.state === State.PLAY) {
            // Elixir Bar
            ctx.fillStyle = "#333";
            ctx.fillRect(0, H - 130, W, 25);
            ctx.fillStyle = "#c800c8";
            ctx.fillRect(0, H - 130, W * (this.eng.p1.elx / 10.0), 25);
            ctx.strokeStyle = "white";
            ctx.strokeRect(0, H - 130, W, 25);
            for (let i = 1; i < 10; i++) {
                ctx.beginPath(); ctx.moveTo(i * (W / 10), H - 130); ctx.lineTo(i * (W / 10), H - 105); ctx.stroke();
            }
            this.drawCenteredString(`${Math.floor(this.eng.p1.elx)}`, W / 2, H - 117, "bold 16px Arial", "white");

            // Cards
            let cardPanelY = H - 100;
            for (let i = 0; i < 4; i++) {
                if (i < this.eng.p1.h.length) {
                    let c = this.eng.p1.h[i];
                    let rect = this.cardRects[i];
                    let offset = this.cardOffsets[i];
                    let drawY = rect.y - offset;
                    let selected = this.eng.sel === c;

                    // Shadow (only when lifted or generally for depth)
                    ctx.fillStyle = "rgba(0,0,0,0.3)";
                    this.drawRoundRect(rect.x + 4, drawY + 4, rect.w, rect.h, 10, true, false);

                    // Card Background
                    ctx.fillStyle = selected ? "#81C784" : (this.eng.p1.elx >= c.c ? "white" : "#D3D3D3");
                    this.drawRoundRect(rect.x, drawY, rect.w, rect.h, 10, true, true);

                    // Name
                    this.drawCenteredString(c.n, rect.x + rect.w / 2, drawY + rect.h / 2, "bold 11px Arial", "black");

                    if (c.n === "Mirror" && this.eng.p1.lastPlayedCard) {
                        this.drawCenteredString(`(${this.eng.p1.lastPlayedCard.n})`, rect.x + rect.w / 2, drawY + rect.h / 2 + 12, "bold 10px Arial", "black");
                    }

                    // Elixir Cost
                    this.drawElixirCost(rect.x + 8, drawY + 8, c.c);
                }
            }

            // Next Card
            if (this.eng.p1.pile.length > 0) {
                let nextC = this.eng.p1.pile[0];
                // Next Card Background
                ctx.fillStyle = "#222";
                ctx.fillRect(this.nextCardRect.x, this.nextCardRect.y, this.nextCardRect.w, this.nextCardRect.h);
                ctx.lineWidth = 2;
                ctx.strokeStyle = "#000";
                ctx.strokeRect(this.nextCardRect.x, this.nextCardRect.y, this.nextCardRect.w, this.nextCardRect.h);
                ctx.lineWidth = 1;

                this.drawCenteredString("Next", this.nextCardRect.x + this.nextCardRect.w / 2, this.nextCardRect.y + 12, "bold 10px Arial", "white");

                // Mini Card
                let margin = 8;
                let cw = this.nextCardRect.w - margin * 2;
                let ch = (cw * 1.33);
                let yStart = this.nextCardRect.y + 25;

                ctx.fillStyle = "white"; // White background
                ctx.fillRect(this.nextCardRect.x + margin, yStart, cw, ch);
                ctx.strokeStyle = "black";
                ctx.strokeRect(this.nextCardRect.x + margin, yStart, cw, ch);

                this.drawCenteredString(nextC.n, this.nextCardRect.x + this.nextCardRect.w / 2, yStart + ch + 10, "bold 9px Arial", "white");
                this.drawElixirCost(this.nextCardRect.x + margin + 5, yStart + 5, nextC.c);
            }

            // Timer / Messages
            let elapsed = Date.now() - this.eng.gameStart;
            let remaining = Math.max(0, 300000 - elapsed);
            let seconds = Math.floor(remaining / 1000);
            let min = Math.floor(seconds / 60);
            let sec = seconds % 60;
            let timeStr = `${min}:${sec < 10 ? '0' + sec : sec}`;

            this.drawCenteredString(timeStr, W - 40, 30, "bold 20px Arial", remaining < 30000 ? "red" : "white");

            if (this.eng.isDoubleElixir) {
                this.drawCenteredString("2x Elixir", 50, 30, "bold 20px Arial", "#c800c8");
            }

            if (this.eng.doubleElixirAnim > 0) {
                ctx.fillStyle = `rgba(200, 0, 200, ${this.eng.doubleElixirAnim / 100.0})`;
                ctx.font = "bold 40px Arial";
                ctx.textAlign = "center";
                ctx.fillText("2x Elixir!", W / 2, H / 2);
            }

            if (this.eng.tiebreaker) {
                this.drawCenteredString("TIEBREAKER!", W / 2, 100, "bold 30px Arial", "red");
            }
        }

        if (this.state === State.CNT) {
            let elapsed = Date.now() - this.t0;
            let count = 3 - Math.floor(elapsed / 1000);
            if (count > 0) {
                ctx.fillStyle = "rgba(0,0,0,0.5)";
                ctx.fillRect(0, 0, W, H);
                this.drawCenteredString(`${count}`, W / 2, H / 2, "bold 100px Arial", "white");
            }
        }

        if (this.state === State.OVER) {
            ctx.fillStyle = "rgba(0,0,0,0.7)";
            ctx.fillRect(0, 0, W, H);
            let msg = this.eng.win === 0 ? "VICTORY!" : "DEFEAT!";
            this.drawCenteredString(msg, W / 2, H / 2 - 50, "bold 50px Arial", this.eng.win === 0 ? "#00c8ff" : "red");
            this.drawBtn(this.exitBtn, "EXIT", "gray");
        }
    }

    drawEntityBody(e) {
        if (e.isClone) ctx.globalAlpha = 0.5;

        let isTower = e instanceof Tower;
        let isBuilding = e instanceof Building;
        let isTroop = e instanceof Troop;

        // Strict Team Colors: Player (0) = Blue, Enemy (1) = Red
        let color = e.tm === 0 ? "#3296ff" : "#ff3232";
        if (isTower) color = e.tm === 0 ? "#1e5a96" : "#961e1e";
        if (isBuilding) color = e.tm === 0 ? "#646464" : "#503232";

        // Removed specific unit color overrides to enforce team colors as requested.

        ctx.fillStyle = color;
        let r = e.rad;
        if (isTower || isBuilding) r = this.eng.getHitboxRadius(e);

        // Simple shape drawing
        if (isTower) {
            ctx.fillRect(e.x - 25, e.y - 25, 50, 50);
            this.drawHealthBar(e.x, e.y - 35, e.hp, e.mhp);
        } else if (isBuilding) {
            let vr = this.eng.getVisualRadius(e.c);
            ctx.fillRect(e.x - vr, e.y - vr, vr * 2, vr * 2);
            this.drawHealthBar(e.x, e.y - vr - 10, e.hp, e.mhp);
        } else {
            ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = "black"; ctx.stroke();

            // HP/Shield Bar
            if (e.shield > 0) {
                if (e.shield < e.maxShield) {
                    this.drawHealthBar(e.x, e.y - r - 8, e.shield, e.maxShield, "#800080"); // Purple for Shield
                } else {
                    // Full shield, maybe don't draw or draw? Standard is hide if full.
                    // But prompt says "extra healthbar".
                    // Let's show it if it's not full, OR if HP is not full?
                    // Usually hide if 100%.
                }
                // If Shield exists, we usually don't show HP bar underneath in CR unless broken.
                // But let's follow the logic: "Shield" is the bar.
            } else if (e.hp < e.mhp) {
                this.drawHealthBar(e.x, e.y - r - 5, e.hp, e.mhp, "#00ff00");
            }
        }

        // Draw Name
        if (isTroop) {
            this.drawCenteredString(e.c.n, e.x, e.y - r - 15, "10px Arial", "white");
        }

        if (e.fr > 0) {
            ctx.fillStyle = "rgba(100, 200, 255, 0.5)";
            ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, Math.PI * 2); ctx.fill();
        }
        if (e.rt > 0) {
            ctx.strokeStyle = "brown";
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, Math.PI * 2); ctx.stroke();
            ctx.lineWidth = 1;
        }
        if (e.st > 0) {
            this.drawCenteredString("!", e.x, e.y - r - 25, "bold 20px Arial", "yellow");
        }

        if (e.isClone) ctx.globalAlpha = 1.0;
    }

    drawHealthBar(x, y, hp, mhp, color) {
        let w = 30;
        let h = 4;
        ctx.fillStyle = "black";
        ctx.fillRect(x - w / 2, y, w, h);
        ctx.fillStyle = color || "#00ff00";
        ctx.fillRect(x - w / 2, y, w * (Math.max(0, hp) / mhp), h);
    }

    drawBtn(rect, text, color) {
        let rx = rect.x, ry = rect.y, rw = rect.w, rh = rect.h;

        // Check hover
        if (this.contains(rect, this.mouse.x, this.mouse.y)) {
            let scale = 1.1;
            rw = rect.w * scale;
            rh = rect.h * scale;
            rx = rect.x - (rw - rect.w) / 2;
            ry = rect.y - (rh - rect.h) / 2;
        }

        ctx.fillStyle = color;
        this.drawRoundRect(rx, ry, rw, rh, 10, true, true);
        this.drawCenteredString(text, rx + rw / 2, ry + rh / 2, "bold 20px Arial", "white");
    }

    drawRoundRect(x, y, w, h, radius, fill, stroke) {
        if (typeof stroke === 'undefined') { stroke = true; }
        if (typeof radius === 'undefined') { radius = 5; }
        if (typeof radius === 'number') { radius = { tl: radius, tr: radius, br: radius, bl: radius }; } else {
            var defaultRadius = { tl: 0, tr: 0, br: 0, bl: 0 };
            for (var side in defaultRadius) { radius[side] = radius[side] || defaultRadius[side]; }
        }
        ctx.beginPath();
        ctx.moveTo(x + radius.tl, y);
        ctx.lineTo(x + w - radius.tr, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + radius.tr);
        ctx.lineTo(x + w, y + h - radius.br);
        ctx.quadraticCurveTo(x + w, y + h, x + w - radius.br, y + h);
        ctx.lineTo(x + radius.bl, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - radius.bl);
        ctx.lineTo(x, y + radius.tl);
        ctx.quadraticCurveTo(x, y, x + radius.tl, y);
        ctx.closePath();
        if (fill) { ctx.fill(); }
        if (stroke) { ctx.stroke(); }
    }

    drawCenteredString(text, x, y, font, color) {
        ctx.font = font;
        ctx.fillStyle = color;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, x, y);
    }

    drawElixirCost(x, y, cost) {
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 4;
        ctx.fillStyle = "#D800D8";
        ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.lineWidth = 2;
        ctx.strokeStyle = "white"; ctx.stroke();
        ctx.lineWidth = 1;
        this.drawCenteredString(`${cost}`, x, y + 1, "bold 14px Arial", "white");
    }
}

window.onload = () => {
    try {
        new Main();
    } catch (e) {
        window.logError("Startup Crash: " + e.message + "\nStack: " + e.stack);
    }
};
