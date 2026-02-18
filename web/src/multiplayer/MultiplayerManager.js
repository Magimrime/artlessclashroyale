import RemoteInputHandler from './RemoteInputHandler.js';

export default class MultiplayerManager {
    constructor(gameEngine) {
        this.eng = gameEngine;
        this.remoteHandler = new RemoteInputHandler(this.eng);

        this.peer = null;
        this.conn = null;
        this.code = null;
        this.isHost = false;

        // Callbacks
        this.onJoined = null;
        this.onStart = null;
        this.onState = null;
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
        console.log("SetupConnection called for:", conn.peer);
        try {
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
                // console.log("Received data:", data); // Verbose
                this.handleMessage(data);
            });

            this.conn.on('close', () => {
                console.log("Connection closed");
                if (this.onOpponentDisconnected) this.onOpponentDisconnected();
            });

            if (this.isHost) {
                console.log("Host: Verify Connection established. Scheduling start...");
                setTimeout(() => {
                    console.log("Host: Starting Game Sequence...");
                    this.gameStarted = true;
                    this.send({ type: 'start', seed: this.seed }); // Send Seed
                    if (this.onStart) {
                        this.onStart(this.seed);
                    } else {
                        console.error("MP Error: onStart callback not set!");
                    }
                }, 500);
            }
        } catch (e) {
            console.error("SetupConnection CRASH:", e);
        }
    }

    handleMessage(msg) {
        if (msg.type === 'start') {
            this.seed = msg.seed;
            if (this.onStart) this.onStart(this.seed);
        } else if (msg.type === 'curr_state') {
            if (this.onState) this.onState(msg.state);
        } else if (msg.type === 'spawn') {
            // Host handles spawn request securely via RemoteHandler
            if (this.isHost) {
                this.remoteHandler.handleSpawn(msg.cardName, msg.x, msg.y, msg.team);
            }
        } else if (msg.type === 'error') {
            alert(msg.message);
        } else {
            if (this.onAction) this.onAction(msg);
        }
    }

    send(data) {
        if (this.conn && this.conn.open) {
            this.conn.send(data);
        }
    }

    broadcastState(stateData) {
        if (this.conn && this.conn.open) {
            this.send({ type: 'curr_state', state: stateData });
        }
    }

    sendSpawn(cardName, x, y, team) {
        this.send({
            type: 'spawn',
            cardName: cardName,
            x: x,
            y: y,
            team: team
        });
    }

    close() {
        if (this.conn) this.conn.close();
        if (this.peer) this.peer.destroy();
        this.conn = null;
        this.peer = null;
    }
}
