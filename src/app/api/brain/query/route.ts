import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { nvidiaChat, nvidiaChatStream, generateEmbeddingSimple } from '@/lib/nvidia';
import { cosineSimilarity } from '@/lib/utils';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);

  // List conversations
  if (searchParams.get('list') === 'true') {
    const conversations = await prisma.conversation.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, updatedAt: true },
    });
    return NextResponse.json({ conversations });
  }

  // Load conversation messages
  const conversationId = searchParams.get('conversationId');
  if (conversationId) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation || conversation.userId !== session.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json({ messages });
  }

  return NextResponse.json({ conversations: [] });
}

// DELETE conversation and all its messages
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get('conversationId');
  if (!conversationId) {
    return NextResponse.json({ error: 'conversationId required' }, { status: 400 });
  }

  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation || conversation.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Delete messages first (cascade), then the conversation
  await prisma.message.deleteMany({ where: { conversationId } });
  await prisma.conversation.delete({ where: { id: conversationId } });

  return NextResponse.json({ success: true });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { message, conversationId, stream: useStream } = await req.json();
  if (!message) {
    return NextResponse.json({ error: 'Message required' }, { status: 400 });
  }

  // Find relevant documents using keyword matching + embedding similarity
  const documents = await prisma.document.findMany({
    where: { userId: session.user.id },
    select: { id: true, title: true, content: true, summary: true, embedding: true },
  });

  const queryEmbedding = generateEmbeddingSimple(message);

  const scoredDocs = documents
    .map((doc: { id: string; title: string; content: string; summary: string | null; embedding: string | null }) => {
      let score = 0;

      // Keyword matching
      const queryWords = message.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
      const content = (doc.content + ' ' + doc.title + ' ' + (doc.summary || '')).toLowerCase();
      for (const word of queryWords) {
        if (content.includes(word)) score += 1;
      }

      // Embedding similarity
      if (doc.embedding) {
        try {
          const docEmb = JSON.parse(doc.embedding);
          score += cosineSimilarity(queryEmbedding, docEmb) * 5;
        } catch {}
      }

      return { ...doc, score };
    })
    .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
    .slice(0, 3)
    .filter((d: { score: number }) => d.score > 0);

  // Build context from relevant documents
  const context = scoredDocs
    .map((d: { title: string; summary: string | null; content: string }) => `### ${d.title}\n${d.summary || d.content.slice(0, 1500)}`)
    .join('\n\n');

  // Cross-conversation knowledge: pull relevant messages from OTHER conversations
  let crossConvoContext = '';
  try {
    const otherConversations = await prisma.conversation.findMany({
      where: {
        userId: session.user.id,
        ...(conversationId ? { id: { not: conversationId } } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: { id: true, title: true },
    });

    if (otherConversations.length > 0) {
      const otherMessages = await prisma.message.findMany({
        where: {
          conversationId: { in: otherConversations.map((c: { id: string }) => c.id) },
          role: 'assistant',
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { content: true, conversationId: true },
      });

      if (otherMessages.length > 0) {
        // Score messages by keyword relevance to current query
        const queryWords = message.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
        const scoredMessages = otherMessages
          .map((m: { content: string; conversationId: string }) => {
            const lower = m.content.toLowerCase();
            let score = 0;
            for (const word of queryWords) {
              if (lower.includes(word)) score++;
            }
            const convTitle = otherConversations.find((c: { id: string; title: string }) => c.id === m.conversationId)?.title || 'Previous chat';
            return { content: m.content, score, convTitle };
          })
          .filter((m: { score: number }) => m.score > 0)
          .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
          .slice(0, 3);

        if (scoredMessages.length > 0) {
          crossConvoContext = '\n\n## Insights from Previous Conversations:\n\n' +
            scoredMessages
              .map((m: { convTitle: string; content: string }) => `**From "${m.convTitle}":**\n${m.content.slice(0, 500)}`)
              .join('\n\n');
        }
      }
    }
  } catch (err) {
    console.error('Cross-conversation lookup failed:', err);
  }

  // Get or create conversation
  let convo;
  if (conversationId) {
    convo = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (convo && convo.userId !== session.user.id) {
      convo = null;
    }
  }

  if (!convo) {
    convo = await prisma.conversation.create({
      data: {
        userId: session.user.id,
        title: message.slice(0, 80),
      },
    });
  }

  // Get conversation history (last 10 messages for context)
  const history = await prisma.message.findMany({
    where: { conversationId: convo.id },
    orderBy: { createdAt: 'asc' },
    take: 10,
  });

  // Save user message
  await prisma.message.create({
    data: {
      conversationId: convo.id,
      role: 'user',
      content: message,
    },
  });

  // Build AI messages
  const systemPrompt = `You are Neural Cortex, an advanced AI personal knowledge twin assistant. You help users recall, connect, and build upon their stored knowledge.

${
  context
    ? `## Relevant Knowledge Base Context:\n\n${context}\n\nUse this context to answer the user's question. When referencing documents, mention their titles clearly.`
    : "The user's knowledge base doesn't have directly relevant documents for this query. Help with general knowledge and suggest they upload relevant documents."
}${crossConvoContext}

Guidelines:
- Be concise, helpful, and accurate
- Use markdown formatting for readability
- Reference specific documents when applicable
- When referencing insights from previous conversations, mention that naturally (e.g. "As we discussed before..." or "Based on your earlier inquiry...")
- Suggest connections between concepts when you notice them
- If unsure, be honest about limitations
- Keep responses focused and under 500 words unless more detail is needed`;

  const aiMessages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: systemPrompt },
    ...history.map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: message },
  ];

  const sources = scoredDocs.map((d: { id: string; title: string }) => ({ id: d.id, title: d.title }));

  // Streaming response
  if (useStream) {
    try {
      const aiStream = await nvidiaChatStream({
        messages: aiMessages,
        maxTokens: 2048,
        temperature: 0.7,
      });

      let fullResponse = '';
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      const transformStream = new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          const text = decoder.decode(chunk, { stream: true });
          // Extract content from SSE data
          const lines = text.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') {
                // Send metadata at end
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, conversationId: convo!.id, sources })}\n\n`));
                return;
              }
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  fullResponse += parsed.content;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: parsed.content })}\n\n`));
                }
              } catch {}
            }
          }
        },
        async flush() {
          // Save the assistant response to DB
          if (fullResponse) {
            await prisma.message.create({
              data: {
                conversationId: convo!.id,
                role: 'assistant',
                content: fullResponse,
                sources: JSON.stringify(sources),
              },
            });
            await prisma.conversation.update({
              where: { id: convo!.id },
              data: { updatedAt: new Date() },
            });
          }
        },
      });

      const readable = aiStream.pipeThrough(transformStream);

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } catch (error) {
      console.error('Streaming error, falling back to non-stream:', error);
      // Fall through to non-streaming
    }
  }

  // Non-streaming response (fallback)
  try {
    const response = await nvidiaChat({
      messages: aiMessages,
      maxTokens: 2048,
      temperature: 0.7,
    });

    // Save assistant message
    await prisma.message.create({
      data: {
        conversationId: convo.id,
        role: 'assistant',
        content: response,
        sources: JSON.stringify(sources),
      },
    });

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: convo.id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      response,
      conversationId: convo.id,
      sources,
    });
  } catch (error) {
    console.error('NVIDIA API error:', error);
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        response:
          `I encountered an error: ${errMsg}. Please try again in a moment.`,
        conversationId: convo.id,
        sources: [],
      },
      { status: 200 } // return 200 so frontend shows the message
    );
  }
}
