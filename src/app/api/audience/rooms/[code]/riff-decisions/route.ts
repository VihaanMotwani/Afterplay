import { NextResponse } from "next/server";
import { z } from "zod";

import { runDemoAudienceDecision, runLiveAudienceDecision } from "@/ai/audience-director";
import {
  audienceDirectorErrorResponse,
  audienceRoomErrorResponse,
  invalidRequest,
} from "@/app/api/http";
import { getAudienceMessages, updateAudienceMessage } from "@/domain/audience-room";

const createDecisionSchema = z.object({
  mode: z.enum(["demo", "live"]),
  afterMessageId: z.string().trim().min(1).max(100).optional(),
});

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
  const parsed = createDecisionSchema.safeParse(body);
  if (!parsed.success) {
    return invalidRequest(parsed.error.issues[0]?.message ?? "The Riff decision request is invalid.");
  }

  try {
    const { code } = await context.params;
    const hostToken = bearerToken(request);
    const feed = getAudienceMessages(code, hostToken);
    const visibleMessages = feed.messages
      .filter((message) => message.status !== "hidden")
      .map(({ id, displayName, text, createdAt }) => ({ id, displayName, text, createdAt }));
    const afterIndex = parsed.data.afterMessageId
      ? visibleMessages.findIndex((message) => message.id === parsed.data.afterMessageId)
      : -1;
    const messages = (afterIndex >= 0 ? visibleMessages.slice(afterIndex + 1) : visibleMessages).slice(-8);
    const liveResult = parsed.data.mode === "live"
      ? await runLiveAudienceDecision(code, messages)
      : null;
    const decision = liveResult?.decision ?? runDemoAudienceDecision(messages);
    if (decision.kind === "spotlight") {
      updateAudienceMessage(code, hostToken, decision.spotlight.id, { status: "spotlighted" });
    }
    return NextResponse.json({
      meta: {
        mode: parsed.data.mode,
        model: liveResult?.model ?? "deterministic_fixture",
        fallbackUsed: false,
      },
      decision,
    });
  } catch (error) {
    const directorResponse = audienceDirectorErrorResponse(error);
    if (directorResponse) return directorResponse;
    return audienceRoomErrorResponse(error);
  }
}
