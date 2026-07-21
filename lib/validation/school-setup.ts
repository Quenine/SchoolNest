import { z } from "zod";
import { formBool, optionalEmail, optionalPhone, optionalText, optionalUuid } from "@/lib/validation/common";

const code = z.string().trim().min(1).max(40).transform((value) => value.toUpperCase().replace(/[^A-Z0-9]+/g, "_"));

export const academicSessionSchema = z.object({
  id: optionalUuid,
  name: z.string().trim().min(4, "Enter the academic session name"),
  starts_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a start date"),
  ends_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose an end date"),
  is_current: z.preprocess(formBool, z.boolean()).default(false),
}).refine((value) => value.ends_on > value.starts_on, { path: ["ends_on"], message: "End date must be after start date" });

export const academicTermSchema = z.object({
  id: optionalUuid,
  academic_session_id: z.string().uuid("Choose a session"),
  name: z.enum(["first", "second", "third"]),
  starts_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a start date"),
  ends_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose an end date"),
  is_current: z.preprocess(formBool, z.boolean()).default(false),
}).refine((value) => value.ends_on > value.starts_on, { path: ["ends_on"], message: "End date must be after start date" });

export const schoolProfileSettingsSchema = z.object({
  display_name: z.string().trim().min(2, "Enter the school display name"),
  motto: optionalText,
  logo_url: optionalText,
  primary_color: optionalText,
  secondary_color: optionalText,
  address: optionalText,
  city: optionalText,
  state: optionalText,
  country: z.string().trim().min(2).default("Nigeria"),
  contact_email: optionalEmail,
  contact_phone: optionalPhone,
  website: optionalText,
  principal_name: optionalText,
  head_teacher_name: optionalText,
  report_card_signature_url: optionalText,
  default_currency: z.string().trim().min(3).max(3).default("NGN"),
  timezone: z.string().trim().min(3).default("Africa/Lagos"),
});

export const schoolSectionSchema = z.object({
  id: optionalUuid,
  name: z.string().trim().min(2, "Enter the section name"),
  code,
  sort_order: z.coerce.number().int().min(0).default(0),
  is_active: z.preprocess(formBool, z.boolean()).default(true),
});

export const schoolClassSchema = z.object({
  id: optionalUuid,
  section_id: optionalUuid,
  name: z.string().trim().min(2, "Enter the class name"),
  code,
  level_order: z.coerce.number().int().min(0).default(0),
  is_graduating_class: z.preprocess(formBool, z.boolean()).default(false),
  is_active: z.preprocess(formBool, z.boolean()).default(true),
});

export const classArmSchema = z.object({
  id: optionalUuid,
  class_id: z.string().uuid("Choose a class"),
  name: z.string().trim().min(1, "Enter the arm name"),
  code,
  capacity: z.preprocess((value) => value === "" ? null : value, z.coerce.number().int().positive().nullable().optional()),
  class_teacher_user_id: optionalUuid,
  is_active: z.preprocess(formBool, z.boolean()).default(true),
});

export const subjectSchema = z.object({
  id: optionalUuid,
  section_id: optionalUuid,
  name: z.string().trim().min(2, "Enter the subject name"),
  code,
  subject_type: z.enum(["core", "elective", "vocational", "language", "co_curricular"]),
  is_active: z.preprocess(formBool, z.boolean()).default(true),
});

export const classSubjectSchema = z.object({
  class_id: z.string().uuid("Choose a class"),
  subject_id: z.string().uuid("Choose a subject"),
  teacher_user_id: optionalUuid,
  is_compulsory: z.preprocess(formBool, z.boolean()).default(true),
});
