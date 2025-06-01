// "use client";
// import Spinner from "@/components/spinner";
// import { Button } from "@/components/ui/button";
// import { SignInButton } from "@clerk/clerk-react";
// import { useConvexAuth } from "convex/react";
// import { ArrowRight } from "lucide-react";
// import Link from "next/link";
// import React from "react";

// const Heading = () => {
//   const { isAuthenticated, isLoading } = useConvexAuth();
//   return (
//     <div className="max-w-3xl space-y-3">
//       <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold">
//         Your Ideas, Documents & Workspaces In One Place. Welcome to
//         <span className="underline ml-1">Notion</span>
//       </h1>
//       <h3 className="text-base sm:text-xl md:text-2xl font-medium">
//         The connecting workspace where
//         <br /> better, faster work happens
//       </h3>
//       {isLoading && (
//         <div className="w-full flex items-center justify-center">
//           <Spinner size={"lg"} />
//         </div>
//       )}
//       {isAuthenticated && !isLoading && (
//         <Button asChild>
//           <Link href="/documents">
//             Get Started
//             <ArrowRight className="w-4 h-4 ml-2" />
//           </Link>
//         </Button>
//       )}

//       {!isAuthenticated && !isLoading && (
//         <SignInButton mode="modal">
//           <Button>
//             Get Notion Free
//             <ArrowRight className="w-4 h-4 ml-2" />
//           </Button>
//         </SignInButton>
//       )}
//     </div>
//   );
// };

// export default Heading;

"use client";
import Spinner from "@/components/spinner";
import { Button } from "@/components/ui/button";
import { SignInButton } from "@clerk/clerk-react";
import { useConvexAuth } from "convex/react";
import {
    ArrowRight,
    Brain,
    FileText,
    Share2,
    Search,
    Zap,
    Link2,
    Network,
    Tags,
} from "lucide-react";
import Link from "next/link";
import React from "react";

const Heading = () => {
    const { isAuthenticated, isLoading } = useConvexAuth();

    const features = [
        {
            icon: FileText,
            title: "Rich Document Editor",
            description:
                "Create beautiful documents with our powerful block-based editor",
        },
        {
            icon: Share2,
            title: "Real-time Collaboration",
            description: "Work together seamlessly with your team in real-time",
        },
        {
            icon: Search,
            title: "Powerful Search",
            description: "Find anything instantly across all your documents",
        },
        {
            icon: Brain,
            title: "AI Auto-Linker",
            description:
                "AI automatically suggests linking to related pages as you write",
        },
        {
            icon: Network,
            title: "Knowledge Graph",
            description:
                "Visualize document relationships as a live interactive graph",
        },
        {
            icon: Tags,
            title: "Smart Auto-Tagging",
            description:
                "AI generates semantic tags for smarter content organization",
        },
        {
            icon: Zap,
            title: "AI Q&A Assistant",
            description:
                "Ask questions about your workspace and get instant answers",
        },
        {
            icon: Link2,
            title: "Publish & Share",
            description:
                "Share your work with the world with one-click publishing",
        },
    ];

    return (
        <div className="max-w-6xl space-y-12">
            {/* Hero Section */}
            <div className="text-center space-y-6">
                <div className="space-y-4">
                    <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full border border-blue-200 dark:border-blue-800">
                        <Brain className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                            Powered by AI Intelligence
                        </span>
                    </div>

                    <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 dark:from-gray-100 dark:via-gray-200 dark:to-gray-300 bg-clip-text text-transparent leading-tight">
                        Your Ideas, Documents &
                        <br />
                        <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                            AI-Powered Workspace
                        </span>
                    </h1>

                    <p className="text-lg sm:text-xl md:text-2xl font-medium text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                        The connecting workspace where better, faster work
                        happens.
                        <br />
                        <span className="text-blue-600 dark:text-blue-400 font-semibold">
                            Now with intelligent AI features.
                        </span>
                    </p>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                    {isLoading && (
                        <div className="w-full flex items-center justify-center">
                            <Spinner size={"lg"} />
                        </div>
                    )}

                    {isAuthenticated && !isLoading && (
                        <Button
                            asChild
                            size="lg"
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                            <Link
                                href="/documents"
                                className="flex items-center"
                            >
                                Get Started
                                <ArrowRight className="w-5 h-5 ml-2" />
                            </Link>
                        </Button>
                    )}

                    {!isAuthenticated && !isLoading && (
                        <>
                            <SignInButton mode="modal">
                                <Button
                                    size="lg"
                                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                                >
                                    Get Started Free
                                    <ArrowRight className="w-5 h-5 ml-2" />
                                </Button>
                            </SignInButton>
                            <Button
                                variant="outline"
                                size="lg"
                                className="border-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                Watch Demo
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Features Grid */}
            <div className="space-y-8">
                <div className="text-center space-y-4">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100">
                        Powerful Features for Modern Teams
                    </h2>
                    <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                        Everything you need to organize thoughts, manage
                        projects, and collaborate effectively
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className="group p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:shadow-lg dark:hover:shadow-xl transition-all duration-300 hover:scale-105"
                        >
                            <div className="space-y-3">
                                <div className="inline-flex p-3 rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10 group-hover:from-blue-500/20 group-hover:to-purple-500/20 transition-colors">
                                    <feature.icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                                    {feature.title}
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                                    {feature.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* AI Features Highlight */}
            <div className="relative p-8 rounded-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/30 dark:via-indigo-950/30 dark:to-purple-950/30 border border-blue-200 dark:border-blue-800">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-2xl"></div>
                <div className="relative text-center space-y-4">
                    <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full text-sm font-medium shadow-lg">
                        <Zap className="w-4 h-4 mr-2" />
                        Coming Soon: Advanced AI Features
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
                        The Future of Intelligent Workspaces
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                        Our upcoming AI features will revolutionize how you work
                        with documents, making your workspace smarter and more
                        connected than ever before.
                    </p>
                </div>
            </div>

            {/* Stats Section */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-8">
                {[
                    { number: "99.9%", label: "Uptime" },
                    { number: "10k+", label: "Documents Created" },
                    { number: "50+", label: "Integrations" },
                    { number: "24/7", label: "Support" },
                ].map((stat, index) => (
                    <div key={index} className="text-center space-y-2">
                        <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            {stat.number}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                            {stat.label}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Heading;
