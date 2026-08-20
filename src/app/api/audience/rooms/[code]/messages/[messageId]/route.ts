import { NextResponse } from "next/server";

import { audienceRoomErrorResponse, invalidRequest } from "@/app/api/http";
import {
  updateAudienceMessage,
  updateAudienceMessageSchema,
} from "@/domain/audience-room";

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  return authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ code: string; messageId: string }> },
) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return invalidRequest("The request body must be valid JSON.");
  }
  const parsed = updateAudienceMessageSchema.safeParse(body);
  if (!parsed.success) {
    return invalidRequest(parsed.error.issues[0]?.message ?? "The message update is invalid.");
  }

  try {
    const { code, messageId } = await context.params;
    return NextResponse.json(
      updateAudienceMessage(code, bearerToken(request), messageId, parsed.data),
    );
  } catch (error) {
    return audienceRoomErrorResponse(error);
  }
}
