import { NextResponse } from "next/server";

import { audienceRoomErrorResponse, invalidRequest } from "@/app/api/http";
import { createAudiencePoll, createAudiencePollSchema } from "@/domain/audience-room";

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  return authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ code: string }> },
) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return invalidRequest("The request body must be valid JSON.");
  }
  const parsed = createAudiencePollSchema.safeParse(body);
  if (!parsed.success) {
    return invalidRequest(parsed.error.issues[0]?.message ?? "The Director prediction is invalid.");
  }

  try {
    const { code } = await context.params;
    return NextResponse.json(createAudiencePoll(code, bearerToken(request), parsed.data), { status: 201 });
  } catch (error) {
    return audienceRoomErrorResponse(error);
  }
}
