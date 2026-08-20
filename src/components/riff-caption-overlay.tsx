"use client";

import { Microphone } from "@phosphor-icons/react";
import Image from "next/image";
import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";

import riffAvatar from "../../demo-video/public/riff-avatar.png";

const CHAT_LIFETIME_MS = 20_000;
const SPOTLIGHT_LIFETIME_MS = 8_000;

type OverlaySession = {
  status: "live" | "ended";
  cohost: {
    name: string;
  };
  presence: {
    state: "listening" | "thinking" | "speaking";
    caption?: string;
  };
};

type AudienceSpotlight = {
  id: string;
  displayName: string;
  text: string;
};

type AudienceStreamMessage = AudienceSpotlight & {
  createdAt: string;
};

type OverlayAudienceRoom = {
  code: string;
  joinScreenVisible: boolean;
  participantUrl: string;
  spotlight?: AudienceSpotlight;
  streamMessages: AudienceStreamMessage[];
};

export function RiffCaptionOverlay({
  sessionId,
  roomCode,
}: {
  sessionId: string;
  roomCode?: string;
}) {
  const [session, setSession] = useState<OverlaySession | null>(null);
  const [spotlight, setSpotlight] = useState<AudienceSpotlight | null>(null);
  const [streamMessages, setStreamMessages] = useState<AudienceStreamMessage[]>([]);
  const [audienceRoom, setAudienceRoom] = useState<OverlayAudienceRoom | null>(null);
  const [joinQrCode, setJoinQrCode] = useState<{ participantUrl: string; dataUrl: string } | null>(null);
  const lastSpotlightId = useRef<string | null>(null);
  const spotlightUntil = useRef(0);

  useEffect(() => {
    document.documentElement.classList.add("overlay-document");
    let cancelled = false;

    async function refresh() {
      try {
        const response = await fetch(`/api/live/sessions/${sessionId}`, { cache: "no-store" });
        if (!response.ok) return;
        const body = await response.json();
        if (!cancelled) setSession(body.session);
      } catch {
        // A missing local session leaves the OBS source transparently empty.
      }
    }

    void refresh();
    const timer = window.setInterval(refresh, 500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.documentElement.classList.remove("overlay-document");
    };
  }, [sessionId]);

  useEffect(() => {
    if (!roomCode) return;

    let cancelled = false;

    async function refreshAudience() {
      try {
        const response = await fetch(`/api/audience/rooms/${roomCode}`, { cache: "no-store" });
        if (!response.ok) {
          if (!cancelled) {
            setSpotlight(null);
            setStreamMessages([]);
            setAudienceRoom(null);
          }
          return;
        }
        const body = await response.json() as { room: OverlayAudienceRoom };
        if (cancelled) return;
        setAudienceRoom(body.room);

        const now = Date.now();
        setStreamMessages(
          body.room.streamMessages
            .filter((message) => now - Date.parse(message.createdAt) < CHAT_LIFETIME_MS)
            .slice(-4),
        );

        const nextSpotlight = body.room.spotlight ?? null;
        if (nextSpotlight && nextSpotlight.id !== lastSpotlightId.current) {
          lastSpotlightId.current = nextSpotlight.id;
          spotlightUntil.current = now + SPOTLIGHT_LIFETIME_MS;
          setSpotlight(nextSpotlight);
        } else if (!nextSpotlight || now >= spotlightUntil.current) {
          setSpotlight(null);
        }
      } catch {
        // A missing audience room leaves the audience areas transparently empty.
      }
    }

    void refreshAudience();
    const timer = window.setInterval(refreshAudience, 500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [roomCode]);

  useEffect(() => {
    if (!audienceRoom?.joinScreenVisible) {
      return;
    }
    let cancelled = false;
    void QRCode.toDataURL(audienceRoom.participantUrl, {
      width: 440,
      margin: 1,
      color: { dark: "#101112", light: "#f4f2ea" },
      errorCorrectionLevel: "M",
    }).then((image) => {
      if (!cancelled) {
        setJoinQrCode({ participantUrl: audienceRoom.participantUrl, dataUrl: image });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [audienceRoom?.joinScreenVisible, audienceRoom?.participantUrl]);

  const presence = session?.status === "live" ? session.presence : null;
  const line = presence?.state === "speaking"
    ? presence.caption
    : null;
  const state = presence?.state ?? "listening";

  return (
    <main className="riff-overlay" aria-label="Riff caption overlay">
      {audienceRoom?.joinScreenVisible && (
        <section className="riff-overlay-join" aria-label="Audience join screen">
          <article>
            {joinQrCode?.participantUrl === audienceRoom.participantUrl && (
              <Image
                src={joinQrCode.dataUrl}
                alt="Audience room QR code"
                width={440}
                height={440}
                unoptimized
              />
            )}
            <div>
              <h1>Join the stream.</h1>
              <p>Scan to send a live comment. Riff can read the room—and put a worthy line on screen.</p>
              <span>Room code</span>
              <strong>{audienceRoom.code}</strong>
            </div>
          </article>
        </section>
      )}
      {!audienceRoom?.joinScreenVisible && spotlight && (
        <section className="riff-overlay-audience" aria-label="Live audience spotlight">
          <span>Live audience</span>
          <blockquote>{spotlight.text}</blockquote>
          <p>{spotlight.displayName}</p>
        </section>
      )}
      {!audienceRoom?.joinScreenVisible && !spotlight && streamMessages.length > 0 && (
        <section className="riff-overlay-chat" aria-label="Live audience chat">
          <header>
            <span aria-hidden="true" />
            <strong>Audience</strong>
            <small>live</small>
          </header>
          <ol>
            {streamMessages.map((message) => (
              <li key={message.id}>
                <strong>{message.displayName}</strong>
                <p>{message.text}</p>
              </li>
            ))}
          </ol>
        </section>
      )}
      <section
        className={`riff-overlay-hud riff-overlay-hud--${state}`}
        aria-label="Riff stream HUD"
        data-state={state}
      >
        <div className="riff-overlay-participant">
          <span className="riff-overlay-avatar" aria-hidden="true">
            <Image
              src={riffAvatar}
              alt=""
              data-testid="riff-mascot"
              preload
              sizes="156px"
            />
          </span>
          <span className="riff-overlay-nameplate">
            <strong>{session?.cohost.name ?? "Riff"}</strong>
            <small>AI cohost</small>
          </span>
          <Microphone className="riff-overlay-microphone" aria-hidden="true" weight="fill" />
        </div>
        {line && (
          <div className="riff-overlay-caption">
            <p aria-live="polite">{line}</p>
          </div>
        )}
      </section>
    </main>
  );
}
