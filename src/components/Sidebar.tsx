'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  TrendingUp,
  FileText,
  Wallet,
  ShoppingCart,
  PiggyBank,
  Brain,
  Settings,
  LogOut,
  Shield,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/credit-score', label: 'Credit Score', icon: TrendingUp },
  { href: '/statements', label: 'Statements', icon: FileText },
  { href: '/expenses', label: 'Expenses', icon: Wallet },
  { href: '/purchase-advisor', label: 'Purchase Advisor', icon: ShoppingCart },
  { href: '/investment-advisor', label: 'Investment Advisor', icon: PiggyBank },
  { href: '/ai-report', label: 'AI Report', icon: Brain },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const logout = useAppStore((s) => s.logout);

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-sidebar border-r border-card-border flex flex-col z-50">
      {/* Logo */}
      <div className="p-6 border-b border-card-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground tracking-tight">
              CreditCommand
            </h1>
            <p className="text-[10px] text-muted uppercase tracking-widest">
              Private Financial System
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-accent/15 text-accent font-medium'
                  : 'text-muted hover:text-foreground hover:bg-white/5'
              }`}
            >
              <Icon className="w-4.5 h-4.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-card-border">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors w-full"
        >
          <LogOut className="w-4.5 h-4.5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
