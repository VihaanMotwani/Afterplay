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
