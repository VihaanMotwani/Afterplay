import { expect, test } from "@playwright/test";

test.beforeEach(async ({ request }) => {
  const reset = await request.post("/api/demo/reset");
  expect(reset.ok()).toBe(true);
});

test("an attendee joins from their phone and sends a real message to Riff", async ({
  page,
  request,
}) => {
  const created = await request.post("/api/audience/rooms", {
    data: { title: "Riff live" },
  });
  const { room, host } = await created.json();

  await page.goto(room.participantPath);
  await expect(page.getByRole("heading", { name: "Make the next moment happen." })).toBeVisible();
  await expect(page.getByText(room.code, { exact: true })).toBeVisible();
  await page.getByRole("textbox", { name: "Name on screen" }).fill("Mira");
  await page.getByRole("button", { name: "Join the room" }).click();

  await expect(page.getByRole("heading", { name: "You’re live, Mira." })).toBeVisible();
  const composer = page.getByRole("textbox", { name: "Send something worth interrupting for" });
  await composer.fill("the safe route has no aura");
  await page.getByRole("button", { name: "Send to Riff" }).click();
  await expect(page.getByRole("status")).toHaveText("Sent to Riff.");

  await expect.poll(async () => {
    const feed = await request.get(`/api/audience/rooms/${room.code}/messages`, {
      headers: { Authorization: `Bearer ${host.token}` },
    });
    return (await feed.json()).messages;
  }).toMatchObject([
    { displayName: "Mira", text: "the safe route has no aura", status: "visible" },
  ]);
});

test("the presenter creates a scannable room and moderates its live feed", async ({
  page,
  request,
}) => {
  await page.goto("/companion");
  await page.getByRole("button", { name: "Create audience room" }).click();

  const roomPanel = page.getByRole("region", { name: "Live audience room" });
  await expect(roomPanel).toBeVisible();
  await expect(roomPanel.getByRole("img", { name: "Audience room QR code" })).toBeVisible();
  const code = (await roomPanel.getByTestId("audience-room-code").textContent())?.trim();
  expect(code).toMatch(/^[A-Z2-9]{6}$/);

  const joined = await request.post(`/api/audience/rooms/${code}/participants`, {
    data: { displayName: "Mira", anonymous: false },
  });
  const { participant } = await joined.json();
  await request.post(`/api/audience/rooms/${code}/messages`, {
    headers: { Authorization: `Bearer ${participant.token}` },
    data: { text: "the safe route has no aura" },
  });

  await expect(roomPanel.getByText("the safe route has no aura", { exact: true })).toBeVisible();
  await roomPanel.getByRole("button", { name: "Spotlight Mira’s comment" }).click();
  await expect(roomPanel.getByText("On screen", { exact: true })).toBeVisible();

  const publicRoom = await request.get(`/api/audience/rooms/${code}`);
  expect(await publicRoom.json()).toMatchObject({
    room: { spotlight: { displayName: "Mira", text: "the safe route has no aura" } },
  });

  await roomPanel.getByRole("button", { name: "Pause audience room" }).click();
  await expect(roomPanel.getByText("Paused", { exact: true })).toBeVisible();
});

test("the presenter manually shows and hides the audience join screen in OBS", async ({
  page,
  context,
  request,
}) => {
  await page.goto("/companion");
  await page.getByRole("button", { name: "Create audience room" }).click();

  const roomPanel = page.getByRole("region", { name: "Live audience room" });
  const code = (await roomPanel.getByTestId("audience-room-code").textContent())?.trim();
  expect(code).toMatch(/^[A-Z2-9]{6}$/);

  await roomPanel.getByRole("button", { name: "Show join screen" }).click();
  await expect(roomPanel.getByRole("button", { name: "Hide join screen" })).toBeVisible();
  const publicRoom = await request.get(`/api/audience/rooms/${code}`);
  expect(await publicRoom.json()).toMatchObject({ room: { joinScreenVisible: true } });

  const overlay = await context.newPage();
  await overlay.goto(`/overlay/riff?room=${code}`);
  const joinScreen = overlay.getByRole("region", { name: "Audience join screen" });
  await expect(joinScreen).toBeVisible();
  await expect(joinScreen.getByRole("img", { name: "Audience room QR code" })).toBeVisible();
  await expect(joinScreen.getByText(code!, { exact: true })).toBeVisible();

  await roomPanel.getByRole("button", { name: "Hide join screen" }).click();
  await expect(joinScreen).toHaveCount(0);
});

test("the OBS overlay shows the exact spotlighted audience comment", async ({ page, request }) => {
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
  const { message } = await sent.json();
  await request.patch(`/api/audience/rooms/${room.code}/messages/${message.id}`, {
    headers: { Authorization: `Bearer ${host.token}` },
    data: { status: "spotlighted" },
  });

  await page.goto("/overlay/riff");
  const spotlight = page.getByRole("region", { name: "Live audience spotlight" });
  await expect(spotlight.getByText("the safe route has no aura", { exact: true })).toBeVisible();
  await expect(spotlight.getByText("Mira", { exact: true })).toBeVisible();
});

test("the OBS overlay automatically shows the latest four real comments with Riff", async ({
  page,
  request,
}) => {
  const created = await request.post("/api/audience/rooms", {
    data: { title: "Riff live" },
  });
  const { room } = await created.json();
  const comments = [
    ["Ari", "first comment should roll off"],
    ["Bea", "take the left route"],
    ["Cam", "the bridge is definitely bait"],
    ["Dev", "ask Riff what it remembers"],
    ["Em", "this is the audience-caused moment"],
  ] as const;

  for (const [displayName, text] of comments) {
    const joined = await request.post(`/api/audience/rooms/${room.code}/participants`, {
      data: { displayName, anonymous: false },
    });
    const { participant } = await joined.json();
    const sent = await request.post(`/api/audience/rooms/${room.code}/messages`, {
      headers: { Authorization: `Bearer ${participant.token}` },
      data: { text },
    });
    expect(sent.status()).toBe(201);
  }

  await page.goto(`/overlay/riff?room=${room.code}`);

  await expect(page.getByTestId("riff-mascot")).toBeVisible();
  const chat = page.getByRole("region", { name: "Live audience chat" });
  await expect(chat).toBeVisible();
  await expect(chat.getByText("first comment should roll off", { exact: true })).toHaveCount(0);
  for (const [, text] of comments.slice(1)) {
    await expect(chat.getByText(text, { exact: true })).toBeVisible();
  }
});

test("an exact spotlight briefly takes priority and hiding removes chat from OBS", async ({
  page,
  request,
}) => {
  const created = await request.post("/api/audience/rooms", {
    data: { title: "Riff live" },
  });
  const { room, host } = await created.json();
  const joined = await request.post(`/api/audience/rooms/${room.code}/participants`, {
    data: { displayName: "Mira", anonymous: false },
  });
  const { participant } = await joined.json();
  const participantHeaders = { Authorization: `Bearer ${participant.token}` };
  const hostHeaders = { Authorization: `Bearer ${host.token}` };
  const chatResponse = await request.post(`/api/audience/rooms/${room.code}/messages`, {
    headers: participantHeaders,
    data: { text: "keep this in compact chat" },
  });
  const chatMessage = (await chatResponse.json()).message;
  const spotlightResponse = await request.post(`/api/audience/rooms/${room.code}/messages`, {
    headers: participantHeaders,
    data: { text: "the safe route has no aura" },
  });
  const spotlightMessage = (await spotlightResponse.json()).message;
  await request.patch(`/api/audience/rooms/${room.code}/messages/${spotlightMessage.id}`, {
    headers: hostHeaders,
    data: { status: "spotlighted" },
  });

  await page.goto(`/overlay/riff?room=${room.code}`);
  const spotlight = page.getByRole("region", { name: "Live audience spotlight" });
  const chat = page.getByRole("region", { name: "Live audience chat" });
  await expect(spotlight.getByText("the safe route has no aura", { exact: true })).toBeVisible();
  await expect(chat).toHaveCount(0);

  await expect(chat.getByText("keep this in compact chat", { exact: true })).toBeVisible({
    timeout: 10_000,
  });
  await request.patch(`/api/audience/rooms/${room.code}/messages/${chatMessage.id}`, {
    headers: hostHeaders,
    data: { status: "hidden" },
  });
  await expect(chat).toHaveCount(0);
});
