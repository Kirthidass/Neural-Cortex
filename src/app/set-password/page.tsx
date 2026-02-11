'use client';

import { Brain, Lock, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import toast from 'react-hot-toast';

export default function SetPasswordPage() {
  const { data: session } = useSession();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Password set successfully! Please sign in.');
        // Sign out and redirect to signin
        await signOut({ redirect: false });
        window.location.href = '/signin';
      } else {
        toast.error(data.error || 'Failed to set password');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      // Delete the account since password was not set
      await fetch('/api/auth/delete-account', { method: 'DELETE' });
      await signOut({ redirect: false });
      window.location.href = '/signin';
    } catch {
      await signOut({ redirect: false });
      window.location.href = '/signin';
    }
  };

  return (
    <div className="min-h-screen animated-gradient flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md p-8 rounded-2xl glass-strong neon-glow"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center mx-auto mb-4">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Set Your Password</h1>
          <p className="text-text-secondary">
            Welcome{session?.user?.name ? `, ${session.user.name}` : ''}! You must set a password to
            complete your registration.
          </p>
        </div>

        <form onSubmit={handleSetPassword} className="space-y-4">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-11 pr-12 py-3 rounded-xl bg-bg-secondary border border-white/10 text-white placeholder-text-secondary focus:outline-none focus:border-neon-blue/50 transition-colors"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-bg-secondary border border-white/10 text-white placeholder-text-secondary focus:outline-none focus:border-neon-blue/50 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-neon-blue to-neon-purple font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Setting password...' : 'Set Password'}
          </button>

          <button
            type="button"
            onClick={handleCancel}
            disabled={cancelling}
            className="w-full py-2 text-red-400 hover:text-red-300 text-sm transition-colors disabled:opacity-50"
          >
            {cancelling ? 'Cancelling...' : 'Cancel registration'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
