'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, TrendingUp, Lightbulb, Target, BookOpen,
  FileText, MessageSquare, Network, Brain, Calendar,
} from 'lucide-react';

interface InsightData {
  stats: {
    documents: number;
    conversations: number;
    nodes: number;
    insights: number;
  };
  topEntities: { name: string; count: number }[];
  recentDocs: { title: string; createdAt: string }[];
  domains: { name: string; count: number }[];
}

export default function InsightsPage() {
  const [data, setData] = useState<InsightData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInsightsData();
  }, []);

  const fetchInsightsData = async () => {
    try {
      const [briefRes, docsRes, graphRes] = await Promise.all([
        fetch('/api/brain/brief'),
        fetch('/api/documents'),
        fetch('/api/brain/graph'),
      ]);
      const [briefData, docsData, graphData] = await Promise.all([
        briefRes.json(),
        docsRes.json(),
        graphRes.json(),
      ]);

      // Count entities across documents
      const entityCounts: Record<string, number> = {};
      const domainCounts: Record<string, number> = {};

      (docsData.documents || []).forEach((doc: any) => {
        // Count domains
        const domain = doc.domain || 'general';
        domainCounts[domain] = (domainCounts[domain] || 0) + 1;

        // Count entities
        try {
          const entities = JSON.parse(doc.entities || '[]');
          entities.forEach((e: string) => {
            entityCounts[e] = (entityCounts[e] || 0) + 1;
          });
        } catch {}
      });

      const topEntities = Object.entries(entityCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }));

      const domains = Object.entries(domainCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count }));

      setData({
        stats: briefData.stats || { documents: 0, conversations: 0, nodes: 0, insights: 0 },
        topEntities,
        recentDocs: (docsData.documents || []).slice(0, 5).map((d: any) => ({
          title: d.title,
          createdAt: d.createdAt,
        })),
        domains,
      });
    } catch (error) {
      console.error('Failed to fetch insights:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Insights</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-6 rounded-2xl glass animate-pulse">
              <div className="h-10 bg-bg-tertiary rounded mb-4 w-10" />
              <div className="h-8 bg-bg-tertiary rounded mb-2 w-20" />
              <div className="h-4 bg-bg-tertiary rounded w-24" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const stats = data?.stats || { documents: 0, conversations: 0, nodes: 0, insights: 0 };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Insights</h1>
        <p className="text-text-secondary mt-1">Analytics and patterns from your knowledge base</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: FileText, label: 'Documents', value: stats.documents, color: 'from-neon-blue to-cyan-400', change: '+' + stats.documents },
          { icon: MessageSquare, label: 'Conversations', value: stats.conversations, color: 'from-neon-purple to-violet-400', change: '+' + stats.conversations },
          { icon: Network, label: 'Knowledge Nodes', value: stats.nodes, color: 'from-neon-pink to-rose-400', change: '+' + stats.nodes },
          { icon: TrendingUp, label: 'Entities Tracked', value: data?.topEntities.length || 0, color: 'from-neon-green to-emerald-400', change: 'active' },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-6 rounded-2xl glass"
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-3`}>
              <card.icon className="w-5 h-5 text-white" />
            </div>
            <div className="text-3xl font-bold mb-1">{card.value}</div>
            <div className="flex items-center justify-between">
              <span className="text-text-secondary text-sm">{card.label}</span>
              <span className="text-neon-green text-xs">{card.change}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Entities */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="p-6 rounded-2xl glass"
        >
          <div className="flex items-center gap-3 mb-6">
            <Brain className="w-5 h-5 text-neon-purple" />
            <h2 className="text-lg font-semibold">Top Entities</h2>
          </div>
          {(data?.topEntities || []).length === 0 ? (
            <p className="text-text-secondary text-sm text-center py-8">
              Upload and process documents to see entities
            </p>
          ) : (
            <div className="space-y-3">
              {data?.topEntities.map((entity, i) => {
                const maxCount = data.topEntities[0]?.count || 1;
                const percentage = (entity.count / maxCount) * 100;
                return (
                  <div key={entity.name} className="flex items-center gap-3">
                    <span className="text-text-secondary text-xs w-5">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{entity.name}</span>
                        <span className="text-xs text-text-secondary">{entity.count}x</span>
                      </div>
                      <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ delay: 0.5 + i * 0.1, duration: 0.5 }}
                          className="h-full rounded-full bg-gradient-to-r from-neon-purple to-neon-pink"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Knowledge Domains */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="p-6 rounded-2xl glass"
        >
          <div className="flex items-center gap-3 mb-6">
            <Target className="w-5 h-5 text-neon-blue" />
            <h2 className="text-lg font-semibold">Knowledge Domains</h2>
          </div>
          {(data?.domains || []).length === 0 ? (
            <p className="text-text-secondary text-sm text-center py-8">
              No domains categorized yet
            </p>
          ) : (
            <div className="space-y-4">
              {data?.domains.map((domain) => {
                const colors: Record<string, string> = {
                  work: '#00f0ff',
                  learning: '#b829f7',
                  personal: '#ff0080',
                  general: '#00ff88',
                };
                return (
                  <div key={domain.name} className="flex items-center gap-4">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: colors[domain.name] || '#a0a0b0' }}
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium capitalize">{domain.name}</span>
                    </div>
                    <span className="text-sm text-text-secondary">
                      {domain.count} doc{domain.count !== 1 ? 's' : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Recent Documents */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="p-6 rounded-2xl glass"
        >
          <div className="flex items-center gap-3 mb-6">
            <Calendar className="w-5 h-5 text-neon-green" />
            <h2 className="text-lg font-semibold">Recent Documents</h2>
          </div>
          {(data?.recentDocs || []).length === 0 ? (
            <p className="text-text-secondary text-sm text-center py-8">No documents uploaded yet</p>
          ) : (
            <div className="space-y-3">
              {data?.recentDocs.map((doc, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors">
                  <FileText className="w-4 h-4 text-text-secondary shrink-0" />
                  <span className="text-sm truncate flex-1">{doc.title}</span>
                  <span className="text-xs text-text-secondary shrink-0">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* AI Suggestions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="p-6 rounded-2xl glass-strong neon-glow-purple"
        >
          <div className="flex items-center gap-3 mb-6">
            <Lightbulb className="w-5 h-5 text-yellow-400" />
            <h2 className="text-lg font-semibold">AI Suggestions</h2>
          </div>
          <div className="space-y-3">
            {stats.documents === 0 ? (
              <p className="text-text-secondary text-sm">
                Upload some documents to get AI-powered suggestions about your knowledge gaps and learning opportunities.
              </p>
            ) : (
              <>
                <div className="p-3 rounded-xl bg-neon-blue/5 border border-neon-blue/20">
                  <p className="text-sm">
                    <span className="text-neon-blue font-medium">Expand coverage:</span>{' '}
                    <span className="text-text-secondary">
                      You have {stats.documents} documents. Upload more diverse content to strengthen your knowledge graph.
                    </span>
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-neon-purple/5 border border-neon-purple/20">
                  <p className="text-sm">
                    <span className="text-neon-purple font-medium">Explore connections:</span>{' '}
                    <span className="text-text-secondary">
                      Visit the Knowledge Studio to discover relationships between your {stats.nodes} knowledge nodes.
                    </span>
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-neon-green/5 border border-neon-green/20">
                  <p className="text-sm">
                    <span className="text-neon-green font-medium">Start a conversation:</span>{' '}
                    <span className="text-text-secondary">
                      Ask Neural Cortex to find patterns across your documents for deeper insights.
                    </span>
                  </p>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
