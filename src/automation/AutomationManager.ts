import { ChronodigmEngine } from './engines/stores/ChronodigmEngine';
import { UnopangyoEngine } from './engines/stores/UnopangyoEngine';
import { StoreConfig, IAutomationEngine, AutomationResult, AutomationProgress } from './types/automation.types';

export class AutomationManager {
  private engines: Map<string, IAutomationEngine> = new Map();
  private storeConfigs: StoreConfig[] = [];
  private isRunning: boolean = false;

  constructor(storeConfigs: StoreConfig[]) {
    this.storeConfigs = storeConfigs;
    this.initializeEngines();
  }

  private initializeEngines(): void {
    this.storeConfigs.forEach(config => {
      let engine: IAutomationEngine | null = null;
      
      // 매장 ID에 따라 적절한 엔진 인스턴스 생성
      switch (config.id) {
        case 'chronodigm':
          engine = new ChronodigmEngine(config);
          break;
        case 'unopangyo':
          engine = new UnopangyoEngine(config);
          break;
        // 다른 매장 엔진 추가
        default:
          console.warn(`No engine found for store: ${config.id}`);
          return;
      }

      if (engine) {
        this.engines.set(config.id, engine);
      }
    });
  }

  async startAll(): Promise<AutomationResult[]> {
    if (this.isRunning) {
      return [{ success: false, message: 'Automation is already running' }];
    }

    this.isRunning = true;
    const results: AutomationResult[] = [];

    // 모든 엔진 초기화
    for (const [id, engine] of this.engines.entries()) {
      try {
        console.log(`Initializing engine for store: ${id}`);
        const result = await engine.initialize();
        results.push(result);
        
        if (!result.success) {
          console.error(`Failed to initialize engine for ${id}:`, result.message);
          continue;
        }
      } catch (error) {
        console.error(`Error initializing engine for ${id}:`, error);
        results.push({
          success: false,
          message: `Error initializing engine: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    }

    // 모든 엔진 시작 (병렬 실행)
    const startPromises = Array.from(this.engines.entries())
      .filter(([id]) => results.find(r => r.storeId === id)?.success !== false)
      .map(async ([id, engine]) => {
        try {
          console.log(`Starting automation for store: ${id}`);
          const result = await engine.start();
          return { ...result, storeId: id };
        } catch (error) {
          console.error(`Error starting automation for ${id}:`, error);
          return {
            success: false,
            storeId: id,
            message: `Error starting automation: ${error instanceof Error ? error.message : 'Unknown error'}`
          };
        }
      });

    const startResults = await Promise.all(startPromises);
    this.isRunning = false;
    return startResults;
  }

  async stopAll(): Promise<AutomationResult[]> {
    const stopPromises = Array.from(this.engines.entries())
      .map(async ([id, engine]) => {
        try {
          console.log(`Stopping automation for store: ${id}`);
          const result = await engine.stop();
          return { ...result, storeId: id };
        } catch (error) {
          console.error(`Error stopping automation for ${id}:`, error);
          return {
            success: false,
            storeId: id,
            message: `Error stopping automation: ${error instanceof Error ? error.message : 'Unknown error'}`
          };
        }
      });

    const results = await Promise.all(stopPromises);
    this.isRunning = false;
    return results;
  }

  async getStatus(storeId?: string): Promise<AutomationProgress[]> {
    if (storeId) {
      const engine = this.engines.get(storeId);
      if (!engine) {
        throw new Error(`No engine found for store: ${storeId}`);
      }
      return [await engine.getProgress()];
    }

    const statusPromises = Array.from(this.engines.entries())
      .map(async ([id, engine]) => {
        try {
          return await engine.getProgress();
        } catch (error) {
          console.error(`Error getting status for ${id}:`, error);
          return {
            storeId: id,
            storeName: id,
            status: 'failed' as const,
            progress: 0,
            currentStep: 'Error getting status',
            lastUpdated: new Date()
          };
        }
      });

    return Promise.all(statusPromises);
  }

  async handleAuth(storeId: string, authData: any): Promise<AutomationResult> {
    const engine = this.engines.get(storeId);
    if (!engine) {
      return { success: false, message: `No engine found for store: ${storeId}` };
    }
    return engine.handleAuth(authData);
  }

  isAutomationRunning(): boolean {
    return this.isRunning;
  }
}
