"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Bot,
  ListTodo,
  FileText,
  Settings,
  Sparkles,
  LogOut,
  Menu,
  X,
  Brain,
  BookOpen,
  Lightbulb,
  TrendingUp,
  BarChart3,
  Plug,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const navGroups = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/suggestions", label: "Suggestions", icon: Lightbulb },
    ],
  },
  {
    label: "AI Agents",
    items: [
      { href: "/ceo", label: "CEO Agent", icon: Brain },
      { href: "/agents", label: "All Agents", icon: Bot },
      { href: "/research", label: "Research", icon: TrendingUp },
    ],
  },
  {
    label: "Work",
    items: [
      { href: "/tasks", label: "Tasks", icon: ListTodo },
      { href: "/reports", label: "Reports", icon: FileText },
      { href: "/knowledge-base", label: "Knowledge Base", icon: BookOpen },
    ],
  },
  {
    label: "Business",
    items: [
      { href: "/company", label: "Company Profile", icon: Building2 },
      { href: "/integrations", label: "Integrations", icon: Plug },
      { href: "/setup", label: "Business Setup", icon: Building2 },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

interface SidebarNavProps {
  pathname: string;
  businessName?: string;
  logoUrl?: string;
  onSignOut?: () => void;
  onNavigate?: () => void;
}

function SidebarNav({ pathname, businessName, logoUrl, onSignOut, onNavigate }: SidebarNavProps) {
  return (
    <>
      <div className="flex items-center gap-2 px-4 py-5">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="Logo" className="h-9 w-9 rounded-lg object-cover" />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
        )}
        <div>
          <p className="text-sm font-bold">AI Business OS</p>
          {businessName && (
            <p className="truncate text-xs text-muted-foreground max-w-[140px]">{businessName}</p>
          )}
        </div>
      </div>
      <Separator />
      <nav className="flex flex-col gap-4 p-3 flex-1 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {group.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <Separator />
      <div className="p-3">
        <Button variant="ghost" className="w-full justify-start gap-3" onClick={onSignOut}>
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </>
  );
}

interface AppSidebarProps {
  businessName?: string;
  logoUrl?: string;
  onSignOut?: () => void;
}

export function AppSidebar({ businessName, logoUrl, onSignOut }: AppSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="fixed left-4 top-4 z-50 lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </Button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-card transition-transform lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarNav
          pathname={pathname}
          businessName={businessName}
          logoUrl={logoUrl}
          onSignOut={onSignOut}
          onNavigate={() => setMobileOpen(false)}
        />
      </aside>
    </>
  );
}
