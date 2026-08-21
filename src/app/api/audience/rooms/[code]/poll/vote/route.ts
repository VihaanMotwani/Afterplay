import { NextResponse } from "next/server";

import { audienceRoomErrorResponse, invalidRequest } from "@/app/api/http";
import { voteAudiencePoll, voteAudiencePollSchema } from "@/domain/audience-room";

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
  const parsed = voteAudiencePollSchema.safeParse(body);
  if (!parsed.success) {
    return invalidRequest(parsed.error.issues[0]?.message ?? "Choose a prediction first.");
  }

  try {
    const { code } = await context.params;
    return NextResponse.json(voteAudiencePoll(code, bearerToken(request), parsed.data));
  } catch (error) {
    return audienceRoomErrorResponse(error);
  }
}
