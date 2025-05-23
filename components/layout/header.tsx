"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, Settings, User } from "lucide-react"

import { cn } from "../../lib/utils"
import { Button } from "../ui/button"

export function Header() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 flex">
          <Button
            variant="ghost"
            className="mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden"
            onClick={() => setIsOpen(!isOpen)}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold text-xl inline-block bg-gradient-to-r from-[#d4af37] to-[#f5e7a3] bg-clip-text text-transparent">
              RolexReserve Pro
            </span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link
              href="/dashboard"
              className={cn(
                "transition-colors hover:text-foreground/80",
                pathname === "/dashboard" ? "text-foreground" : "text-foreground/60"
              )}
            >
              대시보드
            </Link>
            <Link
              href="/profile"
              className={cn(
                "transition-colors hover:text-foreground/80",
                pathname === "/profile" ? "text-foreground" : "text-foreground/60"
              )}
            >
              프로필
            </Link>
            <Link
              href="/history"
              className={cn(
                "transition-colors hover:text-foreground/80",
                pathname === "/history" ? "text-foreground" : "text-foreground/60"
              )}
            >
              예약 이력
            </Link>
          </nav>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
              <span className="sr-only">설정</span>
            </Button>
            <Button variant="ghost" size="icon">
              <User className="h-5 w-5" />
              <span className="sr-only">계정</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
