'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Network, Maximize2, RefreshCw, X, Link2, Zap, Tag, Loader2, Search } from 'lucide-react';
import dynamic from 'next/dynamic';
import toast from 'react-hot-toast';

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
  fx?: number | null;
  fy?: number | null;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  strength: number;
  _bridge?: boolean; // invisible link to keep disconnected clusters nearby
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
  person: '#ffaa00',
  technology: '#00aaff',
  topic: '#ff6b6b',
  organization: '#4ecdc4',
};

export default function StudioPage() {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [rebuilding, setRebuilding] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GraphNode[]>([]);
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const graphRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  // Configure d3 forces for a well-spaced, compact layout
  useEffect(() => {
    if (graphRef.current) {
      // Moderate repulsion with SHORT range — prevents distant scattering
      graphRef.current.d3Force('charge')?.strength(-200).distanceMax(250);
      // Link distances: bridge links are longer to separate clusters but keep them nearby
      graphRef.current.d3Force('link')?.distance((link: any) => {
        if (link._bridge) return 200; // bridge links: keep clusters nearby but not overlapping
        const sourceType = typeof link.source === 'string' ? '' : link.source?.type;
        const targetType = typeof link.target === 'string' ? '' : link.target?.type;
        return sourceType === targetType ? 60 : 120;
      }).strength((link: any) => {
        return link._bridge ? 0.05 : 0.4; // bridge links: very weak pull
      });
      // Strong centering — pulls everything toward the middle
      graphRef.current.d3Force('center')?.strength(0.15);
    }
  }, [graphData]);

  // Handle search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setHighlightedNodeId(null);
      return;
    }
    const q = searchQuery.toLowerCase();
    const results = graphData.nodes.filter(
      (n) =>
        n.label.toLowerCase().includes(q) ||
        n.type.toLowerCase().includes(q)
    );
    setSearchResults(results);
  }, [searchQuery, graphData.nodes]);

  const focusOnNode = useCallback((node: GraphNode) => {
    setHighlightedNodeId(node.id);
    setSelectedNode(node);
    if (graphRef.current) {
      graphRef.current.centerAt(node.x, node.y, 800);
      graphRef.current.zoom(3.5, 800);
    }
  }, []);

  const fetchGraphData = async () => {
    try {
      const res = await fetch('/api/brain/graph');
      const data = await res.json();

      const allNodes = (data.nodes || []).map((n: GraphNode) => ({
        ...n,
        val: Math.max((n.strength || 1) * 2.5, 3),
        color: typeColors[n.type?.toLowerCase()] || '#ffffff',
      }));

      // Keep up to 80 nodes: all concepts/documents/ideas, strongest entities
      const MAX_TOTAL_NODES = 80;
      const importantNodes = allNodes.filter((n: GraphNode) => n.type !== 'entity');
      const entityNodes = allNodes
        .filter((n: GraphNode) => n.type === 'entity')
        .sort((a: GraphNode, b: GraphNode) => (b.strength || 1) - (a.strength || 1))
        .slice(0, Math.max(MAX_TOTAL_NODES - importantNodes.length, 20));
      const nodes = [...importantNodes, ...entityNodes];
      const nodeIds = new Set(nodes.map((n: GraphNode) => n.id));

      // Filter links to only include visible nodes, limit links per node
      const allLinks: GraphLink[] = data.links || [];
      const linkCountPerNode = new Map<string, number>();
      const MAX_LINKS_PER_NODE = 6;

      const sortedLinks = [...allLinks].sort(
        (a: any, b: any) => (b.strength || 0) - (a.strength || 0)
      );

      const filteredLinks = sortedLinks.filter((link: any) => {
        const sourceId = typeof link.source === 'string' ? link.source : link.source?.id;
        const targetId = typeof link.target === 'string' ? link.target : link.target?.id;
        if (!nodeIds.has(sourceId) || !nodeIds.has(targetId)) return false;
        // Avoid self-loops
        if (sourceId === targetId) return false;
        const srcCount = linkCountPerNode.get(sourceId) || 0;
        const tgtCount = linkCountPerNode.get(targetId) || 0;
        if (srcCount >= MAX_LINKS_PER_NODE && tgtCount >= MAX_LINKS_PER_NODE) return false;
        linkCountPerNode.set(sourceId, srcCount + 1);
        linkCountPerNode.set(targetId, tgtCount + 1);
        return true;
      });

      // --- Bridge disconnected clusters so nothing flies off screen ---
      // Find connected components using BFS
      const adjacency = new Map<string, Set<string>>();
      nodes.forEach((n: GraphNode) => adjacency.set(n.id, new Set()));
      filteredLinks.forEach((link: any) => {
        const s = typeof link.source === 'string' ? link.source : link.source?.id;
        const t = typeof link.target === 'string' ? link.target : link.target?.id;
        adjacency.get(s)?.add(t);
        adjacency.get(t)?.add(s);
      });

      const visited = new Set<string>();
      const clusters: string[][] = [];
      for (const node of nodes) {
        if (visited.has(node.id)) continue;
        const cluster: string[] = [];
        const queue = [node.id];
        while (queue.length > 0) {
          const current = queue.shift()!;
          if (visited.has(current)) continue;
          visited.add(current);
          cluster.push(current);
          const neighbors = adjacency.get(current);
          if (neighbors) {
            for (const neighbor of Array.from(neighbors)) {
              if (!visited.has(neighbor)) queue.push(neighbor);
            }
          }
        }
        clusters.push(cluster);
      }

      // If multiple clusters, connect each smaller cluster to the largest via an invisible bridge
      if (clusters.length > 1) {
        // Sort: largest cluster first
        clusters.sort((a, b) => b.length - a.length);
        const mainCluster = clusters[0];
        const mainNodeId = mainCluster[0]; // anchor in main cluster

        for (let i = 1; i < clusters.length; i++) {
          // Connect this cluster's first node to main cluster's anchor
          const bridgeSource = clusters[i][0];
          filteredLinks.push({
            source: bridgeSource,
            target: mainNodeId,
            strength: 0.1,
            _bridge: true,
          } as GraphLink);
        }
      }

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

  // Set of search-matching node IDs
  const searchMatchIds = useMemo(() => {
    return new Set(searchResults.map((n) => n.id));
  }, [searchResults]);

  const rebuildGraph = async () => {
    setRebuilding(true);
    try {
      const res = await fetch('/api/brain/graph', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Graph rebuilt: ${data.nodesCreated} new nodes, ${data.connectionsCreated} new connections`);
        await fetchGraphData();
      } else {
        toast.error('Failed to rebuild graph');
      }
    } catch (error) {
      toast.error('Failed to rebuild graph');
    } finally {
      setRebuilding(false);
    }
  };

  const handleNodeClick = useCallback((node: any) => {
    setSelectedNode(node);
    setHighlightedNodeId(node.id);
    if (graphRef.current) {
      graphRef.current.centerAt(node.x, node.y, 800);
      graphRef.current.zoom(3.5, 800);
    }
  }, []);

  const paintNode = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const size = node.val || 4;
      const color = node.color || '#ffffff';
      const isSelected = selectedNode?.id === node.id;
      const isConnected = selectedNode && connectedNodeIds.has(node.id);
      const isDimmed = selectedNode && !connectedNodeIds.has(node.id);
      const isHighlighted = highlightedNodeId === node.id;
      const isSearchMatch = searchQuery && searchMatchIds.has(node.id);
      const isSearchDimmed = searchQuery && searchResults.length > 0 && !searchMatchIds.has(node.id);

      // Outer glow — larger for highlighted/selected
      ctx.beginPath();
      const glowSize = isHighlighted ? 14 : isSelected ? 10 : isConnected ? 6 : isSearchMatch ? 8 : 3;
      ctx.arc(node.x, node.y, size + glowSize, 0, 2 * Math.PI);
      if (isHighlighted) {
        ctx.fillStyle = color + '60';
      } else if (isSearchDimmed) {
        ctx.fillStyle = 'rgba(255,255,255,0.02)';
      } else if (isDimmed) {
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
      } else if (isSearchMatch) {
        ctx.fillStyle = color + '45';
      } else {
        ctx.fillStyle = color + (isSelected ? '50' : isConnected ? '35' : '15');
      }
      ctx.fill();

      // Pulsing ring for highlighted node (search result focused)
      if (isHighlighted) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, size + 6, 0, 2 * Math.PI);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2 / globalScale;
        ctx.setLineDash([4 / globalScale, 4 / globalScale]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Selection ring
      if (isSelected && !isHighlighted) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, size + 4, 0, 2 * Math.PI);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5 / globalScale;
        ctx.stroke();
      }

      // Search match ring
      if (isSearchMatch && !isSelected && !isHighlighted) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, size + 4, 0, 2 * Math.PI);
        ctx.strokeStyle = '#ffaa00';
        ctx.lineWidth = 1.5 / globalScale;
        ctx.stroke();
      }

      // Node body
      ctx.beginPath();
      ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
      ctx.fillStyle = (isSearchDimmed || isDimmed) ? color + '30' : color;
      ctx.fill();

      // Inner highlight for depth
      if (!isDimmed && !isSearchDimmed) {
        ctx.beginPath();
        ctx.arc(node.x - size * 0.25, node.y - size * 0.25, size * 0.4, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fill();
      }

      // Label logic: always show for selected/highlighted/search match, zoom-based for others
      const shouldShowLabel =
        isSelected || isHighlighted || isSearchMatch || isConnected || globalScale > 1.8;

      if (shouldShowLabel) {
        const fontSize = Math.max(
          (isSelected || isHighlighted) ? 13 / globalScale : isSearchMatch ? 12 / globalScale : 10 / globalScale,
          2
        );
        ctx.font = `${(isSelected || isHighlighted || isSearchMatch) ? 'bold ' : ''}${fontSize}px Inter, system-ui, sans-serif`;

        const labelText = node.label.length > 24 ? node.label.slice(0, 22) + '…' : node.label;

        // Text background for readability
        const textWidth = ctx.measureText(labelText).width;
        const bgPadding = 2 / globalScale;
        const textY = node.y + size + 5;

        ctx.fillStyle = (isSearchDimmed || isDimmed)
          ? 'rgba(10, 10, 15, 0.3)'
          : 'rgba(10, 10, 15, 0.7)';
        ctx.fillRect(
          node.x - textWidth / 2 - bgPadding,
          textY - fontSize / 2,
          textWidth + bgPadding * 2,
          fontSize + bgPadding
        );

        ctx.fillStyle = (isSearchDimmed || isDimmed) ? 'rgba(255,255,255,0.2)' :
          isHighlighted ? '#ffdd00' : isSearchMatch ? '#ffcc44' : '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(labelText, node.x, textY);

        // Type badge below label for selected/highlighted
        if ((isSelected || isHighlighted) && globalScale > 1.5) {
          const badgeFontSize = Math.max(8 / globalScale, 1.5);
          ctx.font = `${badgeFontSize}px Inter, system-ui, sans-serif`;
          const typeText = node.type.toUpperCase();
          ctx.fillStyle = color + '99';
          ctx.fillText(typeText, node.x, textY + fontSize + 3);
        }
      }
    },
    [selectedNode, connectedNodeIds, highlightedNodeId, searchQuery, searchMatchIds, searchResults.length]
  );

  // Link color
  const linkColor = useCallback(
    (link: any) => {
      // Bridge links are always invisible
      if (link._bridge) return 'rgba(0, 0, 0, 0)';

      if (!selectedNode) {
        // If searching, dim non-matching links
        if (searchQuery && searchResults.length > 0) {
          const sourceId = typeof link.source === 'string' ? link.source : link.source?.id;
          const targetId = typeof link.target === 'string' ? link.target : link.target?.id;
          if (searchMatchIds.has(sourceId) || searchMatchIds.has(targetId)) {
            return 'rgba(255, 200, 50, 0.5)';
          }
          return 'rgba(255, 255, 255, 0.04)';
        }
        return 'rgba(255, 255, 255, 0.15)';
      }
      const sourceId = typeof link.source === 'string' ? link.source : link.source?.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target?.id;
      if (sourceId === selectedNode.id || targetId === selectedNode.id) {
        const connectedNode = graphData.nodes.find(
          (n) => n.id === (sourceId === selectedNode.id ? targetId : sourceId)
        );
        return (connectedNode?.color || '#00f0ff') + 'CC';
      }
      return 'rgba(255, 255, 255, 0.04)';
    },
    [selectedNode, graphData.nodes, searchQuery, searchResults.length, searchMatchIds]
  );

  // Link width
  const linkWidth = useCallback(
    (link: any) => {
      // Bridge links have zero width (invisible)
      if (link._bridge) return 0;

      if (!selectedNode) {
        if (searchQuery && searchResults.length > 0) {
          const sourceId = typeof link.source === 'string' ? link.source : link.source?.id;
          const targetId = typeof link.target === 'string' ? link.target : link.target?.id;
          if (searchMatchIds.has(sourceId) || searchMatchIds.has(targetId)) return 1.5;
          return 0.2;
        }
        return 0.6;
      }
      const sourceId = typeof link.source === 'string' ? link.source : link.source?.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target?.id;
      if (sourceId === selectedNode.id || targetId === selectedNode.id) {
        return Math.max((link.strength || 1) * 2, 2);
      }
      return 0.2;
    },
    [selectedNode, searchQuery, searchResults.length, searchMatchIds]
  );

  // Count types for legend
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    graphData.nodes.forEach((n) => {
      counts[n.type] = (counts[n.type] || 0) + 1;
    });
    return counts;
  }, [graphData.nodes]);

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
            {graphData.nodes.length} nodes &bull; {graphData.links.length} connections
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search entities..."
              className="pl-8 pr-8 py-2 rounded-xl glass text-sm bg-transparent border border-white/10 focus:border-neon-blue/50 focus:outline-none w-48 sm:w-56 transition-all placeholder:text-text-secondary/60"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setHighlightedNodeId(null);
                  searchInputRef.current?.focus();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-white/10"
              >
                <X className="w-3.5 h-3.5 text-text-secondary" />
              </button>
            )}
          </div>
          <button
            onClick={rebuildGraph}
            disabled={rebuilding}
            className="px-3 py-2 rounded-xl glass hover:bg-white/10 transition-colors flex items-center gap-2 text-xs"
            title="Rebuild graph from all documents"
          >
            {rebuilding ? (
              <Loader2 className="w-4 h-4 animate-spin text-neon-blue" />
            ) : (
              <Zap className="w-4 h-4 text-neon-green" />
            )}
            <span className="hidden sm:inline">{rebuilding ? 'Rebuilding...' : 'Rebuild'}</span>
          </button>
          <button
            onClick={() => {
              setSelectedNode(null);
              setHighlightedNodeId(null);
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
              setHighlightedNodeId(null);
              graphRef.current?.zoomToFit(400, 60);
            }}
            className="p-2 rounded-xl glass hover:bg-white/10 transition-colors"
            title="Fit to screen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search Results Dropdown */}
      <AnimatePresence>
        {searchQuery && searchResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute top-16 right-4 w-64 z-30 rounded-xl glass-strong border border-white/10 overflow-hidden shadow-2xl"
          >
            <div className="px-3 py-2 border-b border-white/10 text-xs text-text-secondary">
              {searchResults.length} result{searchResults.length === 1 ? '' : 's'} found
            </div>
            <div className="max-h-64 overflow-y-auto">
              {searchResults.slice(0, 20).map((node) => (
                <button
                  key={node.id}
                  onClick={() => {
                    focusOnNode(node);
                    setSearchQuery('');
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/8 transition-colors text-left ${
                    highlightedNodeId === node.id ? 'bg-white/10' : ''
                  }`}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: typeColors[node.type] || '#fff' }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate">{node.label}</p>
                    <p className="text-[10px] text-text-secondary capitalize">{node.type}</p>
                  </div>
                  <Zap className="w-3 h-3 text-text-secondary shrink-0" />
                </button>
              ))}
            </div>
          </motion.div>
        )}
        {searchQuery && searchResults.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute top-16 right-4 w-64 z-30 rounded-xl glass-strong border border-white/10 overflow-hidden shadow-2xl"
          >
            <div className="px-3 py-4 text-center text-xs text-text-secondary">
              No entities matching &ldquo;{searchQuery}&rdquo;
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10 p-3 rounded-xl glass">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {Object.entries(typeColors)
            .filter(([type]) => typeCounts[type])
            .map(([type, color]) => (
              <button
                key={type}
                onClick={() => setSearchQuery(type)}
                className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                title={`Filter by ${type}`}
              >
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-text-secondary capitalize">{type}</span>
                <span className="text-text-secondary/60">({typeCounts[type]})</span>
              </button>
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
              ctx.arc(node.x, node.y, (node.val || 4) + 6, 0, 2 * Math.PI);
              ctx.fillStyle = color;
              ctx.fill();
            }}
            linkColor={linkColor}
            linkWidth={linkWidth}
            linkCurvature={0.15}
            linkDirectionalParticles={(link: any) => {
              if (link._bridge) return 0; // no particles on invisible bridges
              if (!selectedNode) return 0;
              const sourceId = typeof link.source === 'string' ? link.source : link.source?.id;
              const targetId = typeof link.target === 'string' ? link.target : link.target?.id;
              return sourceId === selectedNode.id || targetId === selectedNode.id ? 2 : 0;
            }}
            linkDirectionalParticleWidth={1.5}
            linkDirectionalParticleSpeed={0.004}
            linkDirectionalParticleColor={linkColor}
            backgroundColor="#0a0a0f"
            onNodeClick={handleNodeClick}
            onBackgroundClick={() => {
              setSelectedNode(null);
              setHighlightedNodeId(null);
            }}
            warmupTicks={200}
            cooldownTicks={300}
            d3AlphaDecay={0.015}
            d3VelocityDecay={0.3}
            d3AlphaMin={0.001}
            onEngineStop={() => graphRef.current?.zoomToFit(400, 50)}
            enableNodeDrag={true}
            minZoom={0.3}
            maxZoom={10}
          />
        )}
      </div>

      {/* Node Detail Panel */}
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
                    className="w-3.5 h-3.5 rounded-full shrink-0 ring-2 ring-white/20"
                    style={{ backgroundColor: typeColors[selectedNode.type] || '#fff' }}
                  />
                  <h3 className="font-semibold truncate">{selectedNode.label}</h3>
                </div>
                <button
                  onClick={() => {
                    setSelectedNode(null);
                    setHighlightedNodeId(null);
                  }}
                  className="p-1 rounded hover:bg-white/10 shrink-0 ml-2"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs text-text-secondary">
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5">
                  <Tag className="w-3 h-3" />
                  <span className="capitalize">{selectedNode.type}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Strength: {(selectedNode.strength || 1).toFixed(1)}
                </span>
                <span className="flex items-center gap-1">
                  <Link2 className="w-3 h-3" />
                  {connectedNodes.length}
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
                <div className="space-y-1 max-h-[40vh] overflow-y-auto pr-1">
                  {connectedNodes
                    .sort((a, b) => (b.strength || 1) - (a.strength || 1))
                    .map((node) => (
                    <button
                      key={node.id}
                      onClick={() => {
                        const fullNode = graphData.nodes.find((n) => n.id === node.id);
                        if (fullNode) focusOnNode(fullNode);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/8 transition-colors text-left group"
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
                          {node.type} &bull; strength {(node.strength || 1).toFixed(1)}
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
