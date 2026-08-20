import { NextResponse } from "next/server";

import { audienceRoomErrorResponse, invalidRequest } from "@/app/api/http";
import { createAudienceRoom, createAudienceRoomSchema } from "@/domain/audience-room";
import { audienceParticipantUrl } from "@/domain/audience-room-url";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return invalidRequest("The request body must be valid JSON.");
  }

  const parsed = createAudienceRoomSchema.safeParse(body);
  if (!parsed.success) {
    return invalidRequest(parsed.error.issues[0]?.message ?? "The audience room is invalid.");
  }

  try {
    const created = createAudienceRoom(parsed.data);
    return NextResponse.json({
      ...created,
      room: {
        ...created.room,
        participantUrl: audienceParticipantUrl(request.url, created.room.participantPath),
      },
    }, { status: 201 });
  } catch (error) {
    return audienceRoomErrorResponse(error);
  }
}
