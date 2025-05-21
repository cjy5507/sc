import React, { createContext, useContext, useEffect, useState } from 'react';

// Type definitions
interface UserInfo {
  id: string;
  name: string;
  email?: string;
}

interface UserCredentials {
  username: string;
  password: string;
}

interface ReservationStatus {
  isRunning: boolean;
  status: string;
  lastUpdated?: string;
  message?: string;
  error?: string;
  progress?: string;
  store?: string;
  targetDate?: string;
  targetTime?: string;
}

interface ReservationConfig {
  store: string;
  targetDate: string;
  targetTime: string;
  userInfo: {
    name: string;
    phone: string;
    email: string;
  };
  [key: string]: any;
}

interface Settings {
  store: string;
  targetDate: string;
  targetTime: string;
  userInfo: {
    name: string;
    phone: string;
    email: string;
  };
}

// Electron API interface
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
      startReservation: (config: ReservationConfig) => Promise<{
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
      saveSettings: (settings: Settings) => Promise<{
        success: boolean;
        message: string;
        data?: any;
      }>;
      
      loadSettings: () => Promise<{
        success: boolean;
        data: Settings;
      }>;
      
      // Auth
      login: (credentials: UserCredentials) => Promise<{
        success: boolean;
        message: string;
        user?: UserInfo;
      }>;
      
      logout: () => Promise<{ 
        success: boolean; 
        message: string; 
      }>;
      
      getAuthStatus: () => Promise<{
        isAuthenticated: boolean;
        user: UserInfo | null;
      }>;
      
      // Event handling
      on: (channel: string, callback: (...args: any[]) => void) => () => void;
      removeListener: (channel: string, listener: (...args: any[]) => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}

// Dummy implementation for non-Electron environments
const dummyElectronAPI = {
  // Automation
  startAutomation: async (config: { id: string; name: string; url: string; selector: string }) => ({
    success: false,
    error: 'Not running in Electron environment',
  }),
  
  stopAutomation: async () => {},
  
  // Reservation
  startReservation: async (config: ReservationConfig) => ({
    success: false,
    message: 'Not running in Electron environment',
  }),
  
  stopReservation: async () => ({
    success: false,
    message: 'Not running in Electron environment',
  }),
  
  getReservationStatus: async () => ({
    isRunning: false,
    status: 'inactive',
    lastUpdated: new Date().toISOString(),
  }),
  
  onReservationUpdate: () => () => {},
  
  // Settings
  saveSettings: async (settings: Settings) => ({
    success: false,
    message: 'Not running in Electron environment',
  }),
  
  loadSettings: async () => ({
    success: false,
    data: {
      store: '',
      targetDate: new Date().toISOString().split('T')[0],
      targetTime: '10:00',
      userInfo: {
        name: '',
        phone: '',
        email: ''
      }
    },
  }),
  
  // Auth
  login: async (credentials: UserCredentials) => ({
    success: false,
    message: 'Not running in Electron environment',
  }),
  
  logout: async () => ({
    success: false,
    message: 'Not running in Electron environment',
  }),
  
  getAuthStatus: async () => ({
    isAuthenticated: false,
    user: null,
  }),
  
  // Event handling
  on: () => () => {},
  removeListener: () => {},
  removeAllListeners: () => {},
};

// Create context with dummy implementation
const ElectronContext = createContext<typeof dummyElectronAPI>(dummyElectronAPI);

// Provider component
export const ElectronProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [electronAPI, setElectronAPI] = useState<typeof dummyElectronAPI>(dummyElectronAPI);

  useEffect(() => {
    // Check if running in Electron
    const isElectron = typeof window !== 'undefined' && 
                      window.electronAPI && 
                      typeof window.electronAPI.startAutomation === 'function';
    
    if (isElectron) {
      // Use real Electron API
      const api = {
        // Automation
        startAutomation: (config: { id: string; name: string; url: string; selector: string }) => 
          window.electronAPI.startAutomation(config),
          
        stopAutomation: () => window.electronAPI.stopAutomation(),
        
        // Reservation
        startReservation: (config: ReservationConfig) => 
          window.electronAPI.startReservation(config),
          
        stopReservation: () => window.electronAPI.stopReservation(),
        
        getReservationStatus: () => window.electronAPI.getReservationStatus(),
        
        onReservationUpdate: (callback: (status: {
          isRunning: boolean;
          status: string;
          message?: string;
          error?: string;
        }) => void) => {
          return window.electronAPI.onReservationUpdate(callback);
        },
        
        // Settings
        saveSettings: (settings: Settings) => window.electronAPI.saveSettings(settings),
        
        loadSettings: () => window.electronAPI.loadSettings(),
        
        // Auth
        login: (credentials: UserCredentials) => window.electronAPI.login(credentials),
        
        logout: () => window.electronAPI.logout(),
        
        getAuthStatus: () => window.electronAPI.getAuthStatus(),
        
        // Event handling
        on: (channel: string, callback: (...args: any[]) => void) => 
          window.electronAPI.on(channel, callback),
          
        removeListener: (channel: string, listener: (...args: any[]) => void) => 
          window.electronAPI.removeListener(channel, listener),
          
        removeAllListeners: (channel: string) => 
          window.electronAPI.removeAllListeners(channel)
      };
      
      setElectronAPI(api);
    }
  }, []);

  return (
    <ElectronContext.Provider value={electronAPI}>
      {children}
    </ElectronContext.Provider>
  );
};

// Custom hook to use the Electron API
export const useElectron = () => {
  const context = useContext(ElectronContext);
  if (context === undefined) {
    throw new Error('useElectron must be used within an ElectronProvider');
  }
  return context;
};

// Export types
export type { 
  UserInfo, 
  UserCredentials, 
  ReservationStatus, 
  ReservationConfig, 
  Settings 
};

export default ElectronContext;
