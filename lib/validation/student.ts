import { z } from "zod";
import { optionalDate, optionalText, optionalUuid } from "@/lib/validation/common";
import { isFutureInSchoolTimezone } from "@/lib/dates";

export const studentSchema = z.object({
  id: optionalUuid,
  admission_number: z.string().trim().min(1, "Admission number is required"),
  first_name: z.string().trim().min(2, "First name is required"),
  last_name: z.string().trim().min(2, "Last name is required"),
  other_names: optionalText,
  preferred_name: optionalText,
  gender: optionalText,
  date_of_birth: optionalDate,
  photo_url: optionalText,
  blood_group: optionalText,
  genotype: optionalText,
  allergies: optionalText,
  medical_notes: optionalText,
  religion: optionalText,
  nationality: z.string().trim().min(2).default("Nigerian"),
  state_of_origin: optionalText,
  lga: optionalText,
  home_address: optionalText,
  previous_school: optionalText,
  admission_date: optionalDate,
  student_status: z.enum(["active", "graduated", "withdrawn", "suspended", "transferred"]).default("active"),
  current_class_id: optionalUuid,
  current_arm_id: optionalUuid,
}).refine((value) => !value.date_of_birth || !isFutureInSchoolTimezone(value.date_of_birth), { path: ["date_of_birth"], message: "Date of birth cannot be in the future" })
.refine((value) => !value.admission_date || !isFutureInSchoolTimezone(value.admission_date), { path: ["admission_date"], message: "Admission date cannot be in the future" })
.refine((value) => value.student_status !== "active" || Boolean(value.current_class_id), {
  path: ["current_class_id"],
  message: "Choose a class for an active student",
});

export const changeStudentClassArmSchema = z.object({
  student_id: z.string().uuid("Choose a student"),
  current_class_id: z.string().uuid("Choose a class"),
  current_arm_id: optionalUuid,
});

