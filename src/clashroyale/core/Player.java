package clashroyale.core;

import clashroyale.models.Card;
import java.util.ArrayList;
import java.util.List;

public class Player {
    public int tm;
    public double elx = 5;
    public List<Card> h = new ArrayList<>();
    public List<Card> pile = new ArrayList<>();
    public Card lastPlayedCard = null;

    public Player(int t) {
        this.tm = t;
    }
}
