const WebSocket = require('ws');

const HOST_URL = 'ws://localhost:8080';
const CLIENT_NAME = `Client-${Math.random().toString(36).substring(2, 7)}`;

let ws = null;
let reconnectInterval = 1000; // 1秒から開始
const maxReconnectInterval = 30000; // 最大30秒

function connect() {
    ws = new WebSocket(HOST_URL);

    ws.onopen = () => {
        console.log(`[Client] Connected to host as ${CLIENT_NAME}`);
        reconnectInterval = 1000; // 接続成功したらリセット
        
        // 5秒ごとに自身の状態を送信する
        setInterval(() => {
            const message = {
                name: CLIENT_NAME,
                status: 'Online', // 'Offline', 'Warning' など
                log: `[INFO] Client ${CLIENT_NAME} is running. Uptime: ${process.uptime().toFixed(2)}s`,
                timestamp: new Date().toISOString()
            };
            ws.send(JSON.stringify(message));
        }, 5000);
    };

    ws.onmessage = (message) => {
        console.log(`[Client] Message from host: ${message.data}`);
    };

    ws.onclose = () => {
        console.log(`[Client] Disconnected from host. Reconnecting in ${reconnectInterval / 1000}s...`);
        setTimeout(connect, reconnectInterval);
        reconnectInterval = Math.min(reconnectInterval * 2, maxReconnectInterval); // 指数関数的に増加
    };

    ws.onerror = (error) => {
        console.error(`[Client] WebSocket error for ${CLIENT_NAME}:`, error.message);
        ws.close(); // エラー発生時はクローズして再接続を試みる
    };
}

connect();

console.log(`[Client] Starting ${CLIENT_NAME}...`);