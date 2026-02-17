import { redirect } from "next/navigation";

import { WorkspaceShell } from "@/components/app-shell/workspace-shell";
import { getAuthSession } from "@/lib/session";

export default async function WorkspacesLayout({ children }: { children: React.ReactNode }) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  return <WorkspaceShell>{children}</WorkspaceShell>;
}
