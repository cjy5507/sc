import { AutomationManager } from './AutomationManager';
import { StoreConfig } from './types/automation.types';

// 매장 설정
const storeConfigs: StoreConfig[] = [
  {
    id: 'chronodigm',
    name: '롯데 명동 (크로노다임)',
    url: 'https://www.chronodigmwatch.co.kr/rolex/contact-seoul/appointment/',
    enabled: true,
    priority: 1,
    purpose: '롤렉스 시계 구매 상담'
  },
  // 다른 매장 설정들도 여기에 추가 가능
];

// 자동화 매니저 인스턴스 생성
const automationManager = new AutomationManager(storeConfigs);

// 상태 업데이트를 위한 이벤트 리스너
function setupStatusUpdates() {
  const updateInterval = setInterval(async () => {
    if (!automationManager.isAutomationRunning()) {
      clearInterval(updateInterval);
      return;
    }

    const statuses = await automationManager.getStatus();
    console.log('\n=== Current Status ===');
    statuses.forEach(status => {
      console.log(`[${status.storeName}] ${status.status.toUpperCase()}: ${status.currentStep} (${status.progress}%)`);
    });
    console.log('====================\n');
  }, 5000); // 5초마다 상태 업데이트
}

// 자동화 시작
async function startAutomation() {
  console.log('Starting Rolex reservation automation...');
  
  try {
    // 상태 모니터링 시작
    setupStatusUpdates();
    
    // 모든 매장에서 자동화 시작
    const results = await automationManager.startAll();
    
    // 결과 출력
    console.log('\n=== Automation Results ===');
    results.forEach(result => {
      console.log(`[${result.storeId || 'unknown'}] ${result.success ? '✅ SUCCESS' : '❌ FAILED'}: ${result.message}`);
    });
    
  } catch (error) {
    console.error('Fatal error during automation:', error);
  } finally {
    // 리소스 정리
    await automationManager.stopAll();
    console.log('Automation stopped.');
  }
}

// 예제 실행 (실제 사용 시에는 UI에서 트리거하는 것이 좋음)
startAutomation().catch(console.error);

// Ctrl+C로 종료 처리
process.on('SIGINT', async () => {
  console.log('\nStopping all automations...');
  await automationManager.stopAll();
  process.exit(0);
});
