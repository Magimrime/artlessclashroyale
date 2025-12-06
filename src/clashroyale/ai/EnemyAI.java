package clashroyale.ai;

import clashroyale.core.GameEngine;
import clashroyale.core.Player;
import clashroyale.entities.*;
import clashroyale.models.Card;
import java.util.*;

public class EnemyAI {
    private GameEngine g;
    private Player p;
    private int aiTick = 0;
    private Random rand = new Random();

    public EnemyAI(GameEngine g) {
        this.g = g;
        this.p = g.p2;
    }

    public void generateDeck() {
        List<Card> deck = new ArrayList<>();
        List<Card> pool = new ArrayList<>(g.allCards);
        
        // If user selected some cards, keep them
        if (!g.enemyDeckSelection.isEmpty()) {
            deck.addAll(g.enemyDeckSelection);
        }

        // Rules:
        // 1. Win Condition (Building Targeter)
        if (!hasWinCondition(deck)) {
            Card winCon = findCard(pool, c -> c.t == 1 && !c.n.equals("Miner") && !c.n.equals("Goblin Barrel")); // Simplified check for building targeter
            if (winCon != null) addCard(deck, winCon);
        }

        // 2. Two Spells
        while (countType(deck, 2) < 2) {
            Card spell = findCard(pool, c -> c.t == 2);
            if (spell != null) addCard(deck, spell);
            else break;
        }

        // 3. 1 Elixir Card or Mini Tank
        if (!hasCheapOrMiniTank(deck)) {
            Card cheap = findCard(pool, c -> c.c <= 2 || (c.hp > 800 && c.c <= 4));
            if (cheap != null) addCard(deck, cheap);
        }

        // 4. Ranged Unit
        if (!hasRanged(deck)) {
            Card ranged = findCard(pool, c -> c.rn > 2 && c.t == 0);
            if (ranged != null) addCard(deck, ranged);
        }

        // 5. Building
        if (!hasBuilding(deck)) {
            Card building = findCard(pool, c -> c.t == 3);
            if (building != null) addCard(deck, building);
        }

        // 6. Area Damage
        if (!hasAreaDamage(deck)) {
            Card splash = findCard(pool, c -> c.ar);
            if (splash != null) addCard(deck, splash);
        }

        // Fill remaining slots with random cards
        while (deck.size() < 8) {
            if (pool.isEmpty()) break; // Should not happen
            Card random = pool.get(rand.nextInt(pool.size()));
            addCard(deck, random);
        }

        // Set the deck
        p.pile.clear();
        p.h.clear();
        p.pile.addAll(deck);
        Collections.shuffle(p.pile);
        for (int i = 0; i < 4 && !p.pile.isEmpty(); i++) p.h.add(p.pile.remove(0));
    }

    private boolean hasWinCondition(List<Card> deck) {
        for (Card c : deck) if (c.t == 1) return true; // Building targeter
        return false;
    }

    private int countType(List<Card> deck, int type) {
        int count = 0;
        for (Card c : deck) if (c.t == type) count++;
        return count;
    }

    private boolean hasCheapOrMiniTank(List<Card> deck) {
        for (Card c : deck) if (c.c <= 2 || (c.hp > 800 && c.c <= 4)) return true;
        return false;
    }

    private boolean hasRanged(List<Card> deck) {
        for (Card c : deck) if (c.rn > 2 && c.t == 0) return true;
        return false;
    }

    private boolean hasBuilding(List<Card> deck) {
        for (Card c : deck) if (c.t == 3) return true;
        return false;
    }

    private boolean hasAreaDamage(List<Card> deck) {
        for (Card c : deck) if (c.ar) return true;
        return false;
    }

    private Card findCard(List<Card> pool, java.util.function.Predicate<Card> condition) {
        List<Card> candidates = new ArrayList<>();
        for (Card c : pool) if (condition.test(c)) candidates.add(c);
        if (candidates.isEmpty()) return null;
        return candidates.get(rand.nextInt(candidates.size()));
    }

    private void addCard(List<Card> deck, Card c) {
        if (!deck.contains(c)) deck.add(c);
    }

    public void update() {
        if (g.over || g.tiebreaker) return;
        aiTick++;

        // Logic for specific cards
        // Elixir Collector: Play behind towers
        if (p.elx >= 6) {
            Card pump = getAICard("Elixir Collector");
            if (pump != null) {
                // Check if safe (no miners/spells incoming - simplified to just checking if towers are healthy)
                if (g.t1K.hp > 2000) {
                    playAI(pump, GameEngine.W / 2 + (rand.nextBoolean() ? 20 : -20), 30); // Behind King
                    return;
                }
            }
        }

        // Clone: Only if troops are present
        if (p.elx >= 3) {
            Card clone = getAICard("Clone");
            if (clone != null) {
                // Find best cluster
                Entity bestTarget = null;
                int maxCount = 0;
                for (Entity e : g.ents) {
                    if (e.tm == 1 && e instanceof Troop && !((Troop)e).isClone) {
                        int count = 0;
                        for (Entity neighbor : g.ents) {
                            if (neighbor.tm == 1 && neighbor instanceof Troop && !((Troop)neighbor).isClone && e.dist(neighbor) < 80) {
                                count++;
                            }
                        }
                        if (count >= 2 && count > maxCount) { // At least 2 troops
                            maxCount = count;
                            bestTarget = e;
                        }
                    }
                }
                if (bestTarget != null) {
                    playAI(clone, bestTarget.x, bestTarget.y);
                    return;
                }
            }
        }

        // Tank Support Logic
        // If we have a tank in hand, wait for more elixir to support it
        Card tank = getTankInHand();
        if (tank != null && p.elx < 9.5) {
             // Don't play tank yet unless we are leaking elixir
             // But if we have a support card and a tank on the field, play support
             Entity tankOnField = getTankOnField();
             if (tankOnField != null) {
                 Card support = getSupportCard();
                 if (support != null && p.elx >= support.c) {
                     playAI(support, tankOnField.x, tankOnField.y - 40);
                     return;
                 }
             }
        }

        // Force play if elixir is high
        if (p.elx >= 9.5) {
            boolean played = false;
            for (Card c : p.h) {
                if (c.t != 2 && c.c <= p.elx) {
                    double playX = GameEngine.W / 2 + (Math.random() > 0.5 ? 50 : -50);
                    double playY = 100; 
                    if (c.t == 1 && c.hp > 1000) playY = 50; // Tank in back
                    else if (c.t == 1) playY = GameEngine.RIV_Y - 60; // Building targeter at bridge
                    
                    if (g.isValid((int)playY, (int)playX, c)) {
                        playAI(c, playX, playY);
                        played = true;
                        break;
                    }
                }
            }
            
            if (!played) {
                // Try spells if no troops playable
                for (Card c : p.h) {
                    if (c.t == 2 && c.c <= p.elx) {
                        // Simple spell targeting
                         Tower target = (g.t1L.hp > 0) ? g.t1L : g.t1R;
                         if (target.hp <= 0) target = g.t1K;
                         playAI(c, target.x, target.y);
                         played = true;
                         break;
                    }
                }
            }
        }

        // Defensive Logic (Simplified from previous GameEngine)
        if (aiTick % 60 == 0) { 
            List<Entity> threats = new ArrayList<>();
            for (Entity e : g.ents) if (e.tm == 0 && e instanceof Troop && e.y < GameEngine.RIV_Y + 50) threats.add(e);

            if (!threats.isEmpty() && p.elx >= 3) {
                Entity threat = threats.get(0);
                Card counter = null;
                
                // ... (Counter logic can be refined here, kept simple for now to focus on structure)
                // Basic counter pick
                for (Card c : p.h) {
                    if (c.c <= p.elx && c.t != 2 && c.t != 3) { // Pick a troop
                        counter = c;
                        break;
                    }
                }

                if (counter != null) {
                    playAI(counter, threat.x, threat.y - 40);
                    return;
                }
            }
        }
    }

    private Card getTankInHand() {
        for (Card c : p.h) if (c.hp > 2000 && c.t == 1) return c;
        return null;
    }

    private Entity getTankOnField() {
        for (Entity e : g.ents) if (e.tm == 1 && e.hp > 1000 && e instanceof Troop) return e;
        return null;
    }

    private Card getSupportCard() {
        for (Card c : p.h) if ((c.rn > 3 || c.ar) && c.c <= 5) return c;
        return null;
    }

    private Card getAICard(String name) {
        for (Card c : p.h) if (c.n.equals(name)) return c;
        return null;
    }

    private void playAI(Card c, double x, double y) {
        if (c.t != 2 && !c.n.equals("Goblin Barrel") && y > GameEngine.RIV_Y - 40) return;
        p.elx -= c.c;
        g.addU(1, c, x, y);
        p.h.remove(c);
        p.pile.add(c);
        p.h.add(p.pile.remove(0));
    }
}
