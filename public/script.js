
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

            card.innerHTML = `
                <div class="card-content">
                    <span class="card-title">${server.name}</span>
                    <p>Status: <strong class="${statusColor}">${server.status}</strong></p>
                    <p>Log: ${server.log}</p>
                </div>
            `;
            serverList.appendChild(card);
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
