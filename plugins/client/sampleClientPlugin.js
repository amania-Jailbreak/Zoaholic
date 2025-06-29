// plugins/client/sampleClientPlugin.js

module.exports = {
    name: 'SampleClientPlugin',
    init: function(clientWs) {
        // console.log(`[Plugin] ${this.name} initialized on client.`); // ログを削除
        // ここにクライアント側のプラグインロジックを記述
        // 例: 10秒ごとにメッセージを送信
        setInterval(() => {
            // clientWs.send(JSON.stringify({ type: 'plugin_message', plugin: this.name, data: 'Hello from client plugin!' }));
            // console.log(`[Plugin] ${this.name} sending message.`); // ログを削除
        }, 10000);
    }
};