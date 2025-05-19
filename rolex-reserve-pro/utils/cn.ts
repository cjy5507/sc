import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * 클래스명을 조건부로 결합하는 유틸리티 함수
 * clsx와 tailwind-merge를 사용하여 클래스명을 효율적으로 관리
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
