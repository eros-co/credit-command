'use client';

import { useState } from 'react';
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

type NavItem = {
  href: string;
  label: string;
  icon: any;
  subItems?: { href: string; label: string }[];
};

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/credit-score', label: 'Credit Score', icon: TrendingUp },
  {
    href: '/statements',
    label: 'Statements',
    icon: FileText,
    subItems: [
      { href: '/statements?type=credit', label: 'Credit Card' },
      { href: '/statements?type=debit', label: 'Current Account' },
      { href: '/statements?type=savings', label: 'Savings' }
    ]
  },
  { href: '/expenses', label: 'Expenses', icon: Wallet },
  { href: '/purchase-advisor', label: 'Purchase Advisor', icon: ShoppingCart },
  { href: '/investment-advisor', label: 'Investment Advisor', icon: PiggyBank },
  { href: '/ai-report', label: 'AI Report', icon: Brain },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const logout = useAppStore((s) => s.logout);
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({
    '/statements': pathname.startsWith('/statements')
  });

  const toggleDropdown = (href: string) => {
    setOpenDropdowns(prev => ({ ...prev, [href]: !prev[href] }));
  };

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
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto w-full">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const isDropdownOpen = openDropdowns[item.href];
          const Icon = item.icon;

          if (item.subItems) {
            return (
              <div key={item.href} className="space-y-1">
                <button
                  onClick={() => toggleDropdown(item.href)}
                  className={`w-full flex justify-between items-center px-3 py-2.5 rounded-lg text-sm transition-colors ${pathname.startsWith(item.href)
                    ? 'bg-accent/15 text-accent font-medium'
                    : 'text-muted hover:text-foreground hover:bg-white/5'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4.5 h-4.5" />
                    {item.label}
                  </div>
                  <span className={`text-[10px] transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {isDropdownOpen && (
                  <div className="pl-9 space-y-1">
                    {item.subItems.map(sub => {
                      // We'll consider it active if the current pathname matches and (if using search params) 
                      // we'd need useSearchParams, but let's keep it simple with just href matching
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          className="block px-3 py-2 rounded-lg text-xs text-muted hover:text-foreground hover:bg-white/5 transition-colors"
                        >
                          {sub.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors w-full ${isActive
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
