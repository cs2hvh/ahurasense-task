import { LoginForm } from "@/components/forms/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}) {
  const params = await searchParams;
  const callbackParam = Array.isArray(params.callbackUrl) ? params.callbackUrl[0] : params.callbackUrl;
  const callbackUrl = callbackParam && callbackParam.startsWith("/") ? callbackParam : "/workspaces";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-bg-primary)] px-4">
      <LoginForm callbackUrl={callbackUrl} />
    </main>
  );
}


