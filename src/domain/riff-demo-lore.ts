/** Disclosed stage material, never real creator-memory evidence. */
export const riffDemoLore = [
  {
    id: "demo_callback_high_score",
    label: "The high-score plateau",
    line: "Remember last week? You were stuck at this exact high-score plateau, like the leaderboard had put you on hold.",
  },
  {
    id: "demo_callback_left_route",
    label: "The left-route curse",
    line: "Last week you swore the left route was safe. The left route has since filed a restraining order.",
  },
  {
    id: "demo_callback_respawn",
    label: "Respawn legend",
    line: "At this point the respawn screen knows your full legal name.",
  },
  {
    id: "demo_callback_cactus",
    label: "Cactus rivalry",
    line: "The cactus is now up 100 to nothing across our entirely simulated record book.",
  },
] as const;

export function demoLoreContext() {
  return [
    "DEMO FIXTURE — SIMULATED PAST-STREAM CALLBACKS. These are stage material, not verified creator memory.",
    ...riffDemoLore.map((callback) => `[${callback.id}] ${callback.label}: ${callback.line}`),
    "Use a callback only when the creator or current audience/game context clearly sets it up. Never claim it happened in a real past stream.",
  ].join("\n");
}
