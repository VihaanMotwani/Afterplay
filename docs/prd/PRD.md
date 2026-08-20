# Afterplay — Product Requirements

Status: living document. Last verified against the codebase on 18 August 2026.

Companion: [Implementation phases](./IMPLEMENTATION-PHASES.md) — what gets built when.

---

## 1. Product

**Afterplay is the team behind the player.** It watches a creator's streams, remembers the
history of their channel, turns gameplay into context-aware content, and learns what
actually grows their audience.

The differentiator is one capability no commodity clipper has: **finding a moment whose
meaning depends on history** — a callback, a rivalry payoff, a failure that is only funny
because the audience remembers — and showing the **evidence trail** for why it was chosen.

A normal clipper sees one video. Afterplay sees the channel.

Riff is the live extension of that continuity system. Its first generalized participation proof is a temporary, game-agnostic Audience Room for people physically watching the stream. Platform chat is not required for this slice: attendees scan a QR, submit real comments, and Riff may spotlight one exact source, synthesize grounded consensus, or stay silent.

### Primary outcome

A growing **returning audience**. Reach, watch retention, follows, and comments are
diagnostic signals, not the objective.

### Users

| User | Need |
|---|---|
| Solo gaming creator | One person doing five jobs; wants clips that are actually good without an editor |
| Growing creator with an archive | Has history worth mining and no way to mine it |
| Creator ecosystem operator (e.g. a games publisher) | Wants creators to grow because creators are how games grow |

---

## 2. Verified current state

Everything below was **executed**, not inferred. Re-run anything you doubt.

### Working, with real inputs

| Capability | Evidence |
|---|---|
| Single-video clipping on a real VOD | Real 1034s Free Fire VOD: resolved 5.4s, 14MB audio (not ~860MB video), audio-energy fallback (no captions/heatmap), 3 range-fetched windows, **3/3 clips 1080×1920, all first-pass QC** — [E-001](./EVIDENCE.md#e-001-single-video-live-run) |
| Channel memory backfill | Live OpenAI: extracted the running joke with correct `t=17.0` and verbatim quote — [E-002](./EVIDENCE.md#e-002-callback-detection-live). Works with **no captions at all**: 15 min of gameplay audio → ASR → 5 named threads — [E-025](./EVIDENCE.md#e-025-asr-backfill-on-a-caption-less-source) |
| Callback scoring | Live OpenAI, **conf 0.96**, citing `prior_001 @ 17.0`. The payoff window never repeats the key phrase — genuine semantic reasoning, not keyword matching; callback adds a ranking boost and is not a precondition — [E-002](./EVIDENCE.md#e-002-callback-detection-live), [E-006](./EVIDENCE.md#e-006-callback-is-additive-not-a-gate) |
| Negative control | Unrelated stream → **0 false positives** — [E-003](./EVIDENCE.md#e-003-negative-control-and-adversarial) |
| Adversarial robustness | Hallucinated `thread_id` rejected against retrieved set; confidence 0.10 gated below 0.55; judge exception degrades to heuristic; cold-start memory makes **0** judge calls — [E-003](./EVIDENCE.md#e-003-negative-control-and-adversarial) |
| Call volume | 1,795 candidate windows → **1 batched embed call + 10 judge calls**, flat by stream length; judge prompt 8,000 → **775 tokens** — [E-004](./EVIDENCE.md#e-004-call-volume-and-cost-profile) |
| Callback is additive, not a gate | Streams with no callback still return ranked clips — [E-006](./EVIDENCE.md#e-006-callback-is-additive-not-a-gate) |
| Honest Analyst | Three payloads → inconclusive (42) / contradicted (32) / cautious second test (64), each citing submitted numbers — [E-007](./EVIDENCE.md#e-007-honest-analyst) |
| Authority model | dispatch-before-approval 409, stale revision 409, reject-without-feedback 400, results-without-disclosure literal 400, live-AI-without-key 503 (no silent fallback), double dispatch → still 3 receipts — [E-008](./EVIDENCE.md#e-008-authority-model) |
| Clip playback | Byte-range serving (206 / 416, byte-identical slices); real mouse click plays through to `0:24 / 0:24` — [E-009](./EVIDENCE.md#e-009-clip-media-and-playback) |
| Test suites | Python **116 passed, 1 skipped**; Playwright production **26 passed**; build/typecheck/lint clean — [E-005](./EVIDENCE.md#e-005-test-suites) |
| Temporary Audience Room | Public HTTP and browser tests cover random room creation, configured public join URL, no-account nickname/anonymous join, free-text send, host-only feed and controls, rate limits, bounded severe-pattern rejection, close-time pruning, and the active-room alias (`tests/e2e/audience-room.spec.ts`, `tests/e2e/audience-room-ui.spec.ts`). |
| Grounded audience direction | Deterministic and optional live directors share a validated `spotlight` / `synthesize` / `silent` contract. Unknown source IDs and altered spotlight text are rejected; live failure is explicit with no fixture fallback (`src/ai/audience-director.ts`). |
| Riff and OBS audience path | Browser tests prove a grounded audience decision becomes one bounded public Realtime event and that the stable OBS URL renders the exact selected comment/name (`tests/e2e/riff-desktop-companion.spec.ts`, `tests/e2e/audience-room-ui.spec.ts`). Actual provider audio and public phone ingress remain manual gates. |

Evidence links resolve to dated command/output snapshots in [EVIDENCE.md](./EVIDENCE.md).
Each entry records the command that **produced** the result, not a grep of this document.
Timings are hardware-dependent; the evidence log states the machine.

### Fixtures, not live

- **Strategy director in demo mode is a constant function.** Asked to help a Vietnamese
  cooking streamer, it returns Mika Rao's physics-sandbox diagnosis verbatim
  (`src/ai/strategy.ts`).
- Workspace, creator baseline, evidence, and the three Studio "outputs" are seeded.
- Distribution receipts are simulated. No OAuth, no platform analytics.
- The `audience-demo` director is a deterministic pattern fixture. It is useful for contract tests, not evidence of model taste.
- No provider-backed `audience-live` call or physical phone-to-public-host rehearsal is recorded in this document yet.

### The honest framing

**A real engine with a fixture-driven shell.** The clipper and callback memory genuinely
run; the strategy loop does not.

The two halves are now joined **in both directions**: the clipper writes a manifest, Studio
reads it and carries those clips through approval and dispatch, and recorded results are
written back into the Python memory dir where they re-rank the next run
([E-016](./EVIDENCE.md#e-016-ranking-feedback-changes-a-later-run),
[E-020](./EVIDENCE.md#e-020-pipeline-clips-in-the-approval-loop)). What is still missing at
the end of that loop is **publication**: nothing reaches a platform, so the outcomes fed
back are synthetic by necessity. Real analytics can enter through
`results --input <csv>` ([E-021](./EVIDENCE.md#e-021-real-analytics-csv-into-the-ranking-priors)),
but there is nothing real to enter until G12 exists.

When history matters, Afterplay is uniquely strong because the memory pass can add callback context and confidence evidence as a ranking boost.
When history is absent or unresolved, it is still a strong clipper. Callbacks are therefore
**not a precondition** for output. A stream with no history-dependent callback match must still
surface clearly: **No memory-dependent callback found in this run. Showing highest-quality
standalone clips.** not a silent empty state — and a callback that was found but scored
below the clips returned is reported as its own state rather than claimed as a success
([E-024](./EVIDENCE.md#e-024-callback-found-reflects-shipped-clips)).

---

## 3. Gap register

Every gap found, with source and current status. `P0` = blocks a credible submission or
demo. `P1` = required for the product claim. `P2` = production maturity.

### Already fixed (do not redo)

| # | Gap | Fix |
|---|---|---|
| FIX-1 | Analyst fabricated results — 0% input produced "worth testing again" citing invented 13.6% | Computes from submitted metrics; implements its own declared falsifier — [E-007](./EVIDENCE.md#e-007-honest-analyst) |
| FIX-2 | 1,795 sequential judge + embed calls per 2h stream | Batch-embed once, judge top-K — [E-004](./EVIDENCE.md#e-004-call-volume-and-cost-profile) |
| FIX-3 | Raw embeddings serialized into judge prompts (~95% of 8k tokens) | Stripped in `retrieved_thread` — [E-004](./EVIDENCE.md#e-004-call-volume-and-cost-profile) |
| FIX-4 | `AFTERPLAY_OPENAI_MODEL` shared by app and clipper | Split into `AFTERPLAY_CLIPPER_MODEL` |
| FIX-5 | Citation (`source_stream`/`source_t`/`source_quote`) never rendered | Rendered in Studio — [E-002](./EVIDENCE.md#e-002-callback-detection-live) |
| FIX-6 | Media route ignored HTTP `Range`; video never started | 206 + `Content-Range`, suffix ranges, 416 — [E-009](./EVIDENCE.md#e-009-clip-media-and-playback) |
| FIX-7 | `.output-preview::after` overlay swallowed every click on the player | `pointer-events: none` |
| FIX-8 | E2E fixture wrote into the real workdir and shadowed the demo manifest | Isolated temp workdir via `webServer.env` |
| FIX-9 | Service README sent judges to a different repository (`git clone .../video-clipper-service-.git`) | Install now starts from `cd services/video-clipper` — [E-010](./EVIDENCE.md#e-010-install-path-correction) |
| FIX-10 | Service README published unreproduced performance claims (`3/3 clips, 130s`, "93 tests") under a "Verified on real sources" heading | Replaced with measured runs, hardware stated, plus a re-measure warning; test count corrected to 100 passed / 1 skipped — [E-001](./EVIDENCE.md#e-001-single-video-live-run), [E-005](./EVIDENCE.md#e-005-test-suites) |
| FIX-11 | Callback failure/no-callback states were indistinguishable in the app | Manifest now carries `memory`, `message`, and job `status.json`; Studio renders degraded, stale, and valid no-callback states separately — [E-012](./EVIDENCE.md#e-012-callback-status-contract), [E-013](./EVIDENCE.md#e-013-app-feedback-loop-typecheck) |
| FIX-12 | Experiment approval package ignored real clipper manifests | The experiment domain projects the latest complete manifest into approval outputs and writes per-clip results back to `AFTERPLAY_MEMORY` — [E-013](./EVIDENCE.md#e-013-app-feedback-loop-typecheck) |

### P0 — open / validation-gated

| # | Gap | Detail |
|---|---|---|
| **G1** | **Deck and demo video do not exist** | `docs/submission/REQUIREMENTS.md` has both unchecked. No PDF in the repo. **Two of three required deliverables.** |
| ~~G2~~ | **CLOSED** — backfill proven on real VODs | ASR fallback, `--local`, and actionable `faster-whisper` errors, validated by six real backfills across two creators with zero failures — [E-017](./EVIDENCE.md#e-017-real-creator-thread-extraction). |
| **G5** | Documented judge path must stay live-first | README now leads with `backfill` → `run --memory` → Studio manifest review; keep this live path ahead of the fixture loop. |
| **G24** | Physical Audience Room ingress not yet rehearsed | The QR can use `AFTERPLAY_PUBLIC_BASE_URL`, but no tunnel/public host and external phone run is bundled or recorded. The URL must route to the same in-memory process as the presenter. |
| ~~G6~~ | **CLOSED** — real creator data sourced, callbacks found and rendered | KSI/Sidemen and iShowSpeed backfilled from real auto-captions (no generic threads); 3 genuine cross-video callbacks found; the hero rendered end to end as a playable 1080x1920 clip with its citation — [E-017](./EVIDENCE.md#e-017-real-creator-thread-extraction), [E-018](./EVIDENCE.md#e-018-cross-video-callback-on-real-data), [E-015](./EVIDENCE.md#e-015-hero-callback-rendered). |

### P1 — open

| # | Gap | Detail |
|---|---|---|
| ~~G7~~ | **CLOSED** — the loop is closed in both directions | Recorded outcomes measurably re-rank a later run and the Analyst cites a real `clip_id` ([E-016](./EVIDENCE.md#e-016-ranking-feedback-changes-a-later-run)); real clipper clips now ride the approval loop as an **additive** `pipelineOutputs` set — the curated three-card package is never overwritten — and are approved and dispatched with it ([E-020](./EVIDENCE.md#e-020-pipeline-clips-in-the-approval-loop)). Real published analytics reach the priors through `results --input <csv>` ([E-021](./EVIDENCE.md#e-021-real-analytics-csv-into-the-ranking-priors)); actual publishing is still G12. |
| **G8** | No creator upload | No file input, no multipart handler, no ingest route in `src/`. Media enters only via CLI on the operator's machine. |
| **G9** | No channel connect | **No channel enumeration anywhere** — no playlist, no `/@handle`, no flat-playlist. `backfill` takes one video and a manually assigned `--stream-id`. "Point it at my channel" does not exist. |
| **G10** | No OAuth | `src/app/integrations/page.tsx` states "OAuth is not configured". No YouTube Analytics, no real performance data. |
| **G11** | Studio is review-only | Approve / request changes / reject. No trim, re-cut, caption edit, reorder, or regenerate. |
| **G12** | No publishing | Approval produces simulated receipts; nothing reaches a platform. |
| **G13** | Mode expectations undocumented | No table telling a judge what `demo` guarantees vs what `live` requires — the root of "is this real or fake?" |
| **G14** | Model config drift — **local `.env` only** | Repo files already agree: `.env.example` and `docs/AI.md:30` both say `gpt-5.6-sol`. The drift exists only in the developer's gitignored `.env` (`gpt-4o-mini`). Action is a one-line note plus each developer updating their own `.env`. |
| **G15** | `tasks/todo.md` is historical | Contains duplicated, contradictory, and superseded sections; reads as notes, not status |
| **G25** | Live audience judgment not provider-validated | The Responses adapter is schema- and grounding-validated and fails closed, but taste, latency, safety quality, and spoken delivery have not been run live on the demo machine. |
| **G26** | Audience interventions stop before continuity | Audience-selected Realtime turns are not yet promoted into the source-bearing highlight/memory/experiment debrief. Do not claim that handoff during the demo. |

### P2 — open

| # | Gap | Detail |
|---|---|---|
| **G16** | Reframe is slow | `track_subject_best` measured **142s for one 41.7s 1080p60 clip** with zero contention. `vision.py` and `produce.py` each decode every frame and discard all but every Nth — two full decodes. Fix: downscale before energy scoring, share one decode. |
| **G17** | Systematic duration drift | Planned 30.0s, rendered 26.4–27.0s on every clip; flagged only as `warn` |
| **G18** | yt-dlp deprecation warning | "No supported JavaScript runtime… some formats may be missing." Install `deno` on any machine that ingests. |
| ~~G19~~ | **CLOSED** — silent failures fail loudly | Verified by fault injection, not by inspection: a revoked key produces `degraded: true` with the 401 text, rendered in Studio as an assertive `role="alert"` warning and never as "no callback found" — [E-026](./EVIDENCE.md#e-026-fault-injection-degraded-and-stale). A callback that ranked out is also its own reported state — [E-024](./EVIDENCE.md#e-024-callback-found-reflects-shipped-clips). |
| ~~G20~~ | **CLOSED** — a dead run cannot masquerade as current | A render killed mid-run leaves `status: started` and no manifest; the app serves the last complete run and says so. Fault-injected, and it exposed a real defect: stale and degraded were chained, so one hid the other — [E-026](./EVIDENCE.md#e-026-fault-injection-degraded-and-stale). |
| **G21** | Not durable | Seeded in-process state; not multi-instance or multi-tenant |
| **G22** | Media route has no caching semantics | `no-store`, no ETag/Last-Modified |
| **G27** | Audience Room is demo-grade infrastructure | State/tokens are in one process; the safety filter is a narrow severe-pattern floor; there is no durable store, multi-instance coordination, production abuse defense, or platform moderation integration. |
| ~~G23~~ | **CLOSED** — ASR proven on real caption-less gameplay | 15 minutes of KSI gameplay audio with captions withheld: 2427 words at lang confidence 0.97, yielding **5 concrete named threads**, not generic ones. The missing-dependency path names the fix rather than falling through to "requires captions" — [E-025](./EVIDENCE.md#e-025-asr-backfill-on-a-caption-less-source). |

### Corrections to prior assessments

- **"Stale manifests can show old artifacts" is backwards.** Newest wins; old cannot
  surface. The real failure is a run that dies before writing. Recorded as G20.
- **"backfill from a provided transcript via `--vtt`" undersells it.** `backfill` accepts a
  bare URL positional and resolves captions itself.
- **"Architecture matches the concept: content engine loop + clip production + memory"** —
  not as an integrated loop. See G7.
- **`services/` is fully tracked** (28 files, engine included), contrary to an earlier claim.
- **Callback is a scoring boost, not a gate.** `MemoryReasoner` still appends ranked moments and applies
  callback boosts after candidate scoring; no-callback is a valid, first-class output state. Callback
  moments must be precision-first, not fabricated.

---

## 4. Requirements

### R1 — The demo must exercise the live path

The documented judge walkthrough must run backfill → memory-aware clip selection → Studio
evidence, using real model calls. Fixtures may support the story; they must not *be* it.

### R2 — Nothing on screen may be unsubstantiated

Every number shown must derive from submitted or measured data and link to `EVIDENCE.md`. Every
published claim in docs must be reproducible on the demo machine. Simulated data stays labelled at
point of use. This requirement is currently satisfied via:
[E-001](./EVIDENCE.md#e-001-single-video-live-run),
[E-002](./EVIDENCE.md#e-002-callback-detection-live),
[E-003](./EVIDENCE.md#e-003-negative-control-and-adversarial),
[E-004](./EVIDENCE.md#e-004-call-volume-and-cost-profile),
[E-005](./EVIDENCE.md#e-005-test-suites),
[E-006](./EVIDENCE.md#e-006-callback-is-additive-not-a-gate),
[E-007](./EVIDENCE.md#e-007-honest-analyst),
[E-008](./EVIDENCE.md#e-008-authority-model),
[E-009](./EVIDENCE.md#e-009-clip-media-and-playback),
[E-010](./EVIDENCE.md#e-010-install-path-correction),
[E-011](./EVIDENCE.md#e-011-no-callback-valid-fallback),
[E-012](./EVIDENCE.md#e-012-callback-status-contract),
[E-013](./EVIDENCE.md#e-013-app-feedback-loop-typecheck).

### R8 — Explicit no-callback outcome

If no callback is found and memory is healthy, the UI must state this clearly and still deliver the
strongest non-callback clips as the valid fallback path:
**No memory-dependent callback found in this run. Showing highest-quality standalone clips.**
When `memory.degraded: true`, the same stream must use an explicit failure path (visible reason) and
may never be presented as this fallback success message.

### R3 — Memory must work on caption-less gameplay

Channel memory must be buildable from any source the render pipeline accepts, including
VODs with no captions. Anything less makes the differentiator inapplicable to the target
content.

### R4 — The loop must close

Clip performance must inform the next experiment. Until it does, "learns what grows their
audience" is a claim the system does not support.

### R5 — Creator self-service

A creator must be able to connect a channel or upload a video from the product, without a
terminal, and have memory prepared for them.

### R6 — Editorial control

The creator must be able to change a cut, not only approve or reject it.

### R7 — Honest degradation

No silent fallback. Missing credentials, dead model ids, and failed jobs must surface
visibly rather than producing a successful-looking empty result (G19).

### R9 — Real audience participation before platform chat

The primary physical-room demo must accept real attendee HTTP input through a phone-reachable QR, give the presenter immediate pause/hide/spotlight/close controls, and keep the game choice outside the room/director contract. Twitch or YouTube ingestion is a later adapter, not a precondition for validating the interaction.

### R10 — Audience provenance and ephemerality

A Riff spotlight must preserve the exact supplied comment and source ID; synthesis must cite at least two supplied messages; silence is valid. Ordinary room messages must not silently become long-term viewer memory. Closing a room retains only comments explicitly spotlighted during the show.

---

## 5. Non-goals

- Direct Twitch/YouTube chat ingestion in the first Audience Room slice.
- A general livestreaming or moderation platform. OBS remains the broadcaster, and the presenter remains the authority.
- A general video editor. Editing is scoped to adjusting generated cuts.
- Autonomous publishing. Publishing always requires explicit creator approval.
- Cross-platform person-level identity. Explicitly disclaimed.
- Multi-tenant SaaS operation until P2.

---

## 6. Principles

1. **The evidence trail is the product.** A clip without its citation is a commodity clip.
2. **Never claim what cannot be shown.** Applies to the UI, the README, and the deck.
3. **Degrade loudly.** A silent fallback that produces nothing is worse than an error.
4. **No-callback is a valid result.** A stream with no callback match is still a useful output state.
5. **No callback must never be treated as a failure mode.** It is a valid product outcome and should
   continue ranking standalone clips.
5. **Curation of demo inputs is fair; faking detection is not.**
6. **The engine is the moat; the shell is replaceable.**
