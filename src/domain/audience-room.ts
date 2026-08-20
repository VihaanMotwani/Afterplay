import { randomBytes } from "node:crypto";

import { z } from "zod";

const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_LIFETIME_MS = 2 * 60 * 60 * 1_000;

export const createAudienceRoomSchema = z.object({
  title: z.string().trim().min(1).max(80),
});

export const joinAudienceRoomSchema = z
  .object({
    displayName: z.string().trim().max(30).optional(),
    anonymous: z.boolean(),
  })
  .superRefine((input, context) => {
    if (!input.anonymous && !input.displayName) {
      context.addIssue({
        code: "custom",
        path: ["displayName"],
        message: "Choose a display name or join anonymously.",
      });
    }
  });

export const createAudienceMessageSchema = z.object({
  text: z.string().trim().min(1).max(280),
});

export const updateAudienceRoomSchema = z.object({
  status: z.enum(["open", "paused", "closed"]),
});

export const updateAudienceMessageSchema = z.object({
  status: z.enum(["hidden", "spotlighted"]),
});

export type AudienceRoomStatus = "open" | "paused" | "closed";

export type PublicAudienceRoom = {
  code: string;
  title: string;
  status: AudienceRoomStatus;
  participantCount: number;
  messageCount: number;
  participantPath: string;
  expiresAt: string;
  spotlight?: AudienceMessage;
};

export type AudienceMessage = {
  id: string;
  displayName: string;
  text: string;
  status: "visible" | "hidden" | "spotlighted";
  createdAt: string;
};

type AudienceParticipant = {
  id: string;
  displayName: string;
  anonymous: boolean;
  token: string;
  recentMessageAt: number[];
};

type StoredAudienceRoom = PublicAudienceRoom & {
  hostToken: string;
  participants: Map<string, AudienceParticipant>;
  messages: AudienceMessage[];
};

type AudienceRoomStore = {
  rooms: Map<string, StoredAudienceRoom>;
  activeRoomCode?: string;
};

declare global {
  var __afterplayAudienceRoomStore: AudienceRoomStore | undefined;
}

function store() {
  if (!globalThis.__afterplayAudienceRoomStore) {
    globalThis.__afterplayAudienceRoomStore = { rooms: new Map() };
  }
  return globalThis.__afterplayAudienceRoomStore;
}

function roomCode() {
  const bytes = randomBytes(6);
  return Array.from(bytes, (byte) => ROOM_ALPHABET[byte % ROOM_ALPHABET.length]).join("");
}

function publicRoom(room: StoredAudienceRoom): PublicAudienceRoom {
  const spotlight = room.messages.find((message) => message.status === "spotlighted");
  return {
    code: room.code,
    title: room.title,
    status: room.status,
    participantCount: room.participantCount,
    messageCount: room.messageCount,
    participantPath: room.participantPath,
    expiresAt: room.expiresAt,
    ...(spotlight ? { spotlight: { ...spotlight } } : {}),
  };
}

function requireRoom(code: string) {
  const audienceStore = store();
  const resolvedCode = code.toLowerCase() === "active"
    ? audienceStore.activeRoomCode
    : code.toUpperCase();
  const room = resolvedCode ? audienceStore.rooms.get(resolvedCode) : undefined;
  if (!room || Date.parse(room.expiresAt) <= Date.now()) {
    if (room) audienceStore.rooms.delete(room.code);
    if (resolvedCode === audienceStore.activeRoomCode) audienceStore.activeRoomCode = undefined;
    throw new AudienceRoomError("audience_room_not_found", "Audience room not found.", 404);
  }
  return room;
}

function requireHost(room: StoredAudienceRoom, token: string | undefined) {
  if (!token || token !== room.hostToken) {
    throw new AudienceRoomError("audience_host_forbidden", "Host authorization is required.", 403);
  }
}

function hasUnsafeAudienceText(text: string) {
  const normalized = text.normalize("NFKC").toLowerCase().replace(/\s+/g, " ");
  return [
    /\b(?:kill|hurt|end) (?:yourself|urself)\b/,
    /\b(?:i(?:'ll| will|m going to)? )?(?:kill|shoot|stab|rape) you\b/,
    /\b(?:child porn|sexual abuse material)\b/,
  ].some((pattern) => pattern.test(normalized));
}

export class AudienceRoomError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AudienceRoomError";
  }
}

export function resetAudienceRoomStore() {
  globalThis.__afterplayAudienceRoomStore = { rooms: new Map() };
}

export function createAudienceRoom(input: z.infer<typeof createAudienceRoomSchema>) {
  let code = roomCode();
  while (store().rooms.has(code)) code = roomCode();

  const room: StoredAudienceRoom = {
    code,
    title: input.title,
    status: "open",
    participantCount: 0,
    messageCount: 0,
    participantPath: `/room/${code}`,
    expiresAt: new Date(Date.now() + ROOM_LIFETIME_MS).toISOString(),
    hostToken: `host_${randomBytes(24).toString("base64url")}`,
    participants: new Map(),
    messages: [],
  };
  store().rooms.set(code, room);
  store().activeRoomCode = code;

  return {
    room: publicRoom(room),
    host: { token: room.hostToken },
  };
}

export function getAudienceRoom(code: string) {
  return publicRoom(requireRoom(code));
}

export function joinAudienceRoom(
  code: string,
  input: z.infer<typeof joinAudienceRoomSchema>,
) {
  const room = requireRoom(code);
  if (room.status !== "open") {
    throw new AudienceRoomError(
      "audience_room_unavailable",
      room.status === "paused" ? "This audience room is paused." : "This audience room is closed.",
      409,
    );
  }

  const participant: AudienceParticipant = {
    id: `participant_${randomBytes(12).toString("base64url")}`,
    displayName: input.anonymous ? "Anonymous" : input.displayName!,
    anonymous: input.anonymous,
    token: `participant_${randomBytes(24).toString("base64url")}`,
    recentMessageAt: [],
  };
  room.participants.set(participant.token, participant);
  room.participantCount = room.participants.size;
  return {
    participant: {
      id: participant.id,
      displayName: participant.displayName,
      anonymous: participant.anonymous,
      token: participant.token,
    },
  };
}

export function addAudienceMessage(
  code: string,
  participantToken: string | undefined,
  input: z.infer<typeof createAudienceMessageSchema>,
) {
  const room = requireRoom(code);
  if (room.status !== "open") {
    throw new AudienceRoomError(
      "audience_room_unavailable",
      room.status === "paused" ? "This audience room is paused." : "This audience room is closed.",
      409,
    );
  }
  const participant = participantToken ? room.participants.get(participantToken) : undefined;
  if (!participant) {
    throw new AudienceRoomError(
      "audience_participant_forbidden",
      "Join this audience room before sending a message.",
      403,
    );
  }
  if (hasUnsafeAudienceText(input.text)) {
    throw new AudienceRoomError(
      "audience_message_unsafe",
      "That message cannot be shared with the room.",
      422,
    );
  }
  const now = Date.now();
  participant.recentMessageAt = participant.recentMessageAt.filter((at) => at > now - 10_000);
  if (participant.recentMessageAt.length >= 3) {
    throw new AudienceRoomError(
      "audience_rate_limited",
      "Give the room a moment before sending another message.",
      429,
      { retryAfterMs: participant.recentMessageAt[0] + 10_000 - now },
    );
  }
  participant.recentMessageAt.push(now);

  const message: AudienceMessage = {
    id: `message_${randomBytes(12).toString("base64url")}`,
    displayName: participant.displayName,
    text: input.text,
    status: "visible",
    createdAt: new Date().toISOString(),
  };
  room.messages.push(message);
  room.messageCount = room.messages.length;
  return { message: { ...message } };
}

export function getAudienceMessages(
  code: string,
  hostToken: string | undefined,
) {
  const room = requireRoom(code);
  requireHost(room, hostToken);
  return {
    room: publicRoom(room),
    messages: room.messages.map((message) => ({ ...message })),
  };
}

export function updateAudienceRoom(
  code: string,
  hostToken: string | undefined,
  input: z.infer<typeof updateAudienceRoomSchema>,
) {
  const room = requireRoom(code);
  requireHost(room, hostToken);
  if (room.status === "closed") {
    throw new AudienceRoomError("audience_room_closed", "This audience room is closed.", 409);
  }
  room.status = input.status;
  if (input.status === "closed") {
    const spotlightedComments = room.messages
      .filter((message) => message.status === "spotlighted")
      .map((message) => ({ ...message }));
    room.messages = spotlightedComments.map((message) => ({ ...message }));
    room.messageCount = room.messages.length;
    room.participants.clear();
    room.participantCount = 0;
    return {
      room: publicRoom(room),
      archive: { spotlightedComments },
    };
  }
  return { room: publicRoom(room) };
}

export function updateAudienceMessage(
  code: string,
  hostToken: string | undefined,
  messageId: string,
  input: z.infer<typeof updateAudienceMessageSchema>,
) {
  const room = requireRoom(code);
  requireHost(room, hostToken);
  const message = room.messages.find((candidate) => candidate.id === messageId);
  if (!message) {
    throw new AudienceRoomError("audience_message_not_found", "Audience message not found.", 404);
  }
  if (input.status === "spotlighted") {
    for (const candidate of room.messages) {
      if (candidate.status === "spotlighted") candidate.status = "visible";
    }
  }
  message.status = input.status;
  return { message: { ...message } };
}
