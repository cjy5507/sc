import { useState, useEffect, useCallback } from 'react';
import { useElectron } from '../contexts/ElectronContext';

type ReservationConfig = {
  store: string;
  targetDate: string;
  targetTime: string;
  userInfo: {
    name: string;
    phone: string;
    email: string;
  };
};

export const useReservation = () => {
  const electron = useElectron();
  const [isReserving, setIsReserving] = useState(false);
  const [status, setStatus] = useState({
    isRunning: false,
    progress: '대기 중...',
    lastError: '',
    store: '',
    targetDate: '',
    targetTime: ''
  });
  const [error, setError] = useState<string | null>(null);

  // 상태 업데이트 핸들러
  useEffect(() => {
    const handleStatusUpdate = (newStatus: any) => {
      setStatus(prev => ({
        ...prev,
        ...newStatus,
        lastUpdate: newStatus.lastUpdate ? new Date(newStatus.lastUpdate) : new Date()
      }));
      
      if (newStatus.isRunning !== undefined) {
        setIsReserving(newStatus.isRunning);
      }
      
      if (newStatus.lastError) {
        setError(newStatus.lastError);
      } else if (newStatus.progress?.includes('오류')) {
        setError(newStatus.progress);
      } else {
        setError(null);
      }
    };

    // 상태 업데이트 구독
    electron.onReservationUpdate(handleStatusUpdate);

    // 초기 상태 로드
    const loadInitialStatus = async () => {
      try {
        const currentStatus = await electron.getReservationStatus();
        handleStatusUpdate(currentStatus);
      } catch (err) {
        console.error('상태 로드 중 오류:', err);
      }
    };

    loadInitialStatus();

    // 클린업
    return () => {
      // 필요 시 구독 해제 로직 추가
    };
  }, [electron]);

  // 예약 시작
  const startReservation = useCallback(async (config: ReservationConfig) => {
    try {
      setError(null);
      setIsReserving(true);
      
      const result = await electron.startReservation(config);
      if (!result.success) {
        throw new Error(result.message);
      }
      
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [electron]);

  // 예약 중지
  const stopReservation = useCallback(async () => {
    try {
      const result = await electron.stopReservation();
      if (!result.success) {
        throw new Error(result.message);
      }
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '예약 중지 중 오류가 발생했습니다.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsReserving(false);
    }
  }, [electron]);

  return {
    isReserving,
    status,
    error,
    startReservation,
    stopReservation,
  };
};
