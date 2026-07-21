import { z } from "zod";

export const emptyToNull = (value: unknown) => value === "" ? null : value;
export const optionalText = z.preprocess(emptyToNull, z.string().trim().max(500).nullable().optional());
export const optionalUuid = z.preprocess(emptyToNull, z.string().uuid().nullable().optional());
export const optionalDate = z.preprocess(emptyToNull, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional());
export const optionalEmail = z.preprocess(emptyToNull, z.email("Enter a valid email address").nullable().optional());

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^(\+?234|0)?[789][01]\d{8}$/, "Enter a valid Nigerian phone number");

export const optionalPhone = z.preprocess(emptyToNull, phoneSchema.nullable().optional());

export function formBool(value: unknown) {
  return value === "on" || value === "true" || value === true;
}

export function normalizeFormData(formData: FormData) {
  return Object.fromEntries(formData.entries());
}
