import { NextResponse } from "next/server";

import { audienceRoomErrorResponse, invalidRequest } from "@/app/api/http";
import {
  addAudienceMessage,
  createAudienceMessageSchema,
  getAudienceMessages,
} from "@/domain/audience-room";

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  return authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await context.params;
    return NextResponse.json(getAudienceMessages(code, bearerToken(request)));
  } catch (error) {
    return audienceRoomErrorResponse(error);
  }
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
  const parsed = createAudienceMessageSchema.safeParse(body);
  if (!parsed.success) {
    return invalidRequest(parsed.error.issues[0]?.message ?? "The audience message is invalid.");
  }

  try {
    const { code } = await context.params;
    return NextResponse.json(
      addAudienceMessage(code, bearerToken(request), parsed.data),
      { status: 201 },
    );
  } catch (error) {
    return audienceRoomErrorResponse(error);
  }
}
