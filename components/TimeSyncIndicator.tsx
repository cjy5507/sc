"use client"

import { useEffect, useState } from 'react'
import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Badge } from '../components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { useTimeSync } from '../hooks/useTimeSync'
import { useToast } from '../hooks/use-toast'

interface TimeSyncIndicatorProps {
  showAlert?: boolean
  className?: string
}

export function TimeSyncIndicator({ 
  showAlert = true,
  className
}: TimeSyncIndicatorProps) {
  const { 
    status, 
    error, 
    formattedOffset, 
    isSynced,
    getFormattedLastSyncedTime
  } = useTimeSync();
  
  const { toast } = useToast();
  const [showToast, setShowToast] = useState(false);

  // Show toast when sync state changes to not synced
  useEffect(() => {
    // Only show toast when we transition from synced to not synced
    if (!isSynced() && !showToast) {
      setShowToast(true);
      toast({
        title: "시간 동기화 문제",
        description: `시스템 시계가 정확하지 않습니다. 현재 오차: ${formattedOffset()}`,
        variant: "destructive",
      });
    } else if (isSynced()) {
      setShowToast(false);
    }
  }, [status.synced]);

  // Get badge variant based on sync status
  const getBadgeVariant = () => {
    if (error) return "error";
    if (isSynced()) return "success";
    return "error";
  };

  // Get badge text based on sync status
  const getBadgeText = () => {
    if (error) return "오류";
    if (isSynced()) return "동기화됨";
    return "동기화 필요";
  };

  // Get icon based on sync status
  const getIcon = () => {
    if (error || !isSynced()) return <AlertTriangle className="h-4 w-4 mr-1" />;
    return <CheckCircle2 className="h-4 w-4 mr-1" />;
  };

  return (
    <div className={className}>
      {/* Badge showing sync status */}
      <div className="flex items-center">
        <Badge variant={getBadgeVariant()} className="flex items-center">
          {getIcon()}
          <Clock className="h-3 w-3 mr-1" />
          <span>{getBadgeText()}</span>
          <span className="ml-1">{formattedOffset()}</span>
        </Badge>
        <span className="text-xs text-muted-foreground ml-2">
          {getFormattedLastSyncedTime()}
        </span>
      </div>

      {/* Alert shown when time is not synced */}
      {showAlert && !isSynced() && (
        <Alert variant="warning" className="mt-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>시간 동기화 필요</AlertTitle>
          <AlertDescription>
            <p>
              시스템 시계가 현재 표준 시간과 일치하지 않습니다 (오차: {formattedOffset()}).
              예약 자동화의 정확한 타이밍을 위해 시스템 시계를 조정해 주세요.
            </p>
            <p className="mt-1">
              Windows: 설정 -&gt; 시간 및 언어 -&gt; 날짜 및 시간 -&gt; 지금 동기화<br />
              macOS: 시스템 설정 -&gt; 날짜 및 시간 -&gt; 자동으로 설정
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Error alert */}
      {showAlert && error && (
        <Alert variant="destructive" className="mt-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>시간 동기화 오류</AlertTitle>
          <AlertDescription>
            시간 동기화 중 오류가 발생했습니다: {error}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
} 