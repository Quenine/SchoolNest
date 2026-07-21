import { z } from "zod";
import { formBool, optionalEmail, optionalPhone, optionalText, optionalUuid, phoneSchema } from "@/lib/validation/common";

export const guardianSchema = z.object({
  id: optionalUuid,
  user_profile_id: optionalUuid,
  first_name: z.string().trim().min(2, "First name is required"),
  last_name: z.string().trim().min(2, "Last name is required"),
  other_names: optionalText,
  relationship_label: optionalText,
  phone: phoneSchema,
  alternate_phone: optionalPhone,
  email: optionalEmail,
  occupation: optionalText,
  address: optionalText,
  city: optionalText,
  state: optionalText,
  is_primary_contact: z.preprocess(formBool, z.boolean()).default(false),
});

export const studentGuardianSchema = z.object({
  student_id: z.string().uuid("Choose a student"),
  guardian_id: z.string().uuid("Choose a guardian"),
  relationship_to_student: z.string().trim().min(2, "Enter the relationship"),
  is_primary: z.preprocess(formBool, z.boolean()).default(false),
  can_pick_up: z.preprocess(formBool, z.boolean()).default(false),
  receives_sms: z.preprocess(formBool, z.boolean()).default(true),
  receives_email: z.preprocess(formBool, z.boolean()).default(true),
});
