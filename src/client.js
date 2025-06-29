
const WebSocket = require('ws');
const si = require('systeminformation');

const HOST_URL = 'ws://localhost:8080';
const CLIENT_NAME = `Client-${Math.random().toString(36).substring(2, 7)}`;

let ws = null;
let reconnectInterval = 1000; // 1秒から開始
const maxReconnectInterval = 30000; // 最大30秒

async function getSystemInfo() {
    const cpu = await si.currentLoad();
    const mem = await si.mem();
    const fsSize = await si.fsSize();
    const netStats = await si.networkStats();

    return {
        cpu: cpu.currentLoad.toFixed(2),
        mem: ((mem.used / mem.total) * 100).toFixed(2),
        disk: fsSize.length > 0 ? ((fsSize[0].used / fsSize[0].size) * 100).toFixed(2) : 'N/A',
        net: netStats.length > 0 ? { rx: netStats[0].rx_sec, tx: netStats[0].tx_sec } : 'N/A'
    };
}

function connect() {
    ws = new WebSocket(HOST_URL);

    ws.onopen = () => {
        console.log(`[Client] Connected to host as ${CLIENT_NAME}`);
        reconnectInterval = 1000; // 接続成功したらリセット
        
        // 5秒ごとに自身の状態とシステム情報を送信する
        setInterval(async () => {
            const systemInfo = await getSystemInfo();
            const message = {
                name: CLIENT_NAME,
                status: 'Online',
                log: `[INFO] Client ${CLIENT_NAME} is running. Uptime: ${process.uptime().toFixed(2)}s`,
                timestamp: new Date().toISOString(),
                systemInfo: systemInfo
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
