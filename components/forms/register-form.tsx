"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { LoaderCircle } from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type RegisterInput, registerSchema } from "@/lib/validations/auth";

export function RegisterForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setServerError(payload.error ?? "Failed to create account");
      return;
    }

    const signInResult = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });

    if (signInResult?.error) {
      router.push("/auth/login");
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
        <h1 className="text-[32px] font-bold tracking-[-0.02em] text-[var(--color-text-primary)]">Create Account</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">Set up your profile to get started</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">First name</label>
          <Input {...form.register("firstName")} />
          {form.formState.errors.firstName && <p className="text-xs text-[var(--color-error)]">{form.formState.errors.firstName.message}</p>}
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Last name</label>
          <Input {...form.register("lastName")} />
          {form.formState.errors.lastName && <p className="text-xs text-[var(--color-error)]">{form.formState.errors.lastName.message}</p>}
        </div>
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
        Create account
      </Button>

      <p className="text-sm text-[var(--color-text-secondary)]">
        Already have an account?{" "}
        <Link href="/auth/login" className="text-[var(--color-accent-primary)] hover:text-[var(--color-accent-hover)]">
          Sign in
        </Link>
      </p>
    </motion.form>
  );
}


