const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8000;
const BIN_DIR = path.join(__dirname, 'bin');
const SAVE_FILE = path.join(BIN_DIR, 'save.json');

// Ensure bin directory exists
if (!fs.existsSync(BIN_DIR)) {
    fs.mkdirSync(BIN_DIR);
}

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.woff': 'application/font-woff',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'application/font-otf',
    '.svg': 'application/image/svg+xml'
};

// --- MULTIPLAYER LOGIC ---
const rooms = {}; // { code: { clients: [], lastAction: null } }

function generateCode() {
    let code;
    do {
        code = Math.floor(10000 + Math.random() * 90000).toString();
    } while (rooms[code]);
    return code;
}

const server = http.createServer((req, res) => {
    // CORS headers for all responses
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    console.log(`${req.method} ${req.url}`);

    // --- API ROUTES ---

    // Create Room
    if (req.url === '/api/create' && req.method === 'POST') {
        const code = generateCode();
        rooms[code] = { clients: [] };
        console.log(`Room created: ${code}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, code: code }));
        return;
    }

    // Join Room (SSE)
    if (req.url.startsWith('/api/join') && req.method === 'GET') {
        const urlParams = new URL(req.url, `http://${req.headers.host}`).searchParams;
        const code = urlParams.get('code');

        if (!code || !rooms[code]) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: "Room not found" }));
            return;
        }

        if (rooms[code].clients.length >= 2) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: "Room full" }));
            return;
        }

        // SSE Setup
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });

        const clientId = Date.now();
        const newClient = {
            id: clientId,
            res: res
        };
        rooms[code].clients.push(newClient);

        const playerIndex = rooms[code].clients.length - 1; // 0 or 1
        console.log(`Client ${clientId} joined room ${code} as P${playerIndex}`);

        // Notify client of their index logic could go here if needed, 
        // but for now we just verify connection.
        res.write(`data: ${JSON.stringify({ type: 'joined', playerIndex: playerIndex })}\n\n`);

        // If 2 players, notify start
        if (rooms[code].clients.length === 2) {
            rooms[code].clients.forEach(c => {
                c.res.write(`data: ${JSON.stringify({ type: 'start' })}\n\n`);
            });
        }

        // Cleanup on close
        req.on('close', () => {
            console.log(`Client ${clientId} disconnected from room ${code}`);
            if (rooms[code]) {
                rooms[code].clients = rooms[code].clients.filter(c => c.id !== clientId);
                if (rooms[code].clients.length === 0) {
                    delete rooms[code];
                    console.log(`Room ${code} deleted (empty)`);
                } else {
                    // Notify remaining player
                    rooms[code].clients.forEach(c => {
                        c.res.write(`data: ${JSON.stringify({ type: 'opponent_disconnected' })}\n\n`);
                    });
                }
            }
        });
        return;
    }

    // Action (Spawn)
    if (req.url === '/api/action' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const code = data.code;

                if (rooms[code]) {
                    // Broadcast to ALL other clients in room
                    rooms[code].clients.forEach(c => {
                        // In a real app we might exclude sender, but simplistic logic is fine:
                        // Front-end can ignore its own echoes if we send sender ID, 
                        // OR we just broadcast and frontend handles logic.
                        // Better: Exclude sender? 
                        // Since we don't track sender easily without auth token, 
                        // let's just broadcast to everyone and let frontend filter if needed.
                        // actually, we can't easily filter sender without ID.
                        // Let's send to all.
                        c.res.write(`data: ${JSON.stringify({ type: 'action', data: data })}\n\n`);
                    });
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } else {
                    res.writeHead(404);
                    res.end(JSON.stringify({ success: false, message: "Room not found" }));
                }
            } catch (e) {
                res.writeHead(400);
                res.end(JSON.stringify({ success: false, error: e.message }));
            }
        });
        return;
    }

    // Save/Load API (Existing)
    if (req.url === '/api/save' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                // Verify and Format JSON
                const parsed = JSON.parse(body);
                fs.writeFileSync(SAVE_FILE, JSON.stringify(parsed, null, 4));
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (err) {
                console.error("Save error:", err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
        return;
    }

    if (req.url === '/api/load' && req.method === 'GET') {
        if (fs.existsSync(SAVE_FILE)) {
            const data = fs.readFileSync(SAVE_FILE);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(data);
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: "No save file" }));
        }
        return;
    }

    if (req.url === '/api/delete' && req.method === 'POST') {
        if (fs.existsSync(SAVE_FILE)) {
            fs.unlinkSync(SAVE_FILE);
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
        return;
    }

    // Static File Serving
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './index.html';
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404);
                res.end('404 Not Found');
            } else {
                res.writeHead(500);
                res.end('500 Internal Server Error: ' + error.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log(`Save file location: ${SAVE_FILE}`);
});
