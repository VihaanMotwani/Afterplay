import { expect, test } from "@playwright/test";

test.beforeEach(async ({ request }) => {
  const reset = await request.post("/api/demo/reset");
  expect(reset.ok()).toBe(true);
});

test("a presenter creates a temporary audience room with a safe public join contract", async ({
  request,
}) => {
  const created = await request.post("/api/audience/rooms", {
    data: { title: "Riff live" },
  });

  expect(created.status()).toBe(201);
  const body = await created.json();
  expect(body).toMatchObject({
    room: {
      code: expect.stringMatching(/^[A-Z2-9]{6}$/),
      title: "Riff live",
      status: "open",
      participantCount: 0,
      messageCount: 0,
      participantPath: expect.stringMatching(/^\/room\/[A-Z2-9]{6}$/),
      participantUrl: expect.stringMatching(
        /^https:\/\/audience\.example\.test\/room\/[A-Z2-9]{6}$/,
      ),
      expiresAt: expect.any(String),
    },
    host: {
      token: expect.stringMatching(/^host_/),
    },
  });

  const publicRoom = await request.get(`/api/audience/rooms/${body.room.code}`);
  expect(publicRoom.ok()).toBe(true);
  const publicBody = await publicRoom.json();
  expect(publicBody).toMatchObject({
    room: {
      code: body.room.code,
      title: "Riff live",
      status: "open",
      participantCount: 0,
    },
  });
  expect(JSON.stringify(publicBody)).not.toContain(body.host.token);
});

test("the stable active alias follows the newest audience room", async ({ request }) => {
  const first = await request.post("/api/audience/rooms", {
    data: { title: "First room" },
  });
  expect(first.ok()).toBe(true);

  const second = await request.post("/api/audience/rooms", {
    data: { title: "Current room" },
  });
  const { room } = await second.json();

  const active = await request.get("/api/audience/rooms/active");
  expect(active.ok()).toBe(true);
  expect(await active.json()).toMatchObject({
    room: { code: room.code, title: "Current room", status: "open" },
  });
});

test("an attendee joins without an account and their real comment reaches the presenter feed", async ({
  request,
}) => {
  const created = await request.post("/api/audience/rooms", {
    data: { title: "Riff live" },
  });
  const { room, host } = await created.json();

  const joined = await request.post(`/api/audience/rooms/${room.code}/participants`, {
    data: { displayName: "Mira", anonymous: false },
  });
  expect(joined.status()).toBe(201);
  const participant = await joined.json();
  expect(participant).toMatchObject({
    participant: {
      displayName: "Mira",
      anonymous: false,
      token: expect.stringMatching(/^participant_/),
    },
  });

  const sent = await request.post(`/api/audience/rooms/${room.code}/messages`, {
    headers: { Authorization: `Bearer ${participant.participant.token}` },
    data: { text: "take the risky route — the safe one has no aura" },
  });
  expect(sent.status()).toBe(201);
  expect(await sent.json()).toMatchObject({
    message: {
      id: expect.stringMatching(/^message_/),
      displayName: "Mira",
      text: "take the risky route — the safe one has no aura",
      status: "visible",
      createdAt: expect.any(String),
    },
  });

  const feed = await request.get(`/api/audience/rooms/${room.code}/messages`, {
    headers: { Authorization: `Bearer ${host.token}` },
  });
  expect(feed.ok()).toBe(true);
  expect(await feed.json()).toMatchObject({
    room: { code: room.code, participantCount: 1, messageCount: 1 },
    messages: [
      {
        displayName: "Mira",
        text: "take the risky route — the safe one has no aura",
        status: "visible",
      },
    ],
  });
});

test("unsafe audience text is rejected before it enters the presenter or Riff feed", async ({
  request,
}) => {
  const created = await request.post("/api/audience/rooms", {
    data: { title: "Riff live" },
  });
  const { room, host } = await created.json();
  const joined = await request.post(`/api/audience/rooms/${room.code}/participants`, {
    data: { displayName: "Guest", anonymous: false },
  });
  const { participant } = await joined.json();

  const rejected = await request.post(`/api/audience/rooms/${room.code}/messages`, {
    headers: { Authorization: `Bearer ${participant.token}` },
    data: { text: "you should kill yourself" },
  });

  expect(rejected.status()).toBe(422);
  expect(await rejected.json()).toMatchObject({
    error: {
      code: "audience_message_unsafe",
      message: "That message cannot be shared with the room.",
    },
  });

  const feed = await request.get(`/api/audience/rooms/${room.code}/messages`, {
    headers: { Authorization: `Bearer ${host.token}` },
  });
  expect((await feed.json()).messages).toEqual([]);
});

test("one attendee cannot flood the live room", async ({ request }) => {
  const created = await request.post("/api/audience/rooms", {
    data: { title: "Riff live" },
  });
  const { room } = await created.json();
  const joined = await request.post(`/api/audience/rooms/${room.code}/participants`, {
    data: { displayName: "Fast fingers", anonymous: false },
  });
  const { participant } = await joined.json();
  const headers = { Authorization: `Bearer ${participant.token}` };

  for (const text of ["one", "two", "three"]) {
    const accepted = await request.post(`/api/audience/rooms/${room.code}/messages`, {
      headers,
      data: { text },
    });
    expect(accepted.status()).toBe(201);
  }

  const limited = await request.post(`/api/audience/rooms/${room.code}/messages`, {
    headers,
    data: { text: "four" },
  });
  expect(limited.status()).toBe(429);
  expect(await limited.json()).toMatchObject({
    error: {
      code: "audience_rate_limited",
      message: "Give the room a moment before sending another message.",
      retryAfterMs: expect.any(Number),
    },
  });
});

test("only the presenter can pause and reopen audience participation", async ({ request }) => {
  const created = await request.post("/api/audience/rooms", {
    data: { title: "Riff live" },
  });
  const { room, host } = await created.json();
  const joined = await request.post(`/api/audience/rooms/${room.code}/participants`, {
    data: { displayName: "Mira", anonymous: false },
  });
  const { participant } = await joined.json();

  const forbidden = await request.patch(`/api/audience/rooms/${room.code}`, {
    data: { status: "paused" },
  });
  expect(forbidden.status()).toBe(403);

  const paused = await request.patch(`/api/audience/rooms/${room.code}`, {
    headers: { Authorization: `Bearer ${host.token}` },
    data: { status: "paused" },
  });
  expect(paused.ok()).toBe(true);
  expect(await paused.json()).toMatchObject({ room: { status: "paused" } });

  const blockedMessage = await request.post(`/api/audience/rooms/${room.code}/messages`, {
    headers: { Authorization: `Bearer ${participant.token}` },
    data: { text: "can anyone hear me?" },
  });
  expect(blockedMessage.status()).toBe(409);
  expect(await blockedMessage.json()).toMatchObject({
    error: { code: "audience_room_unavailable", message: "This audience room is paused." },
  });

  const reopened = await request.patch(`/api/audience/rooms/${room.code}`, {
    headers: { Authorization: `Bearer ${host.token}` },
    data: { status: "open" },
  });
  expect(reopened.ok()).toBe(true);
  expect(await reopened.json()).toMatchObject({ room: { status: "open" } });
});

test("the presenter can hide noise and make one exact audience comment public", async ({ request }) => {
  const created = await request.post("/api/audience/rooms", {
    data: { title: "Riff live" },
  });
  const { room, host } = await created.json();
  const joined = await request.post(`/api/audience/rooms/${room.code}/participants`, {
    data: { displayName: "Mira", anonymous: false },
  });
  const { participant } = await joined.json();
  const participantHeaders = { Authorization: `Bearer ${participant.token}` };
  const first = await request.post(`/api/audience/rooms/${room.code}/messages`, {
    headers: participantHeaders,
    data: { text: "first" },
  });
  const second = await request.post(`/api/audience/rooms/${room.code}/messages`, {
    headers: participantHeaders,
    data: { text: "the safe route has no aura" },
  });
  const firstMessage = (await first.json()).message;
  const secondMessage = (await second.json()).message;
  const hostHeaders = { Authorization: `Bearer ${host.token}` };

  const hidden = await request.patch(
    `/api/audience/rooms/${room.code}/messages/${firstMessage.id}`,
    { headers: hostHeaders, data: { status: "hidden" } },
  );
  expect(hidden.ok()).toBe(true);

  const spotlighted = await request.patch(
    `/api/audience/rooms/${room.code}/messages/${secondMessage.id}`,
    { headers: hostHeaders, data: { status: "spotlighted" } },
  );
  expect(spotlighted.ok()).toBe(true);
  expect(await spotlighted.json()).toMatchObject({
    message: {
      id: secondMessage.id,
      displayName: "Mira",
      text: "the safe route has no aura",
      status: "spotlighted",
    },
  });

  const publicRoom = await request.get(`/api/audience/rooms/${room.code}`);
  const publicBody = await publicRoom.json();
  expect(publicBody).toMatchObject({
    room: {
      spotlight: {
        id: secondMessage.id,
        displayName: "Mira",
        text: "the safe route has no aura",
      },
    },
  });
  expect(JSON.stringify(publicBody)).not.toContain('"text":"first"');
});

test("closing a room discards the full feed and returns only spotlighted comments", async ({ request }) => {
  const created = await request.post("/api/audience/rooms", {
    data: { title: "Riff live" },
  });
  const { room, host } = await created.json();
  const joined = await request.post(`/api/audience/rooms/${room.code}/participants`, {
    data: { displayName: "Mira", anonymous: false },
  });
  const { participant } = await joined.json();
  const participantHeaders = { Authorization: `Bearer ${participant.token}` };
  await request.post(`/api/audience/rooms/${room.code}/messages`, {
    headers: participantHeaders,
    data: { text: "ordinary message" },
  });
  const worthy = await request.post(`/api/audience/rooms/${room.code}/messages`, {
    headers: participantHeaders,
    data: { text: "the safe route has no aura" },
  });
  const worthyMessage = (await worthy.json()).message;
  const hostHeaders = { Authorization: `Bearer ${host.token}` };
  await request.patch(`/api/audience/rooms/${room.code}/messages/${worthyMessage.id}`, {
    headers: hostHeaders,
    data: { status: "spotlighted" },
  });

  const closed = await request.patch(`/api/audience/rooms/${room.code}`, {
    headers: hostHeaders,
    data: { status: "closed" },
  });
  expect(closed.ok()).toBe(true);
  expect(await closed.json()).toMatchObject({
    room: { status: "closed", messageCount: 1 },
    archive: {
      spotlightedComments: [
        {
          id: worthyMessage.id,
          displayName: "Mira",
          text: "the safe route has no aura",
        },
      ],
    },
  });

  const retainedFeed = await request.get(`/api/audience/rooms/${room.code}/messages`, {
    headers: hostHeaders,
  });
  const retainedBody = await retainedFeed.json();
  expect(retainedBody.messages).toHaveLength(1);
  expect(JSON.stringify(retainedBody)).not.toContain("ordinary message");
});

test("Riff can spotlight one worthy comment without inventing its source", async ({ request }) => {
  const created = await request.post("/api/audience/rooms", {
    data: { title: "Riff live" },
  });
  const { room, host } = await created.json();
  const joined = await request.post(`/api/audience/rooms/${room.code}/participants`, {
    data: { displayName: "Mira", anonymous: false },
  });
  const { participant } = await joined.json();
  const sent = await request.post(`/api/audience/rooms/${room.code}/messages`, {
    headers: { Authorization: `Bearer ${participant.token}` },
    data: { text: "the safe route has no aura" },
  });
  const sourceMessage = (await sent.json()).message;

  const decided = await request.post(`/api/audience/rooms/${room.code}/riff-decisions`, {
    headers: { Authorization: `Bearer ${host.token}` },
    data: { mode: "demo" },
  });
  expect(decided.ok()).toBe(true);
  expect(await decided.json()).toMatchObject({
    meta: { mode: "demo", model: "deterministic_fixture", fallbackUsed: false },
    decision: {
      kind: "spotlight",
      utterance: expect.stringContaining("Mira"),
      rationale: expect.any(String),
      supportingMessageIds: [sourceMessage.id],
      spotlight: {
        id: sourceMessage.id,
        displayName: "Mira",
        text: "the safe route has no aura",
      },
    },
  });

  const publicRoom = await request.get(`/api/audience/rooms/${room.code}`);
  expect(await publicRoom.json()).toMatchObject({
    room: { spotlight: { id: sourceMessage.id } },
  });
});

test("a maximum-length worthy comment remains exact evidence without breaking the demo decision", async ({
  request,
}) => {
  const created = await request.post("/api/audience/rooms", {
    data: { title: "Riff live" },
  });
  const { room, host } = await created.json();
  const displayName = "M".repeat(30);
  const joined = await request.post(`/api/audience/rooms/${room.code}/participants`, {
    data: { displayName, anonymous: false },
  });
  const { participant } = await joined.json();
  const text = `no aura ${"x".repeat(272)}`;
  expect(text).toHaveLength(280);
  const sent = await request.post(`/api/audience/rooms/${room.code}/messages`, {
    headers: { Authorization: `Bearer ${participant.token}` },
    data: { text },
  });
  const source = (await sent.json()).message;

  const decided = await request.post(`/api/audience/rooms/${room.code}/riff-decisions`, {
    headers: { Authorization: `Bearer ${host.token}` },
    data: { mode: "demo" },
  });

  expect(decided.ok()).toBe(true);
  expect(await decided.json()).toMatchObject({
    decision: {
      kind: "spotlight",
      supportingMessageIds: [source.id],
      spotlight: { id: source.id, text },
    },
  });
});

test("Riff can synthesize differently worded audience consensus with every source attached", async ({
  request,
}) => {
  const created = await request.post("/api/audience/rooms", {
    data: { title: "Riff live" },
  });
  const { room, host } = await created.json();
  const joined = await request.post(`/api/audience/rooms/${room.code}/participants`, {
    data: { displayName: "Crowd", anonymous: false },
  });
  const { participant } = await joined.json();
  const headers = { Authorization: `Bearer ${participant.token}` };
  const sourceIds: string[] = [];
  for (const text of ["take the shortcut", "skip the safe path", "risk it for the room"]) {
    const sent = await request.post(`/api/audience/rooms/${room.code}/messages`, {
      headers,
      data: { text },
    });
    sourceIds.push((await sent.json()).message.id);
  }

  const decided = await request.post(`/api/audience/rooms/${room.code}/riff-decisions`, {
    headers: { Authorization: `Bearer ${host.token}` },
    data: { mode: "demo" },
  });
  expect(decided.ok()).toBe(true);
  expect(await decided.json()).toMatchObject({
    decision: {
      kind: "synthesize",
      utterance: expect.stringContaining("risky route"),
      rationale: expect.any(String),
      supportingMessageIds: sourceIds,
    },
  });
});

test("Riff remains silent when the room has no comment worth interrupting for", async ({ request }) => {
  const created = await request.post("/api/audience/rooms", {
    data: { title: "Riff live" },
  });
  const { room, host } = await created.json();
  const joined = await request.post(`/api/audience/rooms/${room.code}/participants`, {
    data: { displayName: "Guest", anonymous: false },
  });
  const { participant } = await joined.json();
  const sent = await request.post(`/api/audience/rooms/${room.code}/messages`, {
    headers: { Authorization: `Bearer ${participant.token}` },
    data: { text: "nice view, hope everyone is having fun" },
  });
  const sourceMessage = (await sent.json()).message;

  const decided = await request.post(`/api/audience/rooms/${room.code}/riff-decisions`, {
    headers: { Authorization: `Bearer ${host.token}` },
    data: { mode: "demo" },
  });
  expect(decided.ok()).toBe(true);
  expect(await decided.json()).toMatchObject({
    decision: {
      kind: "silent",
      rationale: expect.any(String),
      supportingMessageIds: [sourceMessage.id],
    },
  });
});

test("unconfigured live audience AI fails visibly instead of substituting fixture judgment", async ({
  request,
}) => {
  const created = await request.post("/api/audience/rooms", {
    data: { title: "Riff live" },
  });
  const { room, host } = await created.json();

  const decided = await request.post(`/api/audience/rooms/${room.code}/riff-decisions`, {
    headers: { Authorization: `Bearer ${host.token}` },
    data: { mode: "live" },
  });
  expect(decided.status()).toBe(503);
  expect(await decided.json()).toMatchObject({
    error: {
      code: "audience_live_not_configured",
      message: "Live audience judgment requires explicit server configuration.",
    },
    meta: { mode: "live", fallbackUsed: false },
  });
});
