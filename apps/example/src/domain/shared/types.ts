import { BRAND } from "zod";
import { inferFlattenedErrors } from "zod/dist/types/v3/ZodError";
import type { ZodType } from "zod/dist/types/v3";
import { ZodTypeDef } from "zod/dist/types/v3/types";

export type ForUpdate<T extends { id: unknown }> = Pick<T, "id"> &
  Partial<Omit<T, "id">>;

export type OmitBrand<T> = Omit<T, typeof BRAND>;

export type FieldErrors<
  T extends ZodType<Output, Def, Input>,
  Output = unknown,
  Def extends ZodTypeDef = ZodTypeDef,
  Input = Output,
> = inferFlattenedErrors<T>["fieldErrors"];
