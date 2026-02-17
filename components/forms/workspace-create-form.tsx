"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { slugify } from "@/lib/utils";
import { type CreateWorkspaceInput, createWorkspaceSchema } from "@/lib/validations/workspace";

export function WorkspaceCreateForm() {
  const queryClient = useQueryClient();

  const form = useForm<CreateWorkspaceInput>({
    resolver: zodResolver(createWorkspaceSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const response = await fetch("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      form.setError("root", { message: payload.error ?? "Failed to create workspace" });
      return;
    }

    form.reset();
    await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    window.location.reload();
  });

  return (
    <form className="space-y-3 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4" onSubmit={onSubmit}>
      <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Create Workspace</h3>

      <div className="space-y-1">
        <label className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Workspace Name</label>
        <Input
          {...form.register("name")}
          onChange={(event) => {
            form.setValue("name", event.target.value);
            if (!form.getValues("slug")) {
              form.setValue("slug", slugify(event.target.value));
            }
          }}
        />
        {form.formState.errors.name && <p className="text-xs text-[var(--color-error)]">{form.formState.errors.name.message}</p>}
      </div>

      <div className="space-y-1">
        <label className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Slug</label>
        <Input {...form.register("slug")} />
        {form.formState.errors.slug && <p className="text-xs text-[var(--color-error)]">{form.formState.errors.slug.message}</p>}
      </div>

      <div className="space-y-1">
        <label className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Description</label>
        <Input {...form.register("description")} />
        {form.formState.errors.description && <p className="text-xs text-[var(--color-error)]">{form.formState.errors.description.message}</p>}
      </div>

      {form.formState.errors.root && <p className="text-xs text-[var(--color-error)]">{form.formState.errors.root.message}</p>}

      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : null}
        Create
      </Button>
    </form>
  );
}


