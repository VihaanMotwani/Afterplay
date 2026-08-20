"use client";

import {
  Broadcast,
  Check,
  Copy,
  Eye,
  EyeSlash,
  Pause,
  Play,
  QrCode,
  Sparkle,
  Stop,
} from "@phosphor-icons/react";
import Image from "next/image";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

type HostMessage = {
  id: string;
  displayName: string;
  text: string;
  status: "visible" | "hidden" | "spotlighted";
  createdAt: string;
};

type HostRoom = {
  code: string;
  title: string;
  status: "open" | "paused" | "closed";
  joinScreenVisible: boolean;
  participantCount: number;
  messageCount: number;
  participantPath: string;
  participantUrl: string;
};

export type AudienceRoomConnection = {
  room: HostRoom;
  hostToken: string;
  messages: HostMessage[];
};

export function AudienceRoomHost({
  onConnectionChange,
}: {
  onConnectionChange?: (connection: AudienceRoomConnection | null) => void;
}) {
  const [room, setRoom] = useState<HostRoom | null>(null);
  const [hostToken, setHostToken] = useState<string | null>(null);
  const [messages, setMessages] = useState<HostMessage[]>([]);
  const [participantUrl, setParticipantUrl] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    onConnectionChange?.(room && hostToken ? { room, hostToken, messages } : null);
  }, [hostToken, messages, onConnectionChange, room]);

  const roomCode = room?.code;
  const roomStatus = room?.status;
  useEffect(() => {
    if (!roomCode || !hostToken || roomStatus === "closed") return;
    let cancelled = false;

    async function refresh() {
      try {
        const response = await fetch(`/api/audience/rooms/${roomCode}/messages`, {
          headers: { Authorization: `Bearer ${hostToken}` },
          cache: "no-store",
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error?.message ?? "The audience feed could not refresh.");
        if (!cancelled) {
          setRoom((current) => current ? { ...current, ...body.room } : body.room);
          setMessages(body.messages);
          setError(null);
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "The audience feed could not refresh.");
      }
    }

    void refresh();
    const timer = window.setInterval(refresh, 700);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [hostToken, roomCode, roomStatus]);

  async function createRoom() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/audience/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Riff live" }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "The audience room could not open.");
      const url = body.room.participantUrl;
      const image = await QRCode.toDataURL(url, {
        width: 320,
        margin: 1,
        color: { dark: "#101112", light: "#f1f0e9" },
        errorCorrectionLevel: "M",
      });
      setRoom(body.room);
      setHostToken(body.host.token);
      setParticipantUrl(url);
      setQrCode(image);
      setMessages([]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The audience room could not open.");
    } finally {
      setPending(false);
    }
  }

  async function setRoomStatus(status: "open" | "paused" | "closed") {
    if (!room || !hostToken) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/audience/rooms/${room.code}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${hostToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "The audience room could not update.");
      setRoom(body.room);
      if (status === "closed") {
        setMessages(body.archive?.spotlightedComments ?? []);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The audience room could not update.");
    } finally {
      setPending(false);
    }
  }

  async function setJoinScreenVisible(joinScreenVisible: boolean) {
    if (!room || !hostToken) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/audience/rooms/${room.code}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${hostToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ joinScreenVisible }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "The join screen could not update.");
      setRoom((current) => current ? { ...current, ...body.room } : body.room);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The join screen could not update.");
    } finally {
      setPending(false);
    }
  }

  async function setMessageStatus(message: HostMessage, status: "hidden" | "spotlighted") {
    if (!room || !hostToken) return;
    setError(null);
    try {
      const response = await fetch(`/api/audience/rooms/${room.code}/messages/${message.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${hostToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "That comment could not update.");
      setMessages((current) => current.map((candidate) => {
        if (candidate.id === message.id) return body.message;
        if (status === "spotlighted" && candidate.status === "spotlighted") {
          return { ...candidate, status: "visible" };
        }
        return candidate;
      }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That comment could not update.");
    }
  }

  if (!room) {
    return (
      <section className="companion-audience companion-audience--empty">
        <div>
          <span className="companion-audience-icon"><Broadcast weight="fill" /></span>
          <span><strong>Live audience</strong><small>Open a QR room for the people watching.</small></span>
        </div>
        <button type="button" onClick={createRoom} disabled={pending}>
          {pending ? "Opening" : "Create audience room"}
        </button>
        {error && <p className="companion-error" role="alert">{error}</p>}
      </section>
    );
  }

  return (
    <section className="companion-audience companion-audience--active" role="region" aria-label="Live audience room">
      <header>
        <div>
          <span className="companion-audience-icon"><Broadcast weight="fill" /></span>
          <span><strong>Live audience</strong><small>{room.participantCount} joined · {room.messageCount} messages</small></span>
        </div>
        <span className={`companion-audience-status companion-audience-status--${room.status}`}>
          {room.status === "open" ? "Live" : room.status === "paused" ? "Paused" : "Closed"}
        </span>
      </header>

      <div className="companion-audience-invite">
        {qrCode && (
          <Image
            src={qrCode}
            alt="Audience room QR code"
            width={320}
            height={320}
            unoptimized
          />
        )}
        <div>
          <span>Room code</span>
          <strong data-testid="audience-room-code">{room.code}</strong>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(participantUrl).then(() => {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1_500);
              });
            }}
          >
            {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      </div>

      <div className="companion-audience-controls">
        {room.status !== "closed" && (
          <button
            className="companion-audience-join-toggle"
            type="button"
            aria-label={room.joinScreenVisible ? "Hide join screen" : "Show join screen"}
            onClick={() => setJoinScreenVisible(!room.joinScreenVisible)}
            disabled={pending}
          >
            {room.joinScreenVisible ? <EyeSlash weight="fill" /> : <Eye weight="fill" />}
            {room.joinScreenVisible ? "Hide join screen" : "Show join screen"}
          </button>
        )}
        {room.status !== "closed" && (
          <button
            type="button"
            aria-label={room.status === "paused" ? "Resume audience room" : "Pause audience room"}
            onClick={() => setRoomStatus(room.status === "paused" ? "open" : "paused")}
            disabled={pending}
          >
            {room.status === "paused" ? <Play weight="fill" /> : <Pause weight="fill" />}
            {room.status === "paused" ? "Resume" : "Pause"}
          </button>
        )}
        {room.status !== "closed" && (
          <button type="button" aria-label="Close audience room" onClick={() => setRoomStatus("closed")} disabled={pending}>
            <Stop weight="fill" /> Close
          </button>
        )}
      </div>

      <div className="companion-audience-feed" aria-live="polite">
        {messages.length === 0 ? (
          <p><QrCode /> Waiting for the room to say something worth interrupting for.</p>
        ) : messages.slice(-6).reverse().map((message) => (
          <article key={message.id} className={`companion-audience-message companion-audience-message--${message.status}`}>
            <div>
              <strong>{message.displayName}</strong>
              {message.status === "spotlighted" && <span><Sparkle weight="fill" /> On screen</span>}
            </div>
            <p>{message.text}</p>
            {room.status !== "closed" && message.status !== "hidden" && (
              <footer>
                <button
                  type="button"
                  aria-label={`Spotlight ${message.displayName}’s comment`}
                  onClick={() => setMessageStatus(message, "spotlighted")}
                  disabled={message.status === "spotlighted"}
                >
                  <Eye /> Spotlight
                </button>
                <button
                  type="button"
                  aria-label={`Hide ${message.displayName}’s comment`}
                  onClick={() => setMessageStatus(message, "hidden")}
                >
                  <EyeSlash /> Hide
                </button>
              </footer>
            )}
          </article>
        ))}
      </div>
      {error && <p className="companion-error" role="alert">{error}</p>}
    </section>
  );
}
