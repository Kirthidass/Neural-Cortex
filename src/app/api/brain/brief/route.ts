import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { nvidiaChat } from '@/lib/nvidia';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  const [docCount, convCount, nodeCount, insightCount, recentDocs] = await Promise.all([
    prisma.document.count({ where: { userId } }),
    prisma.conversation.count({ where: { userId } }),
    prisma.knowledgeNode.count({ where: { userId } }),
    prisma.insight.count({ where: { userId } }),
    prisma.document.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { title: true, summary: true, createdAt: true },
    }),
  ]);

  let brief = 'Welcome to Neural Cortex! Start by uploading documents in the Vault to build your knowledge base. Then chat with your AI twin in Converse.';

  if (docCount > 0 && recentDocs.length > 0) {
    try {
      const context = recentDocs
        .map((d: { title: string; summary: string | null; createdAt: Date }) => `- ${d.title}: ${d.summary || 'Processing...'}`)
        .join('\n');

      brief = await nvidiaChat({
        messages: [
          {
            role: 'system',
            content:
              'You are Neural Cortex, a personal knowledge AI assistant. Generate a brief, helpful morning update in 3-4 sentences. Be encouraging and insightful. Mention the documents and suggest what to focus on today. Do not use markdown formatting.',
          },
          {
            role: 'user',
            content: `Here are my recent documents:\n${context}\n\nTotal stats: ${docCount} documents, ${nodeCount} knowledge nodes, ${convCount} conversations.\n\nGenerate a concise morning brief for me.`,
          },
        ],
        maxTokens: 250,
        temperature: 0.7,
      });
    } catch (error) {
      console.error('Failed to generate brief:', error);
      brief = `You have ${docCount} document${docCount !== 1 ? 's' : ''} and ${nodeCount} knowledge node${nodeCount !== 1 ? 's' : ''} in your brain. Check your vault or start a conversation to explore your knowledge.`;
    }
  }

  return NextResponse.json({
    stats: {
      documents: docCount,
      conversations: convCount,
      nodes: nodeCount,
      insights: insightCount,
    },
    brief,
  });
}
