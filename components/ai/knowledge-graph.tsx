"use client";
import { useEffect, useState, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    FileText,
    Lightbulb,
    Loader2,
    Network,
    ArrowRight,
    Info,
    Link as LinkIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ReactFlow, {
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Edge,
    Node,
    BackgroundVariant,
    Position,
    MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

// Custom Node Components
const DocumentNode = ({ data }: { data: any }) => {
    const router = useRouter();

    const handleClick = () => {
        if (data.id) {
            router.push(`/documents/${data.id}`);
        }
        toast.info(`Opening document: ${data.title}`);
    };

    return (
        <div
            className="px-4 py-3 shadow-lg rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 border-2 border-blue-300 min-w-[150px] hover:shadow-xl transition-all duration-300 cursor-pointer group"
            onClick={handleClick}
        >
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-lg">
                    📄
                </div>
                <div className="text-white">
                    <div className="font-semibold text-sm group-hover:scale-105 transition-transform">
                        {data.title.length > 20
                            ? data.title.substring(0, 20) + "..."
                            : data.title}
                    </div>
                    <div className="text-blue-100 text-xs">Document</div>
                </div>
            </div>
        </div>
    );
};

const ConceptNode = ({ data }: { data: any }) => {
    const handleClick = () => {
        toast.info(`Concept: ${data.title}`);
    };

    return (
        <div
            className="px-4 py-3 shadow-lg rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 border-2 border-purple-300 min-w-[150px] hover:shadow-xl transition-all duration-300 cursor-pointer group"
            onClick={handleClick}
        >
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-lg">
                    💡
                </div>
                <div className="text-white">
                    <div className="font-semibold text-sm group-hover:scale-105 transition-transform">
                        {data.title.length > 20
                            ? data.title.substring(0, 20) + "..."
                            : data.title}
                    </div>
                    <div className="text-purple-100 text-xs">Concept</div>
                </div>
            </div>
        </div>
    );
};

// Node types for React Flow
const nodeTypes = {
    document: DocumentNode,
    concept: ConceptNode,
};

interface GraphData {
    nodes: any[];
    links: any[];
}

interface DocumentConnection {
    source: string;
    sourceTitle: string;
    target: string;
    targetTitle: string;
    type: string;
    strength: number;
}

export function KnowledgeGraph() {
    const documents = useQuery(api.documents.getAllWithContent);
    const [graphData, setGraphData] = useState<GraphData | null>(null);
    const [selectedNode, setSelectedNode] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [connections, setConnections] = useState<DocumentConnection[]>([]);

    // React Flow state
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

    const router = useRouter(); // Debug logging
    useEffect(() => {
        console.log("KnowledgeGraph - Documents:", documents?.length || 0);
        console.log("KnowledgeGraph - Document objects:", documents);
        console.log(
            "KnowledgeGraph - GraphData:",
            graphData ? "Present" : "Null"
        );
        console.log("KnowledgeGraph - IsLoading:", isLoading);

        // Additional debug info
        if (documents === undefined) {
            console.log("KnowledgeGraph - Documents query is still loading");
        } else if (documents === null) {
            console.log(
                "KnowledgeGraph - Documents query returned null (possibly auth issue)"
            );
        } else if (Array.isArray(documents) && documents.length === 0) {
            console.log("KnowledgeGraph - No documents found for current user");
        }
    }, [documents, graphData, isLoading]); // Generate or fetch graph data
    const generateGraphData = useCallback(async () => {
        if (!documents?.length) {
            toast.error("No documents available to generate graph");
            return;
        }
        console.log("Generating graph for", documents.length, "documents");
        setIsLoading(true);

        try {
            const response = await fetch("/api/ai/knowledge-graph", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ documents }),
            });

            console.log("API Response status:", response.status);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log("Received graph data:", data);

            if (!data.nodes || data.nodes.length === 0) {
                console.warn("API returned empty nodes, creating fallback");
                throw new Error("No graph data returned from API");
            }

            setGraphData(data);
            toast.success(
                `Generated graph with ${data.nodes.length} nodes and ${data.links?.length || 0} connections`
            );
        } catch (error) {
            console.error("Error generating knowledge graph:", error);
            toast.error(
                "Knowledge graph generation failed. Using simplified view.",
                { description: (error as Error).message }
            );
            // Create a simple fallback graph
            const fallbackData = {
                nodes: documents.slice(0, 10).map((doc, index) => ({
                    id: doc._id,
                    title: doc.title,
                    type: "document",
                    group: Math.floor(index / 3) + 1,
                    size: 15,
                })),
                links: [] as any[],
            };

            if (fallbackData.nodes.length > 1) {
                // Add a simple connection between first two documents
                fallbackData.links.push({
                    source: fallbackData.nodes[0].id,
                    target: fallbackData.nodes[1].id,
                    strength: 0.5,
                    type: "related",
                });
            }

            console.log("Using fallback data:", fallbackData);
            setGraphData(fallbackData);
            toast.info("Using simplified graph structure");
        } finally {
            setIsLoading(false);
        }
    }, [documents]); // Convert graph data to React Flow format
    useEffect(() => {
        if (!graphData || !graphData.nodes?.length) return;

        console.log("Processing graph data:", graphData);

        // Create nodes with better positioning
        const flowNodes: Node[] = graphData.nodes.map(
            (node: any, index: number) => {
                const isDocument = node.type === "document";
                const col = index % 3;
                const row = Math.floor(index / 3);

                return {
                    id: node.id,
                    type: node.type || "document",
                    position: {
                        x: 100 + col * 300 + (isDocument ? 0 : 150),
                        y: 100 + row * 200 + (isDocument ? 0 : 100),
                    },
                    data: {
                        title: node.title,
                        id: node.id,
                        ...node,
                    },
                    draggable: true,
                };
            }
        );

        // Process connections for the dashboard
        const processedConnections: DocumentConnection[] = [];

        if (graphData.links && graphData.links.length > 0) {
            graphData.links.forEach((link: any) => {
                const sourceNode = graphData.nodes.find(
                    (node: any) => node.id === link.source
                );
                const targetNode = graphData.nodes.find(
                    (node: any) => node.id === link.target
                );

                if (sourceNode && targetNode) {
                    processedConnections.push({
                        source: link.source,
                        sourceTitle: sourceNode.title,
                        target: link.target,
                        targetTitle: targetNode.title,
                        type: link.type,
                        strength: link.strength,
                    });
                }
            });
        }

        setConnections(processedConnections); // Create edges with better styling for visibility
        const flowEdges: Edge[] = (graphData.links || []).map(
            (link: any, index: number) => {
                const edgeType = "smoothstep"; // Use smoothstep for all edges for better visibility
                const isDocToDoc = link.type === "related";

                return {
                    id: `edge-${index}`,
                    source: link.source,
                    target: link.target,
                    type: edgeType,
                    animated: true, // Make all edges animated for better visibility
                    style: {
                        stroke: isDocToDoc ? "#3b82f6" : "#8b5cf6", // Blue for doc-doc, purple for others
                        strokeWidth: Math.max(3, (link.strength || 0.5) * 6), // Thicker lines
                        strokeDasharray: isDocToDoc ? "0" : "5,5", // Dashed lines for concept connections
                    },
                    markerEnd: {
                        type: MarkerType.ArrowClosed,
                        color: isDocToDoc ? "#3b82f6" : "#8b5cf6",
                        width: 20,
                        height: 20,
                    },
                    label: link.type || "connected",
                    labelStyle: {
                        fontSize: 12,
                        fontWeight: "bold",
                        fill: "#374151",
                        backgroundColor: "#ffffff",
                        padding: "2px 4px",
                        borderRadius: "4px",
                        border: "1px solid #d1d5db",
                    },
                    labelBgPadding: [8, 4],
                    labelBgBorderRadius: 4,
                    labelBgStyle: { fill: "#ffffff", fillOpacity: 0.9 },
                };
            }
        );

        console.log(
            "Created nodes:",
            flowNodes.length,
            "edges:",
            flowEdges.length
        );
        setNodes(flowNodes);
        setEdges(flowEdges);
    }, [graphData, setNodes, setEdges]);

    // Handle connection between nodes
    const onConnect = useCallback(
        (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
        [setEdges]
    ); // Get statistics
    const getStats = () => {
        if (!graphData) return { documents: 0, concepts: 0, connections: 0 };
        return {
            documents: graphData.nodes.filter((n: any) => n.type === "document")
                .length,
            concepts: graphData.nodes.filter((n: any) => n.type === "concept")
                .length,
            connections: graphData.links.length,
        };
    };

    const stats = getStats(); // Auto-generate if documents are available
    useEffect(() => {
        if (documents?.length && !graphData && !isLoading) {
            console.log(
                "Auto-generating graph with",
                documents.length,
                "documents"
            );
            generateGraphData();
        }
    }, [documents, graphData, generateGraphData, isLoading]);
    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-500" />
                            <span className="font-medium">Documents</span>
                        </div>
                        <Badge
                            variant="secondary"
                            className="text-lg font-bold"
                        >
                            {stats.documents}
                        </Badge>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-2">
                            <Lightbulb className="h-5 w-5 text-purple-500" />
                            <span className="font-medium">Concepts</span>
                        </div>
                        <Badge
                            variant="secondary"
                            className="text-lg font-bold"
                        >
                            {stats.concepts}
                        </Badge>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-2">
                            <ArrowRight className="h-5 w-5 text-green-500" />
                            <span className="font-medium">Connections</span>
                        </div>
                        <Badge
                            variant="secondary"
                            className="text-lg font-bold"
                        >
                            {stats.connections}
                        </Badge>
                    </CardContent>
                </Card>
            </div>{" "}
            {/* Graph Visualization */}
            <Card>
                {" "}
                <CardContent className="p-0">
                    <div className="h-[700px] w-full bg-gray-50 rounded-lg relative">
                        {graphData && nodes.length > 0 ? (
                            <ReactFlow
                                nodes={nodes}
                                edges={edges}
                                onNodesChange={onNodesChange}
                                onEdgesChange={onEdgesChange}
                                onConnect={onConnect}
                                nodeTypes={nodeTypes}
                                onInit={setReactFlowInstance}
                                fitView
                                className="bg-white"
                                connectionLineStyle={{
                                    stroke: "#3b82f6",
                                    strokeWidth: 3,
                                }}
                                defaultEdgeOptions={{
                                    style: {
                                        strokeWidth: 3,
                                        stroke: "#3b82f6",
                                    },
                                    type: "smoothstep",
                                    markerEnd: {
                                        type: MarkerType.ArrowClosed,
                                        color: "#3b82f6",
                                    },
                                }}
                            >
                                <Controls className="bg-white border border-gray-200 rounded-lg shadow-sm" />
                                <MiniMap
                                    className="bg-white border border-gray-200 rounded-lg"
                                    nodeColor={(node: Node) => {
                                        switch (node.type) {
                                            case "document":
                                                return "#3b82f6";
                                            case "concept":
                                                return "#8b5cf6";
                                            default:
                                                return "#6b7280";
                                        }
                                    }}
                                />
                                <Background
                                    variant={BackgroundVariant.Dots}
                                    gap={20}
                                    size={1}
                                    className="bg-white"
                                />
                            </ReactFlow>
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <div className="text-center space-y-4">
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="h-12 w-12 animate-spin mx-auto text-muted-foreground" />
                                            <p className="text-muted-foreground">
                                                Generating knowledge graph...
                                            </p>
                                        </>
                                    ) : !documents?.length ? (
                                        <>
                                            <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
                                            <div>
                                                <p className="text-muted-foreground mb-2">
                                                    {documents === undefined
                                                        ? "Loading documents..."
                                                        : "No documents found in your workspace"}
                                                </p>
                                                <p className="text-sm text-muted-foreground mb-4">
                                                    Create some documents first,
                                                    then come back to generate
                                                    your knowledge graph.
                                                </p>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <Network className="h-12 w-12 mx-auto text-muted-foreground" />
                                            <div>
                                                <p className="text-muted-foreground mb-2">
                                                    No graph data available
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    Graph will be automatically
                                                    generated when documents are
                                                    available.
                                                </p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
            {/* Connections Dashboard */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-medium">
                        Connections Dashboard
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : connections.length === 0 ? (
                        <div className="text-center py-10">
                            <FileText className="h-8 w-8 mx-auto text-muted-foreground" />
                            <p className="text-muted-foreground mt-2">
                                No connections found. Generate a knowledge graph
                                to see the connections between your documents
                                and concepts.
                            </p>
                        </div>
                    ) : (
                        <div>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-left">
                                            Source
                                        </TableHead>
                                        <TableHead className="text-left">
                                            Target
                                        </TableHead>
                                        <TableHead className="text-left">
                                            Type
                                        </TableHead>
                                        <TableHead className="text-left">
                                            Strength
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>{" "}
                                <TableBody>
                                    {connections.map((conn, index) => (
                                        <TableRow
                                            key={index}
                                            className="transition-colors cursor-pointer"
                                        >
                                            <TableCell className="py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
                                                        {conn.sourceTitle.charAt(
                                                            0
                                                        )}
                                                    </div>
                                                    <span className="font-medium">
                                                        {conn.sourceTitle}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm">
                                                        {conn.targetTitle.charAt(
                                                            0
                                                        )}
                                                    </div>
                                                    <span className="font-medium">
                                                        {conn.targetTitle}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-3">
                                                <span className="text-sm">
                                                    {conn.type}
                                                </span>
                                            </TableCell>
                                            <TableCell className="py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                                                    <span className="text-sm">
                                                        {conn.strength}
                                                    </span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>{" "}
            {/* Detailed Connections Dashboard */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <LinkIcon className="h-5 w-5 text-blue-500" />
                        Detailed Connections Dashboard
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {connections.length > 0 ? (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Source Document</TableHead>
                                        <TableHead>Connection Type</TableHead>
                                        <TableHead>Target</TableHead>
                                        <TableHead>Strength</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {connections.map((connection, idx) => (
                                        <TableRow
                                            key={idx}
                                            className="transition-colors"
                                        >
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    {connection.type ===
                                                        "related" ||
                                                    connection.type ===
                                                        "contains" ? (
                                                        <FileText className="h-4 w-4 text-blue-500" />
                                                    ) : (
                                                        <div className="h-4 w-4" />
                                                    )}
                                                    <span
                                                        className="cursor-pointer hover:underline"
                                                        onClick={() =>
                                                            router.push(
                                                                `/documents/${connection.source}`
                                                            )
                                                        }
                                                    >
                                                        {connection.sourceTitle}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={
                                                        connection.type ===
                                                        "related"
                                                            ? "default"
                                                            : connection.type ===
                                                                "contains"
                                                              ? "secondary"
                                                              : "outline"
                                                    }
                                                >
                                                    {connection.type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {connection.type ===
                                                    "related" ? (
                                                        <FileText className="h-4 w-4 text-blue-500" />
                                                    ) : (
                                                        <Lightbulb className="h-4 w-4 text-purple-500" />
                                                    )}
                                                    <span
                                                        className={
                                                            connection.type ===
                                                            "related"
                                                                ? "cursor-pointer hover:underline"
                                                                : ""
                                                        }
                                                        onClick={() => {
                                                            if (
                                                                connection.type ===
                                                                "related"
                                                            ) {
                                                                router.push(
                                                                    `/documents/${connection.target}`
                                                                );
                                                            }
                                                        }}
                                                    >
                                                        {connection.targetTitle}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                    <div
                                                        className="bg-blue-600 h-2 rounded-full"
                                                        style={{
                                                            width: `${connection.strength * 100}%`,
                                                        }}
                                                    />
                                                </div>
                                                <span className="text-xs text-muted-foreground">
                                                    {Math.round(
                                                        connection.strength *
                                                            100
                                                    )}
                                                    %
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="text-center p-4 border rounded-md text-muted-foreground">
                            <Info className="h-5 w-5 mx-auto mb-2" />
                            <p>No connections found in the knowledge graph.</p>
                            <p className="text-xs mt-2">
                                Generate the graph first to see detailed
                                connections.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
            {/* Instructions */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-medium">
                        Instructions
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        <span>Drag nodes to reposition them in the graph</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full" />
                        <span>Click document nodes to open them</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <span>Use controls to zoom and pan the view</span>
                    </div>{" "}
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-gray-500 rounded-full" />
                        <span>View minimap for navigation in large graphs</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
