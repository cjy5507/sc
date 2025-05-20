import { Browser, chromium, Page } from 'playwright';

// 매장별 예약 시나리오 함수 타입
export type StoreAutomationResult = 'success' | 'fail' | 'timeout' | 'waiting-auth' | 'in-progress';
export type StoreName = 'chronodigm' | 'unopangyo' | 'hyundaiwatch' | 'hongbowatch';

export interface IStoreStatus {
  name: StoreName;
  status: StoreAutomationResult;
  message?: string;
  authStartTime?: number;
  authTimeout?: number;
}

export interface IAutomationRunnerOptions {
  onStatusUpdate?: (status: IStoreStatus) => void;
}

export class AutomationRunner {
  private browsers: Partial<Record<StoreName, Browser>> = {};
  private pages: Partial<Record<StoreName, Page>> = {};
  private status: Record<StoreName, IStoreStatus> = {
    chronodigm: { name: 'chronodigm', status: 'in-progress' },
    unopangyo: { name: 'unopangyo', status: 'in-progress' },
    hyundaiwatch: { name: 'hyundaiwatch', status: 'in-progress' },
    hongbowatch: { name: 'hongbowatch', status: 'in-progress' },
  };
  private onStatusUpdate?: (status: IStoreStatus) => void;

  constructor(options?: IAutomationRunnerOptions) {
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

  async startStore(store: StoreName) {
    // TODO: 각 매장별 예약 시나리오(stores/chronodigm 등)로 분리 예정
    // 예시: await runChronodigmScenario(...)
    this.updateStatus(store, 'in-progress', '예약 시나리오 시작');
    // ... Playwright 예약 자동화 로직 ...
  }

  updateStatus(store: StoreName, status: StoreAutomationResult, message?: string) {
    this.status[store] = {
      ...this.status[store],
      status,
      message,
      ...(status === 'waiting-auth' ? { authStartTime: Date.now(), authTimeout: 180000 } : {}),
    };
    if (this.onStatusUpdate) this.onStatusUpdate(this.status[store]);
  }
} 