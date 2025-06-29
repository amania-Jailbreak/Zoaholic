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
        uiClients.add(ws);
        
        // 接続時に現在のサーバーリストを送信
        ws.send(JSON.stringify(Array.from(serverStatus.values())));

        ws.on('close', () => {
            uiClients.delete(ws);
        });

    } else { // Zoaholicクライアント
        let clientId = null;

        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message);
                
                if (data.type === 'plugin_data') {
                    // プラグインからのデータ
                    const existingStatus = serverStatus.get(data.name);
                    if (existingStatus) {
                        existingStatus.plugins = existingStatus.plugins || {};
                        existingStatus.plugins[data.pluginName] = data.data;
                        serverStatus.set(data.name, existingStatus);
                        broadcastToUI();
                    }
                } else if (data.name) {
                    // 通常のクライアントステータス
                    clientId = data.name; // クライアントの識別に名前を使用
                    zoaholicClients.set(clientId, ws); // WebSocketを保存
                    
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
            }
        });
    }

    ws.on('error', (error) => {
        console.error('[Host] WebSocket error:', error.message);
    });
});

// ExpressのJSONボディパーサーを有効にする
app.use(express.json());

// アップデートトリガー用のHTTPエンドポイント
app.post('/update/:clientName', (req, res) => {
    console.log('[Host] Received update request. req.body:', req.body); // デバッグログを追加
    const clientName = req.params.clientName;
    const clientWs = zoaholicClients.get(clientName);
    const { repoUrl, files } = req.body; // リクエストボディからrepoUrlとfilesを取得

    if (!repoUrl || !files || !Array.isArray(files) || files.length === 0) {
        return res.status(400).send('Missing repoUrl or files in request body.');
    }

    if (clientWs && clientWs.readyState === WebSocket.OPEN) {
        const updateCommand = {
            type: 'command',
            command: 'update',
            payload: { repoUrl, files } // payloadにrepoUrlとfilesを含める
        };
        clientWs.send(JSON.stringify(updateCommand));
        res.status(200).send(`Update command sent to ${clientName}`);
        console.log(`[Host] Update command sent to ${clientName} for repo ${repoUrl}`);
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