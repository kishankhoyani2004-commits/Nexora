import type { ReactNode } from "react";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { DashboardTopbar } from "@/components/layout/DashboardTopbar";
import type { NavItem } from "@/constants/nav";

interface DashboardLayoutProps {
  navItems?: NavItem[];
  ctaLabel?: string;
  onCtaClick?: () => void;
  tagline?: string;
  searchPlaceholder?: string;
  topbarRightSlot?: ReactNode;
  children: ReactNode;
  noPadding?: boolean;
}

export function DashboardLayout({
  ctaLabel,
  onCtaClick,
  tagline,
  searchPlaceholder,
  topbarRightSlot,
  children,
  noPadding,
}: DashboardLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-surface-app">
      <DashboardSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardTopbar searchPlaceholder={searchPlaceholder} rightSlot={topbarRightSlot} />
        <main className={noPadding ? "flex-1 overflow-y-auto" : "flex-1 overflow-y-auto p-8"}>
          {children}
        </main>
      </div>
    </div>
  );
}
