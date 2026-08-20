# ADR 0006: Stream visible Audience Room chat through the stable overlay

Date: 2026-08-20

Status: accepted; amends the OBS-output decision in ADR 0005.

## Context

ADR 0005 proved that a real physical audience could submit comments and that Riff could put one exact selected comment on screen. For the live stage demo, that left too much of the audience interaction visible only inside the presenter companion. The broadcast audience should see the room become active before Riff selects a single comment, without adding a second OBS Browser Source or pretending the room is Twitch chat.

Automatic display increases stage energy but also expands the moderation surface. The current safety filter is only a narrow severe-pattern floor, so this remains a controlled prototype behavior rather than a production chat policy.

## Decision

- The stable `/overlay/riff` Browser Source renders the newest four visible Audience Room messages automatically in a compact upper-right stack.
- A message remains eligible for the stack for roughly 20 seconds. Hidden messages are omitted from the public stream response and disappear on the next overlay poll.
- A new exact spotlight temporarily takes priority over the compact stack, then the stack returns. Spotlight text, display name, and source ID remain unchanged.
- The presenter manually shows or hides a polished join screen through the desktop companion. The join screen contains the configured public QR URL, room code, and a short participation instruction.
- The overlay restores the static red Riff headset mascot. Animated or lip-synced avatar work remains out of scope.
- Pause continues to reject new messages, Close clears ordinary messages, and the same narrow safety floor runs before any message can enter the visible feed.
- OBS remains the compositor and broadcaster. The game, facecam, audio, mascot, join screen, chat stack, spotlight, and captions are composed through one stable overlay URL.

## Consequences

- The audience can watch its own participation become part of the show even before Riff reacts.
- The presenter retains immediate Pause, Hide, Hide join screen, and Close controls, but ordinary visible messages do not require per-message approval before entering OBS.
- The stage run must keep OBS Program output—not the companion—as the primary audience-facing view.
- The public stream response exposes only currently visible stream messages; the host-only feed still carries moderation status.
- This does not add Twitch/YouTube ingestion, comprehensive moderation, durable rooms, or long-term viewer memory.
