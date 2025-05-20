export interface StoreConfig {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  priority: number;
  purpose: string;
  // 매장별 고유 설정이 필요한 경우 여기에 추가
}

export interface AutomationResult {
  success: boolean;
  message: string;
  storeId?: string;  // 매장 ID를 추적하기 위해 추가
  data?: any;
  error?: Error;
}

export interface AutomationProgress {
  storeId: string;
  storeName: string;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'waiting_auth';
  progress: number; // 0-100
  currentStep: string;
  lastUpdated: Date;
}

export interface IAutomationEngine {
  initialize(): Promise<AutomationResult>;
  start(): Promise<AutomationResult>;
  stop(): Promise<AutomationResult>;
  getProgress(): Promise<AutomationProgress>;
  handleAuth(data: any): Promise<AutomationResult>;
}
