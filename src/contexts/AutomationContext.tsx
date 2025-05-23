'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { automationApi } from '@/src/lib/api';

interface AutomationContextType {
  isRunning: boolean;
  startAutomation: () => Promise<(() => void) | undefined>;
  stopAutomation: () => Promise<void>;
  handleAuthComplete: (storeId: string, authCode: string) => Promise<void>;
  status: Record<string, any>;
}

const AutomationContext = createContext<AutomationContextType | undefined>(undefined);

export function AutomationProvider({ children }: { children: React.ReactNode }) {
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState<Record<string, any>>({});
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // Cleanup polling on unmount
  // Cleanup function to clear intervals
  const clearIntervals = useCallback(() => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  }, [pollingInterval]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      clearIntervals();
    };
  }, [clearIntervals]);

  const updateStatus = useCallback(async () => {
    try {
      // You can implement status polling from the server if needed
      // For now, we'll just return a simple status
      return {};
    } catch (error) {
      console.error('Error updating status:', error);
      return {};
    }
  }, []);

  const startAutomation = useCallback(async () => {
    if (isRunning) return;
    
    try {
      // Clear any existing intervals before starting new ones
      clearIntervals();
      setIsRunning(true);
      
      // Call the API endpoint to start automation
      const data = await automationApi.start();
      
      // Start polling for status updates
      const interval = setInterval(() => {
        updateStatus().catch(console.error);
      }, 1000);
      
      setPollingInterval(interval);
      
      // Return a cleanup function that can be called if needed
      return () => {
        clearInterval(interval);
      };
    } catch (error) {
      console.error('Error starting automation:', error);
      setIsRunning(false);
      clearIntervals();
      throw error;
    }
  }, [isRunning, updateStatus, clearIntervals]);

  const stopAutomation = useCallback(async () => {
    if (!isRunning) return;
    
    try {
      // Clear any existing polling
      clearIntervals();
      
      // Call the API endpoint to stop automation
      const result = await automationApi.stop();
      
      setIsRunning(false);
      toast.success("자동화가 중지되었습니다.");
      return result;
    } catch (error) {
      console.error('Error stopping automation:', error);
      throw error;
    }
  }, [isRunning, clearIntervals]);

  const handleAuthComplete = useCallback(async (storeId: string, authCode: string) => {
    try {
      // Implement auth completion logic here
      // You might want to call an API endpoint to handle the auth
      toast.success("인증이 완료되었습니다.");
    } catch (error) {
      console.error('Error completing auth:', error);
      toast.error("인증에 실패했습니다. 다시 시도해주세요.");
      throw error;
    }
  }, []);

  return (
    <AutomationContext.Provider
      value={{
        isRunning,
        startAutomation,
        stopAutomation,
        handleAuthComplete,
        status,
      }}
    >
      {children}
    </AutomationContext.Provider>
  );
}

export function useAutomation() {
  const context = useContext(AutomationContext);
  if (context === undefined) {
    throw new Error('useAutomation must be used within an AutomationProvider');
  }
  return context;
}
