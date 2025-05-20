import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import 'antd/dist/reset.css';

import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Toaster } from "@/components/ui/toaster";
import { ConfigProvider, theme } from 'antd';
import koKR from 'antd/locale/ko_KR';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RolexReserve Pro",
  description: "롤렉스 예약 관리 프로그램",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning className="dark">
      <body className={`${inter.className} min-h-screen bg-background antialiased`}>
        <ConfigProvider
          theme={{
            algorithm: theme.defaultAlgorithm,
            token: {
              colorPrimary: '#1677ff',
              borderRadius: 6,
            },
          }}
          locale={koKR}
        >
          <div className="relative flex min-h-screen flex-col">
            <Header />
            <div className="flex-1">{children}</div>
            <Footer />
          </div>
          <Toaster />
        </ConfigProvider>
      </body>
    </html>
  );
}
