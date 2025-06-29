const express = require('express');
const http = require('http');
const path = require('path');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);

// publicディレクトリの静的ファイルを提供
const publicPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicPath));

const wss = new WebSocket.Server({ server });

// 接続されているWebUIクライアントを保持するSet
const uiClients = new Set();
// サーバーの状態を保持するMap
const serverStatus = new Map();

function broadcastToUI(data) {
    const jsonData = JSON.stringify(Array.from(serverStatus.values()));
    uiClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(jsonData);
        }
    });
}

wss.on('connection', (ws, req) => {
    // 接続元を区別する（例：URLのクエリパラメータを使用）
    const clientType = new URL(req.url, `http://${req.headers.host}`).searchParams.get('type');

    if (clientType === 'ui') {
        console.log('WebUI client connected');
        uiClients.add(ws);
        
        // 接続時に現在のサーバーリストを送信
        ws.send(JSON.stringify(Array.from(serverStatus.values())));

        ws.on('close', () => {
            console.log('WebUI client disconnected');
            uiClients.delete(ws);
        });

    } else { // Zoaholicクライアント
        console.log('Zoaholic client connected');
        let clientId = null;

        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message);
                clientId = data.name; // クライアントの識別に名前を使用
                console.log(`Message from ${clientId}:`, data);
                
                // サーバーの状態を更新
                serverStatus.set(clientId, data);
                
                // 更新を全WebUIにブロードキャスト
                broadcastToUI();

            } catch (error) {
                console.error('Failed to parse message:', message, error);
            }
        });

        ws.on('close', () => {
            console.log(`Zoaholic client ${clientId} disconnected`);
            if (clientId) {
                serverStatus.delete(clientId);
                // 更新を全WebUIにブロードキャスト
                broadcastToUI();
            }
        });
    }

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
    console.log(`WebUI available at http://localhost:${PORT}`);
});