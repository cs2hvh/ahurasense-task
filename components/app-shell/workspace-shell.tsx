"use client";

import { motion } from "framer-motion";

import { Sidebar } from "@/components/app-shell/sidebar";
import { TopNav } from "@/components/app-shell/top-nav";

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--color-bg-primary)]">
      <TopNav />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <motion.main
          className="min-h-0 flex-1 overflow-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}


