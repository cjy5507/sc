"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runChronodigmScenario = runChronodigmScenario;
const playwright_1 = require("playwright");
async function runChronodigmScenario(options) {
    const browser = await playwright_1.chromium.launch({ headless: false });
    const page = await browser.newPage();
    try {
        await page.goto('https://www.chronodigmwatch.co.kr/rolex/contact-seoul/appointment/', { waitUntil: 'domcontentloaded' });
        options?.onStatusUpdate?.({ name: 'chronodigm', status: 'in-progress', message: '페이지 진입' });
        // 1. 쿠키/개인정보 동의 자동 클릭
        const agreeBtn = await page.$('text=모두 수락');
        if (agreeBtn)
            await agreeBtn.click();
        // 2. 예약 목적 입력 (예시)
        await page.fill('textarea', '롤렉스 시계 예약');
        // 3. 날짜/시간 선택 (구체적 선택자/로직은 실제 DOM에 맞게 추가 필요)
        // await page.click('text=날짜 및 시간 선택하기');
        // await page.click('text=다음');
        // 4. 연락처 정보 입력 (예시)
        await page.fill('input[placeholder="이름"]', '홍길동');
        await page.fill('input[placeholder="이메일"]', 'test@example.com');
        await page.fill('input[placeholder="전화번호"]', '01012345678');
        // 약관 동의 체크
        const terms = await page.$('input[type="checkbox"]');
        if (terms)
            await terms.check();
        // 5. 예약하기 버튼 클릭 (PASS 인증 직전)
        options?.onStatusUpdate?.({ name: 'chronodigm', status: 'waiting-auth', message: 'PASS 본인인증 대기', authStartTime: Date.now(), authTimeout: 180000 });
        // await page.click('text=예약하기');
        // 실제로는 PASS 인증 창이 뜨는지 감지 필요
        // 6. 인증 완료 감지 (예시: 3분 대기 후 타임아웃)
        const authResult = await waitForAuthOrTimeout(page, 180000); // 3분
        if (authResult === 'success') {
            options?.onStatusUpdate?.({ name: 'chronodigm', status: 'success', message: '예약 성공' });
            await browser.close();
            return 'success';
        }
        else if (authResult === 'timeout') {
            options?.onStatusUpdate?.({ name: 'chronodigm', status: 'timeout', message: 'PASS 인증 타임아웃' });
            await browser.close();
            return 'timeout';
        }
        else {
            options?.onStatusUpdate?.({ name: 'chronodigm', status: 'fail', message: '예약 실패' });
            await browser.close();
            return 'fail';
        }
    }
    catch (e) {
        options?.onStatusUpdate?.({ name: 'chronodigm', status: 'fail', message: '오류 발생: ' + e.message });
        await browser.close();
        return 'fail';
    }
}
async function waitForAuthOrTimeout(page, timeout) {
    // TODO: 실제 PASS 인증 완료 감지 로직 구현 (예: 특정 DOM 변화, URL 변화 등)
    // 임시로 timeout만 구현
    await page.waitForTimeout(timeout);
    return 'timeout';
}
//# sourceMappingURL=chronodigm.js.map