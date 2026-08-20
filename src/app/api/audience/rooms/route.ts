import { NextResponse } from "next/server";

import { audienceRoomErrorResponse, invalidRequest } from "@/app/api/http";
import { createAudienceRoom, createAudienceRoomSchema } from "@/domain/audience-room";

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

  let publicBaseUrl: URL;
  try {
    publicBaseUrl = new URL(process.env.AFTERPLAY_PUBLIC_BASE_URL?.trim() || request.url);
    if (publicBaseUrl.protocol !== "https:" && publicBaseUrl.protocol !== "http:") {
      throw new Error("Unsupported public Audience Room protocol.");
    }
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "audience_public_url_invalid",
          message: "AFTERPLAY_PUBLIC_BASE_URL must be a valid HTTP or HTTPS origin.",
        },
      },
      { status: 500 },
    );
  }

  try {
    const created = createAudienceRoom(parsed.data);
    return NextResponse.json({
      ...created,
      room: {
        ...created.room,
        participantUrl: new URL(created.room.participantPath, publicBaseUrl).toString(),
      },
    }, { status: 201 });
  } catch (error) {
    return audienceRoomErrorResponse(error);
  }
}
