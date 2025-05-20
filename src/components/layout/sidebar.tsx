"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Clock, Home, Settings, History, User, Store, Play } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname()

  return (
    <div className={cn("pb-12", className)}>
      <div className="space-y-4 py-4">
        <div className="px-4 py-2">
          <h2 className="mb-2 px-2 text-lg font-semibold tracking-tight">
            메뉴
          </h2>
          <div className="space-y-1">
            <Button
              asChild
              variant={pathname === "/dashboard" ? "default" : "ghost"}
              className="w-full justify-start"
            >
              <Link href="/dashboard">
                <Home className="mr-2 h-4 w-4" />
                대시보드
              </Link>
            </Button>
            <Button
              asChild
              variant={pathname === "/stores" ? "default" : "ghost"}
              className="w-full justify-start"
            >
              <Link href="/stores">
                <Store className="mr-2 h-4 w-4" />
                매장 설정
              </Link>
            </Button>
            <Button
              asChild
              variant={pathname === "/reservation" ? "default" : "ghost"}
              className="w-full justify-start"
            >
              <Link href="/reservation">
                <Clock className="mr-2 h-4 w-4" />
                예약 실행
              </Link>
            </Button>
            <Button
              asChild
              variant={pathname === "/history" ? "default" : "ghost"}
              className="w-full justify-start"
            >
              <Link href="/history">
                <History className="mr-2 h-4 w-4" />
                예약 이력
              </Link>
            </Button>
            <Button
              asChild
              variant={pathname === "/automation" ? "default" : "ghost"}
              className="w-full justify-start"
            >
              <Link href="/automation">
                <Play className="mr-2 h-4 w-4" />
                자동화 실행
              </Link>
            </Button>
          </div>
        </div>
        <div className="px-4 py-2">
          <h2 className="mb-2 px-2 text-lg font-semibold tracking-tight">
            계정
          </h2>
          <div className="space-y-1">
            <Button
              asChild
              variant={pathname === "/profile" ? "default" : "ghost"}
              className="w-full justify-start"
            >
              <Link href="/profile">
                <User className="mr-2 h-4 w-4" />
                프로필
              </Link>
            </Button>
            <Button
              asChild
              variant={pathname === "/settings" ? "default" : "ghost"}
              className="w-full justify-start"
            >
              <Link href="/settings">
                <Settings className="mr-2 h-4 w-4" />
                설정
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
