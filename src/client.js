
const WebSocket = require('ws');

const HOST_URL = 'ws://localhost:8080';
const CLIENT_NAME = `Client-${Math.random().toString(36).substring(2, 7)}`;

function connect() {
    // Zoaholicクライアントとして接続
    const ws = new WebSocket(HOST_URL);

    ws.on('open', () => {
        console.log(`Connected to host as ${CLIENT_NAME}`);
        
        // 5秒ごとに自身の状態を送信する
        setInterval(() => {
            const message = {
                name: CLIENT_NAME,
                status: 'Online', // 'Offline', 'Warning' など
                log: `All systems normal. Timestamp: ${new Date().toLocaleTimeString()}`,
            };
            ws.send(JSON.stringify(message));
        }, 5000);
    });

    ws.on('message', (message) => {
        console.log(`Message from host: ${message}`);
    });

    ws.on('close', () => {
        console.log('Disconnected from host. Reconnecting...');
        setTimeout(connect, 3000);
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error.message);
        ws.close();
    });
}

connect();

console.log(`Starting ${CLIENT_NAME}...`);
