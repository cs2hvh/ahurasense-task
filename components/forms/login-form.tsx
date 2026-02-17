"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { LoaderCircle } from "lucide-react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type LoginInput, loginSchema } from "@/lib/validations/auth";

export function LoginForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);

    const result = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });

    if (result?.error) {
      setServerError("Invalid email or password");
      return;
    }

    router.push("/workspaces");
    router.refresh();
  });

  return (
    <motion.form
      onSubmit={onSubmit}
      className="w-full max-w-md space-y-4 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6 shadow-[var(--shadow-md)]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div>
        <h1 className="text-[32px] font-bold tracking-[-0.02em] text-[var(--color-text-primary)]">Sign In</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">Continue to your workspace</p>
      </div>

      <div className="space-y-2">
        <label className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Email</label>
        <Input type="email" {...form.register("email")} />
        {form.formState.errors.email && <p className="text-xs text-[var(--color-error)]">{form.formState.errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <label className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Password</label>
        <Input type="password" {...form.register("password")} />
        {form.formState.errors.password && <p className="text-xs text-[var(--color-error)]">{form.formState.errors.password.message}</p>}
      </div>

      {serverError && <p className="text-xs text-[var(--color-error)]">{serverError}</p>}

      <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : null}
        Login
      </Button>

    </motion.form>
  );
}


