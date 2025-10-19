import { z } from "@hono/zod-openapi";

export const Timestamp = z
  .object({
    seconds: z.number().int(),
    nanoseconds: z.number().int(),
  })
  .openapi("Timestamp");
export type Timestamp = z.infer<typeof Timestamp>;

export const toTimestamp = (date: Date): Timestamp => {
  return {
    seconds: Math.floor(date.getTime() / 1000),
    nanoseconds: (date.getTime() % 1000) * 1_000_000,
  };
};

export const toDate = (timestamp: Timestamp): Date => {
  return new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1_000_000);
};
