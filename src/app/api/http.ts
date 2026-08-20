import { NextResponse } from "next/server";

import { AudienceDirectorError } from "@/ai/audience-director";
import { AudienceRoomError } from "@/domain/audience-room";
import { ExperimentError } from "@/domain/experiment";
import { LiveSessionError } from "@/domain/live-session";

export function audienceDirectorErrorResponse(error: unknown) {
  if (error instanceof AudienceDirectorError) {
    return NextResponse.json(
      {
        error: { code: error.code, message: error.message },
        meta: { mode: "live", fallbackUsed: false },
      },
      { status: error.status },
    );
  }
  return null;
}

export function audienceRoomErrorResponse(error: unknown) {
  if (error instanceof AudienceRoomError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message, ...error.details } },
      { status: error.status },
    );
  }

  return NextResponse.json(
    { error: { code: "internal_error", message: "An unexpected error occurred." } },
    { status: 500 },
  );
}

export function experimentErrorResponse(error: unknown) {
  if (error instanceof ExperimentError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }

  return NextResponse.json(
    { error: { code: "internal_error", message: "An unexpected error occurred." } },
    { status: 500 },
  );
}

export function invalidRequest(message: string) {
  return NextResponse.json(
    { error: { code: "invalid_request", message } },
    { status: 400 },
  );
}

export function liveSessionErrorResponse(error: unknown) {
  if (error instanceof LiveSessionError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }

  return NextResponse.json(
    { error: { code: "internal_error", message: "An unexpected error occurred." } },
    { status: 500 },
  );
}
