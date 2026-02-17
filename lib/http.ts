import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function handleRouteError(error: unknown) {
  if (error instanceof ZodError) {
    return fail(error.issues.map((issue) => issue.message).join(", "), 422);
  }

  if (error instanceof Error) {
    return fail(error.message, 400);
  }

  return fail("Unexpected server error", 500);
}


