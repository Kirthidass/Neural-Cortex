'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Network, Maximize2, RefreshCw, X, Link2, Zap, Tag } from 'lucide-react';
import dynamic from 'next/dynamic';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="animate-pulse text-text-secondary">Loading graph engine...</div>
    </div>
  ),
});

interface GraphNode {
  id: string;
  label: string;
  type: string;
  strength: number;
  val?: number;
  color?: string;
  x?: number;
  y?: number;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  strength: number;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

const typeColors: Record<string, string> = {
  concept: '#00f0ff',
  entity: '#b829f7',
  document: '#ff0080',
  idea: '#00ff88',
};

export default function StudioPage() {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const graphRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchGraphData();
  }, []);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Configure d3 forces for better spread
  useEffect(() => {
    if (graphRef.current) {
      graphRef.current.d3Force('charge')?.strength(-300).distanceMax(400);
      graphRef.current.d3Force('link')?.distance(120);
      graphRef.current.d3Force('center')?.strength(0.05);
    }
  }, [graphData]);

  const fetchGraphData = async () => {
    try {
      const res = await fetch('/api/brain/graph');
      const data = await res.json();

      const allNodes = (data.nodes || []).map((n: GraphNode) => ({
        ...n,
        val: (n.strength || 1) * 3,
        color: typeColors[n.type?.toLowerCase()] || '#ffffff',
      }));

      // Reduce entity count: keep all concepts/documents/ideas, but limit entities to strongest
      const MAX_TOTAL_NODES = 30;
      const importantNodes = allNodes.filter((n: GraphNode) => n.type !== 'entity');
      const entityNodes = allNodes
        .filter((n: GraphNode) => n.type === 'entity')
        .sort((a: GraphNode, b: GraphNode) => (b.strength || 1) - (a.strength || 1))
        .slice(0, Math.max(MAX_TOTAL_NODES - importantNodes.length, 8));
      const nodes = [...importantNodes, ...entityNodes];
      const nodeIds = new Set(nodes.map((n: GraphNode) => n.id));

      // Filter links to only include visible nodes, cap per node
      const allLinks: GraphLink[] = data.links || [];
      const linkCountPerNode = new Map<string, number>();
      const MAX_LINKS_PER_NODE = 4;

      const sortedLinks = [...allLinks].sort(
        (a: any, b: any) => (b.strength || 0) - (a.strength || 0)
      );

      const filteredLinks = sortedLinks.filter((link: any) => {
        const sourceId = typeof link.source === 'string' ? link.source : link.source?.id;
        const targetId = typeof link.target === 'string' ? link.target : link.target?.id;
        if (!nodeIds.has(sourceId) || !nodeIds.has(targetId)) return false;
        const srcCount = linkCountPerNode.get(sourceId) || 0;
        const tgtCount = linkCountPerNode.get(targetId) || 0;
        if (srcCount >= MAX_LINKS_PER_NODE && tgtCount >= MAX_LINKS_PER_NODE) return false;
        linkCountPerNode.set(sourceId, srcCount + 1);
        linkCountPerNode.set(targetId, tgtCount + 1);
        return true;
      });

      setGraphData({ nodes, links: filteredLinks });
    } catch (error) {
      console.error('Failed to fetch graph data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Find all nodes connected to the selected node
  const connectedNodes = useMemo(() => {
    if (!selectedNode || !graphData.links.length) return [];

    const connectedIds = new Set<string>();
    for (const link of graphData.links) {
      const sourceId = typeof link.source === 'string' ? link.source : link.source?.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target?.id;
      if (sourceId === selectedNode.id) connectedIds.add(targetId);
      if (targetId === selectedNode.id) connectedIds.add(sourceId);
    }

    return graphData.nodes.filter((n) => connectedIds.has(n.id));
  }, [selectedNode, graphData]);

  // Set of connected node IDs for highlighting
  const connectedNodeIds = useMemo(() => {
    const ids = new Set<string>();
    if (selectedNode) {
      ids.add(selectedNode.id);
      connectedNodes.forEach((n) => ids.add(n.id));
    }
    return ids;
  }, [selectedNode, connectedNodes]);

  const handleNodeClick = useCallback((node: any) => {
    setSelectedNode(node);
    if (graphRef.current) {
      graphRef.current.centerAt(node.x, node.y, 1000);
      graphRef.current.zoom(3, 1000);
    }
  }, []);

  const paintNode = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const size = node.val || 4;
      const color = node.color || '#ffffff';
      const isSelected = selectedNode?.id === node.id;
      const isConnected = selectedNode && connectedNodeIds.has(node.id);
      const isDimmed = selectedNode && !connectedNodeIds.has(node.id);

      // Outer glow
      ctx.beginPath();
      ctx.arc(node.x, node.y, size + (isSelected ? 8 : isConnected ? 5 : 3), 0, 2 * Math.PI);
      ctx.fillStyle = isDimmed
        ? 'rgba(255,255,255,0.03)'
        : color + (isSelected ? '50' : isConnected ? '35' : '18');
      ctx.fill();

      // Selection ring
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, size + 4, 0, 2 * Math.PI);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5 / globalScale;
        ctx.stroke();
      }

      // Node
      ctx.beginPath();
      ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
      ctx.fillStyle = isDimmed ? color + '40' : color;
      ctx.fill();

      // Label — show when zoomed in, when selected, or when connected to selection
      if (globalScale > 1.5 || isSelected || isConnected) {
        const fontSize = Math.max(isSelected ? 12 / globalScale : 10 / globalScale, 2);
        ctx.font = `${isSelected ? 'bold ' : ''}${fontSize}px Inter, sans-serif`;
        ctx.fillStyle = isDimmed ? 'rgba(255,255,255,0.3)' : '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(node.label, node.x, node.y + size + 3);
      }
    },
    [selectedNode, connectedNodeIds]
  );

  // Link color: clearly visible by default, bright highlight on selection
  const linkColor = useCallback(
    (link: any) => {
      if (!selectedNode) return 'rgba(255, 255, 255, 0.25)';
      const sourceId = typeof link.source === 'string' ? link.source : link.source?.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target?.id;
      if (sourceId === selectedNode.id || targetId === selectedNode.id) {
        const connectedNode = graphData.nodes.find(
          (n) => n.id === (sourceId === selectedNode.id ? targetId : sourceId)
        );
        return (connectedNode?.color || '#00f0ff') + 'CC';
      }
      return 'rgba(255, 255, 255, 0.06)';
    },
    [selectedNode, graphData.nodes]
  );

  // Link width: visible by default, bold on selection
  const linkWidth = useCallback(
    (link: any) => {
      if (!selectedNode) return 1;
      const sourceId = typeof link.source === 'string' ? link.source : link.source?.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target?.id;
      if (sourceId === selectedNode.id || targetId === selectedNode.id) {
        return Math.max((link.strength || 1) * 2, 2.5);
      }
      return 0.3;
    },
    [selectedNode]
  );

  return (
    <div className="h-[calc(100vh-7rem)] max-w-7xl mx-auto relative">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Network className="w-6 h-6 text-neon-blue" />
            Knowledge Studio
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            {graphData.nodes.length} nodes &#x2022; {graphData.links.length} connections
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectedNode(null);
              fetchGraphData();
            }}
            className="p-2 rounded-xl glass hover:bg-white/10 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setSelectedNode(null);
              graphRef.current?.zoomToFit(400, 50);
            }}
            className="p-2 rounded-xl glass hover:bg-white/10 transition-colors"
            title="Fit to screen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10 p-3 rounded-xl glass">
        <div className="flex items-center gap-4 text-xs">
          {Object.entries(typeColors).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-text-secondary capitalize">{type}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Graph */}
      <div ref={containerRef} className="w-full h-full rounded-2xl overflow-hidden bg-bg-primary">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <Network className="w-16 h-16 mx-auto mb-4 text-text-secondary opacity-20 animate-pulse" />
              <p className="text-text-secondary">Loading knowledge graph...</p>
            </div>
          </div>
        ) : graphData.nodes.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <Network className="w-16 h-16 mx-auto mb-4 text-text-secondary opacity-20" />
              <p className="text-lg font-medium mb-2">Your knowledge graph is empty</p>
              <p className="text-text-secondary text-sm max-w-md">
                Upload documents in the Vault and they will be processed with AI to extract entities
                and build your knowledge graph.
              </p>
            </div>
          </div>
        ) : (
          <ForceGraph2D
            ref={graphRef}
            graphData={graphData}
            width={dimensions.width}
            height={dimensions.height}
            nodeCanvasObject={paintNode}
            nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
              ctx.beginPath();
              ctx.arc(node.x, node.y, (node.val || 4) + 4, 0, 2 * Math.PI);
              ctx.fillStyle = color;
              ctx.fill();
            }}
            linkColor={linkColor}
            linkWidth={linkWidth}
            linkCurvature={0.2}
            linkDirectionalParticles={(link: any) => {
              if (!selectedNode) return 0;
              const sourceId = typeof link.source === 'string' ? link.source : link.source?.id;
              const targetId = typeof link.target === 'string' ? link.target : link.target?.id;
              return sourceId === selectedNode.id || targetId === selectedNode.id ? 3 : 0;
            }}
            linkDirectionalParticleWidth={2}
            linkDirectionalParticleSpeed={0.005}
            linkDirectionalParticleColor={linkColor}
            backgroundColor="#0a0a0f"
            onNodeClick={handleNodeClick}
            onBackgroundClick={() => setSelectedNode(null)}
            warmupTicks={200}
            cooldownTicks={200}
            d3AlphaDecay={0.01}
            d3VelocityDecay={0.2}
            d3AlphaMin={0.001}
            onEngineStop={() => graphRef.current?.zoomToFit(400, 80)}
          />
        )}
      </div>

      {/* Node Detail Panel — now shows connected nodes */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute top-20 right-4 w-80 rounded-2xl glass-strong neon-glow z-20 overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: typeColors[selectedNode.type] || '#fff' }}
                  />
                  <h3 className="font-semibold truncate">{selectedNode.label}</h3>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="p-1 rounded hover:bg-white/10 shrink-0 ml-2"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs text-text-secondary">
                <span className="flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  <span className="capitalize">{selectedNode.type}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Strength: {(selectedNode.strength || 1).toFixed(1)}
                </span>
                <span className="flex items-center gap-1">
                  <Link2 className="w-3 h-3" />
                  {connectedNodes.length} links
                </span>
              </div>
            </div>

            {/* Connected Nodes */}
            <div className="p-4">
              <p className="text-xs font-medium text-text-secondary mb-3 uppercase tracking-wider">
                Connected To ({connectedNodes.length})
              </p>
              {connectedNodes.length === 0 ? (
                <p className="text-xs text-text-secondary italic">No connections found</p>
              ) : (
                <div className="space-y-1.5 max-h-[40vh] overflow-y-auto pr-1">
                  {connectedNodes.map((node) => (
                    <button
                      key={node.id}
                      onClick={() => {
                        const fullNode = graphData.nodes.find((n) => n.id === node.id);
                        if (fullNode) {
                          setSelectedNode(fullNode);
                          if (graphRef.current) {
                            graphRef.current.centerAt(
                              (fullNode as any).x,
                              (fullNode as any).y,
                              800
                            );
                            graphRef.current.zoom(3, 800);
                          }
                        }
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/8 transition-colors text-left group"
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-transparent group-hover:ring-white/20 transition-all"
                        style={{ backgroundColor: typeColors[node.type] || '#fff' }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm truncate group-hover:text-white transition-colors">
                          {node.label}
                        </p>
                        <p className="text-[10px] text-text-secondary capitalize">
                          {node.type} • str: {(node.strength || 1).toFixed(1)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
