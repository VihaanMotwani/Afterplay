import { NextResponse } from "next/server";

import { audienceRoomErrorResponse, invalidRequest } from "@/app/api/http";
import {
  getAudienceRoom,
  updateAudienceRoom,
  updateAudienceRoomSchema,
} from "@/domain/audience-room";
import { audienceParticipantUrl } from "@/domain/audience-room-url";

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
    const room = getAudienceRoom(code);
    return NextResponse.json({
      room: {
        ...room,
        participantUrl: audienceParticipantUrl(request.url, room.participantPath),
      },
    });
  } catch (error) {
    return audienceRoomErrorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ code: string }> },
) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return invalidRequest("The request body must be valid JSON.");
  }
  const parsed = updateAudienceRoomSchema.safeParse(body);
  if (!parsed.success) {
    return invalidRequest(parsed.error.issues[0]?.message ?? "The audience room update is invalid.");
  }

  try {
    const { code } = await context.params;
    return NextResponse.json(updateAudienceRoom(code, bearerToken(request), parsed.data));
  } catch (error) {
    return audienceRoomErrorResponse(error);
  }
}
