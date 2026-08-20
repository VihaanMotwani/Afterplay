import { AudienceRoomClient } from "@/components/audience-room-client";

export default async function AudienceRoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <AudienceRoomClient code={code.toUpperCase()} />;
}
