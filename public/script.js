
document.addEventListener('DOMContentLoaded', function() {
    const serverList = document.getElementById('server-list');
    const serverCharts = {}; // 各サーバーのChartインスタンスを保持

    function createChart(canvasId, label, data, borderColor) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        return new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array(10).fill(''), // 過去10点のデータを表示
                datasets: [{
                    label: label,
                    data: data,
                    borderColor: borderColor,
                    tension: 0.1,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100 // 使用率なので最大100
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    function updateChart(chart, newData) {
        chart.data.labels.push(''); // 新しいラベルを追加
        chart.data.datasets[0].data.push(newData);

        // 過去10点のみを保持
        if (chart.data.labels.length > 10) {
            chart.data.labels.shift();
            chart.data.datasets[0].data.shift();
        }
        chart.update();
    }

    function updateServerList(data) {
        serverList.innerHTML = '';
        if (data.length === 0) {
            serverList.innerHTML = '<p>No servers connected.</p>';
            return;
        }

        data.forEach(server => {
            const card = document.createElement('div');
            card.className = 'card';
            
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
                            <canvas id="cpuChart-${server.name}" height="100"></canvas>
                        </div>
                        <div class="col s6">
                            <h6>Memory Usage (%)</h6>
                            <canvas id="memChart-${server.name}" height="100"></canvas>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col s6">
                            <h6>Disk Usage (%)</h6>
                            <canvas id="diskChart-${server.name}" height="100"></canvas>
                        </div>
                        <div class="col s6">
                            <h6>Network (Rx/Tx KB/s)</h6>
                            <canvas id="netChart-${server.name}" height="100"></canvas>
                        </div>
                    </div>
                </div>
            `;
            serverList.appendChild(card);

            // Chartの初期化または更新
            if (!serverCharts[server.name]) {
                serverCharts[server.name] = {
                    cpu: createChart(`cpuChart-${server.name}`, 'CPU', [], '#4CAF50'),
                    mem: createChart(`memChart-${server.name}`, 'Memory', [], '#2196F3'),
                    disk: createChart(`diskChart-${server.name}`, 'Disk', [], '#FFC107'),
                    net: createChart(`netChart-${server.name}`, 'Network', [], '#9C27B0')
                };
            }

            // データがある場合のみ更新
            if (server.systemInfo) {
                updateChart(serverCharts[server.name].cpu, parseFloat(server.systemInfo.cpu));
                updateChart(serverCharts[server.name].mem, parseFloat(server.systemInfo.mem));
                updateChart(serverCharts[server.name].disk, parseFloat(server.systemInfo.disk));
                // ネットワークはRxとTxを合計して表示
                const netTotal = (parseFloat(server.systemInfo.net.rx) + parseFloat(server.systemInfo.net.tx)) / 1024; // KB/sに変換
                updateChart(serverCharts[server.name].net, netTotal.toFixed(2));
            }
        });
    }

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
