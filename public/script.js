document.addEventListener('DOMContentLoaded', function() {
    const serverList = document.getElementById('server-list');

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

            const cardContent = document.createElement('div');
            cardContent.className = 'card-content';
            cardContent.innerHTML = `
                <span class="card-title">${server.name}</span>
                <p>Status: <strong class="${statusColor}">${server.status}</strong></p>
                <p>Log: ${server.log}</p>
            `;
            
            card.appendChild(cardContent);
            serverList.appendChild(card);
        });
    }

    function connect() {
        // WebSocketのURLにクエリパラメータを追加してUIからの接続であることを示す
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
            // 3秒後に再接続を試みる
            setTimeout(connect, 3000);
        };

        ws.onerror = function(error) {
            console.error('WebSocket Error:', error);
            ws.close();
        };
    }

    connect();
});