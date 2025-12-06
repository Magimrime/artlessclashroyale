package clashroyale;

import clashroyale.core.GameEngine;
import clashroyale.core.Player;
import clashroyale.entities.*;
import clashroyale.models.Card;
import javax.swing.*;
import java.awt.*;
import java.awt.event.*;
import java.awt.geom.Area;
import java.awt.geom.Point2D;
import java.awt.geom.AffineTransform;

public class Main extends JFrame {
    // Access constants from GameEngine
    static final int W = GameEngine.W, H = GameEngine.H;
    static final int RIV_Y = GameEngine.RIV_Y;

    enum State {
        TITLE, DECK, CNT, PLAY, OVER, NEW_CARD, CHEAT, RESUME_PROMPT, DEBUG_MENU, ENEMY_DECK
    }

    State state = State.TITLE;
    long t0;
    int scrollY = 0;
    GameEngine eng = new GameEngine();

    // UI Rectangles
    Rectangle playBtn = new Rectangle(W / 2 - 60, H / 2 + 40 - 120, 120, 50);
    Rectangle deckBtn = new Rectangle(W / 2 - 60, H / 2 + 100 - 120, 120, 50);
    Rectangle exitBtn = new Rectangle(W / 2 - 60, H / 2 + 40 - 120 + 100, 120, 50);
    Rectangle backBtn = new Rectangle(W / 2 - 60, H - 120, 120, 50);
    Rectangle continueBtn = new Rectangle(W / 2 - 60, H - 120, 120, 50);
    Rectangle resumeYesBtn = new Rectangle(W / 2 - 130, H / 2, 120, 50);
    Rectangle resumeNoBtn = new Rectangle(W / 2 + 10, H / 2, 120, 50);
    Rectangle yesBtn = new Rectangle(W / 2 - 130, H / 2, 120, 50);
    Rectangle noBtn = new Rectangle(W / 2 + 10, H / 2, 120, 50);
    Rectangle debugBtn = new Rectangle(W - 59, 0, 53, 26);
    Rectangle debugToggleBtn = new Rectangle(W / 2 - 100, H / 2 - 60, 200, 50);
    Rectangle enemyDeckBtn = new Rectangle(W / 2 - 100, H / 2 + 20, 200, 50);

    // In-Game UI Rectangles
    Rectangle elixirRect = new Rectangle(0, H - 130, W, 25);
    Rectangle[] cardRects = new Rectangle[4];
    Rectangle nextCardRect = new Rectangle(W - 60, H - 105, 60, 105);

    boolean cheatOptionVisible = true;
    Point mouse = new Point(-100, -100);
    Card justUnlocked = null;

    // Scaling
    double scale = 1.0;
    int xOffset = 0, yOffset = 0;

    public Main() {
        // Initialize Card Rects
        int cardPanelY = H - 100;
        int cardAreaW = W - 60; // Space minus next card panel
        int cardW = (cardAreaW - 30) / 4; // 4 cards with spacing
        for (int i = 0; i < 4; i++) {
            cardRects[i] = new Rectangle(6 + i * (cardW + 6), cardPanelY, cardW, 95);
        }

        setPreferredSize(new Dimension(W, H));
        setDefaultCloseOperation(3);
        setTitle("Clash Royale Clone");
        setResizable(true); // Enable resizing

        if (eng.hasSaveFile()) {
            state = State.RESUME_PROMPT;
        } else {
            eng.initCollection();
        }

        JPanel cnv = new JPanel() {
            protected void paintComponent(Graphics g) {
                super.paintComponent(g);
                Graphics2D g2 = (Graphics2D) g;

                // Fill background
                g2.setColor(Color.BLACK);
                g2.fillRect(0, 0, getWidth(), getHeight());

                // Calculate Scale
                double sw = (double) getWidth() / W;
                double sh = (double) getHeight() / H;
                scale = Math.min(sw, sh);

                xOffset = (int) ((getWidth() - W * scale) / 2);
                yOffset = (int) ((getHeight() - H * scale) / 2);

                // Apply Transform
                AffineTransform old = g2.getTransform();
                g2.translate(xOffset, yOffset);
                g2.scale(scale, scale);

                // Clip to logical area
                Shape oldClip = g2.getClip();
                g2.setClip(0, 0, W, H);

                render(g2);

                g2.setClip(oldClip);
                g2.setTransform(old);
            }
        };
        cnv.setBackground(new Color(50, 160, 50));

        // Input Handling
        cnv.addMouseListener(new MouseAdapter() {
            public void mousePressed(MouseEvent e) {
                int mx = (int) ((e.getX() - xOffset) / scale);
                int my = (int) ((e.getY() - yOffset) / scale);
                handle(mx, my);
            }
        });
        cnv.addMouseMotionListener(new MouseMotionAdapter() {
            public void mouseMoved(MouseEvent e) {
                int mx = (int) ((e.getX() - xOffset) / scale);
                int my = (int) ((e.getY() - yOffset) / scale);
                mouse = new Point(mx, my);
            }
        });
        cnv.addMouseWheelListener(e -> {
            if (state == State.DECK || state == State.ENEMY_DECK) {
                scrollY += e.getWheelRotation() * 20;
                int listSize = (state == State.DECK) ? eng.unlockedCards.size() : eng.allCards.size();
                int maxScroll = Math.max(0, (listSize / 3 + 2) * 80 + 150 - H);
                if (scrollY < 0)
                    scrollY = 0;
                if (scrollY > maxScroll)
                    scrollY = maxScroll;
                repaint();
            }
        });

        // Fullscreen Toggle (F11)
        addKeyListener(new KeyAdapter() {
            public void keyPressed(KeyEvent e) {
                if (e.getKeyCode() == KeyEvent.VK_F11) {
                    dispose();
                    setUndecorated(!isUndecorated());
                    if (isUndecorated()) {
                        setExtendedState(JFrame.MAXIMIZED_BOTH);
                    } else {
                        setExtendedState(JFrame.NORMAL);
                        setSize(W, H);
                        setLocationRelativeTo(null);
                    }
                    setVisible(true);
                }
            }
        });

        add(cnv);
        pack();
        setLocationRelativeTo(null);
        setVisible(true);

        new javax.swing.Timer(16, e -> {
            if (state == State.CNT && System.currentTimeMillis() - t0 > 3000) {
                state = State.PLAY;
                eng.gameStart = System.currentTimeMillis();
            }
            if (state == State.PLAY) {
                eng.upd();
                if (eng.over) {
                    state = State.OVER;
                }
            }
            cnv.repaint();
        }).start();
    }

    void handle(int x, int y) {
        if (state == State.RESUME_PROMPT) {
            if (resumeYesBtn.contains(x, y)) {
                eng.loadProgress();
                cheatOptionVisible = !eng.cheated;
                state = State.TITLE;
            } else if (resumeNoBtn.contains(x, y)) {
                eng.deleteProgress();
                eng.initCollection();
                cheatOptionVisible = true;
                state = State.TITLE;
            }
        } else if (state == State.TITLE) {
            if (playBtn.contains(x, y)) {
                if (eng.myDeck.size() == 8) {
                    state = State.CNT;
                    t0 = System.currentTimeMillis();
                    eng.reset();
                }
            } else if (deckBtn.contains(x, y))
                state = State.DECK;
            else if (cheatOptionVisible && x > W - 53 && y < 26)
                state = State.CHEAT;
            else if (eng.cheated && debugBtn.contains(x, y))
                state = State.DEBUG_MENU;
        } else if (state == State.CHEAT) {
            if (yesBtn.contains(x, y)) {
                eng.unlockAllCards();
                eng.cheated = true;
                eng.saveProgress();
                cheatOptionVisible = false;
                state = State.DECK;
            } else if (noBtn.contains(x, y)) {
                cheatOptionVisible = false;
                state = State.TITLE;
            }
        } else if (state == State.DECK) {
            if (backBtn.contains(x, y)) {
                state = State.TITLE;
                scrollY = 0;
            } else {
                int cols = 3;
                int margin = 20;
                int cardW = (W - (cols + 1) * margin) / cols;
                int cardH = 60;
                for (int i = 0; i < eng.unlockedCards.size(); i++) {
                    int row = i / cols;
                    int col = i % cols;
                    int cx = margin + col * (cardW + margin);
                    int cy = 100 + row * (cardH + margin) - scrollY;
                    if (cy > H || cy + cardH < 0)
                        continue;

                    if (new Rectangle(cx, cy, cardW, cardH).contains(x, y)) {
                        Card c = eng.unlockedCards.get(i);
                        if (eng.myDeck.contains(c))
                            eng.myDeck.remove(c);
                        else if (eng.myDeck.size() < 8)
                            eng.myDeck.add(c);
                        eng.saveProgress();
                    }
                }
            }
        } else if (state == State.DEBUG_MENU) {
            if (debugToggleBtn.contains(x, y)) {
                eng.debugView = !eng.debugView;
                Troop.SHOW_PATH = eng.debugView;
                Troop.SHOW_RANGE = eng.debugView;
            } else if (enemyDeckBtn.contains(x, y)) {
                state = State.ENEMY_DECK;
                scrollY = 0;
            } else if (backBtn.contains(x, y)) {
                state = State.TITLE;
            }
        } else if (state == State.ENEMY_DECK) {
            if (backBtn.contains(x, y)) {
                state = State.DEBUG_MENU;
            } else {
                int cols = 3;
                int margin = 20;
                int cardW = (W - (cols + 1) * margin) / cols;
                int cardH = 60;
                for (int i = 0; i < eng.allCards.size(); i++) {
                    int row = i / cols;
                    int col = i % cols;
                    int cx = margin + col * (cardW + margin);
                    int cy = 100 + row * (cardH + margin) - scrollY;
                    if (cy > H || cy + cardH < 0)
                        continue;

                    if (new Rectangle(cx, cy, cardW, cardH).contains(x, y)) {
                        Card c = eng.allCards.get(i);
                        if (eng.enemyDeckSelection.contains(c))
                            eng.enemyDeckSelection.remove(c);
                        else if (eng.enemyDeckSelection.size() < 8)
                            eng.enemyDeckSelection.add(c);
                        eng.saveProgress();
                    }
                }
            }
        } else if (state == State.PLAY) {
            // Check UI Clicks
            if (y > H - 130) {
                if (eng.p1 != null) {
                    for (int i = 0; i < 4; i++) {
                        if (i < eng.p1.h.size()) {
                            if (cardRects[i].contains(x, y)) {
                                eng.sel = eng.p1.h.get(i);
                            }
                        }
                    }
                }
            } else {
                eng.spawn(x, y);
            }
        } else if (state == State.OVER && exitBtn.contains(x, y)) {
            if (eng.win == 0) {
                Card newC = eng.unlockRandomCard();
                if (newC != null) {
                    justUnlocked = newC;
                    state = State.NEW_CARD;
                } else {
                    state = State.TITLE;
                }
            } else {
                state = State.TITLE;
            }
        } else if (state == State.NEW_CARD && continueBtn.contains(x, y)) {
            state = State.TITLE;
        }
    }

    void render(Graphics2D g) {
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

        // Background
        g.setColor(new Color(50, 160, 50));
        g.fillRect(0, 0, W, H);

        if (state == State.RESUME_PROMPT) {
            g.setColor(new Color(30, 30, 80));
            g.fillRect(0, 0, W, H);
            g.setColor(Color.WHITE);
            g.setFont(new Font("Arial", Font.BOLD, 30));
            String msg = "Resume previous game?";
            drawCenteredString(g, msg, new Rectangle(0, H / 2 - 100, W, 50), new Font("Arial", Font.BOLD, 30),
                    Color.WHITE);

            g.setColor(Color.GREEN);
            g.fill(resumeYesBtn);
            g.setColor(Color.BLACK);
            g.draw(resumeYesBtn);
            drawCenteredString(g, "YES", resumeYesBtn, new Font("Arial", Font.BOLD, 25), Color.WHITE);

            g.setColor(Color.RED);
            g.fill(resumeNoBtn);
            g.setColor(Color.BLACK);
            g.draw(resumeNoBtn);
            drawCenteredString(g, "NO", resumeNoBtn, new Font("Arial", Font.BOLD, 25), Color.WHITE);
            return;
        }

        if (state == State.TITLE) {
            g.setColor(new Color(30, 30, 80));
            g.fillRect(0, 0, W, H);
            g.setColor(Color.WHITE);
            g.setFont(new Font("Arial", 1, 40));
            String title = "Clash Clone";
            int titleW = g.getFontMetrics().stringWidth(title);
            g.drawString(title, (W - titleW) / 2, H / 2 - 50 - 120);
            boolean validDeck = eng.myDeck.size() == 8;
            g.setColor(validDeck ? Color.GREEN : Color.GRAY);
            g.fill(playBtn);
            g.setColor(Color.BLACK);
            g.draw(playBtn);
            drawCenteredString(g, "PLAY", playBtn, new Font("Arial", Font.BOLD, 25),
                    validDeck ? Color.WHITE : Color.DARK_GRAY);
            if (!validDeck) {
                g.setColor(Color.RED);
                g.setFont(new Font("Arial", Font.PLAIN, 12));
                String msg = "Build a deck of 8 cards!";
                g.drawString(msg, (W - g.getFontMetrics().stringWidth(msg)) / 2, playBtn.y - 10);
            }
            g.setColor(Color.ORANGE);
            g.fill(deckBtn);
            g.setColor(Color.BLACK);
            g.draw(deckBtn);
            drawCenteredString(g, "DECK", deckBtn, new Font("Arial", Font.BOLD, 25), Color.WHITE);

            g.setFont(new Font("Arial", Font.ITALIC, 14));
            g.setColor(Color.LIGHT_GRAY);
            String stats = "Cards Unlocked: " + eng.unlockedCards.size() + "/" + eng.allCards.size();
            g.drawString(stats, (W - g.getFontMetrics().stringWidth(stats)) / 2, H - 150 - 120);

            String matchStats = "Wins: " + eng.gamesWon + " | Matches: " + eng.gamesPlayed;
            g.drawString(matchStats, (W - g.getFontMetrics().stringWidth(matchStats)) / 2, H - 130 - 120);

            if (cheatOptionVisible) {
                g.setFont(new Font("Arial", Font.PLAIN, 10));
                g.setColor(new Color(255, 255, 255, 50));
                g.drawString("cheat", W - 43, 16);
            }
            if (eng.cheated) {
                g.setFont(new Font("Arial", Font.PLAIN, 10));
                g.setColor(new Color(255, 255, 255, 50));
                g.drawString("debug", W - 49, 16);
            }
            return;
        }

        if (state == State.CHEAT) {
            g.setColor(new Color(0, 0, 0, 200));
            g.fillRect(0, 0, W, H);
            g.setColor(Color.WHITE);
            g.setFont(new Font("Arial", Font.BOLD, 30));
            String msg = "Unlock all cards?";
            g.drawString(msg, (W - g.getFontMetrics().stringWidth(msg)) / 2, H / 2 - 50);

            g.setColor(Color.GREEN);
            g.fill(yesBtn);
            g.setColor(Color.BLACK);
            g.draw(yesBtn);
            drawCenteredString(g, "YES", yesBtn, new Font("Arial", Font.BOLD, 25), Color.WHITE);

            g.setColor(Color.RED);
            g.fill(noBtn);
            g.setColor(Color.BLACK);
            g.draw(noBtn);
            drawCenteredString(g, "NO", noBtn, new Font("Arial", Font.BOLD, 25), Color.WHITE);
            return;
        }

        if (state == State.DECK) {
            g.setColor(new Color(40, 40, 40));
            g.fillRect(0, 0, W, H);
            int cols = 3;
            int margin = 20;
            int cardW = (W - (cols + 1) * margin) / cols;
            int cardH = 60;
            g.setFont(new Font("Arial", Font.BOLD, 12));
            for (int i = 0; i < eng.unlockedCards.size(); i++) {
                Card c = eng.unlockedCards.get(i);
                boolean selected = eng.myDeck.contains(c);
                int row = i / cols;
                int col = i % cols;
                int cx = margin + col * (cardW + margin);
                int cy = 100 + row * (cardH + margin) - scrollY;
                if (cy > H || cy + cardH < 0)
                    continue;
                g.setColor(selected ? new Color(0, 200, 0) : new Color(100, 100, 100));
                g.fillRect(cx, cy, cardW, cardH);
                g.setColor(Color.BLACK);
                g.drawRect(cx, cy, cardW, cardH);
                g.setColor(Color.WHITE);
                drawCenteredString(g, c.n, new Rectangle(cx, cy, cardW, cardH), new Font("Arial", Font.BOLD, 11),
                        Color.WHITE);
                drawElixirCost(g, cx - 5, cy - 5, c.c);
            }

            g.setColor(new Color(40, 40, 40));
            g.fillRect(0, 0, W, 90);

            g.setColor(Color.WHITE);
            g.setFont(new Font("Arial", 1, 30));
            String title = "Build Deck (" + eng.myDeck.size() + "/8)";
            g.drawString(title, (W - g.getFontMetrics().stringWidth(title)) / 2, 50);
            double sum = 0;
            for (Card c : eng.myDeck)
                sum += c.c;
            double avg = eng.myDeck.isEmpty() ? 0 : sum / eng.myDeck.size();
            g.setFont(new Font("Arial", Font.ITALIC, 16));
            g.setColor(new Color(200, 100, 255));
            String avgTxt = String.format("Avg Elixir: %.1f", avg);
            g.drawString(avgTxt, W - g.getFontMetrics().stringWidth(avgTxt) - 20, 80);
            g.setColor(Color.RED);
            g.fill(backBtn);
            g.setColor(Color.WHITE);
            g.draw(backBtn);
            drawCenteredString(g, "BACK", backBtn, new Font("Arial", Font.BOLD, 25), Color.WHITE);
            return;
        }

        if (state == State.DEBUG_MENU) {
            g.setColor(new Color(30, 30, 80));
            g.fillRect(0, 0, W, H);

            g.setColor(eng.debugView ? Color.GREEN : Color.RED);
            g.fill(debugToggleBtn);
            g.setColor(Color.BLACK);
            g.draw(debugToggleBtn);
            drawCenteredString(g, "SHOW PATH/RANGE", debugToggleBtn, new Font("Arial", Font.BOLD, 18), Color.WHITE);

            g.setColor(Color.ORANGE);
            g.fill(enemyDeckBtn);
            g.setColor(Color.BLACK);
            g.draw(enemyDeckBtn);
            drawCenteredString(g, "BUILD ENEMY DECK", enemyDeckBtn, new Font("Arial", Font.BOLD, 18), Color.WHITE);

            g.setColor(Color.RED);
            g.fill(backBtn);
            g.setColor(Color.WHITE);
            g.draw(backBtn);
            drawCenteredString(g, "BACK", backBtn, new Font("Arial", Font.BOLD, 25), Color.WHITE);
            return;
        }

        if (state == State.ENEMY_DECK) {
            g.setColor(new Color(40, 40, 40));
            g.fillRect(0, 0, W, H);
            int cols = 3;
            int margin = 20;
            int cardW = (W - (cols + 1) * margin) / cols;
            int cardH = 60;
            g.setFont(new Font("Arial", Font.BOLD, 12));
            for (int i = 0; i < eng.allCards.size(); i++) {
                Card c = eng.allCards.get(i);
                boolean selected = eng.enemyDeckSelection.contains(c);
                int row = i / cols;
                int col = i % cols;
                int cx = margin + col * (cardW + margin);
                int cy = 100 + row * (cardH + margin) - scrollY;
                if (cy > H || cy + cardH < 0)
                    continue;
                g.setColor(selected ? new Color(0, 200, 0) : new Color(100, 100, 100));
                g.fillRect(cx, cy, cardW, cardH);
                g.setColor(Color.BLACK);
                g.drawRect(cx, cy, cardW, cardH);
                g.setColor(Color.WHITE);
                drawCenteredString(g, c.n, new Rectangle(cx, cy, cardW, cardH), new Font("Arial", Font.BOLD, 11),
                        Color.WHITE);
                drawElixirCost(g, cx - 5, cy - 5, c.c);
            }

            g.setColor(new Color(40, 40, 40));
            g.fillRect(0, 0, W, 90);

            g.setColor(Color.WHITE);
            g.setFont(new Font("Arial", 1, 30));
            String title = "Enemy Deck (" + eng.enemyDeckSelection.size() + "/8)";
            g.drawString(title, (W - g.getFontMetrics().stringWidth(title)) / 2, 50);

            g.setColor(Color.RED);
            g.fill(backBtn);
            g.setColor(Color.WHITE);
            g.draw(backBtn);
            drawCenteredString(g, "BACK", backBtn, new Font("Arial", Font.BOLD, 25), Color.WHITE);
            return;
        }

        if (state == State.NEW_CARD) {
            g.setColor(new Color(50, 0, 100));
            g.fillRect(0, 0, W, H);
            g.setColor(new Color(50, 0, 100));
            g.fillRect(0, 0, W, H);
            g.setColor(Color.WHITE);
            g.setFont(new Font("Arial", Font.BOLD, 30));
            String t1 = "NEW CARD";
            String t2 = "UNLOCKED!";
            g.drawString(t1, (W - g.getFontMetrics().stringWidth(t1)) / 2, 150);
            g.drawString(t2, (W - g.getFontMetrics().stringWidth(t2)) / 2, 190);
            if (justUnlocked != null) {
                int cardW = 140;
                int cardH = 180;
                int cx = (W - cardW) / 2;
                int cy = (H - cardH) / 2;

                g.setColor(Color.WHITE);
                g.fillRect(cx, cy, cardW, cardH);

                g.setColor(Color.DARK_GRAY);
                g.setStroke(new BasicStroke(4));
                g.drawRect(cx, cy, cardW, cardH);
                g.setStroke(new BasicStroke(1));

                g.setColor(Color.BLACK);
                g.setFont(new Font("Arial", Font.BOLD, 18));
                String name = justUnlocked.n;
                // Center name
                drawCenteredString(g, name, new Rectangle(cx, cy, cardW, cardH), new Font("Arial", Font.BOLD, 18),
                        Color.BLACK);

                // Elixir Top Left
                drawElixirCost(g, cx - 10, cy - 10, justUnlocked.c);
            }
            g.setColor(Color.GREEN);
            g.fill(continueBtn);
            g.setColor(Color.BLACK);
            g.draw(continueBtn);
            drawCenteredString(g, "CONTINUE", continueBtn, new Font("Arial", Font.BOLD, 20), Color.WHITE);
            return;
        }

        // GAMEPLAY RENDER
        g.setColor(new Color(50, 150, 255));
        g.fillRect(0, RIV_Y - 15, W, 30);
        g.setColor(new Color(139, 69, 19));
        g.fillRect(W / 4 - 25, RIV_Y - 18, 50, 36);
        g.fillRect(W * 3 / 4 - 25, RIV_Y - 18, 50, 36);

        if (state == State.PLAY && eng.sel != null && eng.sel.t != 2) {
            Area inv = new Area(new Rectangle(0, 0, W, H));
            Area val = new Area(new Rectangle(0, RIV_Y, W, H - RIV_Y));
            if (eng.t2L != null && eng.t2L.hp <= 0)
                val.add(new Area(new Rectangle(0, 150, W / 2, RIV_Y - 150)));
            if (eng.t2R != null && eng.t2R.hp <= 0)
                val.add(new Area(new Rectangle(W / 2, 150, W / 2, RIV_Y - 150)));
            inv.subtract(val);
            g.setColor(new Color(255, 0, 0, 100));
            g.fill(inv);
        }

        for (Proj p : eng.projs) {
            if (p.barrel)
                g.setColor(new Color(100, 50, 0));
            else if (p.fireArea) {
                int size = (int) (p.rad * 2);
                if (p.isGray) {
                    g.setColor(new Color(100, 100, 100, 180));
                    g.fillOval((int) p.x - size / 2, (int) p.y - size / 2, size, size);
                    g.setColor(Color.LIGHT_GRAY);
                    g.fillOval((int) p.x - size / 4, (int) p.y - size / 4, size / 2, size / 2);
                } else {
                    g.setColor(new Color(255, 69, 0, 180));
                    g.fillOval((int) p.x - size / 2, (int) p.y - size / 2, size, size);
                    g.setColor(Color.YELLOW);
                    g.fillOval((int) p.x - size / 4, (int) p.y - size / 4, size / 2, size / 2);
                }
            } else if (p.isHeal)
                g.setColor(new Color(0, 255, 0, 150));
            else if (p.redArea)
                g.setColor(new Color(255, 0, 0, 150));
            else if (p.poison) {
                int size = (int) (p.rad);
                g.setColor(new Color(0, 128, 0, 100));
                g.fillOval((int) p.x - size / 2, (int) p.y - size / 2, size, size);
            } else if (p.graveyard) {
                int size = (int) (p.rad);
                g.setColor(new Color(0, 0, 139, 100));
                g.fillOval((int) p.x - size / 2, (int) p.y - size / 2, size, size);
            } else if (p.isLightBlue)
                g.setColor(new Color(100, 200, 255));
            else if (p.isClone)
                g.setColor(new Color(0, 255, 255, 100));
            else if (p.isRolling) {
                g.setColor(new Color(100, 0, 150));
            } else
                g.setColor(p.spl ? (p.rad < 10 ? Color.CYAN : Color.ORANGE) : Color.LIGHT_GRAY);

            if (!p.fireArea && !p.poison && !p.graveyard) {
                int size = p.rad * 2;
                if (!p.spl && !p.barrel && !p.redArea && !p.isHeal && !p.barbBreak && !p.isRolling)
                    size = 8;
                g.fillOval((int) p.x - size / 2, (int) p.y - size / 2, size, size);
            }

            if (p.chainTargets != null) {
                g.setColor(Color.CYAN);
                for (int i = 0; i < p.chainTargets.size() - 1; i++) {
                    Entity e1 = p.chainTargets.get(i);
                    Entity e2 = p.chainTargets.get(i + 1);
                    if (e1 != null && e2 != null)
                        g.drawLine((int) e1.x, (int) e1.y, (int) e2.x, (int) e2.y);
                }
            }
        }

        for (Entity e : eng.ents) {
            if (e instanceof Troop) {
                Troop t = (Troop) e;
                if (t.chargeT > 0) {
                    g.setColor(new Color(100, 200, 255, 150 + (int) (50 * Math.sin(t.chargeT * 0.2))));
                    int r = (int) t.rad + 5;
                    g.drawOval((int) t.x - r, (int) t.y - r, r * 2, r * 2);
                    if (Math.random() < 0.3) {
                        int sx = (int) t.x + (int) ((Math.random() - 0.5) * t.rad * 2);
                        int sy = (int) t.y + (int) ((Math.random() - 0.5) * t.rad * 2);
                        g.drawLine(sx, sy, sx + 5, sy + 5);
                    }
                }

            }
        }

        for (Entity e : eng.ents) {
            if (e instanceof Troop) {
                Troop t = (Troop) e;
                if (t.c.n.equals("Electro Giant")) {
                    g.setColor(new Color(0, 255, 255, 100));
                    int r = (int) t.rad + 10;
                    g.setStroke(new BasicStroke(2));
                    g.drawOval((int) t.x - r, (int) t.y - r, r * 2, r * 2);
                    g.setStroke(new BasicStroke(1));
                    if (Math.random() < 0.5) {
                        double angle = Math.random() * Math.PI * 2;
                        int sx = (int) (t.x + Math.cos(angle) * r);
                        int sy = (int) (t.y + Math.sin(angle) * r);
                        g.setColor(Color.WHITE);
                        g.drawLine(sx, sy, sx + 2, sy + 2);
                    }
                }
            }
        }

        for (Entity e : eng.ents) {
            boolean isInferno = false;
            Entity target = null;
            int ticks = e.infernoTick;

            if (e instanceof Troop) {
                Troop t = (Troop) e;
                if (t.c.n.equals("Inferno Dragon") && t.atk) {
                    isInferno = true;
                    target = t.lk;
                }
            } else if (e instanceof Building) {
                Building b = (Building) e;
                if (b.c.n.equals("Inferno Tower") && b.atk) {
                    isInferno = true;
                    target = b.lk;
                }
            }

            if (isInferno && target != null) {
                float width = 2 + (ticks / 20.0f);
                if (width > 8)
                    width = 8;
                g.setStroke(new BasicStroke(width));
                int red = 255;
                int green = Math.max(0, 165 - ticks);
                int blue = 0;
                g.setColor(new Color(red, green, blue));
                g.drawLine((int) e.x, (int) e.y, (int) target.x, (int) target.y);
                g.setStroke(new BasicStroke(1));
            }
        }

        for (Entity e : eng.ents) {
            if (e.fly) {
                int visualR = (int) e.rad;
                int shadowOffset = 20;
                if (e instanceof Troop && ((Troop) e).c.n.equals("Mega Knight") && ((Troop) e).jp) {
                    Troop mk = (Troop) e;
                    if (mk.jt != null && mk.jd > 0) {
                        double d = mk.dist(mk.jt);
                        double progress = 1.0 - (d / mk.jd);
                        shadowOffset = (int) (50 * Math.sin(progress * Math.PI));
                    }
                }
                g.setColor(new Color(0, 0, 0, 50));
                g.fillOval((int) e.x - visualR, (int) e.y - visualR + shadowOffset, visualR * 2, visualR * 2);
            } else if (e instanceof Troop && ((Troop) e).jp) {
                // Shadow for Jump (Ballistic)
                Troop t = (Troop) e;
                if (t.jt != null) {
                    int visualR = (int) e.rad;
                    double totalDist = t.jd;
                    double currentDist = e.dist(t.jt);
                    double progress = 1.0 - (currentDist / totalDist);

                    // Parabolic arc height
                    double jumpHeight = 50.0 * Math.sin(progress * Math.PI);
                    int shadowOffset = (int) jumpHeight + 10;

                    g.setColor(new Color(0, 0, 0, 50));
                    g.fillOval((int) e.x - visualR, (int) e.y - visualR + shadowOffset, visualR * 2, visualR * 2);
                }
            }
        }

        if (Troop.SHOW_PATH) {
            g.setColor(Color.WHITE);
            for (Entity e : eng.ents) {
                if (e instanceof Troop) {
                    Troop t = (Troop) e;
                    if (!t.path.isEmpty()) {
                        double prevX = t.x;
                        double prevY = t.y;
                        for (Point2D.Double p : t.path) {
                            g.drawLine((int) prevX, (int) prevY, (int) p.x, (int) p.y);
                            g.fillOval((int) p.x - 2, (int) p.y - 2, 4, 4);
                            prevX = p.x;
                            prevY = p.y;
                        }
                    }
                }
            }
        }

        for (Entity e : eng.ents) {
            if (!e.fly)
                drawEntityBody(g, e);
        }

        for (Entity e : eng.ents) {
            if (e.fly)
                drawEntityBody(g, e);
        }

        // Render Status Effects (Curse) ON TOP
        for (Entity e : eng.ents) {
            if (e instanceof Troop) {
                Troop t = (Troop) e;
                if (t.curseTime > 0) {
                    g.setColor(new Color(128, 0, 128, 100)); // Purple filled
                    int r = (int) t.rad + 5; // Slightly larger than troop
                    g.fillOval((int) t.x - r, (int) t.y - r, r * 2, r * 2);
                    g.setColor(new Color(255, 0, 255)); // Bright outline
                    g.setStroke(new BasicStroke(2));
                    g.drawOval((int) t.x - r, (int) t.y - r, r * 2, r * 2);
                    g.setStroke(new BasicStroke(1));
                }
            }
        }

        if (Troop.SHOW_RANGE) {
            g.setColor(new Color(255, 255, 0, 50));
            for (Entity e : eng.ents) {
                if (e instanceof Troop) {
                    Troop t = (Troop) e;
                    int r = (int) t.sightRange;
                    g.drawOval((int) t.x - r, (int) t.y - r, r * 2, r * 2);
                    g.setColor(new Color(255, 165, 0, 150));
                    int ar = (int) t.c.rn;
                    if (ar > 0)
                        g.drawOval((int) t.x - ar, (int) t.y - ar, ar * 2, ar * 2);
                    g.setColor(new Color(255, 255, 0, 50));
                }
            }
        }

        for (Entity e : eng.ents) {
            int visualR = (int) e.rad;
            int hbw = (int) (e.rad * 2);
            if (hbw < 16)
                hbw = 16;
            int hby = (int) e.y - visualR - 8;
            g.setColor(Color.RED);
            g.fillRect((int) e.x - hbw / 2, hby, hbw, 4);
            g.setColor(Color.GREEN);
            g.fillRect((int) e.x - hbw / 2, hby, (int) (hbw * (Math.max(0, e.hp) / e.mhp)), 4);

            if (e instanceof Troop || e instanceof Building) {
                g.setColor(Color.WHITE);
                g.setFont(new Font("Arial", Font.BOLD, 9));
                String name = (e instanceof Troop) ? ((Troop) e).c.n : ((Building) e).c.n;
                if (name.equals("Skeleton Army") || name.equals("Graveyard"))
                    name = "Skelly";
                g.setColor(Color.BLACK);
                int tw = g.getFontMetrics().stringWidth(name);
                g.drawString(name, (int) e.x - tw / 2 + 1, hby - 2);
                g.setColor(Color.WHITE);
                g.drawString(name, (int) e.x - tw / 2, hby - 3);
            }
        }

        if (eng.isDoubleElixir && state == State.PLAY) {
            g.setColor(new Color(255, 0, 0, 30));
            g.fillRect(0, 0, W, H);
        }
        if (eng.tiebreaker && state == State.PLAY) {
            g.setColor(Color.ORANGE);
            g.setFont(new Font("Arial", Font.BOLD, 30));
            g.drawString("TIEBREAKER", W / 2 - 100, H / 2 - 50);
        }
        if (state == State.PLAY) {
            g.setColor(Color.WHITE);
            g.setFont(new Font("Arial", Font.BOLD, 20));
            long time = 300 - (System.currentTimeMillis() - eng.gameStart) / 1000;
            if (time < 0)
                time = 0;
            String ts = String.format("%d:%02d", time / 60, time % 60);
            g.drawString(ts, W - 80, 30);

            if (eng.doubleElixirAnim > 0) {
                g.setColor(Color.MAGENTA);
                g.setFont(new Font("Arial", Font.BOLD, 20));
                String dx = "2x";
                int dxW = g.getFontMetrics().stringWidth(dx);
                g.drawString(dx, W - 80 - dxW - 10, 30);
            }

            // --- DRAW UI (Bottom Panel Replacement) ---
            // Draw Background for UI
            g.setColor(Color.DARK_GRAY);
            g.fillRect(0, H - 130, W, 130);

            // Draw Elixir Bar
            g.setColor(Color.BLACK);
            g.fillRect(elixirRect.x, elixirRect.y, elixirRect.width, elixirRect.height);
            if (eng.p1 != null) {
                int barW = (int) ((eng.p1.elx / 10.0) * elixirRect.width);
                g.setColor(new Color(200, 0, 200));
                g.fillRect(elixirRect.x, elixirRect.y, barW, elixirRect.height);
                g.setColor(new Color(255, 255, 255, 100));
                for (int i = 1; i < 10; i++) {
                    int x = (elixirRect.width / 10) * i;
                    g.drawLine(x, elixirRect.y, x, elixirRect.y + elixirRect.height);
                }
                g.setColor(Color.WHITE);
                g.setFont(new Font("Arial", Font.BOLD, 14));
                String txt = (int) eng.p1.elx + " / 10";
                drawCenteredString(g, txt, elixirRect, new Font("Arial", Font.BOLD, 14), Color.WHITE);
            }

            // Draw Cards
            if (eng.p1 != null) {
                for (int i = 0; i < 4; i++) {
                    if (i < eng.p1.h.size()) {
                        Card c = eng.p1.h.get(i);
                        Rectangle r = cardRects[i];

                        // Card Background
                        if (eng.sel == c)
                            g.setColor(Color.YELLOW);
                        else if (eng.p1.elx >= c.c)
                            g.setColor(Color.WHITE);
                        else
                            g.setColor(Color.GRAY);
                        g.fillRect(r.x, r.y, r.width, r.height);

                        // Card Border
                        g.setColor(Color.BLACK);
                        g.setStroke(new BasicStroke(2));
                        g.drawRect(r.x, r.y, r.width, r.height);
                        g.setStroke(new BasicStroke(1));

                        // Define variables
                        String name = c.n;
                        int cost = c.c;
                        if (name.equals("Mirror") && eng.p1.lastPlayedCard != null) {
                            name = "Mirror (" + eng.p1.lastPlayedCard.n + ")";
                            cost = eng.p1.lastPlayedCard.c + 1;
                        }

                        // Name centered
                        g.setColor(Color.BLACK);
                        g.setFont(new Font("Arial", Font.BOLD, 10));
                        drawCenteredString(g, name, new Rectangle(r.x, r.y, r.width, r.height),
                                new Font("Arial", Font.BOLD, 10), Color.BLACK);

                        // Elixir Cost (Inwards)
                        drawElixirCost(g, r.x + 8, r.y + 8, cost);
                    }
                }
            }

            // Draw Next Card
            g.setColor(new Color(34, 34, 34));
            g.fillRect(nextCardRect.x, nextCardRect.y, nextCardRect.width, nextCardRect.height);
            g.setColor(Color.BLACK);
            g.setStroke(new BasicStroke(2));
            g.drawRect(nextCardRect.x, nextCardRect.y, nextCardRect.width, nextCardRect.height);
            g.setStroke(new BasicStroke(1));

            drawCenteredString(g, "NEXT", new Rectangle(nextCardRect.x, nextCardRect.y, nextCardRect.width, 15),
                    new Font("Arial", Font.BOLD, 9), Color.WHITE);

            if (eng.p1 != null && !eng.p1.pile.isEmpty()) {
                Card next = eng.p1.pile.get(0);
                int margin = 8;
                int cw = nextCardRect.width - margin * 2;
                int ch = (int) (cw * 1.33);
                int yStart = nextCardRect.y + 25;

                g.setColor(Color.WHITE); // White background
                g.fillRect(nextCardRect.x + margin, yStart, cw, ch);
                g.setColor(Color.BLACK);
                g.drawRect(nextCardRect.x + margin, yStart, cw, ch);

                drawCenteredString(g, next.n, new Rectangle(nextCardRect.x + margin, yStart + ch + 2, cw, 10),
                        new Font("Arial", Font.BOLD, 9), Color.WHITE);

                drawElixirCost(g, nextCardRect.x + margin + 5, yStart + 5, next.c);
            }
        }

        if (state == State.CNT) {
            g.setColor(new Color(0, 0, 0, 100));
            g.fillRect(0, 0, W, H);
            g.setColor(Color.WHITE);
            int c = 3 - (int) ((System.currentTimeMillis() - t0) / 1000);
            g.setFont(new Font("Arial", 1, 100));
            g.drawString(c > 0 ? String.valueOf(c) : "FIGHT", W / 2 - (c > 0 ? 30 : 150), H / 2);
        } else if (state == State.OVER) {
            g.setColor(new Color(0, 0, 0, 180));
            g.fillRect(0, 0, W, H);
            g.setColor(Color.WHITE);
            g.setFont(new Font("Arial", 1, 40));
            String msg = eng.win == 0 ? "YOU WIN!" : "YOU LOSE!";
            g.drawString(msg, (W - g.getFontMetrics().stringWidth(msg)) / 2, H / 2 - 50);
            g.setColor(Color.RED);
            g.fill(exitBtn);
            g.setColor(Color.WHITE);
            g.draw(exitBtn);
            drawCenteredString(g, "EXIT", exitBtn, new Font("Arial", Font.BOLD, 25), Color.WHITE);
        }

        // Mouse Hover Preview
        if (state == State.PLAY && eng.sel != null) {
            Card c = eng.sel;
            int r = 10;
            if (c.t == 2)
                r = c.n.equals("Zap") ? 40
                        : (c.n.equals("Arrows") ? 70
                                : (c.n.equals("Freeze") || c.n.equals("Vines") ? 80
                                        : (c.n.equals("Poison") || c.n.equals("Graveyard") ? 100 : 60)));
            else if (c.n.contains("Skeletons") || c.n.equals("Bats"))
                r = 6;
            else if (c.n.equals("Mega Knight"))
                r = 25;
            else if (c.n.equals("Giant") || c.t == 3)
                r = 20;

            if (c.n.equals("Cannon") || c.n.equals("Musketeer") || c.n.equals("Tesla") || c.n.equals("Wizard")
                    || c.n.equals("Witch") || c.n.equals("Inferno Tower")) {
                int sR = (int) c.rn;
                g.setColor(new Color(255, 255, 255, 50));
                g.fillOval(mouse.x - sR, mouse.y - sR, sR * 2, sR * 2);
                g.setColor(new Color(255, 255, 255, 150));
                g.drawOval(mouse.x - sR, mouse.y - sR, sR * 2, sR * 2);
            }

            boolean valid = eng.isValid(mouse.y, mouse.x, c);
            g.setColor(valid ? new Color(255, 255, 255, 180) : new Color(255, 50, 50, 180));

            if (c.t == 3)
                g.fillRect(mouse.x - r, mouse.y - r, r * 2, r * 2);
            else
                g.fillOval(mouse.x - r, mouse.y - r, r * 2, r * 2);
            g.setColor(Color.WHITE);
            g.drawOval(mouse.x - r, mouse.y - r, r * 2, r * 2);
        }
    }

    void drawEntityBody(Graphics g, Entity e) {
        Color baseColor = e.tm == 0 ? Color.BLUE : Color.RED;

        if (e instanceof Troop && ((Troop) e).isClone) {
            baseColor = e.tm == 0 ? new Color(0, 0, 255, 100) : new Color(255, 0, 0, 100);
        }

        g.setColor(baseColor);
        int visualR = (int) e.rad;
        int yOffset = 0;

        if (e instanceof Troop) {
            Troop t = (Troop) e;
            if (t.jp && t.jt != null) {
                double totalDist = t.jd;
                double currentDist = e.dist(t.jt);
                double progress = 1.0 - (currentDist / totalDist);
                // Parabolic arc height
                double jumpHeight = 50.0 * Math.sin(progress * Math.PI);
                yOffset = (int) -jumpHeight;
            }
        }

        if (e instanceof Tower) {
            g.fillRoundRect((int) (e.x - visualR), (int) (e.y - visualR), visualR * 2, visualR * 2, 15, 15);
        } else if (e instanceof Building) {
            g.fillOval((int) (e.x - visualR), (int) (e.y - visualR), visualR * 2, visualR * 2);
        } else {
            g.fillOval((int) (e.x - visualR), (int) (e.y - visualR + yOffset), visualR * 2, visualR * 2);
        }

        if (e.st > 0) {
            g.setColor(Color.YELLOW);
            g.drawOval((int) e.x - visualR, (int) e.y - visualR, visualR * 2, visualR * 2);
        }
        if (e.rt > 0) {
            g.drawOval((int) e.x - visualR - 2, (int) e.y - visualR - 2, visualR * 2 + 4, visualR * 2 + 4);
        }
        if (e.fr > 0) {
            g.setColor(Color.CYAN);
            g.drawOval((int) e.x - visualR - 2, (int) e.y - visualR - 2, visualR * 2 + 4, visualR * 2 + 4);
        }

        if (e instanceof Tower) {
            Tower t = (Tower) e;
            if (t.kg && t.actv) {
                g.setColor(Color.YELLOW);
                g.fillOval((int) e.x - 5, (int) e.y - 5, 10, 10);
            } else if (!t.kg) {
                g.setColor(Color.YELLOW);
                g.fillOval((int) e.x - 5, (int) e.y - 5, 10, 10);
            }
        }
    }

    void drawCenteredString(Graphics g, String text, Rectangle rect, Font font, Color c) {
        FontMetrics metrics = g.getFontMetrics(font);
        int x = rect.x + (rect.width - metrics.stringWidth(text)) / 2;
        int y = rect.y + ((rect.height - metrics.getHeight()) / 2) + metrics.getAscent();
        g.setFont(font);
        g.setColor(c);
        g.drawString(text, x, y);
    }

    void drawElixirCost(Graphics g, int x, int y, int cost) {
        Graphics2D g2 = (Graphics2D) g;
        g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

        g2.setColor(new Color(216, 0, 216));
        g2.fillOval(x, y, 24, 24);

        g2.setColor(Color.WHITE);
        g2.setStroke(new BasicStroke(2));
        g2.drawOval(x, y, 24, 24);
        g2.setStroke(new BasicStroke(1));

        g2.setFont(new Font("Arial", Font.BOLD, 16));
        String s = String.valueOf(cost);
        FontMetrics fm = g2.getFontMetrics();
        int tx = x + (24 - fm.stringWidth(s)) / 2;
        int ty = y + (24 - fm.getHeight()) / 2 + fm.getAscent() - 1;
        g2.drawString(s, tx, ty);
    }

    public static void main(String[] a) {
        new Main();
    }
}
