# OBS, the selected game, and Riff rehearsal

Use this runbook for the live physical-audience demo. Riff runs in the desktop companion. OBS remains the compositor and receives one stable transparent HUD source plus Riff's application audio.

## Scene layout

```text
┌──────────────────────────────────────────────────────────────┐
│ selected-game capture                                facecam │
│                                                              │
│                                                              │
│                         ┌ AUDIENCE · LIVE ────────────────┐  │
│                         │ viewer · newest visible comment │  │
│                         │ viewer · up to four, ~20 sec    │  │
│                         └─────────────────────────────────┘  │
│  ┌ RIFF MASCOT · LISTENING ───────────────────────────────┐  │
│  │ Live captions appear here while Riff is speaking.       │  │
│  └─────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

The static Riff mascot/nameplate stays visible. Captions expand beside it while Riff speaks. The newest four visible audience comments appear automatically at the top right for roughly 20 seconds. A presenter- or Riff-selected exact spotlight temporarily replaces that stack. The manual join screen deliberately covers most of the game while people scan. Do not capture the desktop-companion control window or Afterplay dashboard in the broadcast scene.

## One-time OBS setup

1. Create a scene named **Afterplay judge demo**.
2. Add the chosen game using Game Capture or the platform-appropriate window capture.
3. Add the camera as a small corner Video Capture Device.
4. Add the creator microphone and verify its meter before Riff starts.
5. Add a Browser Source at `1280 x 720` using `http://127.0.0.1:3100/overlay/riff`. Keep it above the game source. This URL remains stable across sessions.
6. Capture audio from **Riff by Afterplay** using OBS Application Audio Capture when available. Otherwise capture desktop audio and verify that game/Riff levels remain separable enough for the demo.
7. Wear headphones so Riff's voice does not loop into the creator microphone.

## Start the companion

1. Expose port `3100` through one HTTPS tunnel/public origin that routes back to this same Next.js process. Put its origin and the live keys in `.env.local`:

   ```text
   AFTERPLAY_PUBLIC_BASE_URL=https://your-tunnel-host.example
   AFTERPLAY_ENABLE_LIVE_AUDIENCE_AI=true
   AFTERPLAY_AUDIENCE_MODEL=gpt-5.6-sol
   OPENAI_API_KEY=...
   ```

   A deployed multi-instance/serverless host is not supported by the current in-memory room store.
2. From the repository root, run:

   ```bash
   npm run companion:dev
   ```

3. Select **Create audience room**, click **Show join screen**, and verify the QR/code appear in OBS. Scan with a phone not on the laptop, join, send a harmless test comment, and confirm it reaches both the presenter feed and compact OBS chat. Click **Hide join screen**. If this fails, fix public ingress before the audience arrives.
4. In the compact Riff window, click **Choose**, select the game window, and confirm **Game vision active**.
5. Click **Start Riff** and grant macOS microphone and screen-recording access if requested.
6. Wait for **Riff is listening**. Speak once and confirm audible model speech and captions in OBS.
7. Spotlight the harmless test comment and confirm the exact text temporarily replaces compact chat at the top right; hide it before the demo.
8. Balance levels: creator voice first, Riff slightly below, game beneath both.

The companion sends a resized current-game snapshot every five seconds. This is periodic image context, not continuous video. The automated suite verifies that an `input_image` event crosses the Realtime data channel; it does not prove selected-game capture quality or the model's visual interpretation on this machine.

## Judge sequence

1. Start on the OBS Program output with the permanent Riff HUD visible. In the companion, click **Show join screen** and leave the audience-facing OBS output up long enough for people to scan.
2. Click **Hide join screen**, then briefly show the compact companion—not the Afterplay dashboard—receiving real comments, selecting the game window, and starting Riff.
3. Return to the OBS Program output and play. Let compact automatic chat establish that the room is real; talk naturally so Riff has microphone, current-frame, and visible room context.
4. Let the room produce a worthy comment. Riff may spotlight it, synthesize genuine agreement, or stay silent; do not promise a response to every message.
5. When Riff selects one comment, verify its exact text/name appears in OBS while the bounded Riff response is audible.
6. Use **Pause** if the room becomes noisy, **Hide** for an individual on-screen comment, and **Close** at the end. Ordinary safety-floor-passing chat does not wait for approval.
7. Close the live proof by saying that source-bearing show moments are intended to feed Afterplay's highlight, memory, and experiment loop. Do not claim the new Audience Room intervention is already written into that ledger.

The older `/live` path still contains the visibly labelled scripted-chat rehearsal. The primary desktop path now proves real Audience Room HTTP input and a mocked public Realtime boundary in automation; the actual OpenAI audience judgment, phone ingress, microphone/audio, and OBS composition remain manual rehearsal gates until tested together on the demo machine.

## Recovery

- No windows listed: open the chosen game first. On macOS, enable Screen & System Audio Recording for Electron/Riff, then restart the companion.
- No microphone: enable Microphone access for Electron/Riff, then restart.
- No Riff audio: confirm the companion is not muted and OBS captures the Riff application or desktop audio.
- No HUD: confirm the Browser Source URL is exactly `http://127.0.0.1:3100/overlay/riff`, the local service is running on port `3100`, and refresh the source cache.
- No join screen in OBS: confirm the room is open, click **Show join screen** in the companion, and verify the Browser Source is not hidden beneath the game source.
- Comment reaches the presenter but not OBS chat: confirm it was not hidden or spotlighted, the room is the newest active room (or pass `?room=CODE` while rehearsing), and refresh the Browser Source cache.
- QR opens nothing on a phone: confirm `AFTERPLAY_PUBLIC_BASE_URL` is the HTTPS tunnel origin and that the tunnel routes to the same process/port used by the companion. Recreate the room after changing it.
- Comment reaches the presenter but Riff does not react: confirm the room is open, Riff is listening, `AFTERPLAY_ENABLE_LIVE_AUDIENCE_AI=true`, and the provider key/network work. Live failure is intentionally not replaced by fixture output.
- Unsafe/noisy room: pause the room first, hide individual messages, and close it if control is not immediately restored.
- Riff does not start: use the visible error, then check the server key, network, microphone permission, and app restart.
- The game changes too quickly: remember that the MVP samples every five seconds; narrate the current moment so audio and the latest frame reinforce each other.
