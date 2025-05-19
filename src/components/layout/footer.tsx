"use client"

import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center justify-between py-4">
        <div className="flex items-center">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} RolexReserve Pro. All rights reserved.
          </p>
        </div>
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <Link href="/terms" className="hover:text-foreground">
            이용약관
          </Link>
          <Link href="/privacy" className="hover:text-foreground">
            개인정보처리방침
          </Link>
          <Link href="/contact" className="hover:text-foreground">
            문의하기
          </Link>
        </div>
      </div>
    </footer>
  )
}
