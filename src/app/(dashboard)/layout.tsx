"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { useBusiness } from "@/hooks/use-business";

const themeClasses: Record<string, string> = {
  default: "",
  blue: "theme-blue",
  purple: "theme-purple",
  green: "theme-green",
  orange: "theme-orange",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { business } = useBusiness();

  const theme = (business as { theme?: string } | null)?.theme ?? "default";
  const themeClass = themeClasses[theme] ?? "";

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className={`min-h-screen bg-background ${themeClass}`}>
      <AppSidebar
        businessName={business?.name}
        logoUrl={(business as { logo_url?: string } | null)?.logo_url ?? undefined}
        onSignOut={handleSignOut}
      />
      <main className="lg:pl-64">
        <div className="container mx-auto p-4 pt-16 lg:p-8 lg:pt-8">{children}</div>
      </main>
    </div>
  );
}
