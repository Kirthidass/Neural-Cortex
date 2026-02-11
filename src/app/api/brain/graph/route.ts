import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const nodes = await prisma.knowledgeNode.findMany({
    where: { userId: session.user.id },
  });

  const graphNodes = nodes.map((n: { id: string; label: string; type: string; strength: number }) => ({
    id: n.id,
    label: n.label,
    type: n.type,
    strength: n.strength,
  }));

  // Build links from connections
  const links: { source: string; target: string; strength: number }[] = [];
  const addedLinks = new Set<string>();

  for (const node of nodes) {
    let connections: string[] = [];
    try {
      connections = JSON.parse(node.connections || '[]');
    } catch {
      connections = [];
    }

    for (const targetId of connections) {
      // Verify target exists
      const targetExists = nodes.some((n: { id: string }) => n.id === targetId);
      if (!targetExists) continue;

      const linkKey = [node.id, targetId].sort().join('|');
      if (!addedLinks.has(linkKey)) {
        addedLinks.add(linkKey);
        links.push({
          source: node.id,
          target: targetId,
          strength: node.strength,
        });
      }
    }
  }

  return NextResponse.json({ nodes: graphNodes, links });
}
