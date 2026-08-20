# ADR 0005: Build a real Audience Room before platform chat

Date: 2026-08-18

Status: accepted; narrows the first live proof in ADR 0004.

## Context

The scripted chat rehearsal makes Riff repeatable but does not prove that real viewers can affect a live show. Twitch would provide real participation, but it also adds creator-account setup, OAuth, platform moderation, network dependency, and a less controllable stage path before the core interaction has been validated.

The live demo will have a physically present audience. A QR room lets those people participate immediately while preserving the interaction that matters: a real comment can earn the stage, several independent comments can become a grounded crowd read, and weak input can be ignored.

## Decision

Build a game-agnostic temporary Audience Room before Twitch or YouTube chat ingestion.

- The presenter creates one room in the desktop companion and receives a random code, private host token, and QR URL.
- Attendees join without an account under a nickname or anonymously and submit free text.
- Messages are untrusted, limited to 280 characters, rate-limited per participant, and checked by a narrow deterministic severe-pattern safety floor before entering the presenter/Riff feed.
- The presenter can pause, resume, hide, spotlight, and close the room.
- The audience director returns `spotlight`, `synthesize`, or `silent`. Every non-silent decision cites supplied message IDs; a spotlight preserves the exact comment.
- The stable OBS source renders at most one selected exact comment. The chosen display name may be spoken.
- Closing the room removes participant state and ordinary messages. Only spotlighted comments remain in the local room archive.
- The desktop companion requests live audience judgment only. Missing or failed live AI remains a visible error and is never replaced by the deterministic fixture.

## Consequences

- The demo truth strip becomes **live gameplay · live audience · live AI cohost**.
- No Audience Room or director rule depends on Roblox. The exact game and stage cue can be chosen later without changing the room contract.
- The existing scripted chat path remains a disclosed rehearsal fixture, not the primary participation proof.
- Twitch/YouTube ingestion, long-term viewer memory, experiment verdicts, and automatic audience-turn promotion into the debrief are deferred.
- Physical phones require an operator-supplied HTTPS tunnel/public origin routing to the same Next.js process. The repository does not currently deploy that ingress.
- In-process storage is appropriate for one rehearsed room but is not durable, multi-instance, multi-tenant, or production abuse-resistant.
- Automated tests prove public HTTP, visible phone/presenter behavior, exact OBS spotlighting, grounding validation, and the mocked public Realtime boundary. They do not prove the public network path, provider judgment quality, spoken delivery, or a live audience load.
