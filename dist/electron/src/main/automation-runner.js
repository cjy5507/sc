"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutomationRunner = void 0;
class AutomationRunner {
    constructor(options) {
        this.browsers = {};
        this.pages = {};
        this.status = {
            chronodigm: { name: 'chronodigm', status: 'in-progress' },
            unopangyo: { name: 'unopangyo', status: 'in-progress' },
            hyundaiwatch: { name: 'hyundaiwatch', status: 'in-progress' },
            hongbowatch: { name: 'hongbowatch', status: 'in-progress' },
        };
        this.onStatusUpdate = options?.onStatusUpdate;
    }
    async startAll() {
        await Promise.all([
            this.startStore('chronodigm'),
            this.startStore('unopangyo'),
            this.startStore('hyundaiwatch'),
            this.startStore('hongbowatch'),
        ]);
    }
    async startStore(store) {
        // TODO: 각 매장별 예약 시나리오(stores/chronodigm 등)로 분리 예정
        // 예시: await runChronodigmScenario(...)
        this.updateStatus(store, 'in-progress', '예약 시나리오 시작');
        // ... Playwright 예약 자동화 로직 ...
    }
    updateStatus(store, status, message) {
        this.status[store] = {
            ...this.status[store],
            status,
            message,
            ...(status === 'waiting-auth' ? { authStartTime: Date.now(), authTimeout: 180000 } : {}),
        };
        if (this.onStatusUpdate)
            this.onStatusUpdate(this.status[store]);
    }
}
exports.AutomationRunner = AutomationRunner;
//# sourceMappingURL=automation-runner.js.map