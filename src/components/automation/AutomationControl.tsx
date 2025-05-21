'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Play, Square, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from 'sonner';
import { TimeSyncIndicator } from "../../../components/TimeSyncIndicator";

type StoreStatus = 'idle' | 'running' | 'error' | 'success' | 'waiting_auth' | 'waiting' | 'stopped' | 'cookie' | 'contact' | 'typing' | 'submitting' | 'pass' | 'pass-done';

interface StoreConfig {
  id: string;
  name: string;
  url: string;
  selector: string;
}

// Store configurations
const STORES: StoreConfig[] = [
  {
    id: 'chronodigm',
    name: '롯데 명동 (크로노다임)',
    url: 'https://www.chronodigmwatch.co.kr/rolex/contact-seoul/appointment/',
    selector: '.fappointment .purpose-card'
  },
  {
    id: 'unopangyo',
    name: '현대 판교 (우노와치)',
    url: 'https://www.unopangyo.com/rolex/contact-gyeonggi/',
    selector: '.booking-wrapper .booking-option'
  },
  {
    id: 'hyundai',
    name: '현대 무역 (현대시계)',
    url: 'https://www.hyundaiwatch.co.kr/rolex/contact-seoul/appointment/',
    selector: '.appointment-section .appointment-choice'
  },
  {
    id: 'hongbo',
    name: '롯데 서면 (홍보시계)',
    url: 'https://www.hongbowatch.co.kr/rolex/contact-busan/appointment/',
    selector: '.booking-container .booking-card'
  }
];

// 진행 중 상태 목록 추가
const IN_PROGRESS_STATUSES: StoreStatus[] = [
  'running', 'waiting', 'waiting_auth', 'cookie', 'contact', 'typing', 'submitting', 'pass', 'pass-done'
];

export function AutomationControl() {
  const [isClient, setIsClient] = useState(false);
  const [storeLoading, setStoreLoading] = useState<Record<string, boolean>>({});
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [status, setStatus] = useState<Record<string, { status: StoreStatus; message: string; timer?: number }>>(
    STORES.reduce((acc, store) => ({
      ...acc,
      [store.id]: { status: 'idle' as StoreStatus, message: '' }
    }), {})
  );
  const [timeStatus, setTimeStatus] = useState<any>(null);

  useEffect(() => {
    setIsClient(true);
    const electronAPI = (window as any).electronAPI;

    // 자동화 페이지 진입(마운트) 시점에만 시간 동기화 시작
    if (typeof window !== 'undefined' && electronAPI && typeof electronAPI.startTimeSync === 'function') {
      electronAPI.startTimeSync();
    }

    if (
      typeof window !== 'undefined' &&
      electronAPI &&
      typeof electronAPI.onAutomationStatus === 'function'
    ) {
      electronAPI.onAutomationStatus((payload: { storeId: string; status: string; message?: string }) => {
        setStatus(prev => ({
          ...prev,
          [payload.storeId]: {
            status: payload.status as StoreStatus,
            message: payload.message || ''
          }
        }));
        setStoreLoading(prev => ({ ...prev, [payload.storeId]: false }));
        if ([ 'stopped', 'idle', 'success', 'error' ].includes(payload.status)) {
          setSelectedStores(prev => prev.filter(id => id !== payload.storeId));
        }
      });
    }
    // 시간 동기화 상태 구독
    if (typeof window !== 'undefined' && electronAPI && typeof electronAPI.onTimeSyncUpdate === 'function') {
      electronAPI.onTimeSyncUpdate((status: any) => {
        setTimeStatus({ ...status });
      });
      if (typeof electronAPI.getTimeStatus === 'function') {
        setTimeStatus(electronAPI.getTimeStatus());
      }
    }
  }, []);

  if (!isClient) {
    // SSR에서는 아무것도 렌더링하지 않음
    return null;
  }

  // Check if we're running in Electron
  const isElectron = typeof window !== 'undefined' && 'electronAPI' in window;

  // 매장별 시작
  const handleStartStore = async (storeId: string) => {
    if (storeLoading[storeId]) return;
    try {
      setStoreLoading(prev => ({ ...prev, [storeId]: true }));
      if (isElectron) {
        const electronAPI = (window as any).electronAPI;
        // @ts-ignore
        const result = await electronAPI.startAutomation({ stores: [storeId] });
        if (result.success) {
          setStatus(prev => ({
            ...prev,
            [storeId]: { status: 'running', message: '자동화 실행 중...' }
          }));
        } else {
          throw new Error(result.error || 'Failed to start automation');
        }
      } else {
        throw new Error('Automation is only available in the desktop app');
      }
      setSelectedStores(prev => prev.includes(storeId) ? prev : [...prev, storeId]);
    } catch (error) {
      toast.error(`자동화 시작 중 오류: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setStoreLoading(prev => ({ ...prev, [storeId]: false }));
    }
  };

  // 매장별 중지
  const handleStopStore = async (storeId: string) => {
    if (storeLoading[storeId]) return;
    try {
      setStoreLoading(prev => ({ ...prev, [storeId]: true }));
      if (isElectron) {
        const electronAPI = (window as any).electronAPI;
        // @ts-ignore
        await electronAPI.stopAutomation({ stores: [storeId] });
      }
      setStatus(prev => ({ ...prev, [storeId]: { status: 'idle', message: '' } }));
      setSelectedStores(prev => prev.filter(id => id !== storeId));
    } catch (error) {
      toast.error('개별 중지 중 오류');
    } finally {
      setStoreLoading(prev => ({ ...prev, [storeId]: false }));
    }
  };

  // 전체 시작
  const handleStartAll = async () => {
    const storesToStart = STORES.map(s => s.id).filter(id => status[id].status === 'idle' || status[id].status === 'stopped');
    if (storesToStart.length === 0) return;
    try {
      storesToStart.forEach(id => setStoreLoading(prev => ({ ...prev, [id]: true })));
      if (isElectron) {
        const electronAPI = (window as any).electronAPI;
        // @ts-ignore
        const result = await electronAPI.startAutomation({ stores: storesToStart });
        if (result.success) {
          setStatus(prev => {
            const next = { ...prev };
            storesToStart.forEach(id => {
              next[id] = { status: 'running', message: '자동화 실행 중...' };
            });
            return next;
          });
        } else {
          throw new Error(result.error || 'Failed to start automation');
        }
      } else {
        throw new Error('Automation is only available in the desktop app');
      }
      setSelectedStores(storesToStart);
    } catch (error) {
      toast.error(`자동화 시작 중 오류: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      storesToStart.forEach(id => setStoreLoading(prev => ({ ...prev, [id]: false })));
    }
  };

  // 전체 중지
  const handleStopAll = async () => {
    const runningStores = STORES.map(s => s.id).filter(id => status[id].status === 'running' || status[id].status === 'waiting');
    if (runningStores.length === 0) return;
    try {
      runningStores.forEach(id => setStoreLoading(prev => ({ ...prev, [id]: true })));
      if (isElectron) {
        const electronAPI = (window as any).electronAPI;
        // @ts-ignore
        await electronAPI.stopAutomation({ stores: runningStores });
        // 창 닫기 추가
        if (electronAPI.closeWindow) {
          electronAPI.closeWindow();
        }
      }
      setStatus(prev => {
        const next = { ...prev };
        runningStores.forEach(id => {
          next[id] = { status: 'idle', message: '' };
        });
        return next;
      });
      setSelectedStores(prev => prev.filter(id => !runningStores.includes(id)));
    } catch (error) {
      toast.error('전체 중지 중 오류');
    } finally {
      runningStores.forEach(id => setStoreLoading(prev => ({ ...prev, [id]: false })));
    }
  };

  // 체크박스 핸들러
  const handleStoreCheck = (storeId: string) => {
    if (status[storeId]?.status === 'running') return;
    setSelectedStores(prev =>
      prev.includes(storeId)
        ? prev.filter(id => id !== storeId)
        : [...prev, storeId]
    );
  };

  const getStatusColor = (status: StoreStatus) => {
    switch (status) {
      case 'running':
        return 'bg-blue-500';
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'waiting_auth':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-300';
    }
  };

  const getStatusText = (status: StoreStatus) => {
    switch (status) {
      case 'running':
        return '실행 중';
      case 'success':
        return '완료';
      case 'error':
        return '오류';
      case 'waiting_auth':
        return '인증 대기 중';
      default:
        return '대기 중';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">롤렉스 예약 자동화</h2>
        <div className="flex space-x-4">
          {STORES.some(store => status[store.id].status === 'running' || status[store.id].status === 'waiting') ? (
            <Button
              variant="destructive"
              onClick={handleStopAll}
              disabled={STORES.some(store => storeLoading[store.id])}
            >
              <Square className="h-4 w-4 mr-2" />
              전체 중지
            </Button>
          ) : (
            <Button
              onClick={handleStartAll}
              disabled={STORES.every(store => status[store.id].status === 'running' || storeLoading[store.id])}
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              전체 시작
            </Button>
          )}
        </div>
      </div>

      {/* Time Sync Status Indicator */}
      <Card className="mb-4">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <h3 className="text-lg font-medium mr-4">시스템 시간 상태</h3>
              <TimeSyncIndicator showAlert={true} />
            </div>
            <div className="text-sm text-muted-foreground">
              {timeStatus ? (
                <>
                  <div>오프셋: {timeStatus.offsetMs}ms</div>
                  <div>동기화: {timeStatus.synced ? '정상' : '불일치'}</div>
                  <div>마지막 동기화: {timeStatus.lastSynced ? new Date(timeStatus.lastSynced).toLocaleString() : '-'}</div>
                </>
              ) : (
                <>동기화 정보 없음</>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>스토어 선택</CardTitle>
          <CardDescription>자동화를 실행할 스토어를 선택하세요.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {STORES.map((store) => {
              const storeStatus = status[store.id]?.status || 'idle';
              const isStoreRunning = IN_PROGRESS_STATUSES.includes(storeStatus);
              return (
                <div
                  key={store.id}
                  className={`p-4 border rounded-lg flex items-center justify-between transition-colors ${
                    selectedStores.includes(store.id)
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  } ${isStoreRunning ? 'opacity-70' : ''}`}
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedStores.includes(store.id)}
                      onChange={() => handleStoreCheck(store.id)}
                      disabled={isStoreRunning || storeLoading[store.id]}
                      className="form-checkbox h-5 w-5 text-blue-600"
                    />
                    <div>
                      <h3 className="font-medium">{store.name}</h3>
                      <p className="text-sm text-muted-foreground">{store.url}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`h-3 w-3 rounded-full ${getStatusColor(storeStatus)}`}
                      title={getStatusText(storeStatus)}
                    />
                    <span className="text-sm text-muted-foreground">
                      {status[store.id]?.message || getStatusText(storeStatus)}
                    </span>
                    {isStoreRunning ? (
                      <Button size="sm" variant="destructive" onClick={() => handleStopStore(store.id)} disabled={storeLoading[store.id]}>
                        <Square className="h-4 w-4 mr-1" />중지
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => handleStartStore(store.id)} disabled={storeLoading[store.id]}>
                        <Play className="h-4 w-4 mr-1" />시작
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      {!isElectron && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 rounded-lg">
          <p>자동화 기능은 데스크톱 앱에서만 사용할 수 있습니다.</p>
        </div>
      )}
    </div>
  );
}
