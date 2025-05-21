/**
 * 프리로드 스크립트
 *
 * 렌더러 프로세스에서 사용할 수 있는 API를 노출합니다.
 * 렌더러 프로세스에서 안전하게 메인 프로세스와 통신할 수 있도록 합니다.
 */
const { contextBridge, ipcRenderer } = require('electron');
// 전역 윈도우 객체에 노출할 API 정의
contextBridge.exposeInMainWorld('electronAPI', {
    /**
     * 자동화 시작
     * @param {Object} params - 자동화 설정
     * @param {string[]} params.stores - 매장 ID 배열
     * @returns {Promise<Object>} 자동화 결과
     */
    startAutomation: (params) => ipcRenderer.invoke('start-automation', params),
    /**
     * 자동화 중지
     * @param {Object} params - 중지할 매장 설정
     * @param {string[]} params.stores - 매장 ID 배열
     * @returns {Promise<Object>} 중지 결과
     */
    stopAutomation: (params) => ipcRenderer.invoke('stop-automation', params),
    /**
     * 자동화 상태 이벤트 리스너
     * @param {Function} callback - 상태 업데이트 시 호출될 콜백
     */
    onAutomationStatus: (callback) => {
        ipcRenderer.on('automation-status', (_event, status) => {
            callback(status);
        });
    },
    /**
     * 시간 동기화 업데이트 이벤트 리스너
     * @param {Function} callback - 상태 업데이트 시 호출될 콜백
     */
    onTimeSyncUpdate: (callback) => {
        const listener = (_event, status) => callback(status);
        ipcRenderer.on('time-sync-update', listener);
        return () => ipcRenderer.removeListener('time-sync-update', listener);
    },
    /**
     * 시간 동기화 오류 이벤트 리스너
     * @param {Function} callback - 오류 발생 시 호출될 콜백
     */
    onTimeSyncError: (callback) => {
        const listener = (_event, err) => callback(err);
        ipcRenderer.on('time-sync-error', listener);
        return () => ipcRenderer.removeListener('time-sync-error', listener);
    },
    /**
     * 메인 윈도우 닫기
     * 애플리케이션을 종료합니다.
     */
    closeMainWindow: () => ipcRenderer.send('close-main-window')
});
