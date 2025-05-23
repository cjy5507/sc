"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 프리로드 스크립트
 *
 * 렌더러 프로세스에서 사용할 수 있는 API를 노출합니다.
 * 렌더러 프로세스에서 안전하게 메인 프로세스와 통신할 수 있도록 합니다.
 */
const electron_1 = require("electron");
// 전자상거래 예약 시스템 API 노출
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    /**
     * 자동화 시작
     * @param {Object} params - 자동화 설정
     * @param {string[]} params.stores - 매장 ID 배열
     * @returns {Promise<Object>} 자동화 결과
     */
    startAutomation: (params) => electron_1.ipcRenderer.invoke('start-automation', params),
    /**
     * 자동화 중지
     * @param {Object} params - 중지할 매장 설정
     * @param {string[]} params.stores - 매장 ID 배열
     * @returns {Promise<Object>} 중지 결과
     */
    stopAutomation: (params) => electron_1.ipcRenderer.invoke('stop-automation', params),
    /**
     * 말일 자정 예약 자동화 시작
     * @param {Object} params - 말일 자정 예약 설정
     * @param {string} params.storeId - 매장 ID
     * @returns {Promise<Object>} 자동화 결과
     */
    startMidnightReservation: (params) => electron_1.ipcRenderer.invoke('start-midnight-reservation', params),
    /**
     * 말일 자정 예약 자동화 중지
     * @param {Object} params - 중지할 말일 자정 예약 설정
     * @param {string} params.storeId - 매장 ID
     * @returns {Promise<Object>} 중지 결과
     */
    stopMidnightReservation: (params) => electron_1.ipcRenderer.invoke('stop-midnight-reservation', params),
    /**
     * 자동화 상태 이벤트 리스너
     * @param {Function} callback - 상태 업데이트 시 호출될 콜백
     */
    onAutomationStatus: (callback) => {
        const listener = (_event, status) => callback(status);
        electron_1.ipcRenderer.on('automation-status', listener);
        return () => {
            electron_1.ipcRenderer.removeListener('automation-status', listener);
        };
    },
    /**
     * 시간 동기화 업데이트 이벤트 리스너
     * @param {Function} callback - 상태 업데이트 시 호출될 콜백
     */
    onTimeSyncUpdate: (callback) => {
        const listener = (_event, status) => callback(status);
        electron_1.ipcRenderer.on('time-sync-update', listener);
        return () => electron_1.ipcRenderer.removeListener('time-sync-update', listener);
    },
    /**
     * 시간 동기화 오류 이벤트 리스너
     * @param {Function} callback - 오류 발생 시 호출될 콜백
     */
    onTimeSyncError: (callback) => {
        const listener = (_event, err) => callback(err);
        electron_1.ipcRenderer.on('time-sync-error', listener);
        return () => {
            electron_1.ipcRenderer.removeListener('time-sync-error', listener);
        };
    },
    /**
     * 메인 윈도우 닫기
     * 애플리케이션을 종료합니다.
     */
    closeWindow: () => electron_1.ipcRenderer.send('close-main-window')
});
// 개발 환경 표시
console.log('Electron preload.ts loaded');
