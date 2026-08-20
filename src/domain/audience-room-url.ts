import { AudienceRoomError } from "@/domain/audience-room";

export function audienceParticipantUrl(requestUrl: string, participantPath: string) {
  try {
    const publicBaseUrl = new URL(
      process.env.AFTERPLAY_PUBLIC_BASE_URL?.trim() || requestUrl,
    );
    if (publicBaseUrl.protocol !== "https:" && publicBaseUrl.protocol !== "http:") {
      throw new Error("Unsupported public Audience Room protocol.");
    }
    return new URL(participantPath, publicBaseUrl).toString();
  } catch {
    throw new AudienceRoomError(
      "audience_public_url_invalid",
      "AFTERPLAY_PUBLIC_BASE_URL must be a valid HTTP or HTTPS origin.",
      500,
    );
  }
}
