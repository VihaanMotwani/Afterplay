import { RiffCaptionOverlay } from "@/components/riff-caption-overlay";

export default async function RiffOverlayPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; room?: string }>;
}) {
  const { room, session } = await searchParams;
  return <RiffCaptionOverlay roomCode={room ?? "active"} sessionId={session ?? "active"} />;
}
