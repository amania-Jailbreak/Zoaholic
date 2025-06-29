const WebSocket = require('ws');
const si = require('systeminformation');
const os = require('os');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch').default; // node-fetchをインポート

const HOST_URL = 'ws://localhost:8080';
const CLIENT_NAME = os.hostname();

let ws = null;
let reconnectInterval = 1000;
const maxReconnectInterval = 30000;

let currentMode = 'Client'; // 初期モード

// コマンドライン引数でモードをチェック
if (process.argv.includes('--mode') && process.argv[process.argv.indexOf('--mode') + 1] === 'rescue') {
    currentMode = 'Rescue';
    console.log('[Client] Starting in Rescue Mode...');
    // レスキューモードのシミュレーション
    setTimeout(() => {
        console.log('[Client] Simulating configuration reset...');
        console.log('[Client] Simulating fetching stable release from GitHub...');
        console.log('[Client] Rescue Mode completed. Please restart in Client Mode.');
        // 実際にはここでプロセスを終了するか、Clientモードに移行する
        // process.exit(0);
    }, 5000);
}

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

async function downloadAndReplaceFile(repoUrl, filePath, targetPath) {
    const rawUrl = `${repoUrl}/raw/main/${filePath}`; // mainブランチから取得
    const fullTargetPath = path.join(__dirname, '..', targetPath);

    console.log(`[Client:Update] Downloading ${rawUrl} to ${fullTargetPath}`);
    try {
        const response = await fetch(rawUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const content = await response.text();
        fs.writeFileSync(fullTargetPath, content);
        console.log(`[Client:Update] Successfully downloaded and replaced ${filePath}`);
        return true;
    } catch (error) {
        console.error(`[Client:Update] Failed to download or replace ${filePath}:`, error.message);
        return false;
    }
}

function connect() {
    ws = new WebSocket(HOST_URL);

    ws.onopen = () => {
        reconnectInterval = 1000;
        
        // 5秒ごとに自身の状態とシステム情報を送信する
        setInterval(async () => {
            const systemInfo = await getSystemInfo();
            const message = {
                name: CLIENT_NAME,
                status: 'Online',
                log: `[INFO] Client ${CLIENT_NAME} is running. Uptime: ${process.uptime().toFixed(2)}s`,
                timestamp: new Date().toISOString(),
                systemInfo: systemInfo,
                mode: currentMode // 現在のモードを送信
            };
            ws.send(JSON.stringify(message));
        }, 5000);

        // クライアントプラグインのロード
        const CLIENT_PLUGINS_DIR = path.join(__dirname, '..', 'plugins', 'client');
        if (fs.existsSync(CLIENT_PLUGINS_DIR)) {
            fs.readdirSync(CLIENT_PLUGINS_DIR).forEach(file => {
                if (file.endsWith('.js')) {
                    try {
                        const plugin = require(path.join(CLIENT_PLUGINS_DIR, file));
                        if (plugin.init && typeof plugin.init === 'function') {
                            plugin.init(ws); // WebSocketインスタンスを渡す
                        }
                    } catch (error) {
                        console.error(`[Client] Failed to load client plugin ${file}:`, error);
                    }
                }
            });
        }
    };

    ws.onmessage = async (message) => {
        try {
            const command = JSON.parse(message.data);
            if (command.type === 'command' && command.command === 'update') {
                console.log('[Client] Received update command. Entering Update Mode...');
                currentMode = 'Update';
                const { repoUrl, files } = command.payload;

                let updateSuccess = true;
                if (repoUrl && files && files.length > 0) {
                    for (const file of files) {
                        const success = await downloadAndReplaceFile(repoUrl, file.sourcePath, file.targetPath);
                        if (!success) {
                            updateSuccess = false;
                            break;
                        }
                    }
                } else {
                    console.warn('[Client:Update] No repository URL or files specified for update.');
                    updateSuccess = false;
                }

                setTimeout(() => {
                    if (updateSuccess) {
                        console.log('[Client] Update successful. Returning to Client Mode.');
                        currentMode = 'Client';
                    } else {
                        console.log('[Client] Update failed. Restoring from backup (simulated)...');
                        currentMode = 'Client'; // 失敗してもClientモードに戻る
                    }
                    // ホストにアップデート結果を通知するロジックを追加することも可能
                }, 2000); // ダウンロード後に少し待つ
            }
        } catch (error) {
            console.error('[Client] Failed to parse command from host:', error);
        }
    };

    ws.onclose = () => {
        setTimeout(connect, reconnectInterval);
        reconnectInterval = Math.min(reconnectInterval * 2, maxReconnectInterval);
    };

    ws.onerror = (error) => {
        console.error(`[Client] WebSocket error for ${CLIENT_NAME}:`, error.message);
        ws.close();
    };
}

// レスキューモードでない場合のみ接続を開始
if (currentMode !== 'Rescue') {
    connect();
}

console.log(`[Client] Starting ${CLIENT_NAME}...`);