'use client';

import { ElectronProvider } from '@/src/contexts/ElectronContext';
import { Sidebar } from "@/src/components/layout/sidebar";

export default function Home() {
  return (
    <ElectronProvider>
      <div className="container grid flex-1 gap-12 md:grid-cols-[200px_1fr] lg:grid-cols-[250px_1fr]">
        <aside className="hidden w-[200px] flex-col md:flex lg:w-[250px]">
          <Sidebar />
        </aside>
        <main className="flex w-full flex-col overflow-hidden">
          <div className="flex flex-col space-y-6 p-1 md:p-8">
            <div className="flex flex-col space-y-2">
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-[#d4af37] to-[#f5e7a3] bg-clip-text text-transparent">
                RolexReserve Pro
              </h1>
              <p className="text-muted-foreground">
                롤렉스 예약 관리를 위한 프로페셔널 도구입니다.
              </p>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-primary/20 bg-card text-card-foreground shadow-sm transition-all hover:border-primary hover:shadow-md">
                <div className="p-6 flex flex-col space-y-2">
                  <h3 className="font-semibold text-primary">예약 대기</h3>
                  <p className="text-3xl font-bold">3</p>
                </div>
              </div>
              <div className="rounded-lg border border-primary/20 bg-card text-card-foreground shadow-sm transition-all hover:border-primary hover:shadow-md">
                <div className="p-6 flex flex-col space-y-2">
                  <h3 className="font-semibold text-primary">예약 완료</h3>
                  <p className="text-3xl font-bold">12</p>
                </div>
              </div>
              <div className="rounded-lg border border-primary/20 bg-card text-card-foreground shadow-sm transition-all hover:border-primary hover:shadow-md">
                <div className="p-6 flex flex-col space-y-2">
                  <h3 className="font-semibold text-primary">매장 수</h3>
                  <p className="text-3xl font-bold">5</p>
                </div>
              </div>
              <div className="rounded-lg border border-primary/20 bg-card text-card-foreground shadow-sm transition-all hover:border-primary hover:shadow-md">
                <div className="p-6 flex flex-col space-y-2">
                  <h3 className="font-semibold text-primary">프로필 수</h3>
                  <p className="text-3xl font-bold">8</p>
                </div>
              </div>
            </div>
            
            <div className="rounded-lg border border-primary/20 bg-card text-card-foreground shadow-sm transition-all hover:border-primary hover:shadow-md">
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4 text-primary">최근 예약 이력</h3>
                <div className="space-y-4 divide-y divide-primary/10">
                  <div className="flex justify-between items-center py-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-10 bg-primary rounded-full"></div>
                      <div>
                        <p className="font-medium">롤렉스 강남점</p>
                        <p className="text-sm text-muted-foreground">데이토나 - 플래티넘</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-green-500 flex items-center">
                        <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                        예약 완료
                      </p>
                      <p className="text-sm text-muted-foreground">2025-05-18</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-10 bg-primary rounded-full"></div>
                      <div>
                        <p className="font-medium">롤렉스 명동점</p>
                        <p className="text-sm text-muted-foreground">서브마리너 - 블루</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-green-500 flex items-center">
                        <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                        예약 완료
                      </p>
                      <p className="text-sm text-muted-foreground">2025-05-15</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-10 bg-primary rounded-full"></div>
                      <div>
                        <p className="font-medium">롤렉스 부산점</p>
                        <p className="text-sm text-muted-foreground">GMT 마스터 II - 폭시</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-amber-500 flex items-center">
                        <span className="inline-block w-2 h-2 bg-amber-500 rounded-full mr-2"></span>
                        예약 대기
                      </p>
                      <p className="text-sm text-muted-foreground">2025-05-12</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </ElectronProvider>
  );
}
