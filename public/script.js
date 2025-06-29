document.addEventListener('DOMContentLoaded', function() {
    const serverList = document.getElementById('server-list');

    function updateServerList(data) {
        serverList.innerHTML = '';
        if (data.length === 0) {
            serverList.innerHTML = '<p class="text-gray-600">No servers connected.</p>';
            return;
        }

        data.forEach(server => {
            const card = document.createElement('div');
            card.className = 'bg-white rounded-lg shadow-md p-6';
            
            let statusColor = 'text-gray-600';
            switch(server.status) {
                case 'Online':
                    statusColor = 'text-green-500';
                    break;
                case 'Offline':
                    statusColor = 'text-red-500';
                    break;
                case 'Warning':
                    statusColor = 'text-yellow-500';
                    break;
            }

            card.innerHTML = `
                <h2 class="text-xl font-semibold text-gray-800 mb-2">${server.name}</h2>
                <p class="text-gray-700 mb-1">Status: <strong class="${statusColor}">${server.status}</strong></p>
                <p class="text-gray-700 mb-4">Log: ${server.log}</p>
                ${server.systemInfo ? `
                    <div class="grid grid-cols-2 gap-4 text-sm text-gray-700">
                        <div><strong>CPU:</strong> ${server.systemInfo.cpu}%</div>
                        <div><strong>Memory:</strong> ${server.systemInfo.mem}%</div>
                        <div><strong>Disk:</strong> ${server.systemInfo.disk}%</div>
                        <div><strong>Network:</strong> Rx ${server.systemInfo.net.rx ? (server.systemInfo.net.rx / 1024).toFixed(2) : 'N/A'} KB/s / Tx ${server.systemInfo.net.tx ? (server.systemInfo.net.tx / 1024).toFixed(2) : 'N/A'} KB/s</div>
                    </div>
                ` : ''}
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