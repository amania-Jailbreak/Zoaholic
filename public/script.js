document.addEventListener('DOMContentLoaded', function() {
    const serverList = document.getElementById('server-list');
    const serverDataHistory = {}; // 各サーバーのデータ履歴を保持
    const MAX_HISTORY_POINTS = 10; // 履歴の最大点数

    function createC3Chart(bindtoId, label, color) {
        return c3.generate({
            bindto: `#${bindtoId}`,
            data: {
                columns: [
                    [label]
                ],
                type: 'line',
                colors: {
                    [label]: color
                }
            },
            axis: {
                x: {
                    type: 'category',
                    show: false // X軸のラベルは非表示
                },
                y: {
                    min: 0,
                    max: 100,
                    padding: { top: 0, bottom: 0 },
                    tick: { format: function (d) { return d + '%'; } }
                }
            },
            point: {
                show: false // データポイントを非表示
            },
            legend: {
                show: false // 凡例を非表示
            },
            tooltip: {
                show: false // ツールチップを非表示
            },
            size: {
                height: 150 // グラフの高さ
            }
        });
    }

    function updateC3Chart(chart, label, newData) {
        let history = serverDataHistory[chart.element.id] || [];
        history.push(newData);
        if (history.length > MAX_HISTORY_POINTS) {
            history.shift();
        }
        serverDataHistory[chart.element.id] = history;

        chart.load({
            columns: [
                [label, ...history]
            ]
        });
    }

    function updateServerList(data) {
        // 既存のサーバーカードを削除せずに更新するために、Mapを使用
        const existingCards = new Map();
        serverList.querySelectorAll('.card').forEach(card => {
            const serverName = card.querySelector('.card-title').textContent;
            existingCards.set(serverName, card);
        });

        data.forEach(server => {
            let card = existingCards.get(server.name);
            if (!card) {
                card = document.createElement('div');
                card.className = 'card';
                serverList.appendChild(card);
            }

            let statusColor = '';
            switch(server.status) {
                case 'Online':
                    statusColor = 'green-text';
                    break;
                case 'Offline':
                    statusColor = 'red-text';
                    break;
                case 'Warning':
                    statusColor = 'orange-text';
                    break;
            }

            card.innerHTML = `
                <div class="card-content">
                    <span class="card-title">${server.name}</span>
                    <p>Status: <strong class="${statusColor}">${server.status}</strong></p>
                    <p>Log: ${server.log}</p>
                    <div class="row">
                        <div class="col s6">
                            <h6>CPU Usage (%)</h6>
                            <div id="cpuChart-${server.name}" class="chart-container"></div>
                        </div>
                        <div class="col s6">
                            <h6>Memory Usage (%)</h6>
                            <div id="memChart-${server.name}" class="chart-container"></div>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col s6">
                            <h6>Disk Usage (%)</h6>
                            <div id="diskChart-${server.name}" class="chart-container"></div>
                        </div>
                        <div class="col s6">
                            <h6>Network (Rx/Tx KB/s)</h6>
                            <div id="netChart-${server.name}" class="chart-container"></div>
                        </div>
                    </div>
                </div>
            `;

            // C3.js Chartの初期化
            if (!serverCharts[server.name]) {
                serverCharts[server.name] = {
                    cpu: createC3Chart(`cpuChart-${server.name}`, 'CPU', '#4CAF50'),
                    mem: createC3Chart(`memChart-${server.name}`, 'Memory', '#2196F3'),
                    disk: createC3Chart(`diskChart-${server.name}`, 'Disk', '#FFC107'),
                    net: createC3Chart(`netChart-${server.name}`, 'Network', '#9C27B0')
                };
            }

            // データがある場合のみ更新
            if (server.systemInfo) {
                updateC3Chart(serverCharts[server.name].cpu, 'CPU', parseFloat(server.systemInfo.cpu));
                updateC3Chart(serverCharts[server.name].mem, 'Memory', parseFloat(server.systemInfo.mem));
                updateC3Chart(serverCharts[server.name].disk, 'Disk', parseFloat(server.systemInfo.disk));
                const netTotal = (parseFloat(server.systemInfo.net.rx) + parseFloat(server.systemInfo.net.tx)) / 1024; // KB/sに変換
                updateC3Chart(serverCharts[server.name].net, 'Network', netTotal.toFixed(2));
            }
        });

        // 切断されたサーバーを削除
        existingCards.forEach((card, name) => {
            if (!data.some(s => s.name === name)) {
                card.remove();
                delete serverCharts[name];
                delete serverDataHistory[name];
            }
        });
    }

    // WebSocket接続ロジックは変更なし
    function connect() {
        const ws = new WebSocket(`ws://${window.location.host}?type=ui`);

        ws.onopen = function() {
            console.log('Connected to HOST-WS');
        };

        ws.onmessage = function(event) {
            try {
                const data = JSON.parse(event.data);
                console.log('Received data:', data);
                updateServerList(data);
            } catch (error) {
                console.error('Failed to parse message:', event.data, error);
            }
        };

        ws.onclose = function() {
            console.log('Disconnected from HOST-WS. Reconnecting...');
            setTimeout(connect, 3000);
        };

        ws.onerror = function(error) {
            console.error('WebSocket Error:', error);
            ws.close();
        };
    }

    connect();
});