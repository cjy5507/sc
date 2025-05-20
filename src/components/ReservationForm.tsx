import React, { useState, useEffect } from 'react';
import { useReservation } from '../hooks/useReservation';
import { Button, Card, Form, Input, Select, Space, Typography, Alert, Spin } from 'antd';
import { PlayCircleOutlined, StopOutlined, ReloadOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

// 매장 목록 (실제 매장 데이터로 교체 필요)
const STORES = [
  { value: 'gangnam', label: '강남점' },
  { value: 'jamsil', label: '잠실점' },
  { value: 'hongdae', label: '홍대점' },
  { value: 'myeongdong', label: '명동점' },
];

// 시간 목록 (실제 예약 가능 시간으로 교체 필요)
const TIME_SLOTS = [
  '10:00', '10:30', '11:00', '11:30', 
  '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30'
];

const ReservationForm: React.FC = () => {
  const [form] = Form.useForm();
  const { isReserving, status, error, startReservation, stopReservation } = useReservation();
  const [countdown, setCountdown] = useState<string>('');

  // 폼 초기값 설정
  useEffect(() => {
    if (status.store) {
      form.setFieldsValue({
        store: status.store,
        targetDate: status.targetDate || getTodayDate(),
        targetTime: status.targetTime,
      });
    }
  }, [status, form]);

  // 카운트다운 업데이트
  useEffect(() => {
    if (!status.targetDate || !status.targetTime) {
      setCountdown('');
      return;
    }

    const updateCountdown = () => {
      const target = new Date(`${status.targetDate}T${status.targetTime}:00`);
      const now = new Date();
      const diff = target.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdown('예약 시간이 되었습니다!');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setCountdown(`${hours}시간 ${minutes}분 ${seconds}초 남음`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [status.targetDate, status.targetTime]);

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const handleSubmit = async (values: any) => {
    const result = await startReservation({
      store: values.store,
      targetDate: values.targetDate,
      targetTime: values.targetTime,
      userInfo: {
        name: values.name,
        phone: values.phone,
        email: values.email,
      },
    });

    if (result.success) {
      // 성공 시 처리
    }
  };

  const handleStop = async () => {
    await stopReservation();
  };

  return (
    <Card title="로렉스 예약 자동화" style={{ maxWidth: 600, margin: '0 auto' }}>
      {error && (
        <Alert
          message="오류 발생"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {status.progress && (
        <Alert
          message={status.progress}
          type={isReserving ? 'info' : 'success'}
          showIcon
          style={{ marginBottom: 16 }}
          action={
            isReserving && (
              <Button type="text" danger onClick={handleStop} icon={<StopOutlined />}>
                중지
              </Button>
            )
          }
        />
      )}

      {countdown && (
        <div style={{ textAlign: 'center', margin: '16px 0' }}>
          <Text strong>예약까지 남은 시간: {countdown}</Text>
        </div>
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          targetDate: getTodayDate(),
        }}
      >
        <Form.Item
          name="store"
          label="매장 선택"
          rules={[{ required: true, message: '매장을 선택해주세요' }]}
        >
          <Select placeholder="매장을 선택하세요" disabled={isReserving}>
            {STORES.map(store => (
              <Option key={store.value} value={store.value}>
                {store.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="targetDate"
          label="예약 날짜"
          rules={[{ required: true, message: '날짜를 선택해주세요' }]}
        >
          <Input type="date" disabled={isReserving} min={getTodayDate()} />
        </Form.Item>

        <Form.Item
          name="targetTime"
          label="예약 시간"
          rules={[{ required: true, message: '시간을 선택해주세요' }]}
        >
          <Select placeholder="시간을 선택하세요" disabled={isReserving}>
            {TIME_SLOTS.map(time => (
              <Option key={time} value={time}>
                {time}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Title level={4} style={{ marginTop: 24 }}>개인 정보</Title>
        
        <Form.Item
          name="name"
          label="이름"
          rules={[{ required: true, message: '이름을 입력해주세요' }]}
        >
          <Input placeholder="홍길동" disabled={isReserving} />
        </Form.Item>

        <Form.Item
          name="phone"
          label="전화번호"
          rules={[
            { required: true, message: '전화번호를 입력해주세요' },
            {
              pattern: /^01[0-9]{8,9}$/,
              message: '올바른 전화번호 형식이 아닙니다',
            },
          ]}
        >
          <Input placeholder="01012345678" disabled={isReserving} />
        </Form.Item>

        <Form.Item
          name="email"
          label="이메일"
          rules={[
            { required: true, message: '이메일을 입력해주세요' },
            { type: 'email', message: '올바른 이메일 형식이 아닙니다' },
          ]}
        >
          <Input placeholder="example@example.com" disabled={isReserving} />
        </Form.Item>

        <Form.Item style={{ marginTop: 24 }}>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              icon={<PlayCircleOutlined />}
              loading={isReserving}
              disabled={isReserving}
            >
              {isReserving ? '예약 진행 중...' : '예약 시작'}
            </Button>
            
            {isReserving && (
              <Button
                danger
                onClick={handleStop}
                icon={<StopOutlined />}
                loading={isReserving}
              >
                중지
              </Button>
            )}
            
            <Button
              icon={<ReloadOutlined />}
              onClick={() => window.location.reload()}
            >
                새로고침
            </Button>
          </Space>
        </Form.Item>
      </Form>

      {isReserving && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Spin tip="예약 진행 중..." size="large">
            <div style={{ padding: '50px', background: 'rgba(0, 0, 0, 0.05)', borderRadius: '4px' }} />
          </Spin>
        </div>
      )}
    </Card>
  );
};

export default ReservationForm;
