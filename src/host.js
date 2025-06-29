const express = require('express');
const http = require('http');
const path = require('path');
const WebSocket = require('ws');
const fs = require('fs');

const app = express();
const server = http.createServer(app);

// publicディレクトリの静的ファイルを提供
const publicPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicPath));

// ログファイルのパスを設定
const LOG_DIR = path.join(__dirname, '..', 'logs');
const CLIENT_LOG_FILE = path.join(LOG_DIR, 'client_messages.log');

// ログディレクトリが存在しない場合は作成
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR);
}

const wss = new WebSocket.Server({ server });

// 接続されているWebUIクライアントを保持するSet
const uiClients = new Set();
// 接続されているZoaholicクライアントのWebSocketを保持するMap
const zoaholicClients = new Map(); // Key: clientId, Value: WebSocket
// サーバーの状態を保持するMap
const serverStatus = new Map();

function broadcastToUI() {
    const jsonData = JSON.stringify(Array.from(serverStatus.values()));
    uiClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(jsonData);
        }
    });
}

wss.on('connection', (ws, req) => {
    const clientType = new URL(req.url, `http://${req.headers.host}`).searchParams.get('type');

    if (clientType === 'ui') {
        console.log('[Host] WebUI client connected');
        uiClients.add(ws);
        
        // 接続時に現在のサーバーリストを送信
        ws.send(JSON.stringify(Array.from(serverStatus.values())));

        ws.on('close', () => {
            console.log('[Host] WebUI client disconnected');
            uiClients.delete(ws);
        });

    } else { // Zoaholicクライアント
        let clientId = null;
        console.log('[Host] Zoaholic client connected');

        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message);
                if (data.name) {
                    clientId = data.name; // クライアントの識別に名前を使用
                    zoaholicClients.set(clientId, ws); // WebSocketを保存
                    console.log(`[Host] Message from ${clientId}:`, data);
                    
                    // サーバーの状態を更新
                    serverStatus.set(clientId, data);
                    
                    // 更新を全WebUIにブロードキャスト
                    broadcastToUI();

                    // ログをファイルに保存
                    fs.appendFile(CLIENT_LOG_FILE, JSON.stringify(data) + '\n', (err) => {
                        if (err) {
                            console.error('[Host] Failed to write log to file:', err);
                        }
                    });

                } else {
                    console.warn('[Host] Received message without client name:', data);
                }

            } catch (error) {
                console.error('[Host] Failed to parse message:', message, error);
            }
        });

        ws.on('close', () => {
            if (clientId) {
                console.log(`[Host] Zoaholic client ${clientId} disconnected`);
                zoaholicClients.delete(clientId); // WebSocketを削除
                // クライアントが切断されたらステータスをOfflineに更新
                const disconnectedClient = serverStatus.get(clientId);
                if (disconnectedClient) {
                    disconnectedClient.status = 'Offline';
                    disconnectedClient.log = 'Client disconnected.';
                    disconnectedClient.mode = 'Offline'; // モードもOfflineに
                    serverStatus.delete(clientId); // 切断されたクライアントをリストから削除
                }
                // 更新を全WebUIにブロードキャスト
                broadcastToUI();
            } else {
                console.log('[Host] An unknown Zoaholic client disconnected');
            }
        });
    }

    ws.on('error', (error) => {
        console.error('[Host] WebSocket error:', error.message);
    });
});

// アップデートトリガー用のHTTPエンドポイント
app.post('/update/:clientName', (req, res) => {
    const clientName = req.params.clientName;
    const clientWs = zoaholicClients.get(clientName);

    if (clientWs && clientWs.readyState === WebSocket.OPEN) {
        const updateCommand = {
            type: 'command',
            command: 'update',
            payload: { message: `Update requested for ${clientName}` }
        };
        clientWs.send(JSON.stringify(updateCommand));
        res.status(200).send(`Update command sent to ${clientName}`);
        console.log(`[Host] Update command sent to ${clientName}`);
    } else {
        res.status(404).send(`Client ${clientName} not found or not connected.`);
        console.warn(`[Host] Failed to send update command: Client ${clientName} not found or not connected.`);
    }
});

// ホストプラグインのロード
const HOST_PLUGINS_DIR = path.join(__dirname, '..', 'plugins', 'host');
if (fs.existsSync(HOST_PLUGINS_DIR)) {
    fs.readdirSync(HOST_PLUGINS_DIR).forEach(file => {
        if (file.endsWith('.js')) {
            try {
                const plugin = require(path.join(HOST_PLUGINS_DIR, file));
                if (plugin.init && typeof plugin.init === 'function') {
                    plugin.init(app); // Expressアプリインスタンスを渡す
                }
            } catch (error) {
                console.error(`[Host] Failed to load host plugin ${file}:`, error);
            }
        }
    });
}

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`[Host] Server started on port ${PORT}`);
    console.log(`[Host] WebUI available at http://localhost:${PORT}`);
    console.log(`[Host] To trigger update: POST http://localhost:${PORT}/update/:clientName`);
});