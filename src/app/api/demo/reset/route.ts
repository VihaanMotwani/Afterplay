import { NextResponse } from "next/server";

import { resetAudienceRoomStore } from "@/domain/audience-room";
import { resetExperimentStore } from "@/domain/experiment";
import { resetLiveSessionStore } from "@/domain/live-session";

export async function POST() {
  resetAudienceRoomStore();
  resetLiveSessionStore();
  return NextResponse.json({ experiment: resetExperimentStore() });
}
