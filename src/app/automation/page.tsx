'use client';

import { AutomationControl } from '@/components/automation/AutomationControl';
import { AutomationProvider } from '@/contexts/AutomationContext';

export default function AutomationPage() {
  return (
    <AutomationProvider>
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">롤렉스 예약 자동화</h1>
        <AutomationControl />
      </div>
    </AutomationProvider>
  );
}
