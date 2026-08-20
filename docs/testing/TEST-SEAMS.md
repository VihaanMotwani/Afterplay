# Accepted public test seams

Status: **accepted on 9 August 2026; Audience Room extension accepted on 18 August 2026; stream-output extension accepted on 20 August 2026**

The user approved these seams before implementation. Tests verify public behavior rather than private component or repository structure.

## Seam 1: Creator and desktop-companion experience

Verify through accessible, visible behavior:

- Afterplay proposes one stream experiment and the creator can accept or edit it.
- The creator can configure Riff with a natural-language personality brief, roast intensity, and talk frequency.
- Live mode visibly progresses through connecting, ready, hearing, thinking, speaking, and failure states based on public Realtime events.
- A spontaneous microphone reply remains audible and captioned without fabricating a source-backed experiment turn.
- The live control surface labels gameplay/chat/AI truth status and exposes mute/end controls.
- The primary live path can show a static Riff mascot, compact automatic audience chat, a manual QR join screen, and one presenter/Riff-selected exact audience callout without a scrolling-chat takeover.
- One fail setup and one multi-message audience request produce materially different cohost responses.
- Ending a stream reveals memories, highlight candidates, experiment evidence, and a next experiment or callback.
- Electron opens a compact companion instead of the Afterplay dashboard and exposes only a narrow context-isolated preload bridge.
- The creator can list capturable windows, select Roblox, and see **Game vision active** before starting Riff.
- Starting Riff creates the live session, establishes the Realtime WebRTC boundary, and sends selected-window image context.

## Seam 2: Live-session HTTP contract

Verify through public routes:

- start a session with an accepted experiment and valid cohost profile;
- retrieve current session state;
- submit a bounded turn packet containing gameplay observation, streamer transcript, chat messages, and relevant memory;
- return `speak` or `silent` from Riff;
- require spoken turns to contain an utterance, timing rationale, and valid supporting source references;
- end the session idempotently and return source-grounded memories, highlights, and experiment evidence;
- reject malformed, missing, ended, or unsupported transitions predictably.

## Seam 3: AI adapter contract

Verify at the replaceable runtime boundary:

- deterministic demo and live model modes return the same validated cohost-decision structure;
- live failures remain visible and never silently become fixture success;
- chat, transcripts, and visual observations cannot directly invoke application behavior;
- `silent` is a valid first-class decision;
- emitted source references must exist in the supplied turn packet.

## Seam 4: OBS-facing browser source

Verify in a browser:

- one stable transparent route resolves the active session and keeps Riff's static mascot/nameplate visible while captions and state change;
- the same stable route follows the active Audience Room, automatically exposes the newest four visible comments for roughly 20 seconds, and removes a hidden comment on the next poll;
- a new exact spotlight temporarily replaces the compact chat stack, then the stack returns;
- the presenter can show and hide a QR join screen in that same route without changing OBS sources;
- a separate transparent route retains the disclosed simulated-chat rehearsal feed;
- the overlay remains legible at the target OBS canvas size;
- no dashboard chrome or animated avatar appears.

## Seam 5: Real Audience Room

Verify through public HTTP and accessible browser behavior:

- the presenter creates a temporary room and receives a random code, private host token, public participant path, and configured public URL;
- an attendee joins by nickname or anonymously without an account and sends free text from the phone surface;
- unsafe severe-pattern text is rejected before entering the presenter/Riff feed, and one participant cannot exceed three messages per ten seconds;
- only the presenter can inspect the host feed, show/hide the OBS join screen, pause/resume/close the room, hide noise, or spotlight an exact comment;
- closing removes the participant list and all non-spotlighted messages;
- the director returns `spotlight`, `synthesize`, or `silent` with only supplied message IDs, and a live failure never becomes fixture success;
- a grounded non-silent decision crosses the public browser Realtime boundary as one bounded Riff response;
- the stable OBS URL follows the newest room and renders manual join-screen state, visible compact chat, and the exact spotlight text/display name.

Automated tests prove the Electron shell, capture selection contract, image-event emission, Audience Room lifecycle, grounded browser-to-Realtime event, and overlay state. Actual phone-to-public-internet ingress, Roblox pixels, OS permissions, live model judgment, microphone playback, Riff audio routing, and the OBS scene remain manual rehearsal gates because browser mocks cannot prove the public/device graph.

## Testing posture

- Browser tests assert accessible visible content, not hidden DOM fixture text.
- Service tests call public HTTP routes, not private repositories.
- Deterministic observations, transcripts, simulated chat, model output, time, and randomness may be replaced in tests.
- The browser WebRTC boundary may be replaced in automated tests to prove event-driven UI behavior; real microphone permission, provider latency, and audio playback remain manual gates.
- Each capability is implemented as one red-green vertical slice.
- Fixture chat and model mode remain visibly disclosed whenever used; the physical-room path instead labels the audience live.
