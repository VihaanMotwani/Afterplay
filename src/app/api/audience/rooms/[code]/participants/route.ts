import { NextResponse } from "next/server";

import { audienceRoomErrorResponse, invalidRequest } from "@/app/api/http";
import { joinAudienceRoom, joinAudienceRoomSchema } from "@/domain/audience-room";

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
  const parsed = joinAudienceRoomSchema.safeParse(body);
  if (!parsed.success) {
    return invalidRequest(parsed.error.issues[0]?.message ?? "The participant is invalid.");
  }

  try {
    const { code } = await context.params;
    return NextResponse.json(joinAudienceRoom(code, parsed.data), { status: 201 });
  } catch (error) {
    return audienceRoomErrorResponse(error);
  }
}
