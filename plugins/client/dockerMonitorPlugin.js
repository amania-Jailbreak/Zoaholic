// plugins/client/dockerMonitorPlugin.js

const { exec } = require('child_process');

module.exports = {
    name: 'DockerMonitorPlugin',
    init: function(clientWs) {
        // console.log(`[Plugin] ${this.name} initialized on client.`); // ログを削除

        const fetchDockerContainers = () => {
            exec('docker ps -a --format "{{json .}}"', (error, stdout, stderr) => {
                if (error) {
                    console.error(`[Plugin:Docker] Error executing docker command: ${error.message}`);
                    // Optionally send error status to host
                    return;
                }
                if (stderr) {
                    console.warn(`[Plugin:Docker] Docker command stderr: ${stderr}`);
                }

                try {
                    const containers = stdout.trim().split('\n').filter(line => line).map(JSON.parse);
                    // Send container data to host
                    clientWs.send(JSON.stringify({
                        type: 'plugin_data',
                        pluginName: this.name,
                        data: {
                            containers: containers
                        }
                    }));
                } catch (parseError) {
                    console.error(`[Plugin:Docker] Failed to parse docker ps output: ${parseError.message}`);
                }
            });
        };

        // Fetch immediately and then every 10 seconds
        fetchDockerContainers();
        setInterval(fetchDockerContainers, 10000); // Every 10 seconds
    }
};