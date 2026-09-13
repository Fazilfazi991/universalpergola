"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Banknote, BarChart3, Boxes, CalendarDays, ClipboardCheck, FileText, FolderKanban,
  Gauge, LayoutList, Menu, MessageSquareText, ReceiptText, Settings,
  Users, UserRoundCog, X, type LucideIcon,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { signOutAction } from "@/app/login/actions";
import { canAccessModule, roleLabels, type AppRole, type DashboardModule } from "@/lib/auth/permissions";

type NavItem = { label: string; href: string; icon: LucideIcon; module?: DashboardModule };
const navItems: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: Gauge },
  { label: "Products", href: "/dashboard/products", icon: Boxes, module: "products" },
  { label: "Categories", href: "/dashboard/categories", icon: LayoutList, module: "categories" },
  { label: "Enquiries", href: "/dashboard/enquiries", icon: MessageSquareText, module: "enquiries" },
  { label: "Customers", href: "/dashboard/customers", icon: Users, module: "customers" },
  { label: "Site visits", href: "/dashboard/site-visits", icon: CalendarDays, module: "site-visits" },
  { label: "Quotations", href: "/dashboard/quotations", icon: FileText, module: "quotations" },
  { label: "Projects", href: "/dashboard/projects", icon: FolderKanban, module: "projects" },
  { label: "Payments", href: "/dashboard/payments", icon: Banknote, module: "payments" },
  { label: "Tasks", href: "/dashboard/tasks", icon: ClipboardCheck, module: "tasks" },
  { label: "Feedback", href: "/dashboard/feedback", icon: ReceiptText, module: "feedback" },
  { label: "Reports", href: "/dashboard/reports", icon: BarChart3, module: "reports" },
  { label: "Users", href: "/dashboard/users", icon: UserRoundCog, module: "users" },
  { label: "Settings", href: "/dashboard/settings", icon: Settings, module: "settings" },
];

function NavLinks({ role, onNavigate }: { role: AppRole; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-1" aria-label="Dashboard navigation">
      {navItems.filter((item) => !item.module || canAccessModule(role, item.module)).map((item) => {
        const active = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
        return <Link key={item.href} href={item.href} onClick={onNavigate} className={`flex min-h-11 items-center gap-3 rounded-md px-3 text-sm ${active ? "bg-white/10 font-medium text-white" : "text-white/55 hover:bg-white/6 hover:text-white"}`}><item.icon size={18} strokeWidth={1.7} /><span>{item.label}</span></Link>;
      })}
    </nav>
  );
}

export function DashboardShell({ children, profile }: { children: React.ReactNode; profile: { fullName: string; email: string; role: AppRole } }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const preferredMobileHrefs = profile.role === "admin" || profile.role === "sales"
    ? ["/dashboard", "/dashboard/enquiries", "/dashboard/customers", "/dashboard/tasks"]
    : ["/dashboard", "/dashboard/site-visits", "/dashboard/projects", "/dashboard/tasks"];
  const mobileItems = navItems.filter((item) => preferredMobileHrefs.includes(item.href) && (!item.module || canAccessModule(profile.role, item.module)));

  return (
    <div className="min-h-screen bg-limestone">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/8 bg-ink p-4 text-white lg:flex">
        <div className="px-1 py-2"><BrandMark href="/dashboard" inverse /></div>
        <div className="mt-7 min-h-0 flex-1 overflow-y-auto"><NavLinks role={profile.role} /></div>
        <div className="mt-4 border-t border-white/10 pt-4">
          <p className="truncate px-3 text-sm font-medium">{profile.fullName}</p><p className="truncate px-3 pt-0.5 text-xs text-white/40">{roleLabels[profile.role]}</p>
          <form action={signOutAction}><button type="submit" className="mt-3 min-h-11 w-full rounded-md px-3 text-left text-sm text-white/55 hover:bg-white/6 hover:text-white">Sign out</button></form>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-line bg-paper/95 px-4 backdrop-blur lg:hidden">
        <BrandMark compact href="/dashboard" /><div className="min-w-0 text-right"><p className="truncate text-sm font-medium text-graphite">{profile.fullName}</p><p className="text-xs text-stone">{roleLabels[profile.role]}</p></div>
      </header>

      {menuOpen && <div className="fixed inset-0 z-40 bg-ink/45 lg:hidden" onClick={() => setMenuOpen(false)} aria-hidden="true" />}
      <aside className={`fixed inset-y-0 right-0 z-50 flex w-[min(88vw,22rem)] flex-col bg-ink p-4 text-white shadow-2xl transition-transform lg:hidden ${menuOpen ? "translate-x-0" : "translate-x-full"}`} aria-hidden={!menuOpen}>
        <div className="flex items-center justify-between"><BrandMark href="/dashboard" inverse /><button type="button" onClick={() => setMenuOpen(false)} className="grid size-11 place-items-center rounded-md text-white/70" aria-label="Close navigation"><X size={21} /></button></div>
        <div className="mt-7 min-h-0 flex-1 overflow-y-auto"><NavLinks role={profile.role} onNavigate={() => setMenuOpen(false)} /></div>
        <form action={signOutAction}><button type="submit" className="min-h-11 w-full rounded-md border border-white/12 px-3 text-left text-sm text-white/65">Sign out</button></form>
      </aside>

      <main className="min-w-0 pb-24 lg:ml-64 lg:pb-0"><div className="mx-auto max-w-[92rem] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</div></main>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid min-h-16 grid-cols-5 border-t border-line bg-paper px-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] lg:hidden" aria-label="Mobile dashboard navigation">
        {mobileItems.map((item) => { const active = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href); return <Link key={item.href} href={item.href} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-md text-[10px] ${active ? "text-brass-dark" : "text-stone"}`}><item.icon size={19} strokeWidth={active ? 2 : 1.7} /><span>{item.label}</span></Link>; })}
        <button type="button" onClick={() => setMenuOpen(true)} aria-expanded={menuOpen} className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-md text-[10px] text-stone"><Menu size={19} strokeWidth={1.7} /><span>Menu</span></button>
      </nav>
    </div>
  );
}
