"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.randomDelay = randomDelay;
exports.moveMouseNaturally = moveMouseNaturally;
exports.humanClick = humanClick;
exports.humanType = humanType;
exports.humanScroll = humanScroll;
/**
 * 인간과 같은 지연 시간 제공
 * @param min 최소 지연 시간(ms)
 * @param max 최대 지연 시간(ms)
 * @returns Promise<void>
 */
function randomDelay(min = 100, max = 300) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
}
/**
 * 자연스러운 마우스 움직임을 시뮬레이션하기 위해 랜덤한 베지어 곡선 경로를 생성합니다.
 * @param startX 시작 X 좌표
 * @param startY 시작 Y 좌표
 * @param endX 종료 X 좌표
 * @param endY 종료 Y 좌표
 * @param pointCount 경로 포인트 개수
 * @returns 좌표 배열 {x, y}[]
 */
function generateRandomBezierPath(startX, startY, endX, endY, pointCount = 10) {
    // 제어점 계산 (곡선 생성을 위한 중간 포인트)
    const cp1x = startX + (Math.random() * 0.5 + 0.25) * (endX - startX);
    const cp1y = startY + (Math.random() * 0.8 - 0.4) * (endY - startY);
    const cp2x = startX + (Math.random() * 0.5 + 0.5) * (endX - startX);
    const cp2y = startY + (Math.random() * 0.8 - 0.4) * (endY - startY);
    const points = [];
    // 베지어 곡선 포인트 생성
    for (let i = 0; i <= pointCount; i++) {
        const t = i / pointCount;
        const x = Math.pow(1 - t, 3) * startX +
            3 * Math.pow(1 - t, 2) * t * cp1x +
            3 * (1 - t) * Math.pow(t, 2) * cp2x +
            Math.pow(t, 3) * endX;
        const y = Math.pow(1 - t, 3) * startY +
            3 * Math.pow(1 - t, 2) * t * cp1y +
            3 * (1 - t) * Math.pow(t, 2) * cp2y +
            Math.pow(t, 3) * endY;
        // 약간의 노이즈 추가 (마우스 떨림 시뮬레이션)
        const noise = Math.random() * 2 - 1; // -1 ~ 1
        points.push({
            x: Math.round(x + noise),
            y: Math.round(y + noise)
        });
    }
    return points;
}
/**
 * 자연스러운 마우스 움직임으로 요소로 이동
 * @param page Playwright 페이지 객체
 * @param selector 대상 요소 선택자
 * @returns Promise<boolean> 성공 여부
 */
async function moveMouseNaturally(page, selector) {
    try {
        // 현재 마우스 위치 가져오기 (기본값은 화면 중앙)
        const viewportSize = page.viewportSize() || { width: 1280, height: 720 };
        let currentX = viewportSize.width / 2;
        let currentY = viewportSize.height / 2;
        // 타겟 요소 위치 가져오기
        const element = await page.$(selector);
        if (!element)
            return false;
        const boundingBox = await element.boundingBox();
        if (!boundingBox)
            return false;
        // 요소 중앙 좌표 계산
        const targetX = boundingBox.x + boundingBox.width / 2;
        const targetY = boundingBox.y + boundingBox.height / 2;
        // 베지어 곡선 경로 생성
        const points = generateRandomBezierPath(currentX, currentY, targetX, targetY, Math.floor(Math.random() * 10) + 10 // 10-20 포인트
        );
        // 경로를 따라 마우스 이동
        for (const point of points) {
            await page.mouse.move(point.x, point.y);
            await randomDelay(5, 15); // 포인트 간 짧은 지연
        }
        return true;
    }
    catch (error) {
        console.error('자연스러운 마우스 이동 실패:', error);
        return false;
    }
}
/**
 * 인간처럼 요소 클릭하기
 * @param page Playwright 페이지 객체
 * @param selector 클릭할 요소 선택자
 * @returns Promise<boolean> 성공 여부
 */
async function humanClick(page, selector) {
    try {
        // 자연스러운 마우스 이동
        const moved = await moveMouseNaturally(page, selector);
        if (!moved) {
            // 마우스 이동 실패 시 일반 클릭 시도
            await page.click(selector);
            return true;
        }
        // 약간의 지연 후 마우스 다운
        await randomDelay(50, 150);
        await page.mouse.down();
        // 실제 사람처럼 버튼 누르고 있는 효과
        await randomDelay(50, 200);
        // 마우스 업
        await page.mouse.up();
        return true;
    }
    catch (error) {
        console.error('인간형 클릭 실패:', error);
        // 실패 시 일반 클릭 시도
        try {
            await page.click(selector);
            return true;
        }
        catch {
            return false;
        }
    }
}
/**
 * 인간처럼 텍스트 입력하기
 * @param page Playwright 페이지 객체
 * @param selector 입력 필드 선택자
 * @param text 입력할 텍스트
 * @returns Promise<boolean> 성공 여부
 */
async function humanType(page, selector, text) {
    try {
        // 입력 필드로 마우스 이동 및 클릭
        const clicked = await humanClick(page, selector);
        if (!clicked)
            return false;
        await randomDelay(100, 300);
        // 필드 내용 선택 및 삭제
        await page.click(selector, { clickCount: 3 }); // 텍스트 전체 선택
        await randomDelay(50, 150);
        await page.keyboard.press('Backspace');
        await randomDelay(50, 150);
        // 한 글자씩 입력
        for (const char of text) {
            await page.keyboard.type(char);
            await randomDelay(30, 100); // 타이핑 사이의 지연
        }
        return true;
    }
    catch (error) {
        console.error('인간형 텍스트 입력 실패:', error);
        // 실패 시 일반 입력 시도
        try {
            await page.fill(selector, text);
            return true;
        }
        catch {
            return false;
        }
    }
}
/**
 * 인간처럼 스크롤하기
 * @param page Playwright 페이지 객체
 * @param distance 스크롤 거리 (양수: 아래로, 음수: 위로)
 * @param smooth 부드러운 스크롤 여부
 * @returns Promise<void>
 */
async function humanScroll(page, distance, smooth = true) {
    if (smooth) {
        // 부드러운 스크롤 (여러 작은 단계로 나누기)
        const steps = Math.abs(Math.floor(distance / 100)) + 1;
        const stepDistance = distance / steps;
        for (let i = 0; i < steps; i++) {
            await page.evaluate((dist) => {
                window.scrollBy({
                    top: dist,
                    behavior: 'smooth'
                });
            }, stepDistance);
            await randomDelay(50, 150);
        }
    }
    else {
        // 일반 스크롤
        await page.evaluate((dist) => {
            window.scrollBy(0, dist);
        }, distance);
    }
    // 스크롤 후 짧은 대기
    await randomDelay(300, 800);
}
