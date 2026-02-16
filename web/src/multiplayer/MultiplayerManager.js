export default class MultiplayerManager {
    constructor() {
        this.peer = null;
        this.conn = null;
        this.code = null;
        this.isHost = false;

        // Callbacks
        this.onJoined = null;
        this.onStart = null;
        this.onAction = null;
        this.onOpponentDisconnected = null;

        this.userId = localStorage.getItem('clash_user_id');
        if (!this.userId) {
            this.userId = 'user_' + Math.floor(Math.random() * 1000000000);
            localStorage.setItem('clash_user_id', this.userId);
        }
        console.log("My User ID:", this.userId);

        this.seed = null;
        this.gameStarted = false;
    }

    createGame(callback) {
        this.code = Math.floor(10000 + Math.random() * 90000).toString();
        this.isHost = true;

        // ID format: clash-clone-gemini-{CODE}
        // Using a common prefix helps, but PeerJS IDs must be unique. 
        // We hope the random 5-digit code is unique enough for this demo.
        const peerId = `clash-clone-gemini-${this.code}`;

        console.log(`Initializing Peer with ID: ${peerId}`);

        try {
            this.peer = new Peer(peerId, {
                debug: 2
            });

            this.gameStarted = false;
            this.seed = Math.floor(Math.random() * 2147483647);

            this.peer.on('open', (id) => {
                console.log('My peer ID is: ' + id);
                if (callback) callback(true, this.code);
            });

            this.peer.on('connection', (conn) => {
                console.log("Incoming connection...");
                this.setupConnection(conn);
            });

            this.peer.on('error', (err) => {
                console.error("PeerJS Error:", err);
                if (callback) callback(false, err.type);
            });

        } catch (e) {
            console.error("PeerJS Init Failed:", e);
            if (callback) callback(false, e.message);
        }
    }

    joinGame(code, callback) {
        this.code = code;
        this.isHost = false;

        try {
            this.peer = new Peer(); // Random ID for joiner

            this.gameStarted = false;

            this.peer.on('open', (id) => {
                console.log('Joined with Peer ID: ' + id);
                // Connect to Host
                const hostId = `clash-clone-gemini-${code}`;
                // Send User ID in metadata
                const conn = this.peer.connect(hostId, {
                    metadata: { userId: this.userId }
                });

                conn.on('open', () => {
                    console.log("Connected to Host!");
                    this.setupConnection(conn);
                    if (callback) callback(true);
                });

                conn.on('error', (err) => {
                    console.error("Connection Error:", err);
                    if (callback) callback(false, "Connection failed");
                });
            });

            this.peer.on('error', (err) => {
                console.error("PeerJS Error:", err);
                if (callback) callback(false, err.type);
            });

        } catch (e) {
            console.error("PeerJS Join Failed:", e);
            if (callback) callback(false, e.message);
        }
    }

    setupConnection(conn) {
        // Check restrictions (only relevant for Host receiving connection)
        if (this.isHost) {
            if (this.gameStarted || (this.conn && this.conn.open && this.conn !== conn)) {
                console.warn("Rejecting connection: Game already full or started.");
                conn.send({ type: 'error', message: "Game already started or full." });
                setTimeout(() => conn.close(), 500);
                return;
            }

            if (conn.metadata && conn.metadata.userId === this.userId) {
                console.warn("Rejecting connection: Same User ID.");
                conn.send({ type: 'error', message: "Cannot play against yourself!" });
                setTimeout(() => conn.close(), 500);
                return;
            }
        }

        this.conn = conn;

        this.conn.on('data', (data) => {
            console.log("Received data:", data);
            this.handleMessage(data);
        });

        this.conn.on('close', () => {
            console.log("Connection closed");
            if (this.onOpponentDisconnected) this.onOpponentDisconnected();
        });

        if (this.isHost) {
            // Wait a sec then start? Or just start immediately.
            setTimeout(() => {
                this.gameStarted = true;
                this.send({ type: 'start', seed: this.seed }); // Send Seed
                if (this.onStart) this.onStart(this.seed);
            }, 500);
        }
    }

    handleMessage(msg) {
        if (msg.type === 'start') {
            this.seed = msg.seed;
            this.gameStarted = true;
            if (this.onStart) this.onStart(this.seed);
        } else if (msg.type === 'error') {
            alert("Error: " + msg.message);
            this.close();
        } else if (msg.type === 'spawn') {
            // Mirror actions
            // { type: 'spawn', cardName: '...', x: 100, y: 200, team: 0 }
            // Receiver (Team 1) needs to see it as Team 1.
            // But sender sent it as Team 0 (their perspective).
            // Main.js/GameEngine.js handles the coordinate flip in `spawnRemote`.
            // Here we just pass data.
            if (this.onAction) this.onAction(msg);
        }
    }

    sendSpawn(cardName, x, y, team) {
        if (this.conn && this.conn.open) {
            this.send({
                type: 'spawn',
                cardName: cardName,
                x: x,
                y: y,
                team: team
            });
        }
    }

    send(data) {
        if (this.conn && this.conn.open) {
            this.conn.send(data);
        }
    }

    close() {
        if (this.conn) this.conn.close();
        if (this.peer) this.peer.destroy();
        this.conn = null;
        this.peer = null;
    }
}
