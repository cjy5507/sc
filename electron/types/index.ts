export interface Store {
  id: string;
  name: string;
  url: string;
  username?: string;
  password?: string;
  config: Config;
}

export interface Config {
  name: string;
  phone: string;
  message: string;
  carrier: string;
  testMode: boolean;
  email: string;
}

export interface AutomationProcess {
  stopped: boolean;
  browser: any;
  abortController: AbortController;
} 