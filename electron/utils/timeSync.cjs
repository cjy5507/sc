/**
 * timeSync 모듈 테스트
 */
const { timeSync } = require('./timeSync');

async function testTimeSync() {
  try {
    await timeSync.syncTime();
    console.log('시간 동기화가 성공적으로 완료되었습니다.');
    return { success: true };
  } catch (error) {
    console.error('시간 동기화 테스트 실패:', error.message);
    return { success: false, error: error.message };
  }
}

if (require.main === module) {
  testTimeSync()
    .then(result => console.log('테스트 결과:', result))
    .catch(err => console.error('테스트 오류:', err));
}

module.exports = { testTimeSync }; 