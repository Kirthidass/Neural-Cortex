'use client';

import { Bell, Search, Command } from 'lucide-react';
import Image from 'next/image';

interface NavbarProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export default function Navbar({ user }: NavbarProps) {
  return (
    <header className="h-16 border-b border-border-custom bg-bg-secondary/50 backdrop-blur-xl flex items-center justify-between px-6 shrink-0">
      {/* Search */}
      <div className="flex items-center gap-2">
        <button className="flex items-center gap-3 px-4 py-2 rounded-xl glass text-text-secondary hover:text-white transition-colors">
          <Search className="w-4 h-4" />
          <span className="text-sm hidden sm:inline">Search knowledge...</span>
          <kbd className="hidden md:flex items-center gap-1 px-2 py-0.5 rounded bg-bg-tertiary text-xs">
            <Command className="w-3 h-3" /> K
          </kbd>
        </button>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        <button className="relative p-2 rounded-xl hover:bg-white/5 transition-colors">
          <Bell className="w-5 h-5 text-text-secondary" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-neon-pink" />
        </button>

        <div className="flex items-center gap-3 pl-4 border-l border-border-custom">
          {user.image ? (
            <Image
              src={user.image}
              alt={user.name || 'User'}
              width={32}
              height={32}
              className="rounded-full"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center text-sm font-bold">
              {user.name?.charAt(0) || 'U'}
            </div>
          )}
          <div className="hidden sm:block">
            <p className="text-sm font-medium">{user.name || 'User'}</p>
            <p className="text-xs text-text-secondary">{user.email}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
