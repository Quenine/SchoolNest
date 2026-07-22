import { z } from "zod";
import { optionalDate, optionalEmail, optionalPhone, optionalText, optionalUuid } from "@/lib/validation/common";
import { isFutureInSchoolTimezone } from "@/lib/dates";

export const staffProfileSchema = z.object({
  id: optionalUuid,
  user_profile_id: optionalUuid,
  staff_number: z.string().trim().min(1, "Staff number is required"),
  first_name: z.string().trim().min(2, "First name is required"),
  last_name: z.string().trim().min(2, "Last name is required"),
  other_names: optionalText,
  gender: optionalText,
  phone: optionalPhone,
  email: optionalEmail,
  address: optionalText,
  state_of_origin: optionalText,
  date_of_birth: optionalDate,
  employment_date: optionalDate,
  employment_status: z.enum(["active", "inactive", "suspended", "resigned", "terminated"]).default("active"),
  staff_category: z.enum(["academic", "non_academic", "management", "support"]).default("academic"),
  job_title: optionalText,
  department: optionalText,
  qualification: optionalText,
  emergency_contact_name: optionalText,
  emergency_contact_phone: optionalPhone,
  photo_url: optionalText,
}).refine((value) => !value.date_of_birth || !isFutureInSchoolTimezone(value.date_of_birth), { path: ["date_of_birth"], message: "Date of birth cannot be in the future" })
.refine((value) => !value.employment_date || !isFutureInSchoolTimezone(value.employment_date), { path: ["employment_date"], message: "Employment date cannot be in the future" });

