
// plugins/host/sampleHostPlugin.js

module.exports = {
    name: 'SampleHostPlugin',
    init: function(hostApp) {
        console.log(`[Plugin] ${this.name} initialized on host.`);
        // ここにホスト側のプラグインロジックを記述
        // 例: 新しいAPIエンドポイントの追加
        hostApp.get('/plugin/sample', (req, res) => {
            res.send(`Hello from ${this.name}!`);
        });
    }
};
