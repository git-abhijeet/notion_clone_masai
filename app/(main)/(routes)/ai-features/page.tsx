"use client";
import { AISearch } from "@/components/ai/ai-search";
import { KnowledgeGraph } from "@/components/ai/knowledge-graph";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Search, Network, Tag } from "lucide-react";

export default function AIFeaturesPage() {
    return (
        <div className="h-full px-4 py-6 max-w-6xl mx-auto">
            <div className="space-y-6">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">
                        AI Features
                    </h1>
                    <p className="text-muted-foreground">
                        Enhance your knowledge management with AI-powered tools
                    </p>
                </div>

                <Tabs defaultValue="search" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger
                            value="search"
                            className="flex items-center gap-2"
                        >
                            <Search className="h-4 w-4" />
                            AI Search
                        </TabsTrigger>
                        <TabsTrigger
                            value="knowledge-graph"
                            className="flex items-center gap-2"
                        >
                            <Network className="h-4 w-4" />
                            Knowledge Graph
                        </TabsTrigger>
                        <TabsTrigger
                            value="features"
                            className="flex items-center gap-2"
                        >
                            <Brain className="h-4 w-4" />
                            All Features
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="search" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Search className="h-5 w-5" />
                                    AI-Powered Question Answering
                                </CardTitle>
                                <CardDescription>
                                    Ask questions about your workspace content
                                    and get AI-powered answers
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <AISearch />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="knowledge-graph" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Network className="h-5 w-5" />
                                    Knowledge Graph Visualization
                                </CardTitle>
                                <CardDescription>
                                    Visualize relationships between your
                                    documents
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <KnowledgeGraph />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="features" className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Search className="h-5 w-5" />
                                        AI Auto-Linker
                                    </CardTitle>
                                    <CardDescription>
                                        Automatically suggests relevant
                                        documents to link while writing
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        This feature is integrated into the
                                        editor and automatically suggests
                                        related documents as you type.
                                    </p>{" "}
                                    <div className="bg-muted p-3 rounded-md">
                                        <p className="text-xs text-muted-foreground">
                                            💡 Start typing in any document to
                                            see AI-powered link suggestions
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Tag className="h-5 w-5" />
                                        Auto Tag Generator
                                    </CardTitle>
                                    <CardDescription>
                                        AI generates semantic tags for your
                                        documents
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        This feature analyzes your document
                                        content and generates relevant tags
                                        automatically.
                                    </p>{" "}
                                    <div className="bg-muted p-3 rounded-md">
                                        <p className="text-xs text-muted-foreground">
                                            ✨ Click &ldquo;Generate AI
                                            Tags&rdquo; on any document to add
                                            semantic tags
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Network className="h-5 w-5" />
                                        Knowledge Graph Builder
                                    </CardTitle>
                                    <CardDescription>
                                        Visualizes document relationships and
                                        connections
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Explore how your documents are connected
                                        through AI-analyzed relationships.
                                    </p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            const tabsTrigger =
                                                document.querySelector(
                                                    '[value="knowledge-graph"]'
                                                ) as HTMLElement;
                                            tabsTrigger?.click();
                                        }}
                                    >
                                        View Knowledge Graph
                                    </Button>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Brain className="h-5 w-5" />
                                        Question Answering
                                    </CardTitle>
                                    <CardDescription>
                                        Ask questions about your workspace
                                        content
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Get AI-powered answers based on all your
                                        workspace content.
                                    </p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            const tabsTrigger =
                                                document.querySelector(
                                                    '[value="search"]'
                                                ) as HTMLElement;
                                            tabsTrigger?.click();
                                        }}
                                    >
                                        Try AI Search
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
