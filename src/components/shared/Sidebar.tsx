'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Brain, LayoutDashboard, FolderOpen, MessageSquare,
  Network, BarChart3, Settings, LogOut,
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: FolderOpen, label: 'Vault', href: '/vault' },
  { icon: MessageSquare, label: 'Converse', href: '/converse' },
  { icon: Network, label: 'Studio', href: '/studio' },
  { icon: BarChart3, label: 'Insights', href: '/insights' },
  { icon: Settings, label: 'Settings', href: '/settings' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 h-screen bg-bg-secondary border-r border-border-custom flex flex-col shrink-0">
      {/* Logo */}
      <div className="p-6 border-b border-border-custom">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="font-bold text-lg gradient-text">Neural Cortex</span>
            <p className="text-xs text-text-secondary">Knowledge Twin</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-gradient-to-r from-neon-blue/10 to-neon-purple/10 text-white border border-neon-blue/20'
                  : 'text-text-secondary hover:text-white hover:bg-white/5'
              )}
            >
              <item.icon className={cn('w-5 h-5', isActive && 'text-neon-blue')} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Sign Out */}
      <div className="p-4 border-t border-border-custom">
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-text-secondary hover:text-red-400 hover:bg-red-400/5 transition-all duration-200 w-full"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
