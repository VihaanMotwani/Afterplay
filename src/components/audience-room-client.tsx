"use client";

import { ArrowUp, Broadcast, Check, Sparkle, UserCircle } from "@phosphor-icons/react";
import { FormEvent, useEffect, useState } from "react";

type PublicMessage = {
  id: string;
  displayName: string;
  text: string;
};

type PublicRoom = {
  code: string;
  title: string;
  status: "open" | "paused" | "closed";
  participantCount: number;
  spotlight?: PublicMessage;
  poll?: {
    id: string;
    prompt: string;
    status: "open" | "locked";
    closesAt: string;
    options: Array<{ id: "a" | "b"; label: string; votes: number }>;
  };
};

type Participant = {
  displayName: string;
  token: string;
};

export function AudienceRoomClient({ code }: { code: string }) {
  const [room, setRoom] = useState<PublicRoom | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [votedPollId, setVotedPollId] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.add("audience-room-document");
    let cancelled = false;

    async function refresh() {
      try {
        const response = await fetch(`/api/audience/rooms/${encodeURIComponent(code)}`, {
          cache: "no-store",
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error?.message ?? "This room is unavailable.");
        if (!cancelled) {
          setRoom(body.room);
          setError(null);
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "This room is unavailable.");
      }
    }

    void refresh();
    const timer = window.setInterval(refresh, 1_500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.documentElement.classList.remove("audience-room-document");
    };
  }, [code]);

  async function joinRoom(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/audience/rooms/${encodeURIComponent(code)}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, anonymous }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "You could not join this room.");
      setParticipant(body.participant);
      setNotice(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "You could not join this room.");
    } finally {
      setPending(false);
    }
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!participant || !message.trim()) return;
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/audience/rooms/${encodeURIComponent(code)}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${participant.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: message }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "That message did not reach Riff.");
      setMessage("");
      setNotice("Sent to Riff.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That message did not reach Riff.");
    } finally {
      setPending(false);
    }
  }

  async function vote(optionId: "a" | "b") {
    if (!participant || !room?.poll || votedPollId === room.poll.id) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/audience/rooms/${encodeURIComponent(code)}/poll/vote`, {
        method: "POST",
        headers: { Authorization: `Bearer ${participant.token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ optionId }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "Your prediction did not lock.");
      setVotedPollId(room.poll.id);
      setNotice("Prediction locked. Watch the screen.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your prediction did not lock.");
    } finally {
      setPending(false);
    }
  }

  if (!room && !error) {
    return (
      <main className="audience-room audience-room--loading" aria-busy="true">
        <span className="audience-room-pulse" />
        <p>Finding the room</p>
      </main>
    );
  }

  if (!room) {
    return (
      <main className="audience-room audience-room--unavailable">
        <span className="audience-room-mark"><Sparkle weight="fill" /></span>
        <p className="audience-room-kicker">Riff audience</p>
        <h1>This room has left the stage.</h1>
        <p>{error}</p>
      </main>
    );
  }

  if (room.status === "closed") {
    return (
      <main className="audience-room audience-room--closed">
        <header className="audience-room-topline"><span>Riff audience</span><strong>{room.code}</strong></header>
        <section className="audience-room-finale">
          <span className="audience-room-mark"><Check weight="bold" /></span>
          <p className="audience-room-kicker">Room closed</p>
          <h1>That’s the room.</h1>
          <p>The full chat is gone. Only comments spotlighted during the show remain with the creator.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="audience-room">
      <header className="audience-room-topline">
        <span><i /> Live audience</span>
        <strong>{room.code}</strong>
      </header>

      {!participant ? (
        <section className="audience-room-join">
          <div className="audience-room-intro">
            <span className="audience-room-mark"><Sparkle weight="fill" /></span>
            <p className="audience-room-kicker">You’re part of the show</p>
            <h1>Make the next moment happen.</h1>
            <p>Send a challenge, a read, or the line everyone else missed. Riff may spotlight you—or combine the room into one terrible idea.</p>
          </div>

          <form className="audience-room-ticket" onSubmit={joinRoom}>
            <div className="audience-room-ticket-head">
              <span>Live room</span>
              <strong>{room.title}</strong>
            </div>
            <label className="audience-room-name">
              <span><UserCircle aria-hidden="true" /> Name on screen</span>
              <input
                aria-label="Name on screen"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                maxLength={30}
                disabled={anonymous || pending}
                autoComplete="nickname"
                placeholder="What should Riff call you?"
              />
            </label>
            <label className="audience-room-anonymous">
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(event) => setAnonymous(event.target.checked)}
              />
              <span>Join anonymously</span>
            </label>
            {error && <p className="audience-room-error" role="alert">{error}</p>}
            <button type="submit" disabled={pending || (!anonymous && !displayName.trim())}>
              {pending ? "Joining" : "Join the room"}<ArrowUp weight="bold" />
            </button>
            <small>No account. The room disappears when the session closes.</small>
          </form>
        </section>
      ) : (
        <section className="audience-room-live">
          <div className="audience-room-live-head">
            <div>
              <p className="audience-room-kicker">Mic is Riff’s. The next idea could be yours.</p>
              <h1>You’re live, {participant.displayName}.</h1>
            </div>
            <span><Broadcast weight="fill" /> {room.participantCount} in room</span>
          </div>

          {room.spotlight ? (
            <blockquote className="audience-room-spotlight">
              <span>Riff spotlight</span>
              <p>“{room.spotlight.text}”</p>
              <cite>— {room.spotlight.displayName}</cite>
            </blockquote>
          ) : (
            <div className="audience-room-listening">
              <span className="audience-room-orbit"><i /><i /><i /></span>
              <p><strong>Riff is reading the room.</strong> Strong comments may appear on the main screen and be said aloud.</p>
            </div>
          )}

          {room.poll && (
            <section className={`audience-room-poll audience-room-poll--${room.poll.status}`} aria-label="Director prediction">
              <header><span>Director prediction</span><small>{room.poll.status === "open" ? "Vote now" : "Locked"}</small></header>
              <h2>{room.poll.prompt}</h2>
              <div>
                {room.poll.options.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    disabled={pending || room.poll?.status !== "open" || votedPollId === room.poll.id}
                    onClick={() => vote(option.id)}
                  >
                    <span>{option.label}</span><strong>{option.votes}</strong>
                  </button>
                ))}
              </div>
            </section>
          )}

          <form className="audience-room-composer" onSubmit={sendMessage}>
            <label htmlFor="audience-message">Send something worth interrupting for</label>
            <div>
              <textarea
                id="audience-message"
                aria-label="Send something worth interrupting for"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                maxLength={280}
                rows={4}
                disabled={pending || room.status === "paused"}
                placeholder={room.status === "paused" ? "The presenter paused the room." : "Challenge the move. Finish the joke. Call the next play."}
              />
              <span>{message.length}/280</span>
            </div>
            {room.status === "paused" && <p className="audience-room-paused">The presenter paused new messages.</p>}
            {error && <p className="audience-room-error" role="alert">{error}</p>}
            {notice && <p className="audience-room-notice" role="status">{notice}</p>}
            <button type="submit" disabled={pending || room.status === "paused" || !message.trim()}>
              {pending ? "Sending" : "Send to Riff"}<ArrowUp weight="bold" />
            </button>
          </form>
        </section>
      )}
    </main>
  );
}
