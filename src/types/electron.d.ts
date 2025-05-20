// Type definitions for Electron API exposed via preload
declare global {
  interface Window {
    electronAPI: {
      // Automation
      startAutomation: (config: { 
        id: string; 
        name: string; 
        url: string; 
        selector: string 
      }) => Promise<{ success: boolean; error?: string }>;
      
      stopAutomation: () => Promise<void>;
      
      // Reservation
      startReservation: (config: any) => Promise<{
        success: boolean;
        message: string;
        data?: any;
      }>;
      
      stopReservation: () => Promise<{
        success: boolean;
        message: string;
      }>;
      
      getReservationStatus: () => Promise<{
        isRunning: boolean;
        status: string;
        lastUpdated: string;
      }>;
      
      onReservationUpdate: (callback: (status: {
        isRunning: boolean;
        status: string;
        message?: string;
        error?: string;
      }) => void) => () => void;
      
      // Settings
      saveSettings: (settings: any) => Promise<{
        success: boolean;
        message: string;
        data?: any;
      }>;
      
      loadSettings: () => Promise<{
        success: boolean;
        data: any;
      }>;
      
      // Auth
      login: (credentials: { 
        username: string; 
        password: string 
      }) => Promise<{
        success: boolean;
        message: string;
        user?: { 
          id: string; 
          name: string; 
          email?: string 
        };
      }>;
      
      logout: () => Promise<{ 
        success: boolean; 
        message: string 
      }>;
      
      getAuthStatus: () => Promise<{
        isAuthenticated: boolean;
        user: { 
          id: string; 
          name: string; 
          email?: string 
        } | null;
      }>;
      
      // Event handling
      on: (channel: string, callback: (...args: any[]) => void) => () => void;
      removeListener: (channel: string, listener: (...args: any[]) => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}

export {};
