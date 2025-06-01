import type { Metadata } from "next";
import { Toaster } from "sonner";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ConvexClientProvider } from "@/components/providers/convex-provider";
import { ModelProvider } from "@/components/providers/model-provider";
import { EdgeStoreProvider } from "@/lib/edgestore";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Notion Clone",
    description:
        "The Connecting workspace with AI features where better, faster work happens",
    icons: {
        icon: "/notion-light.svg",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="dark:bg-[#1f1f1f]" suppressHydrationWarning>
            <body className={cn(inter.className, "dark:bg-[#1f1f1f]")}>
                <ConvexClientProvider>
                    <EdgeStoreProvider>
                        <ThemeProvider
                            attribute="class"
                            enableSystem
                            defaultTheme="system"
                            disableTransitionOnChange
                            storageKey="notion-theme"
                        >
                            <Toaster position="bottom-right" />
                            <ModelProvider />
                            {children}
                        </ThemeProvider>
                    </EdgeStoreProvider>
                </ConvexClientProvider>
            </body>
        </html>
    );
}
