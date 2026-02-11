'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { User, Bell, Shield, Palette, Save, Check, Brain, Zap } from 'lucide-react';
import Image from 'next/image';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { data: session } = useSession();
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({
    theme: 'dark',
    density: 'comfortable',
    notifications: true,
    aiProcessing: true,
    privacyLevel: 'local',
  });

  const handleSave = () => {
    setSaved(true);
    toast.success('Settings saved');
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-text-secondary mt-1">Manage your account and preferences</p>
      </div>

      {/* Profile */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-2xl glass"
      >
        <div className="flex items-center gap-3 mb-6">
          <User className="w-5 h-5 text-neon-blue" />
          <h2 className="text-lg font-semibold">Profile</h2>
        </div>
        <div className="flex items-center gap-6">
          {session?.user?.image ? (
            <Image
              src={session.user.image}
              alt={session.user.name || 'User'}
              width={64}
              height={64}
              className="rounded-2xl"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center text-2xl font-bold">
              {session?.user?.name?.charAt(0) || 'U'}
            </div>
          )}
          <div>
            <h3 className="text-lg font-semibold">{session?.user?.name || 'User'}</h3>
            <p className="text-text-secondary text-sm">{session?.user?.email || ''}</p>
            <p className="text-xs text-neon-green mt-1">&#x2022; Connected via Google</p>
          </div>
        </div>
      </motion.div>

      {/* AI Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-6 rounded-2xl glass"
      >
        <div className="flex items-center gap-3 mb-6">
          <Brain className="w-5 h-5 text-neon-purple" />
          <h2 className="text-lg font-semibold">AI Processing</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Auto-process uploads</p>
              <p className="text-text-secondary text-xs mt-0.5">
                Automatically extract summaries, entities, and key points on upload
              </p>
            </div>
            <button
              onClick={() => setSettings({ ...settings, aiProcessing: !settings.aiProcessing })}
              className={`w-12 h-6 rounded-full transition-colors ${
                settings.aiProcessing ? 'bg-neon-blue' : 'bg-bg-tertiary'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.aiProcessing ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="p-4 rounded-xl bg-bg-secondary">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-neon-blue" />
              <span className="text-sm font-medium">AI Model</span>
            </div>
            <p className="text-text-secondary text-sm">NVIDIA Llama 3.3 70B (via NIM API)</p>
            <p className="text-xs text-neon-green mt-1">&#x2713; Connected</p>
          </div>
        </div>
      </motion.div>

      {/* Appearance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-6 rounded-2xl glass"
      >
        <div className="flex items-center gap-3 mb-6">
          <Palette className="w-5 h-5 text-neon-pink" />
          <h2 className="text-lg font-semibold">Appearance</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Theme</label>
            <div className="flex gap-3">
              {['dark', 'midnight', 'deep-space'].map((theme) => (
                <button
                  key={theme}
                  onClick={() => setSettings({ ...settings, theme })}
                  className={`px-4 py-2 rounded-xl text-sm capitalize transition-all ${
                    settings.theme === theme
                      ? 'bg-gradient-to-r from-neon-blue/20 to-neon-purple/20 border border-neon-blue/30 text-white'
                      : 'bg-bg-secondary text-text-secondary hover:text-white'
                  }`}
                >
                  {theme.replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Content Density</label>
            <div className="flex gap-3">
              {['compact', 'comfortable', 'spacious'].map((d) => (
                <button
                  key={d}
                  onClick={() => setSettings({ ...settings, density: d })}
                  className={`px-4 py-2 rounded-xl text-sm capitalize transition-all ${
                    settings.density === d
                      ? 'bg-gradient-to-r from-neon-blue/20 to-neon-purple/20 border border-neon-blue/30 text-white'
                      : 'bg-bg-secondary text-text-secondary hover:text-white'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Notifications */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="p-6 rounded-2xl glass"
      >
        <div className="flex items-center gap-3 mb-6">
          <Bell className="w-5 h-5 text-yellow-400" />
          <h2 className="text-lg font-semibold">Notifications</h2>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">Enable notifications</p>
            <p className="text-text-secondary text-xs mt-0.5">
              Get notified about AI insights and processing completion
            </p>
          </div>
          <button
            onClick={() => setSettings({ ...settings, notifications: !settings.notifications })}
            className={`w-12 h-6 rounded-full transition-colors ${
              settings.notifications ? 'bg-neon-blue' : 'bg-bg-tertiary'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                settings.notifications ? 'translate-x-6' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </motion.div>

      {/* Privacy */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="p-6 rounded-2xl glass"
      >
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-5 h-5 text-neon-green" />
          <h2 className="text-lg font-semibold">Privacy &amp; Security</h2>
        </div>
        <div className="p-4 rounded-xl bg-neon-green/5 border border-neon-green/20">
          <p className="text-sm font-medium text-neon-green mb-1">Local-First Architecture</p>
          <p className="text-text-secondary text-xs">
            All your data is stored locally in SQLite. Your documents and conversations never leave
            your machine. Only AI queries are sent to NVIDIA&apos;s API for processing.
          </p>
        </div>
      </motion.div>

      {/* Save Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex justify-end"
      >
        <button
          onClick={handleSave}
          className="btn-primary flex items-center gap-2"
        >
          {saved ? <Check className="w-5 h-5" /> : <Save className="w-5 h-5" />}
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </motion.div>
    </div>
  );
}
