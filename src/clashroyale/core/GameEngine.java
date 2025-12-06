package clashroyale.core;

import clashroyale.entities.*;
import clashroyale.models.Card;
import clashroyale.ai.EnemyAI;
import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;
import java.io.*;
import java.nio.file.*;

public class GameEngine {
    public static final int W = 450, H = 824;
    public static final int RIV_Y = 337;

    public Player p1, p2;
    public List<Entity> ents = new CopyOnWriteArrayList<>();
    public List<Proj> projs = new CopyOnWriteArrayList<>();
    public Tower t1K, t1L, t1R, t2K, t2L, t2R;
    public boolean over;
    public int win;
    public int aiTick = 0;
    public long gameStart;
    public boolean isDoubleElixir, tiebreaker;
    public int doubleElixirAnim = 0;
    public Random rand = new Random();
    public List<Card> unlockedCards = new ArrayList<>();
    public List<Card> myDeck = new ArrayList<>();
    public Card sel;
    public boolean cheated = false;
    public int gamesPlayed = 0;
    public int gamesWon = 0;
    public List<Card> enemyDeckSelection = new ArrayList<>();
    public boolean debugView = false;

    public List<Card> allCards = List.of(
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
            new Card("Mother Witch", 4, 532, 133, 1.2, 110, 0, 10, 72, 150, false, true));

    static {
        // Apply Stat Adjustments
        // Since allCards is immutable List.of, we need to reconstruct it or modify
        // cards if mutable.
        // Card objects are mutable in this codebase.
        // But List.of returns immutable list. We can't modify the list, but we can
        // modify the objects inside?
        // Actually, let's just modify the list creation to be a mutable ArrayList so we
        // can modify it easily if needed,
        // or just iterate and modify since we have references.
        // Wait, List.of creates an immutable list containing the elements. The elements
        // themselves are objects.
        // If Card fields are public/settable, we can modify them.
        // Let's assume we can modify them.
    }

    {
        // Instance initializer to apply stats? No, allCards is instance variable but
        // initialized with List.of
        // We should convert it to ArrayList to be safe and modifiable
        allCards = new ArrayList<>(allCards);
        for (Card c : allCards) {
            if (!c.n.equals("Mother Witch"))
                c.hp = (int) (c.hp * 1.30);
            if (c.s > 0)
                c.s = c.s * 0.75;
            if (c.t == 2) {
                if (c.n.equals("Fireball"))
                    c.d = (int) (c.d * 1.60);
                else
                    c.d = (int) (c.d * 1.30);
            }
        }
    }

    public static final Card GOLEMITE = new Card("Golemite", 0, 1039, 84, 0.8, 25, 1, 2000, 150, 120, false, false);
    public static final Card LAVA_PUP = new Card("Lava Pup", 0, 134, 67, 1.2, 50, 0, 5, 102, 80, true, false);
    public static final Card ELIXIR_GOLEMITE = new Card("Elixir Golemite", 0, 762, 128, 0.8, 25, 1, 2000, 78, 120,
            false, false);
    public static final Card ELIXIR_BLOB = new Card("Elixir Blob", 0, 360, 64, 1, 15, 0, 5, 50, 80, false, false);
    public static final Card CURSED_HOG = new Card("Cursed Hog", 0, 520, 52, 2.0, 20, 1, 150, 60, 120, false, false);

    static {
        // Apply stats to static tokens
        Card[] tokens = { GOLEMITE, LAVA_PUP, ELIXIR_GOLEMITE, ELIXIR_BLOB, CURSED_HOG };
        for (Card c : tokens) {
            if (!c.n.equals("Mother Witch"))
                c.hp = (int) (c.hp * 1.30);
            if (c.s > 0)
                c.s = c.s * 0.75;
        }
    }

    public EnemyAI enemyAI;

    public GameEngine() {
    }

    public void giveElixir(int teamToGive, double amount) {
        if (teamToGive == 0)
            p1.elx = Math.min(10, p1.elx + amount);
        else
            p2.elx = Math.min(10, p2.elx + amount);
    }

    public void initCollection() {
        cheated = false;
        unlockedCards.clear();
        myDeck.clear();
        List<Card> pool = new ArrayList<>(allCards);
        Collections.shuffle(pool);
        for (int i = 0; i < Math.min(9, pool.size()); i++)
            unlockedCards.add(pool.get(i));
        for (int i = 0; i < Math.min(8, unlockedCards.size()); i++)
            myDeck.add(unlockedCards.get(i));
    }

    public Card unlockRandomCard() {
        List<Card> locked = new ArrayList<>();
        for (Card c : allCards)
            if (!unlockedCards.contains(c))
                locked.add(c);
        if (locked.isEmpty())
            return null;
        Card c = locked.get(rand.nextInt(locked.size()));
        unlockedCards.add(c);
        saveProgress();
        return c;
    }

    public void unlockAllCards() {
        unlockedCards.clear();
        unlockedCards.addAll(allCards);
        saveProgress();
    }

    public void saveProgress() {
        try {
            File dir = new File("bin/saves");
            if (!dir.exists())
                dir.mkdirs();
            File file = new File(dir, "progress.txt");
            try (PrintWriter pw = new PrintWriter(file)) {
                pw.println(gamesWon);
                pw.println(gamesPlayed);
                pw.println(cheated ? "y" : "n");

                StringBuilder deckSb = new StringBuilder();
                for (Card c : myDeck) {
                    if (deckSb.length() > 0)
                        deckSb.append(",");
                    deckSb.append(c.n);
                }
                pw.println(deckSb.toString());

                pw.println(debugView ? "y" : "n");

                StringBuilder enemyDeckSb = new StringBuilder();
                for (Card c : enemyDeckSelection) {
                    if (enemyDeckSb.length() > 0)
                        enemyDeckSb.append(",");
                    enemyDeckSb.append(c.n);
                }
                pw.println(enemyDeckSb.toString());

                for (Card c : unlockedCards) {
                    pw.println(c.n);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public void loadProgress() {
        File file = new File("bin/saves/progress.txt");
        if (!file.exists())
            return;
        try (BufferedReader br = new BufferedReader(new FileReader(file))) {
            String line = br.readLine();
            if (line != null)
                gamesWon = Integer.parseInt(line.trim());

            line = br.readLine();
            if (line != null)
                gamesPlayed = Integer.parseInt(line.trim());

            line = br.readLine();
            if (line != null)
                cheated = line.trim().equalsIgnoreCase("y");

            line = br.readLine();
            if (line != null && !line.isEmpty()) {
                myDeck.clear();
                String[] deckCards = line.split(",");
                for (String cardName : deckCards) {
                    Card c = getCard(cardName.trim());
                    if (c != null)
                        myDeck.add(c);
                }
            }

            line = br.readLine();
            if (line != null) {
                debugView = line.trim().equalsIgnoreCase("y");
                Troop.SHOW_PATH = debugView;
                Troop.SHOW_RANGE = debugView;
            }

            line = br.readLine();
            if (line != null && !line.isEmpty()) {
                enemyDeckSelection.clear();
                String[] deckCards = line.split(",");
                for (String cardName : deckCards) {
                    Card c = getCard(cardName.trim());
                    if (c != null)
                        enemyDeckSelection.add(c);
                }
            }

            unlockedCards.clear();
            while ((line = br.readLine()) != null) {
                Card c = getCard(line.trim());
                if (c != null && !unlockedCards.contains(c)) {
                    unlockedCards.add(c);
                }
            }
            // Ensure deck cards are also in unlocked (sanity check)
            for (Card c : myDeck) {
                if (!unlockedCards.contains(c))
                    unlockedCards.add(c);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public void deleteProgress() {
        try {
            File file = new File("bin/saves/progress.txt");
            if (file.exists())
                file.delete();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public boolean hasSaveFile() {
        return new File("bin/saves/progress.txt").exists();
    }

    public void reset() {
        p1 = new Player(0);
        p2 = new Player(1);
        ents.clear();
        projs.clear();
        sel = null;
        over = false;
        aiTick = 0;
        gameStart = System.currentTimeMillis();
        isDoubleElixir = false;
        tiebreaker = false;
        doubleElixirAnim = 0;
        p1.pile.clear();
        p1.h.clear();
        p1.pile.addAll(myDeck);
        Collections.shuffle(p1.pile);
        for (int i = 0; i < 4; i++)
            p1.h.add(p1.pile.remove(0));

        // Initialize Enemy AI
        enemyAI = new clashroyale.ai.EnemyAI(this);
        enemyAI = new clashroyale.ai.EnemyAI(this);
        // Enemy Deck: Random 8 cards from unlocked cards (or all cards if not enough)
        p2.pile.clear();
        p2.h.clear();
        ArrayList<Card> enemyPool = new ArrayList<>(unlockedCards);
        if (enemyPool.size() < 8)
            enemyPool = new ArrayList<>(allCards);
        Collections.shuffle(enemyPool);
        for (int i = 0; i < 8; i++)
            p2.pile.add(enemyPool.get(i));

        for (int i = 0; i < 4; i++)
            p2.h.add(p2.pile.remove(0));

        t1K = new Tower(0, W / 2, H - 230, true);
        ents.add(t1K);
        t1L = new Tower(0, W / 4, H - 310, false);
        ents.add(t1L);
        t1R = new Tower(0, W * 3 / 4, H - 310, false);
        ents.add(t1R);
        t2K = new Tower(1, W / 2, 70, true);
        ents.add(t2K);
        t2L = new Tower(1, W / 4, 150, false);
        ents.add(t2L);
        t2R = new Tower(1, W * 3 / 4, 150, false);
        ents.add(t2R);
    }

    public boolean isValid(int y, int x, Card c) {
        if (c.t == 2 || c.n.equals("Goblin Barrel"))
            return true;
        if (y >= RIV_Y + 40)
            return true;
        if (c.t == 3 && y > RIV_Y - 40 && y < RIV_Y + 40)
            return false; // Cannot place buildings on river
        if (t2L != null && t2L.hp <= 0 && x < W / 2 && y >= 150)
            return true;
        if (t2R != null && t2R.hp <= 0 && x > W / 2 && y >= 150)
            return true;
        return false;
    }

    public double getHitboxRadius(Entity e) {
        if (e instanceof Tower)
            return e.rad / 1.5;
        if (e instanceof Building)
            return e.rad / 1.5;
        if (e instanceof Troop) {
            return e.rad; // Full radius for troops (no overlap)
        }
        return e.rad / 2.0;
    }

    public double getVisualRadius(Card c) {
        if (c.n.equals("Cannon"))
            return 25;
        if (c.t == 3)
            return 20;
        return 18;
    }

    public void spawn(int x, int y) {
        if (tiebreaker)
            return;
        if (sel == null || y > H - 120)
            return;

        Card cardToPlay = sel;
        int cost = sel.c;

        if (sel.n.equals("Mirror")) {
            if (p1.lastPlayedCard == null)
                return;
            cardToPlay = p1.lastPlayedCard;
            cost = cardToPlay.c + 1;
        }

        if (p1.elx < cost)
            return;

        if (cardToPlay.t == 3) {
            double newVisualRad = getVisualRadius(cardToPlay);
            for (Entity e : ents) {
                if (e instanceof Tower || e instanceof Building) {
                    if (Math.hypot(x - e.x, y - e.y) < e.rad + newVisualRad + 3)
                        return;
                }
            }
        }

        if (!isValid(y, x, cardToPlay))
            return;
        p1.elx -= cost;
        addU(0, cardToPlay, x, y);

        if (!sel.n.equals("Mirror"))
            p1.lastPlayedCard = sel;
        else
            p1.lastPlayedCard = cardToPlay;

        p1.h.remove(sel);
        p1.pile.add(sel); // Add to back of pile
        p1.h.add(p1.pile.remove(0)); // Draw from front of pile
        sel = null;
    }

    public void addU(int tm, Card c, double x, double y) {
        if (c.n.equals("Goblin Barrel"))
            projs.add(new Proj(tm == 0 ? W / 2 : W / 2, tm == 0 ? H : 0, x, y, null, 15, false, 10, 0, tm, true));
        else if (c.n.equals("Barbarian Barrel")) {
            projs.add(new Proj(x, y, x, y, null, 0, false, 60, 50, tm, false).asRedArea());
            Card barb = new Card("Barbarians", 0, 600, 150, 1.2, 18, 0, 10, 90, 180, false, false);
            ents.add(new Troop(tm, x, y, barb));
        } else if (c.n.equals("Poison"))
            projs.add(new Proj(x, y, x, y, null, 0, true, 200, 5, tm, false).asPoison());
        else if (c.n.equals("Graveyard"))
            projs.add(new Proj(x, y, x, y, null, 0, true, 200, 0, tm, false).asGraveyard());
        else if (c.n.equals("Clone")) {
            Proj p = new Proj(x, y, x, y, null, 0, true, 90, 0, tm, false);
            p.life = 5; // Instant effect
            p.isClone = true;
            projs.add(p);

            List<Troop> toClone = new ArrayList<>();
            for (Entity e : ents) {
                if (e instanceof Troop && e.tm == tm && Math.hypot(e.x - x, e.y - y) < 90 && !((Troop) e).isClone
                        && !(e instanceof Building) && !(e instanceof Tower)) {
                    toClone.add((Troop) e);
                }
            }
            for (Troop t : toClone) {
                Troop clone = new Troop(tm, t.x + 20, t.y, t.c);
                clone.hp = 1;
                clone.mhp = 1;
                clone.isClone = true;
                ents.add(clone);
            }
        } else if (c.t == 2) {
            int rad = 60, dmg = c.d;
            if (c.n.equals("Zap")) {
                rad = 40;
                dmg = 150;
            }
            if (c.n.equals("Vines")) {
                rad = 80;
                dmg = 20;
            }
            if (c.n.equals("Freeze")) {
                rad = 100;
                dmg = 5;
            }
            if (c.n.equals("Arrows")) {
                rad = 100;
                dmg = 120;
            }
            Proj p = new Proj(x, y, x, y, null, 0, true, rad, dmg, tm, false);
            if (c.n.equals("Zap"))
                p.asStun();
            if (c.n.equals("Vines"))
                p.isRoot = true;
            if (c.n.equals("Freeze"))
                p.isFreeze = true;
            if (c.n.equals("Fireball"))
                p.hasKnockback = true;
            projs.add(p);
        } else if (c.n.equals("Archers") || c.n.equals("Spear Goblins") || c.n.equals("Wall Breakers")) {
            ents.add(new Troop(tm, x - 15, y, c));
            ents.add(new Troop(tm, x + 15, y, c));
            if (c.n.contains("Spear"))
                ents.add(new Troop(tm, x, y + 15, c));
        } else if (c.n.equals("Skeletons") || c.n.equals("Goblins")) {
            ents.add(new Troop(tm, x, y - 10, c));
            ents.add(new Troop(tm, x - 10, y + 10, c));
            ents.add(new Troop(tm, x + 10, y + 10, c));
        } else if (c.n.equals("Minions")) {
            ents.add(new Troop(tm, x, y - 10, c));
            ents.add(new Troop(tm, x - 10, y + 10, c));
            ents.add(new Troop(tm, x + 10, y + 10, c));
        } else if (c.n.equals("Minion Horde")) {
            for (int i = 0; i < 6; i++)
                ents.add(new Troop(tm, x + rand.nextInt(50) - 25, y + rand.nextInt(50) - 25, getCard("Minions")));
        } else if (c.n.equals("Skeleton Army"))
            for (int i = 0; i < 15; i++)
                ents.add(new Troop(tm, x + rand.nextInt(60) - 30, y + rand.nextInt(60) - 30, getCard("Skeletons")));
        else if (c.n.equals("Bats"))
            for (int i = 0; i < 5; i++)
                ents.add(new Troop(tm, x + rand.nextInt(40) - 20, y + rand.nextInt(40) - 20, c));
        else if (c.n.equals("Barbarians")) {
            ents.add(new Troop(tm, x - 12, y - 12, c));
            ents.add(new Troop(tm, x + 12, y - 12, c));
            ents.add(new Troop(tm, x - 12, y + 12, c));
            ents.add(new Troop(tm, x + 12, y + 12, c));
        } else if (c.n.equals("Elite Barbarians")) {
            ents.add(new Troop(tm, x - 10, y, c));
            ents.add(new Troop(tm, x + 10, y, c));
        } else if (c.n.equals("Zappies")) {
            ents.add(new Troop(tm, x - 10, y, c));
            ents.add(new Troop(tm, x + 10, y, c));
            ents.add(new Troop(tm, x, y + 10, c));
        } else if (c.n.equals("Mega Knight")) {
            ents.add(new Troop(tm, x, y, c));
            for (Entity e : ents)
                if (e.tm != tm && !e.fly && Math.hypot(e.x - x, e.y - y) < 100)
                    e.hp -= 100;
        } else if (c.t == 3) {
            ents.add(new Building(tm, x, y, c));
        } else if (c.n.equals("Royal Hogs")) {
            ents.add(new Troop(tm, x - 30, y, c));
            ents.add(new Troop(tm, x - 10, y, c));
            ents.add(new Troop(tm, x + 10, y, c));
            ents.add(new Troop(tm, x + 30, y, c));
        } else
            ents.add(new Troop(tm, x, y, c));
    }

    public Card getCard(String n) {
        for (Card c : allCards)
            if (c.n.equals(n))
                return c;
        return allCards.get(0);
    }

    public void endGame(int winner) {
        if (over)
            return;
        over = true;
        win = winner;
        gamesPlayed++;
        if (win == 0)
            gamesWon++;
        saveProgress();
    }

    public void upd() {
        long elapsed = System.currentTimeMillis() - gameStart;
        long remaining = 300000 - elapsed;
        if (remaining <= 120000 && !isDoubleElixir) {
            isDoubleElixir = true;
            doubleElixirAnim = 300;
        }
        if (remaining <= 0) {
            remaining = 0;
            tiebreaker = true;
        }

        if (doubleElixirAnim > 0)
            doubleElixirAnim--;

        if (t1K.hp <= 0 || t2K.hp <= 0) {
            endGame(t1K.hp <= 0 ? 1 : 0);
            return;
        }

        if (tiebreaker) {
            // Remove all troops and buildings (except towers)
            ents.removeIf(e -> !(e instanceof Tower));

            int t1Count = (t1K.hp > 0 ? 1 : 0) + (t1L.hp > 0 ? 1 : 0) + (t1R.hp > 0 ? 1 : 0);
            int t2Count = (t2K.hp > 0 ? 1 : 0) + (t2L.hp > 0 ? 1 : 0) + (t2R.hp > 0 ? 1 : 0);

            if (t1Count != t2Count) {
                endGame(t1Count > t2Count ? 0 : 1);
                return;
            }

            // Drain health
            for (Entity e : ents) {
                if (e instanceof Tower) {
                    e.hp -= 10;
                    if (e.hp <= 0) {
                        endGame(e.tm == 0 ? 1 : 0); // If p1 tower dies, p2 wins
                        return;
                    }
                }
            }
        }

        double rate = isDoubleElixir ? 0.02 : 0.01;
        p1.elx = Math.min(10, p1.elx + rate);
        p2.elx = Math.min(10, p2.elx + rate);

        aiTick++;

        t1K.actv = (t1K.hp < t1K.mhp) || (t1L.hp <= 0) || (t1R.hp <= 0);
        t2K.actv = (t2K.hp < t2K.mhp) || (t2L.hp <= 0) || (t2L.hp <= 0) || (t2R.hp <= 0);

        if (enemyAI != null)
            enemyAI.update();

        // STUCK PUSH: If inside building, push out
        for (Entity e : ents) {
            if (e instanceof Tower || e instanceof Building)
                continue;
            if (e.fly)
                continue;
            for (Entity b : ents) {
                if (b instanceof Tower) {
                    double hR = getHitboxRadius(b);
                    double cR = hR * 0.25;
                    double iB = hR - cR;

                    double cx = Math.max(b.x - iB, Math.min(b.x + iB, e.x));
                    double cy = Math.max(b.y - iB, Math.min(b.y + iB, e.y));

                    double dx = e.x - cx;
                    double dy = e.y - cy;
                    double dist = Math.hypot(dx, dy);

                    if (dist == 0 && Math.abs(e.x - b.x) < iB && Math.abs(e.y - b.y) < iB) {
                        double dL = Math.abs(e.x - (b.x - iB)), dR = Math.abs(e.x - (b.x + iB));
                        double dT = Math.abs(e.y - (b.y - iB)), dB = Math.abs(e.y - (b.y + iB));
                        double min = Math.min(Math.min(dL, dR), Math.min(dT, dB));
                        if (min == dL)
                            dx = -1;
                        else if (min == dR)
                            dx = 1;
                        else if (min == dT)
                            dy = -1;
                        else
                            dy = 1;
                        dist = 0.1;
                    }

                    double req = cR + getHitboxRadius(e) + 3; // Push 3 pixels outside
                    if (dist < req) {
                        double pen = req - dist;
                        double pushSpeed = pen / 12.0; // Resolve over ~0.2s
                        if (dist > 0) {
                            e.x += (dx / dist) * pushSpeed;
                            e.y += (dy / dist) * pushSpeed;
                        } else {
                            e.x += dx * pushSpeed;
                            e.y += dy * pushSpeed;
                        }
                    }
                } else if (b instanceof Building) {
                    double dist = e.dist(b);
                    double combinedHitbox = getHitboxRadius(e) + getHitboxRadius(b);
                    if (dist < combinedHitbox) {
                        double dx = e.x - b.x;
                        double dy = e.y - b.y;
                        double len = Math.hypot(dx, dy);
                        if (len == 0) {
                            dx = 1;
                            dy = 0;
                            len = 1;
                        }
                        e.x += (dx / len) * 2.0;
                        e.y += (dy / len) * 2.0;
                    }
                }
            }
        }

        // Physics: Pushing and Collision
        for (int i = 0; i < ents.size(); i++) {
            Entity a = ents.get(i);
            for (int j = i + 1; j < ents.size(); j++) {
                Entity b = ents.get(j);
                if (a.fly != b.fly)
                    continue;

                boolean aIsTower = a instanceof Tower;
                boolean bIsTower = b instanceof Tower;

                if (aIsTower || bIsTower) {
                    Entity t = aIsTower ? a : b;
                    Entity u = aIsTower ? b : a;
                    if (u instanceof Tower)
                        continue;

                    double hR = getHitboxRadius(t);
                    double cR = hR * 0.25;
                    double iB = hR - cR;
                    double cx = Math.max(t.x - iB, Math.min(t.x + iB, u.x));
                    double cy = Math.max(t.y - iB, Math.min(t.y + iB, u.y));
                    double dx = u.x - cx, dy = u.y - cy;
                    double dist = Math.hypot(dx, dy);
                    double req = cR + getHitboxRadius(u);

                    if (dist < req) {
                        double pen = req - dist;
                        if (dist == 0) {
                            dx = rand.nextDouble() - 0.5;
                            dy = rand.nextDouble() - 0.5;
                            dist = 0.1;
                        }
                        u.x += (dx / dist) * pen;
                        u.y += (dy / dist) * pen;
                    }
                    continue;
                }

                boolean aIsBuilding = a instanceof Building;
                boolean bIsBuilding = b instanceof Building;

                double radA = aIsBuilding ? getHitboxRadius(a) : a.rad;
                double radB = bIsBuilding ? getHitboxRadius(b) : b.rad;

                double dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy, r = radA + radB;
                if (d2 < r * r) {
                    double d = Math.sqrt(d2);
                    double pen = r - d; // Full penetration depth for immediate resolution
                    if (d == 0) {
                        d = 0.1;
                        dx = rand.nextDouble() - 0.5;
                        dy = rand.nextDouble() - 0.5;
                    }

                    // Strict Mass Priority
                    if (a.mass > b.mass) {
                        // A is heavier, B moves full amount
                        b.x -= (dx / d) * pen;
                        b.y -= (dy / d) * pen;
                    } else if (b.mass > a.mass) {
                        // B is heavier, A moves full amount
                        a.x += (dx / d) * pen;
                        a.y += (dy / d) * pen;
                    } else {
                        // Equal mass, both move half
                        double halfPen = pen / 2.0;
                        a.x += (dx / d) * halfPen;
                        a.y += (dy / d) * halfPen;
                        b.x -= (dx / d) * halfPen;
                        b.y -= (dy / d) * halfPen;
                    }
                }
            }
        }

        for (Entity e : ents) {
            if (e.fr > 0)
                e.fr--;
            if (e.rt > 0)
                e.rt--;
            if (e instanceof Building) {
                // Building decay handled in act()
            }
            if (!(e instanceof Tower) && !(e instanceof Building)) {
                double visualR = e.rad;
                e.x = Math.max(visualR, Math.min(W - visualR, e.x));
                e.y = Math.max(visualR, Math.min(H - 140 - visualR, e.y));
                if (e.y + visualR > RIV_Y - 15 && e.y - visualR < RIV_Y + 15 && !e.fly) {
                    if (!((e.x >= W / 4 - 25 && e.x <= W / 4 + 25) || (e.x >= W * 3 / 4 - 25 && e.x <= W * 3 / 4 + 25)))
                        e.y = e.y < RIV_Y ? RIV_Y - 15 - visualR : RIV_Y + 15 + visualR;
                }
            }
            if (e.fr <= 0 && e.hp > 0)
                e.act(this);
            if (e.hp <= 0) {
                e.die(this);
                ents.remove(e);
            }
        }

        // Update Projectiles (Safe Loop)
        for (int i = 0; i < projs.size(); i++) {
            Proj p = projs.get(i);
            p.upd(this);
            if (p.life <= 0) {
                projs.remove(i);
                i--;
            }
        }
    }
}
