'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Brain, FileText, MessageSquare, Network, TrendingUp,
  Sparkles, Clock, BookOpen,
} from 'lucide-react';
import Link from 'next/link';

interface Stats {
  documents: number;
  conversations: number;
  nodes: number;
  insights: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ documents: 0, conversations: 0, nodes: 0, insights: 0 });
  const [brief, setBrief] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch('/api/brain/brief');
      const data = await res.json();
      setStats(data.stats || { documents: 0, conversations: 0, nodes: 0, insights: 0 });
      setBrief(data.brief || 'Welcome to Neural Cortex! Start by uploading your first document to build your knowledge base.');
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setBrief('Welcome to Neural Cortex! Start by uploading your first document to build your knowledge base.');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { icon: FileText, label: 'Documents', value: stats.documents, color: 'from-neon-blue to-cyan-400' },
    { icon: MessageSquare, label: 'Conversations', value: stats.conversations, color: 'from-neon-purple to-violet-400' },
    { icon: Network, label: 'Knowledge Nodes', value: stats.nodes, color: 'from-neon-pink to-rose-400' },
    { icon: TrendingUp, label: 'Insights', value: stats.insights, color: 'from-neon-green to-emerald-400' },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Good {getGreeting()}</h1>
        <p className="text-text-secondary">Here&apos;s your cognitive overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-6 rounded-2xl glass card-hover"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center`}>
                <card.icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-3xl font-bold">{card.value}</span>
            </div>
            <p className="text-text-secondary text-sm">{card.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Morning Brief */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="p-6 rounded-2xl glass-strong neon-glow"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Morning Brief</h2>
            <p className="text-xs text-text-secondary">AI-generated daily summary</p>
          </div>
        </div>
        {loading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-bg-tertiary rounded w-3/4" />
            <div className="h-4 bg-bg-tertiary rounded w-1/2" />
            <div className="h-4 bg-bg-tertiary rounded w-2/3" />
          </div>
        ) : (
          <p className="text-text-secondary leading-relaxed whitespace-pre-line">{brief}</p>
        )}
      </motion.div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            icon: FileText,
            title: 'Upload Document',
            desc: 'Add knowledge to your vault',
            href: '/vault',
            borderColor: 'border-neon-blue/30 hover:border-neon-blue/60',
          },
          {
            icon: MessageSquare,
            title: 'Start Conversation',
            desc: 'Ask your knowledge twin',
            href: '/converse',
            borderColor: 'border-neon-purple/30 hover:border-neon-purple/60',
          },
          {
            icon: Network,
            title: 'Explore Graph',
            desc: 'Visualize connections',
            href: '/studio',
            borderColor: 'border-neon-pink/30 hover:border-neon-pink/60',
          },
        ].map((action, i) => (
          <motion.div
            key={action.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 + i * 0.1 }}
          >
            <Link
              href={action.href}
              className={`block p-6 rounded-2xl glass card-hover border ${action.borderColor} transition-all duration-300`}
            >
              <action.icon className="w-8 h-8 mb-3 text-text-secondary" />
              <h3 className="font-semibold mb-1">{action.title}</h3>
              <p className="text-sm text-text-secondary">{action.desc}</p>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="p-6 rounded-2xl glass"
      >
        <div className="flex items-center gap-3 mb-4">
          <Clock className="w-5 h-5 text-text-secondary" />
          <h2 className="text-lg font-semibold">Getting Started</h2>
        </div>
        <div className="text-center py-8 text-text-secondary">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="mb-2">Upload your first document to get started!</p>
          <p className="text-sm">
            Go to <Link href="/vault" className="text-neon-blue hover:underline">Vault</Link> to upload,
            then chat about it in <Link href="/converse" className="text-neon-purple hover:underline">Converse</Link>.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  return 'Evening';
}
