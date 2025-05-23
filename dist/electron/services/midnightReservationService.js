"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MidnightReservationService = void 0;
const timeUtils_1 = require("../utils/timeUtils");
/**
 * 말일 자정 예약을 위한 서비스
 */
class MidnightReservationService {
    constructor(mainWindow, automationProcesses) {
        this.browser = null;
        this.context = null;
        this.page = null;
        this.isRunning = false;
        this.scheduledTask = null;
        this.currentStore = null; // storeId를 currentStore로 변경
        this.statusCallback = null;
        this.mainWindow = mainWindow;
        this.automationProcesses = automationProcesses;
        console.log('MidnightReservationService 초기화');
    }
    /**
     * 자정 예약 자동화 시작
     * @param url 예약할 URL
     * @param credentials 인증 정보
     * @returns Promise<void>
     */
    async startMidnightReservation(url, credentials) {
        console.log(`자정 예약 자동화 시작: ${url}`);
        if (this.isRunning) {
            console.log('자정 예약 자동화가 이미 실행 중입니다.');
            return;
        }
        this.isRunning = true;
        try {
            // 예약 대상 스토어 설정
            const store = {
                id: 'midnight',
                name: '자정 예약',
                url: url,
                config: credentials
            };
            this.currentStore = store;
            // 현재 날짜 및 시간 정보 가져오기
            const now = new Date();
            const lastDay = (0, timeUtils_1.getLastDayOfMonth)();
            const nextMonthLastDay = new Date(now.getFullYear(), now.getMonth() + 2, 0);
            const daysUntilLastDay = Math.ceil((nextMonthLastDay.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            this.updateStatus(store.id, 'waiting', `다음 말일(${nextMonthLastDay.toLocaleDateString()})까지 ${daysUntilLastDay}일 남았습니다.`);
            // 월말 자정 예약 스케줄링
            await this.scheduleMonthEndMidnightReservation(store);
            console.log('자정 예약 자동화가 예약되었습니다.');
        }
        catch (error) {
            this.isRunning = false;
            console.error('자정 예약 자동화 시작 중 오류:', error);
            throw error;
        }
    }
    /**
     * 자정 예약 자동화 중지
     * @returns Promise<void>
     */
    async stopMidnightReservation() {
        console.log('자정 예약 자동화 중지');
        if (!this.isRunning) {
            console.log('자정 예약 자동화가 실행 중이 아닙니다.');
            return;
        }
        try {
            // 스케줄링된 작업 취소
            if (this.scheduledTask) {
                clearTimeout(this.scheduledTask);
                this.scheduledTask = null;
            }
            // 브라우저 및 관련 리소스 정리
            await this.forceClearResources();
            this.isRunning = false;
            if (this.currentStore) {
                this.updateStatus(this.currentStore.id, 'stopped', '자정 예약 자동화가 중지되었습니다.');
            }
            console.log('자정 예약 자동화가 중지되었습니다.');
        }
        catch (error) {
            console.error('자정 예약 자동화 중지 중 오류:', error);
            throw error;
        }
    }
    /**
     * 상태 업데이트 콜백 설정
     * @param callback 상태 업데이트 콜백 함수
     */
    setStatusCallback(callback) {
        this.statusCallback = callback;
    }
    /**
     * 상태 업데이트 메서드
     * @param storeId 스토어 ID
     * @param status 상태 코드
     * @param message 상태 메시지
     */
    updateStatus(storeId, status, message) {
        console.log(`[${storeId}] 상태 업데이트: ${status} - ${message}`);
        // 메인 윈도우에 상태 업데이트 전송
        if (this.mainWindow && this.mainWindow.webContents) {
            this.mainWindow.webContents.send('automation-status', {
                storeId,
                status,
                message
            });
        }
    }
    /**
     * 말일 자정 예약 작업 스케줄링
     * @param store 타겟 스토어 정보
     * @returns Promise<void>
     */
    async scheduleMonthEndMidnightReservation(store) {
        this.currentStore = store; // 현재 처리 중인 매장 정보 저장
        // 이미 스케줄링된 작업이 있으면 취소
        if (this.scheduledTask) {
            clearTimeout(this.scheduledTask);
            this.scheduledTask = null;
        }
        // 현재 시간과 말일 자정 계산
        const now = new Date();
        const lastDay = (0, timeUtils_1.getLastDayOfMonth)();
        const isLastDayOfMonth = now.getDate() === lastDay.getDate();
        // 오늘이 말일이 아니면 다음 말일까지 대기
        if (!isLastDayOfMonth) {
            const nextMonthLastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            const daysUntilLastDay = nextMonthLastDay.getDate() - now.getDate();
            console.log(`[${store.name}] 오늘은 말일이 아닙니다. 다음 말일(${nextMonthLastDay.toLocaleDateString()})까지 ${daysUntilLastDay}일 남았습니다.`);
            // 다음 날 0시 1분에 다시 체크하도록 설정
            const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 1, 0, 0);
            const timeUntilTomorrow = tomorrow.getTime() - now.getTime();
            this.scheduledTask = setTimeout(() => {
                this.scheduleMonthEndMidnightReservation(store).catch(err => {
                    console.error(`[${store.name}] 말일 자정 예약 스케줄링 재시도 중 오류:`, err);
                });
            }, timeUntilTomorrow);
            return;
        }
        // 말일인 경우 - 시간 확인
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        // 자정이 이미 지났으면 다음 달 말일로 스케줄링
        if (currentHour > 0 || (currentHour === 0 && currentMinute > 5)) {
            console.log(`[${store.name}] 오늘은 말일이지만 자정이 이미 지났습니다. 다음 달 말일을 대기합니다.`);
            // 다음 날 0시 1분에 다시 체크하도록 설정 (다음 달 1일)
            const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 1, 0, 0);
            const timeUntilTomorrow = tomorrow.getTime() - now.getTime();
            this.scheduledTask = setTimeout(() => {
                this.scheduleMonthEndMidnightReservation(store).catch(err => {
                    console.error(`[${store.name}] 말일 자정 예약 스케줄링 재시도 중 오류:`, err);
                });
            }, timeUntilTomorrow);
            return;
        }
        // 말일이고 자정 전이면 예약 자동화 시작
        console.log(`[${store.name}] 오늘은 말일입니다. 자정 예약 자동화를 시작합니다.`);
        // 다음 달 마지막 날 계산 (현재 말일 시점에서 다음 달 계산)
        const nextMonthLastDay = new Date(now.getFullYear(), now.getMonth() + 2, 0);
        const daysUntilLastDay = Math.ceil((nextMonthLastDay.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        this.updateStatus(this.currentStore.id, // store.id 대신 this.currentStore.id 사용
        'waiting', `다음 말일(${nextMonthLastDay.toLocaleDateString()})까지 ${daysUntilLastDay}일 남았습니다.`);
        // 다음 날 0시 1분에 다시 체크하도록 설정
        const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 1, 0, 0);
        const timeUntilTomorrow = tomorrow.getTime() - now.getTime();
        this.scheduledTask = setTimeout(() => {
            this.scheduleMonthEndMidnightReservation(store).catch(err => {
                console.error(`[${store.name}] 말일 자정 예약 스케줄링 재시도 중 오류:`, err);
            });
        }, timeUntilTomorrow);
        return;
    }
    /**
     * 브라우저와 관련 리소스를 강제로 정리하는 메서드
     * 오류 상황에서 호출되어 자원을 해제함
     * @returns Promise<void>
     */
    async forceClearResources(storeIdToClear) {
        const logPrefix = storeIdToClear ? `[${storeIdToClear}]` : `[${this.currentStore?.id || 'Global'}]`;
        console.log(`${logPrefix} 자원 강제 정리 시작`);
        try {
            // 스케줄링된 작업 취소
            if (this.scheduledTask) {
                clearTimeout(this.scheduledTask);
                this.scheduledTask = null;
                console.log(`${logPrefix} 예약 스케줄링 작업 취소됨`);
            }
            // 페이지 정리
            if (this.page) {
                try {
                    if (!this.page.isClosed()) {
                        await this.page.close();
                        console.log(`${logPrefix} 페이지가 성공적으로 닫혔습니다.`);
                    }
                }
                catch (error) {
                    console.error(`${logPrefix} 페이지 닫기 중 오류:`, error);
                }
                finally {
                    this.page = null;
                }
            }
            // 컨텍스트 정리
            if (this.context) {
                try {
                    // 컨텍스트의 모든 페이지 확인 및 정리
                    const pages = this.context.pages();
                    await Promise.all(pages.map(async (page) => {
                        if (!page.isClosed()) {
                            await page.close().catch(err => console.error(`${logPrefix} 추가 페이지 닫기 중 오류:`, err));
                        }
                    }));
                    await this.context.close();
                    console.log(`${logPrefix} 브라우저 컨텍스트가 성공적으로 닫혔습니다.`);
                }
                catch (error) {
                    console.error(`${logPrefix} 브라우저 컨텍스트 닫기 중 오류:`, error);
                }
                finally {
                    this.context = null;
                }
            }
            // 브라우저 정리
            if (this.browser) {
                try {
                    if (this.browser.isConnected()) {
                        // 브라우저의 모든 컨텍스트 확인 및 정리
                        const contexts = this.browser.contexts();
                        await Promise.all(contexts.map(async (context) => {
                            await context.close().catch(err => console.error(`${logPrefix} 추가 컨텍스트 닫기 중 오류:`, err));
                        }));
                        await this.browser.close();
                        console.log(`${logPrefix} 브라우저가 성공적으로 닫혔습니다.`);
                    }
                }
                catch (error) {
                    console.error(`${logPrefix} 브라우저 닫기 중 오류:`, error);
                }
                finally {
                    this.browser = null;
                }
            }
            // automationProcesses 정리
            if (storeIdToClear && this.automationProcesses) {
                if (this.automationProcesses[storeIdToClear]) {
                    const process = this.automationProcesses[storeIdToClear];
                    if (process && typeof process.stop === 'function') {
                        await process.stop().catch((err) => console.error(`${logPrefix} 프로세스 중지 중 오류:`, err));
                    }
                    delete this.automationProcesses[storeIdToClear];
                    console.log(`${logPrefix} automationProcesses에서 ${storeIdToClear} 제거됨`);
                }
                // 모든 프로세스가 정리되었는지 확인
                if (Object.keys(this.automationProcesses).length === 0) {
                    console.log(`[Global] 모든 자동화 프로세스가 정리되었습니다.`);
                    // 여기서 필요한 경우 추가적인 전역 리소스 정리 수행
                }
            }
            console.log(`${logPrefix} 자원 정리가 완료되었습니다.`);
        }
        catch (error) {
            console.error(`${logPrefix} 자원 정리 중 예상치 못한 오류:`, error);
            throw error; // 상위 레벨에서 처리할 수 있도록 오류 전파
        }
    }
}
exports.MidnightReservationService = MidnightReservationService;
