import GameEngine from './core/GameEngine.js';
import Troop from './entities/Troop.js';
import Tower from './entities/Tower.js';
import Building from './entities/Building.js';
import MultiplayerManager from './multiplayer/MultiplayerManager.js';


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
    ENEMY_DECK: 'ENEMY_DECK',
    MP_MENU: 'MP_MENU',
    MP_HOST: 'MP_HOST',
    MP_JOIN: 'MP_JOIN'
};

class Main {
    constructor() {
        this.state = State.TITLE;
        this.t0 = 0;
        this.scrollY = 0;
        this.eng = new GameEngine();
        this.mp = new MultiplayerManager();

        this.scale = 1.0;
        this.xOffset = 0;
        this.yOffset = 0;

        this.mouse = { x: -100, y: -100 };
        this.cheatOptionVisible = true;
        this.justUnlocked = null;

        // UI Rects
        this.playBtn = { x: 0, y: 0, w: 120, h: 50 };
        this.deckBtn = { x: 0, y: 0, w: 120, h: 50 };
        this.mpBtn = { x: 0, y: 0, w: 120, h: 50 }; // MP Button
        this.exitBtn = { x: 0, y: 0, w: 120, h: 50 };
        this.backBtn = { x: 0, y: 0, w: 120, h: 50 };
        this.continueBtn = { x: 0, y: 0, w: 120, h: 50 };
        this.resumeYesBtn = { x: 0, y: 0, w: 120, h: 50 };
        this.resumeNoBtn = { x: 0, y: 0, w: 120, h: 50 };
        this.yesBtn = { x: 0, y: 0, w: 120, h: 50 };
        this.noBtn = { x: 0, y: 0, w: 120, h: 50 };
        this.debugBtn = { x: 0, y: 0, w: 53, h: 26 };
        this.debugToggleBtn = { x: 0, y: 0, w: 200, h: 50 };
        this.debugEnemyElixirBtn = { x: 0, y: 0, w: 200, h: 50 };
        this.enemyDeckBtn = { x: 0, y: 0, w: 200, h: 50 };

        // MP UI
        this.makeGameBtn = { x: 0, y: 0, w: 200, h: 60 };
        this.joinGameBtn = { x: 0, y: 0, w: 200, h: 60 };
        this.codeInputs = []; // Rects for 5 digits (for join)
        this.enteredCode = "";

        this.cardRects = [];
        this.nextCardRect = { x: W - 60, y: H - 105, w: 60, h: 105 };
        this.cardOffsets = [0, 0, 0, 0]; // For hover animation

        this.init();
    }

    init() {
        this.playBtn = { x: W / 2 - 60, y: H / 2 + 40 - 150, w: 120, h: 50 };
        this.deckBtn = { x: W / 2 - 60, y: H / 2 + 100 - 150, w: 120, h: 50 };
        this.mpBtn = { x: W / 2 - 60, y: H / 2 + 160 - 150, w: 120, h: 50 };
        this.exitBtn = { x: W / 2 - 60, y: H / 2 + 40 - 120 + 100, w: 120, h: 50 };
        this.backBtn = { x: W / 2 - 60, y: H - 120, w: 120, h: 50 };
        this.continueBtn = { x: W / 2 - 60, y: H - 120, w: 120, h: 50 };
        this.resumeYesBtn = { x: W / 2 - 130, y: H / 2, w: 120, h: 50 };
        this.resumeNoBtn = { x: W / 2 + 10, y: H / 2, w: 120, h: 50 };
        this.yesBtn = { x: W / 2 - 130, y: H / 2, w: 120, h: 50 };
        this.noBtn = { x: W / 2 + 10, y: H / 2, w: 120, h: 50 };
        this.debugBtn = { x: W - 59, y: 0, w: 53, h: 26 };
        this.debugToggleBtn = { x: W / 2 - 110, y: H / 2 - 60, w: 220, h: 50 };
        this.debugEnemyElixirBtn = { x: W / 2 - 110, y: H / 2, w: 220, h: 50 };
        this.enemyDeckBtn = { x: W / 2 - 110, y: H / 2 + 60, w: 220, h: 50 };

        this.makeGameBtn = { x: W / 2 - 100, y: H / 2 - 50, w: 200, h: 60 };
        this.joinGameBtn = { x: W / 2 - 100, y: H / 2 + 30, w: 200, h: 60 };

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

        // Key Listener for Code Entry (Simple version)
        window.addEventListener('keydown', (e) => {
            if (this.state === State.MP_JOIN) {
                if (e.key >= '0' && e.key <= '9') {
                    if (this.enteredCode.length < 5) this.enteredCode += e.key;
                } else if (e.key === 'Backspace') {
                    this.enteredCode = this.enteredCode.slice(0, -1);
                } else if (e.key === 'Enter') {
                    if (this.enteredCode.length === 5) {
                        this.joinGame(this.enteredCode);
                    }
                }
            }
        });

        if (this.eng.hasSaveFile()) {
            this.state = State.RESUME_PROMPT;
        } else {
            this.eng.initCollection();
        }

        // Setup MP Callbacks
        this.mp.onJoined = (idx) => {
            console.log("Joined as Player", idx);
        };
        this.mp.onStart = () => {
            this.startMultiplayerGame();
        };
        this.mp.onAction = (data) => {
            if (data.type === 'spawn') {
                this.eng.spawnRemote(data.cardName, data.x, data.y, data.team);
            }
        };
        this.mp.onOpponentDisconnected = () => {
            alert("Opponent Disconnected!");
            this.state = State.TITLE;
            this.eng.setMultiplayer(false);
            this.eng.reset();
            this.mp.close();
        };

        requestAnimationFrame(() => this.loop());
    }

    joinGame(code) {
        this.mp.joinGame(code, (success, msg) => {
            if (!success) {
                alert(msg || "Failed to join");
                this.enteredCode = "";
            } else {
                // Waiting for start...
            }
        });
    }

    createGame() {
        this.mp.createGame((success, msg) => {
            if (!success) {
                alert("Failed to create game: " + msg);
                this.state = State.MP_MENU;
            }
        });
    }

    startMultiplayerGame() {
        this.eng.setMultiplayer(true);
        this.eng.reset(); // Resets game, but keeps MP flag if we set it after? No, reset() clears ents.
        this.eng.setMultiplayer(true); // Ensure it's set

        // Disable Debug in MP
        this.eng.debugView = false;
        this.eng.debugEnemyElixir = false;

        this.state = State.CNT;
        this.t0 = Date.now();
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
                    this.eng.setMultiplayer(false); // Single player
                    this.state = State.CNT;
                    this.t0 = Date.now();
                    this.eng.reset();
                }
            } else if (this.contains(this.deckBtn, x, y)) {
                this.state = State.DECK;
            } else if (this.contains(this.mpBtn, x, y)) {
                this.enteredCode = "";
                this.state = State.MP_MENU;
            } else if (!this.eng.cheatPressed && x > W - 53 && y < 26) {
                this.eng.cheatPressed = true;
                this.eng.saveProgress();
                this.state = State.CHEAT;
            } else if (this.eng.cheated && x > W - 53 && y < 26) {
                this.state = State.DEBUG_MENU;
            }
        } else if (this.state === State.MP_MENU) {
            if (this.contains(this.backBtn, x, y)) {
                this.state = State.TITLE;
            } else if (this.contains(this.makeGameBtn, x, y)) {
                this.state = State.MP_HOST;
                this.createGame();
            } else if (this.contains(this.joinGameBtn, x, y)) {
                this.enteredCode = "";
                this.state = State.MP_JOIN;
            }
        } else if (this.state === State.MP_HOST) {
            if (this.contains(this.backBtn, x, y)) {
                this.mp.close();
                this.state = State.MP_MENU;
            }
        } else if (this.state === State.MP_JOIN) {
            if (this.contains(this.backBtn, x, y)) {
                this.mp.close();
                this.state = State.MP_MENU;
            }
            // Code input handled by keydown, but maybe touch controls later?
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
            // ... (Deck logic unchanged)
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
            // (Unchanged debug render)
            if (this.contains(this.debugToggleBtn, x, y)) {
                this.eng.debugView = !this.eng.debugView;
                this.eng.saveProgress();
            } else if (this.contains(this.debugEnemyElixirBtn, x, y)) {
                this.eng.debugEnemyElixir = !this.eng.debugEnemyElixir;
                this.eng.saveProgress();
            } else if (this.contains(this.enemyDeckBtn, x, y)) {
                this.state = State.ENEMY_DECK;
                this.scrollY = 0;
            } else if (this.contains(this.backBtn, x, y)) {
                this.state = State.TITLE;
            }
        } else if (this.state === State.ENEMY_DECK) {
            // ... (Enemy Deck logic unchanged)
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
                // If MP, broadcast spawn
                if (this.eng.sel) {
                    let playedName = this.eng.sel.n;
                    // Check validity
                    if (this.eng.isValid(y, x, this.eng.sel, 0)) {
                        // Perform spawn locally
                        // let success = this.eng.spawn(x, y); 
                        // Note: spawn() returns undefined. It modifies state if successful.
                        // We need to check if card was used.
                        // But spawn() is complex. 
                        // Better to check if sel became null, meaning it was used.
                        // Wait, spawn() sets sel = null at the end.

                        // Modified Spawn Logic needed? 
                        // Actually spawn() manages logic. If I just call it, it works locally.
                        // I need to intercept effective spawn.
                        // For now, let's just assume valid if it passes check? No.
                        // Let's rely on sel being cleared.
                        // But `this.eng.spawn(x, y)` is called inside the `if` block above in original code.
                        // I can't easily detect success without modifying `spawn`.
                        // However, `spawn` logic checks cost, resets sel.

                        // Let's hook into `spawn` or just replicate check?
                        // Replicating check is safer.
                    }
                }

                // Call orginal spawn
                let prevSel = this.eng.sel;
                this.eng.spawn(x, y);
                if (prevSel && !this.eng.sel && this.eng.isMultiplayer) {
                    // Spawn occurred
                    this.mp.sendSpawn(prevSel.n, x, y, 0);
                }
            }
        } else if (this.state === State.OVER && this.contains(this.exitBtn, x, y)) {
            if (this.eng.isMultiplayer) {
                this.mp.close();
                this.eng.setMultiplayer(false);
            }
            if (this.eng.win === 0 && !this.eng.isMultiplayer) {
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
        if (this.state === State.CNT) {
            if (now - this.t0 > 3000) {
                this.state = State.PLAY;
                this.eng.gameStart = now;
            }
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

            this.drawCenteredString("Clash Clone", W / 2, H / 2 - 50 - 150, "bold 40px Arial", "#006400");

            let validDeck = this.eng.myDeck.length === 8;
            this.drawBtn(this.playBtn, "PLAY", validDeck ? "#32CD32" : "gray");
            if (!validDeck) {
                this.drawCenteredString("Build a deck of 8 cards!", W / 2, this.playBtn.y - 10, "12px Arial", "red");
            }
            this.drawBtn(this.deckBtn, "DECK", "#FFA500");
            this.drawBtn(this.mpBtn, "MULTIPLAYER", "#3296ff");

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

        if (this.state === State.MP_MENU) {
            ctx.fillStyle = '#66BB6A';
            ctx.fillRect(0, 0, W, H);

            this.drawCenteredString("MULTIPLAYER", W / 2, 100, "bold 40px Arial", "white");

            this.drawBtn(this.makeGameBtn, "MAKE GAME", "#3296ff");
            this.drawBtn(this.joinGameBtn, "JOIN GAME", "#FFA500");

            this.drawBtn(this.backBtn, "BACK", "#FF6347");
            // Red warning note
            ctx.fillStyle = "red";
            ctx.font = "bold 14px Arial";
            ctx.textAlign = "center";
            ctx.fillText("NOTE: DEBUG FEATURES DISABLED IN MULTIPLAYER", W / 2, H - 20);
            return;
        }

        if (this.state === State.MP_HOST) {
            ctx.fillStyle = '#66BB6A';
            ctx.fillRect(0, 0, W, H);

            this.drawCenteredString("Waiting for opponent...", W / 2, H / 2 - 100, "24px Arial", "white");

            if (this.mp.code) {
                this.drawCenteredString(`CODE: ${this.mp.code}`, W / 2, H / 2, "bold 60px Arial", "white");
            } else {
                this.drawCenteredString(`Generating Code...`, W / 2, H / 2, "italic 20px Arial", "#eee");
            }

            this.drawBtn(this.backBtn, "CANCEL", "#FF6347");
            return;
        }

        if (this.state === State.MP_JOIN) {
            ctx.fillStyle = '#66BB6A';
            ctx.fillRect(0, 0, W, H);

            this.drawCenteredString("ENTER CODE:", W / 2, H / 2 - 100, "bold 30px Arial", "white");

            // Draw Code Digits
            let codeStr = this.enteredCode;
            ctx.font = "bold 50px Courier New";
            ctx.fillStyle = "white";
            ctx.textAlign = "center";
            ctx.fillText(codeStr.padEnd(5, '_').split('').join(' '), W / 2, H / 2);

            this.drawCenteredString("Type digits on keyboard. Press Enter to Join.", W / 2, H / 2 + 60, "14px Arial", "#eee");

            this.drawBtn(this.backBtn, "BACK", "#FF6347");
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
            // (Unchanged deck render)
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
            // (Unchanged debug render)
            ctx.fillStyle = '#66BB6A';
            ctx.fillRect(0, 0, W, H);
            this.drawBtn(this.debugToggleBtn, "SHOW PATH/RANGE", this.eng.debugView ? "#32CD32" : "#FF6347");
            this.drawBtn(this.debugEnemyElixirBtn, "SHOW OPP ELIXIR", this.eng.debugEnemyElixir ? "#32CD32" : "#FF6347");
            this.drawBtn(this.enemyDeckBtn, "BUILD ENEMY DECK", "#FFA500");
            this.drawBtn(this.backBtn, "BACK", "#FF6347");
            return;
        }

        if (this.state === State.ENEMY_DECK) {
            // (Unchanged enemy deck render)
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
            // (Unchanged new card render)
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

        // GAMEPLAY RENDER
        ctx.fillStyle = "#3296ff";
        ctx.fillRect(0, RIV_Y - 15, W, 30);
        ctx.fillStyle = "#8b4513";
        ctx.fillRect(W / 4 - 25, RIV_Y - 18, 50, 36);
        ctx.fillRect(W * 3 / 4 - 25, RIV_Y - 18, 50, 36);

        // Render Game during COUNTDOWN (CNT) or PLAY
        if (this.state === State.PLAY || this.state === State.CNT) {
            if (this.eng.sel && (this.eng.sel.t !== 2 || ["The Log", "Barbarian Barrel"].includes(this.eng.sel.n))) {
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
            } // Close Invalid Area Logic

            // --- RENDER ENTITIES ---
            if (this.eng.ents) {
                // Sort by Y for simple depth buffering
                const sorted = [...this.eng.ents].sort((a, b) => a.y - b.y);
                for (let e of sorted) {
                    this.drawEntityBody(e);
                    // Draw HP bar if damaged
                    if (e.hp < e.mhp) {
                        let hpPct = e.hp / e.mhp;
                        ctx.fillStyle = "red";
                        ctx.fillRect(e.x - 15, e.y - e.rad - 10, 30, 4);
                        ctx.fillStyle = "#32CD32";
                        ctx.fillRect(e.x - 15, e.y - e.rad - 10, 30 * hpPct, 4);
                    }
                }
            }

            // HOVER PREVIEW (Ghost Unit & Range)
            if ((this.state === State.PLAY || this.state === State.CNT) && this.eng.sel && this.mouse.y < H - 120) {
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

                    if (["The Log", "Barbarian Barrel"].includes(c.n)) {
                        // Draw Arrow for rolling spells
                        let dist = (c.n === "The Log") ? 280 : 101;
                        let ey = this.mouse.y - dist;
                        ctx.beginPath();
                        ctx.moveTo(this.mouse.x, this.mouse.y);
                        ctx.lineTo(this.mouse.x, ey);

                        // Arrowhead
                        ctx.lineTo(this.mouse.x - 10, ey + 15);
                        ctx.moveTo(this.mouse.x, ey);
                        ctx.lineTo(this.mouse.x + 10, ey + 15);
                        ctx.stroke();

                        // Also fill rect for body width
                        let w = (c.n === "The Log") ? 70 : 44;
                        ctx.fillStyle = canAfford ? "rgba(255, 255, 255, 0.2)" : "rgba(100, 100, 100, 0.2)";
                        ctx.fillRect(this.mouse.x - w / 2, ey, w, dist);
                    } else if (spellShape.type === 'circle') {
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
                    ctx.beginPath(); ctx.arc(p.x, p.y, p.rad, 0, Math.PI * 2); ctx.fill();
                } else if (p.graveyard) {
                    ctx.fillStyle = "rgba(0, 0, 139, 0.4)";
                    ctx.beginPath(); ctx.arc(p.x, p.y, p.rad, 0, Math.PI * 2); ctx.fill();
                } else if (p.isLightBlue) {
                    ctx.fillStyle = "#64c8ff";
                } else if (p.isClone) {
                    ctx.fillStyle = "rgba(0, 255, 255, 0.4)";
                } else if (p.isRolling) {
                    if (p.isLog) {
                        if (p.tm === 1) ctx.fillStyle = "#8b0000"; // Dark Red for Enemy
                        else ctx.fillStyle = "#8b4513"; // Brown for Player
                        // Render as rectangle
                        let w = p.barbBarrelLog ? 44 : 70;
                        let h = 20;
                        ctx.fillRect(p.x - w / 2, p.y - h / 2, w, h);
                        // ctx.strokeStyle = "black";
                        // ctx.strokeRect(p.x - w / 2, p.y - h / 2, w, h);
                        continue; // Skip default circle rendering
                    }
                    ctx.fillStyle = "#640096";
                } else {
                    ctx.fillStyle = p.spl ? (p.rad < 10 ? "cyan" : "orange") : "lightgray";
                }

                if (!p.fireArea && !p.poison && !p.graveyard) {
                    let size = p.rad * 2;
                    if (!p.spl && !p.barrel && !p.redArea && !p.brownArea && !p.isHeal && !p.barbBreak && !p.isRolling && !p.isLightBlue) size = 8;
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
            if (this.state === State.PLAY || this.state === State.CNT) {
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
                for (let i = 0; i < 4; i++) {
                    if (i < this.eng.p1.h.length) {
                        let c = this.eng.p1.h[i];
                        let r = this.cardRects[i];
                        let hoverOff = this.cardOffsets[i] || 0;

                        let isSel = this.eng.sel === c;
                        let canAfford = this.eng.p1.elx >= c.c;

                        // DISABLED POP UP ON SELECTION
                        // let paintY = r.y - (isSel ? 30 : 0) - hoverOff;
                        // Only hover effect, no selection offset
                        let paintY = r.y - hoverOff;

                        ctx.fillStyle = canAfford ? "#fff" : "#888"; // Gray if can't afford
                        if (isSel) ctx.fillStyle = "#32CD32"; // Green if selected

                        this.drawRoundRect(r.x, paintY, r.w, r.h, 5, true, true);
                        // Image/Text
                        this.drawCenteredString(c.n, r.x + r.w / 2, paintY + r.h / 2, "bold 10px Arial", "black");
                        // MOVED ELIXIR COST INWARD
                        this.drawElixirCost(r.x + 15, paintY + 15, c.c);
                    }
                }

                // Next Card
                if (this.eng.p1.pile.length > 0) {
                    let nextC = this.eng.p1.pile[0];
                    let nr = this.nextCardRect;
                    ctx.fillStyle = "#ccc";
                    this.drawRoundRect(nr.x, nr.y, nr.w, nr.h, 5, true, true);
                    this.drawCenteredString("Next:", nr.x + nr.w / 2, nr.y + 15, "10px Arial", "black");
                    this.drawCenteredString(nextC.n, nr.x + nr.w / 2, nr.y + nr.h / 2, "bold 9px Arial", "black");
                    // MOVED ELIXIR COST INWARD
                    this.drawElixirCost(nr.x + 15, nr.y + 15, nextC.c);
                }

                // Timer / Messages
                if (this.state === State.CNT) {
                    // COUNTDOWN OVERLAY
                    let elapsed = Date.now() - this.t0;
                    let count = 3 - Math.floor(elapsed / 1000);
                    if (count > 0) {
                        ctx.fillStyle = "rgba(0,0,0,0.5)";
                        ctx.fillRect(0, 0, W, H);
                        this.drawCenteredString(count.toString(), W / 2, H / 2, "bold 100px Arial", "white");
                    }
                } else {
                    let time = (Date.now() - this.eng.gameStart) / 1000;
                    let remaining = 180 - time;
                    if (remaining < 0) remaining = 0; // Overtime handled by state
                    if (this.eng.tiebreaker) {
                        this.drawCenteredString("TIEBREAKER!", W / 2, H / 2, "bold 40px Arial", "red");
                    }

                    if (this.eng.doubleElixirAnim > 0) {
                        ctx.globalAlpha = this.eng.doubleElixirAnim / 100;
                        this.drawCenteredString("2x ELIXIR", W / 2, H / 2, "bold 50px Arial", "magenta");
                        ctx.globalAlpha = 1.0;
                    }

                    let mins = Math.floor(remaining / 60);
                    let secs = Math.floor(remaining % 60);
                    let timeStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
                    ctx.fillStyle = (remaining <= 10 && remaining % 1 > 0.5) ? "red" : "black"; // Blink effect
                    if (this.eng.tiebreaker) ctx.fillStyle = "red";
                    ctx.font = "bold 20px Arial";
                    ctx.fillText(timeStr, W - 40, 30);
                }
            }


        } // End PLAY|CNT block

        if (this.state === State.OVER) {
            ctx.fillStyle = "rgba(0,0,0,0.6)";
            ctx.fillRect(0, 0, W, H);
            let msg = this.eng.win === 0 ? "You Win!" : "You Lose!";
            let color = this.eng.win === 0 ? "#32CD32" : "#FF6347";
            this.drawCenteredString(msg, W / 2, H / 2 - 50, "bold 50px Arial", color);
            this.drawBtn(this.exitBtn, "EXIT", "#FFA500");
        }
    } // End render()

    drawEntityBody(e) {

        let x = e.x;
        let y = e.y;
        let radius = e.rad;

        // Visual Z-Index offset for flying
        if (e.fly) {
            y -= 25;
            radius *= 1.1;
        }

        // Jump offset
        if (e instanceof Troop && e.jp) {
            let jumpHeight = 0;
            if (e.jt) {
                let totalDist = e.jd;
                let currentDist = e.dist(e.jt);
                let progress = 1.0 - (currentDist / totalDist);
                jumpHeight = 50.0 * Math.sin(progress * Math.PI);
            }
            y -= jumpHeight;
        }

        // Electric Aura (Blue, Flickering)
        let name = e.c ? e.c.n : "";
        if (name === "Sparky" || name === "Zappies") {
            let threshold = (name === "Zappies") ? 72 : 180;
            let isCharging = (e.chargeT > 0 && e.chargeT < threshold);
            let isReady = (e.chargeT >= threshold);

            if (isCharging) {
                // Flicker while charging
                let flick = (Math.floor(Date.now() / 50) % 2 === 0);
                if (flick) {
                    ctx.strokeStyle = "cyan";
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(x, y, radius + 5, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.lineWidth = 1;
                }
            } else if (isReady) {
                // Solid ring when ready? User said "stop flickering".
                // Detailed interpretation: "when it is done charging, it should stop flickering."
                // I will leave it as NO aura when ready, or maybe a solid one.
                // Let's go with SOLID to indicate readiness.
                ctx.strokeStyle = "rgba(0, 255, 255, 0.8)";
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(x, y, radius + 5, 0, Math.PI * 2);
                ctx.stroke();
                ctx.lineWidth = 1;
            }
        }

        let isFriend = (e.tm === 0);
        let color = isFriend ? "#3296ff" : (e.isClone ? "cyan" : "#ff3232");
        if (e.isClone) color = isFriend ? "#32ffff" : "#ff32ff";

        // Freeze effect
        if (e instanceof Troop && e.fr > 0) {
            color = "#add8e6"; // Light Blue
        }

        ctx.fillStyle = color;
        ctx.strokeStyle = "black"; // RESET STROKE STYLE
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (e instanceof Tower) {
            // ROUNDED TOWER
            let r = e.rad; // use radius as half-width approx
            // drawRoundRect expects x,y as top-left
            this.drawRoundRect(x - r, y - r, r * 2, r * 2, 8, true, true); // 5px radius corner
        } else if (e instanceof Building) {
            ctx.rect(x - radius, y - radius, radius * 2, radius * 2);
            ctx.fill();
            ctx.stroke();
        } else {
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }


        // HP Bar
        if (e.hp < e.mhp) {
            let hpPct = Math.max(0, e.hp / e.mhp);
            let barW = 30;
            ctx.fillStyle = "red";
            ctx.fillRect(x - barW / 2, y - radius - 10, barW, 4);
            ctx.fillStyle = "#32CD32";
            ctx.fillRect(x - barW / 2, y - radius - 10, barW * hpPct, 4);
        }

        // Level / Name (Optional, simplified)
        // ctx.fillStyle = "white";
        // ctx.textAlign = "center";
        // ctx.fillText("Lvl 9", x, y);
    }

    drawBtn(rect, txt, color) {
        let isHover = this.contains(rect, this.mouse.x, this.mouse.y);
        let drawRect = { ...rect };

        if (isHover) {
            let scale = 1.1;
            let w = rect.w * scale;
            let h = rect.h * scale;
            drawRect.x = rect.x - (w - rect.w) / 2;
            drawRect.y = rect.y - (h - rect.h) / 2;
            drawRect.w = w;
            drawRect.h = h;
        }

        ctx.fillStyle = color;
        this.drawRoundRect(drawRect.x, drawRect.y, drawRect.w, drawRect.h, 10, true, true);
        ctx.fillStyle = "white";
        ctx.font = "bold 16px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(txt, drawRect.x + drawRect.w / 2, drawRect.y + drawRect.h / 2);
        ctx.textBaseline = "alphabetic"; // Reset
    }

    drawCenteredString(txt, x, y, font, color) {
        ctx.fillStyle = color;
        ctx.font = font;
        ctx.textAlign = "center";
        ctx.fillText(txt, x, y);
    }

    drawElixirCost(x, y, val) {
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fillStyle = "#c800c8";
        ctx.fill();
        ctx.strokeStyle = "black";
        ctx.stroke();
        ctx.fillStyle = "white";
        ctx.font = "bold 12px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(val, x, y);
        ctx.textBaseline = "alphabetic";
    }

    drawRoundRect(x, y, w, h, r, fill, stroke) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
        if (fill) ctx.fill();
        if (stroke) {
            ctx.strokeStyle = "black";
            ctx.stroke();
        }
    }
}

new Main();
