# Product contract

Last updated: 2026-08-20

## Promise

Afterplay gives gaming creators an audible AI cohost that can follow the streamer, gameplay, chat, community history, and one accepted experiment at the same time. Riff helps create the live moment; Afterplay preserves what the moment taught the creator.

## Canonical live demo

The creator plays a game in front of a physically present audience. The presenter manually puts a QR join screen into the OBS output; the audience scans it, joins without an account, and sends real comments from their phones. The newest four visible comments appear automatically in a compact stream stack for roughly 20 seconds. Riff can select one worthy comment, synthesize genuine agreement across multiple source messages, or stay silent.

The Audience Room, creator performance, and gameplay are real during this path. The room and director contain no Roblox-specific rules; Roblox remains one possible rehearsal game, and the exact game and stage cue are deliberately deferred. A separate scripted chat surface remains available only as a visibly disclosed fallback/rehearsal fixture.

## Central workflow

1. Afterplay proposes one falsifiable stream experiment.
2. The creator accepts or edits the experiment and tunes Riff's personality, roast intensity, and talk frequency.
3. The creator opens the lightweight desktop companion, selects the game window, and starts a live session with that accepted experiment in context.
4. Riff hears the streamer, receives periodic frames from only the selected game window, and reads recent visible Audience Room messages through a grounded director.
5. Visible comments flow into the compact OBS chat stack after the safety floor. The director returns `spotlight`, `synthesize`, or `silent`. A non-silent result carries only supplied message IDs and becomes one bounded Realtime response; a spotlight temporarily replaces the chat stack with the exact comment in OBS.
6. Afterplay records the evidence behind each useful live turn and identifies semantic highlight candidates.
7. The stream ends in a short debrief: new memories, highlight candidates, experiment evidence, and a proposed next experiment or callback.

## Canonical judge path

`Experiment check-in -> live session -> audible Riff intervention -> visible highlight capture -> continuity debrief`

Within the first 20 seconds, the judge must understand:

- Riff is an audible AI cohost, not another dashboard assistant;
- Riff has simultaneous context from the streamer, gameplay, a real temporary audience room, memory, and accepted experiment;
- the truth strip reads **live gameplay · live audience · live AI cohost**;
- the stream will produce reusable memory and evidence rather than evaporating when it ends.

## Product surfaces

1. **Check-in**: the proposed experiment and compact cohost configuration in Afterplay.
2. **Desktop companion**: selected-game preview, microphone/Realtime state, Riff output, and start/stop control outside the dashboard.
3. **Audience Room**: phone join/composer plus presenter QR, feed, manual join-screen toggle, pause, hide, spotlight, and close controls.
4. **OBS overlay**: one stable transparent browser-source page with a static Riff mascot/nameplate, captions, an automatic four-comment chat stack, a manual QR join screen, and transient exact spotlight priority. OBS remains the broadcaster.
5. **Debrief**: memories, highlights, experiment evidence, and next experiment.
6. **History**: prior experiments and creator/community memory. It supports the core loop but is not the demo climax.

## Prototype boundary

- One preloaded creator workspace is used; Audience Room and director behavior are game-agnostic.
- Audience participation uses real HTTP requests, random room/participant tokens, a 280-character limit, three-message-per-ten-second participant limit, a two-hour expiry, and presenter controls.
- A configured `AFTERPLAY_PUBLIC_BASE_URL` must expose the same local process through a public HTTPS origin for physical phones. That ingress is operator-supplied and is not deployed by this repository.
- The built-in safety rejection covers a narrow deterministic set of severe text patterns. It is a demo safety floor, not production moderation.
- Ordinary visible messages can appear automatically in OBS for roughly 20 seconds without presenter approval. Pause stops new messages; Hide removes an individual message from the public stream response on the next poll.
- Demo audience judgment is deterministic and grounded; live judgment uses the OpenAI Responses API and fails visibly without fallback.
- Demo mode uses a deterministic cohost director and returns the same validated decision shape as live mode.
- Live mode uses an OpenAI realtime voice model and fails visibly if it is unavailable.
- Gameplay context is sampled from the selected desktop window every five seconds and sent as bounded image input; continuous video is not claimed.
- Roblox broadcast capture, facecam, creator-microphone routing, Riff application audio, and final composition are configured in OBS and verified manually.
- The product emits captions/speaking state for an OBS browser source; it does not recreate OBS.
- Seeded in-process state is acceptable for the prototype and is not represented as durable production storage.
- Final clips may exclude Riff. Riff contributes timestamps, context, memory, and experiment evidence.
- Audience-selected Realtime interventions are not yet automatically promoted into the debrief/evidence ledger; that downstream connection remains separate work.

## Deliberate exclusions

- Real Twitch or YouTube chat ingestion.
- An animated or lip-synced Riff avatar; the stream HUD uses one static mascot image.
- Direct game control, modifiers, trouble tokens, or chat-triggered commands.
- Autonomous moderation sanctions, DMs, purchases, public posting, or sponsor claims.
- Sensitive individual fan profiles.
- Claims that one physical-room demo proves retention, burnout reduction, or creator growth.
- Durable rooms, multi-instance coordination, production abuse defense, or long-term viewer memory from ordinary room messages.
