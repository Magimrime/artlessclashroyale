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

            this.peer.on('open', (id) => {
                console.log('Joined with Peer ID: ' + id);
                // Connect to Host
                const hostId = `clash-clone-gemini-${code}`;
                console.log(`Connecting to ${hostId}...`);

                const conn = this.peer.connect(hostId);

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
        this.conn = conn;

        this.conn.on('data', (data) => {
            console.log("Received data:", data);
            this.handleMessage(data);
        });

        this.conn.on('close', () => {
            console.log("Connection closed");
            if (this.onOpponentDisconnected) this.onOpponentDisconnected();
        });

        // If Host, we are now "Joined" (connected to a peer)
        // If Joiner, we are also "Joined"
        // Let's trigger onJoined for UI updates if needed, but mainly we wait for Start.

        // Handshake / Ready check?
        // Let's just say once connected, we are ready.
        // Host sends "start" message to Joiner?

        if (this.isHost) {
            // Wait a sec then start? Or just start immediately.
            setTimeout(() => {
                this.send({ type: 'start' });
                if (this.onStart) this.onStart();
            }, 500);
        }
    }

    handleMessage(msg) {
        if (msg.type === 'start') {
            if (this.onStart) this.onStart();
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
