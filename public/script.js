
document.addEventListener('DOMContentLoaded', function() {
    const serverList = document.getElementById('server-list');

    function updateServerList(data) {
        serverList.innerHTML = '';
        if (data.length === 0) {
            serverList.innerHTML = '<p class="text-gray-400 text-center col-span-full">No servers connected.</p>';
            return;
        }

        data.forEach(server => {
            const card = document.createElement('div');
            card.className = 'bg-gray-800 rounded-xl shadow-2xl p-8 transform transition-all duration-300 hover:scale-105 hover:shadow-3xl';
            
            let statusColor = 'text-gray-400';
            switch(server.status) {
                case 'Online':
                    statusColor = 'text-green-400';
                    break;
                case 'Offline':
                    statusColor = 'text-red-400';
                    break;
                case 'Warning':
                    statusColor = 'text-yellow-400';
                    break;
            }

            let dockerContainersHtml = '';
            if (server.plugins && server.plugins.DockerMonitorPlugin && server.plugins.DockerMonitorPlugin.containers) {
                dockerContainersHtml = `
                    <h3 class="text-xl font-semibold text-white mt-6 mb-3">Docker Containers</h3>
                    <div class="overflow-x-auto">
                        <table class="min-w-full bg-gray-700 rounded-lg">
                            <thead>
                                <tr class="text-left text-gray-300">
                                    <th class="py-2 px-4">Name</th>
                                    <th class="py-2 px-4">Image</th>
                                    <th class="py-2 px-4">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                `;
                server.plugins.DockerMonitorPlugin.containers.forEach(container => {
                    dockerContainersHtml += `
                                <tr class="border-t border-gray-600">
                                    <td class="py-2 px-4 text-gray-200">${container.Names}</td>
                                    <td class="py-2 px-4 text-gray-200">${container.Image}</td>
                                    <td class="py-2 px-4 text-gray-200">${container.Status}</td>
                                </tr>
                    `;
                });
                dockerContainersHtml += `
                            </tbody>
                        </table>
                    </div>
                `;
            }

            card.innerHTML = `
                <h2 class="text-3xl font-extrabold text-white mb-4">${server.name}</h2>
                <p class="text-gray-300 text-lg mb-2">Status: <strong class="${statusColor}">${server.status}</strong></p>
                <p class="text-gray-300 text-lg mb-2">Mode: <strong class="text-blue-400">${server.mode || 'N/A'}</strong></p>
                <p class="text-gray-400 text-base mb-6">Log: ${server.log}</p>
                ${server.systemInfo ? `
                    <div class="grid grid-cols-2 gap-y-3 gap-x-6 text-base text-gray-300">
                        <div><strong class="text-gray-200">CPU:</strong> ${server.systemInfo.cpu}%</div>
                        <div><strong class="text-gray-200">Memory:</strong> ${server.systemInfo.mem}%</div>
                        <div><strong class="text-gray-200">Disk:</strong> ${server.systemInfo.disk}%</div>
                        <div><strong class="text-gray-200">Network:</strong> Rx ${server.systemInfo.net.rx ? (server.systemInfo.net.rx / 1024).toFixed(2) : 'N/A'} KB/s / Tx ${server.systemInfo.net.tx ? (server.systemInfo.net.tx / 1024).toFixed(2) : 'N/A'} KB/s</div>
                    </div>
                ` : ''}
                ${dockerContainersHtml}
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
