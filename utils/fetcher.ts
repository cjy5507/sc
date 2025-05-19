/**
 * API 호출을 위한 기본 fetcher 유틸리티
 */

type FetcherOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  cache?: RequestCache;
};

/**
 * API 호출을 위한 기본 fetcher 함수
 * @param url API 엔드포인트 URL
 * @param options 요청 옵션
 * @returns Promise<T> 응답 데이터
 */
export async function fetcher<T = any>(url: string, options: FetcherOptions = {}): Promise<T> {
  const {
    method = 'GET',
    headers = {},
    body,
    cache = 'default',
  } = options;

  const requestOptions: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    cache,
  };

  if (body) {
    requestOptions.body = JSON.stringify(body);
  }

  const response = await fetch(url, requestOptions);

  // 응답이 성공적이지 않은 경우 에러 발생
  if (!response.ok) {
    const error = new Error('API 요청 실패');
    try {
      const errorData = await response.json();
      (error as any).info = errorData;
      (error as any).status = response.status;
    } catch (e) {
      (error as any).status = response.status;
      (error as any).info = { message: response.statusText };
    }
    throw error;
  }

  // 응답 데이터가 없는 경우 (204 No Content)
  if (response.status === 204) {
    return {} as T;
  }

  // JSON 응답 반환
  return response.json();
}

/**
 * GET 요청 헬퍼 함수
 */
export function get<T = any>(url: string, options: Omit<FetcherOptions, 'method' | 'body'> = {}): Promise<T> {
  return fetcher<T>(url, { ...options, method: 'GET' });
}

/**
 * POST 요청 헬퍼 함수
 */
export function post<T = any>(url: string, body: any, options: Omit<FetcherOptions, 'method' | 'body'> = {}): Promise<T> {
  return fetcher<T>(url, { ...options, method: 'POST', body });
}

/**
 * PUT 요청 헬퍼 함수
 */
export function put<T = any>(url: string, body: any, options: Omit<FetcherOptions, 'method' | 'body'> = {}): Promise<T> {
  return fetcher<T>(url, { ...options, method: 'PUT', body });
}

/**
 * DELETE 요청 헬퍼 함수
 */
export function del<T = any>(url: string, options: Omit<FetcherOptions, 'method'> = {}): Promise<T> {
  return fetcher<T>(url, { ...options, method: 'DELETE' });
}

/**
 * PATCH 요청 헬퍼 함수
 */
export function patch<T = any>(url: string, body: any, options: Omit<FetcherOptions, 'method' | 'body'> = {}): Promise<T> {
  return fetcher<T>(url, { ...options, method: 'PATCH', body });
}
