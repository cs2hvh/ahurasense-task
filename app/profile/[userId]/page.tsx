import { redirect } from "next/navigation";

import { EmployeeProfileForm } from "@/components/profile/employee-profile-form";
import { getAuthSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

interface Props {
  params: Promise<{ userId: string }>;
}

export default async function UserProfilePage({ params }: Props) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const { userId } = await params;

  // If viewing own profile, redirect to /profile
  if (userId === session.user.id) {
    redirect("/profile");
  }

  // Verify user exists
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!target) {
    redirect("/profile");
  }

  return (
    <main className="flex h-full flex-col">
      <EmployeeProfileForm userId={userId} />
    </main>
  );
}
