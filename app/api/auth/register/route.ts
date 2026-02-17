import { NextRequest } from "next/server";

import { fail } from "@/lib/http";

export async function POST(request: NextRequest) {
  void request;
  return fail("Public registration is disabled. Contact your workspace admin.", 403);
}


