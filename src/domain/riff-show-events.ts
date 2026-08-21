import { z } from "zod";

/** Director-authored, stream-visible states. A single event owns the overlay at a time. */
export const riffShowEventSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("prediction"),
    id: z.string().min(1),
    prompt: z.string().min(1).max(120),
    options: z.tuple([z.string().min(1).max(40), z.string().min(1).max(40)]),
    closesAt: z.string().datetime(),
  }),
  z.object({
    kind: z.literal("clutch"), id: z.string().min(1), headline: z.string().min(1).max(80) }),
  z.object({
    kind: z.literal("oops"), id: z.string().min(1), headline: z.string().min(1).max(80) }),
  z.object({
    kind: z.literal("callback"), id: z.string().min(1), headline: z.string().min(1).max(80), source: z.literal("SIMULATED DEMO CALLBACK") }),
]);

export type RiffShowEvent = z.infer<typeof riffShowEventSchema>;
