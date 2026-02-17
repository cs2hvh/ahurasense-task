"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type CreateProjectInput, createProjectSchema } from "@/lib/validations/project";

export function ProjectCreateForm({ workspaceId }: { workspaceId: string }) {
  const form = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      key: "",
      name: "",
      description: "",
      type: "software",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const response = await fetch(`/api/workspaces/${workspaceId}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      form.setError("root", { message: payload.error ?? "Failed to create project" });
      return;
    }

    form.reset();
    window.location.reload();
  });

  return (
    <form className="space-y-3 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4" onSubmit={onSubmit}>
      <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Create Project</h3>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Project Key</label>
          <Input {...form.register("key")} placeholder="PROJ" />
          {form.formState.errors.key && <p className="text-xs text-[var(--color-error)]">{form.formState.errors.key.message}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Name</label>
          <Input {...form.register("name")} />
          {form.formState.errors.name && <p className="text-xs text-[var(--color-error)]">{form.formState.errors.name.message}</p>}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Description</label>
        <Input {...form.register("description")} />
      </div>

      <div className="space-y-1">
        <label className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Type</label>
        <select
          {...form.register("type")}
          className="h-10 w-full border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 text-sm text-[var(--color-text-primary)] outline-none"
        >
          <option value="software">Software</option>
          <option value="business">Business</option>
          <option value="service_desk">Service Desk</option>
        </select>
      </div>

      {form.formState.errors.root && <p className="text-xs text-[var(--color-error)]">{form.formState.errors.root.message}</p>}

      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : null}
        Create project
      </Button>
    </form>
  );
}


