#!/usr/bin/env node
import { ReservationScheduler } from '../src/services/reservationScheduler';
import { Command } from 'commander';
import inquirer from 'inquirer';

const program = new Command();

program
  .name('rolex-reservation')
  .description('롤렉스 매장 예약 자동화 도구')
  .version('1.0.0');

program
  .command('start')
  .description('예약 프로세스 시작')
  .option('-s, --store <type>', '매장 선택 (chronodigm, unopangyo, hyundai, hongbo)')
  .option('-d, --date <date>', '예약 희망일 (YYYY-MM-DD)')
  .option('-t, --time <time>', '예약 희망 시간 (HH:MM)')
  .option('-n, --name <name>', '이름')
  .option('-p, --phone <phone>', '전화번호')
  .option('-e, --email <email>', '이메일')
  .option('-m, --memo <memo>', '메모')
  .action(async (options) => {
    try {
      // 필수 옵션 확인
      if (!options.store || !options.date || !options.time || !options.name || !options.phone || !options.email) {
        console.error('필수 옵션이 누락되었습니다. --help를 참조하세요.');
        process.exit(1);
      }

      console.log('롤렉스 예약 도구를 시작합니다...');
      console.log('매장:', options.store);
      console.log('예약 희망일:', options.date);
      console.log('예약 희망시간:', options.time);
      console.log('이름:', options.name);
      console.log('전화번호:', options.phone);
      console.log('이메일:', options.email);
      if (options.memo) console.log('메모:', options.memo);

      const scheduler = new ReservationScheduler({
        store: options.store as any,
        targetDate: options.date,
        targetTime: options.time,
        userInfo: {
          name: options.name,
          phone: options.phone,
          email: options.email,
          memo: options.memo
        }
      });

      // 프로세스 종료 시 정리
      process.on('SIGINT', async () => {
        console.log('\n프로그램을 종료합니다...');
        await scheduler.stop();
        process.exit();
      });

      // 예약 시작
      await scheduler.start();
    } catch (error) {
      console.error('오류가 발생했습니다:', error);
      process.exit(1);
    }
  });

// 인터랙티브 모드
program
  .command('interactive')
  .description('인터랙티브 모드로 예약 시작')
  .action(async () => {
    try {
      const answers = await inquirer.prompt([
        {
          type: 'list',
          name: 'store',
          message: '매장을 선택하세요:',
          choices: [
            { name: '롯데 명동 (크로노다임)', value: 'chronodigm' },
            { name: '현대 판교 (우노와치)', value: 'unopangyo' },
            { name: '현대 무역 (현대시계)', value: 'hyundai' },
            { name: '롯데 서면 (홍보시계)', value: 'hongbo' }
          ]
        },
        {
          type: 'input',
          name: 'date',
          message: '예약 희망일을 입력하세요 (YYYY-MM-DD):',
          validate: (input: string) => {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            return dateRegex.test(input) || '올바른 날짜 형식(YYYY-MM-DD)으로 입력해주세요.';
          }
        },
        {
          type: 'input',
          name: 'time',
          message: '예약 희망 시간을 입력하세요 (HH:MM):',
          validate: (input: string) => {
            const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
            return timeRegex.test(input) || '올바른 시간 형식(HH:MM)으로 입력해주세요.';
          }
        },
        {
          type: 'input',
          name: 'name',
          message: '이름을 입력하세요:',
          validate: (input: string) => !!input.trim() || '이름을 입력해주세요.'
        },
        {
          type: 'input',
          name: 'phone',
          message: '전화번호를 입력하세요 (숫자만):',
          validate: (input: string) => /^\d+$/.test(input) || '숫자만 입력해주세요.'
        },
        {
          type: 'input',
          name: 'email',
          message: '이메일을 입력하세요:',
          validate: (input: string) => 
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input) || '올바른 이메일 형식으로 입력해주세요.'
        },
        {
          type: 'input',
          name: 'memo',
          message: '메모 (선택사항):',
          default: ''
        }
      ]);

      console.log('\n예약 정보를 확인해주세요:');
      console.log('매장:', answers.store);
      console.log('예약 희망일:', answers.date);
      console.log('예약 희망시간:', answers.time);
      console.log('이름:', answers.name);
      console.log('전화번호:', answers.phone);
      console.log('이메일:', answers.email);
      if (answers.memo) console.log('메모:', answers.memo);

      const confirm = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirmed',
          message: '위 정보로 예약을 시작하시겠습니까?',
          default: false
        }
      ]);

      if (!confirm.confirmed) {
        console.log('예약이 취소되었습니다.');
        process.exit(0);
      }

      const scheduler = new ReservationScheduler({
        store: answers.store,
        targetDate: answers.date,
        targetTime: answers.time,
        userInfo: {
          name: answers.name,
          phone: answers.phone,
          email: answers.email,
          memo: answers.memo
        }
      });

      // 프로세스 종료 시 정리
      process.on('SIGINT', async () => {
        console.log('\n프로그램을 종료합니다...');
        await scheduler.stop();
        process.exit();
      });

      // 예약 시작
      await scheduler.start();
    } catch (error) {
      console.error('오류가 발생했습니다:', error);
      process.exit(1);
    }
  });

// 도움말 표시
program.parseAsync(process.argv).catch(console.error);

// 인자가 없으면 도움말 표시
if (!process.argv.slice(2).length) {
  program.outputHelp();
  process.exit(1);
}
