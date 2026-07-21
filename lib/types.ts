export const roles = [
  "platform_super_admin",
  "school_owner",
  "principal",
  "head_teacher",
  "school_admin",
  "bursar",
  "exam_officer",
  "teacher",
  "class_teacher",
  "parent",
  "student",
  "librarian",
  "nurse",
  "storekeeper",
  "transport_officer",
  "hostel_officer",
  "club_coordinator",
  "sports_coordinator",
] as const;

export type Role = (typeof roles)[number];

export const planCodes = [
  "free",
  "basic",
  "premium_lite",
  "premium_standard",
  "premium_pro",
  "enterprise",
] as const;

export type PlanCode = (typeof planCodes)[number];
export type BillingCycle = "one_time" | "session" | "term";

export const featureFlagKeys = [
  "student_management", "staff_management", "parent_management", "attendance",
  "fees_manual", "receipt_generation", "result_management", "report_card_pdf",
  "parent_portal", "online_payments", "sms_alerts", "email_alerts",
  "whatsapp_alerts", "cbt", "payroll", "inventory", "library", "transport",
  "hostel", "clinic", "inter_house_sports", "clubs_and_societies",
  "extracurricular_activities", "events_calendar", "ai_report_comments",
  "multi_branch", "custom_branding", "data_export", "advanced_analytics",
] as const;

export type FeatureFlagKey = (typeof featureFlagKeys)[number];

export interface SubscriptionLimits {
  maxStudents: number | null;
  maxStaff: number | null;
  maxClasses: number | null;
  watermarkedReportCards: boolean;
}

export type SubjectType = "core" | "elective" | "vocational" | "language" | "co_curricular";
export type EmploymentStatus = "active" | "inactive" | "suspended" | "resigned" | "terminated";
export type StaffCategory = "academic" | "non_academic" | "management" | "support";
export type StudentStatus = "active" | "graduated" | "withdrawn" | "suspended" | "transferred";
export type EnrollmentStatus = "active" | "promoted" | "repeated" | "withdrawn" | "transferred" | "graduated";

export interface SchoolProfileSettings {
  id: string;
  school_id: string;
  display_name: string | null;
  motto: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  principal_name: string | null;
  head_teacher_name: string | null;
  report_card_signature_url: string | null;
  default_currency: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface SchoolSection {
  id: string;
  school_id: string;
  name: string;
  code: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SchoolClass {
  id: string;
  school_id: string;
  section_id: string | null;
  name: string;
  code: string;
  level_order: number;
  is_graduating_class: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClassArm {
  id: string;
  school_id: string;
  class_id: string;
  name: string;
  code: string;
  capacity: number | null;
  class_teacher_user_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: string;
  school_id: string;
  section_id: string | null;
  name: string;
  code: string;
  subject_type: SubjectType;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClassSubject {
  id: string;
  school_id: string;
  class_id: string;
  subject_id: string;
  teacher_user_id: string | null;
  is_compulsory: boolean;
  created_at: string;
  updated_at: string;
}

export interface StaffProfile {
  id: string;
  school_id: string;
  user_profile_id: string | null;
  staff_number: string;
  first_name: string;
  last_name: string;
  other_names: string | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  state_of_origin: string | null;
  date_of_birth: string | null;
  employment_date: string | null;
  employment_status: EmploymentStatus;
  staff_category: StaffCategory;
  job_title: string | null;
  department: string | null;
  qualification: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ParentGuardian {
  id: string;
  school_id: string;
  user_profile_id: string | null;
  first_name: string;
  last_name: string;
  other_names: string | null;
  relationship_label: string | null;
  phone: string;
  alternate_phone: string | null;
  email: string | null;
  occupation: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  is_primary_contact: boolean;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  school_id: string;
  admission_number: string;
  first_name: string;
  last_name: string;
  other_names: string | null;
  preferred_name: string | null;
  gender: string | null;
  date_of_birth: string | null;
  photo_url: string | null;
  blood_group: string | null;
  genotype: string | null;
  allergies: string | null;
  medical_notes: string | null;
  religion: string | null;
  nationality: string;
  state_of_origin: string | null;
  lga: string | null;
  home_address: string | null;
  previous_school: string | null;
  admission_date: string | null;
  student_status: StudentStatus;
  current_class_id: string | null;
  current_arm_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentGuardian {
  id: string;
  school_id: string;
  student_id: string;
  guardian_id: string;
  relationship_to_student: string;
  is_primary: boolean;
  can_pick_up: boolean;
  receives_sms: boolean;
  receives_email: boolean;
  created_at: string;
  updated_at: string;
}

export interface StudentEnrollment {
  id: string;
  school_id: string;
  student_id: string;
  academic_session_id: string;
  term_id: string | null;
  class_id: string;
  arm_id: string | null;
  enrollment_status: EnrollmentStatus;
  enrolled_at: string;
  created_at: string;
  updated_at: string;
}

export type FeeBillingFrequency = "termly" | "session" | "one_time" | "monthly" | "custom";
export type FeeAppliesTo = "all_students" | "section" | "class" | "arm" | "individual";
export type FeeAdjustmentType = "discount" | "scholarship" | "waiver" | "surcharge" | "sibling_discount" | "correction";
export type AdjustmentAmountType = "fixed" | "percentage";
export type FinanceApprovalStatus = "pending" | "approved" | "rejected" | "cancelled";
export type InvoiceStatus = "draft" | "issued" | "partially_paid" | "paid" | "overdue" | "cancelled" | "void";
export type PaymentMethod = "cash" | "bank_transfer" | "pos" | "cheque" | "mobile_money" | "online" | "other";
export type PaymentStatus = "pending" | "confirmed" | "rejected" | "reversed";
export type ReceiptStatus = "issued" | "void";
export type FinanceNoteType = "general" | "correction" | "follow_up" | "dispute" | "approval";

export interface FeeCategory {
  id: string;
  school_id: string;
  name: string;
  code: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface FeeItem {
  id: string;
  school_id: string;
  category_id: string | null;
  name: string;
  code: string;
  description: string | null;
  amount: number;
  billing_frequency: FeeBillingFrequency;
  applies_to: FeeAppliesTo;
  is_mandatory: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClassFeeStructure {
  id: string;
  school_id: string;
  academic_session_id: string;
  term_id: string | null;
  class_id: string;
  arm_id: string | null;
  fee_item_id: string;
  amount: number;
  is_required: boolean;
  created_at: string;
  updated_at: string;
}

export interface StudentFeeAdjustment {
  id: string;
  school_id: string;
  student_id: string;
  academic_session_id: string;
  term_id: string | null;
  adjustment_type: FeeAdjustmentType;
  title: string;
  description: string | null;
  amount: number;
  amount_type: AdjustmentAmountType;
  applies_to_fee_item_id: string | null;
  approved_by_user_profile_id: string | null;
  status: FinanceApprovalStatus;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  school_id: string;
  student_id: string;
  academic_session_id: string;
  term_id: string | null;
  invoice_number: string;
  title: string;
  subtotal_amount: number;
  discount_amount: number;
  adjustment_amount: number;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  status: InvoiceStatus;
  due_date: string | null;
  issued_at: string | null;
  notes: string | null;
  created_by_user_profile_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: string;
  school_id: string;
  invoice_id: string;
  fee_item_id: string | null;
  description: string;
  quantity: number;
  unit_amount: number;
  line_amount: number;
  is_adjustment: boolean;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  school_id: string;
  student_id: string;
  invoice_id: string | null;
  payment_reference: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  paid_at: string;
  received_by_user_profile_id: string | null;
  payer_name: string | null;
  payer_phone: string | null;
  bank_name: string | null;
  transaction_note: string | null;
  evidence_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentAllocation {
  id: string;
  school_id: string;
  payment_id: string;
  invoice_id: string;
  amount: number;
  created_at: string;
  updated_at: string;
}

export interface Receipt {
  id: string;
  school_id: string;
  payment_id: string;
  receipt_number: string;
  student_id: string;
  invoice_id: string | null;
  amount: number;
  issued_at: string;
  issued_by_user_profile_id: string | null;
  receipt_status: ReceiptStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinanceAuditNote {
  id: string;
  school_id: string;
  student_id: string | null;
  invoice_id: string | null;
  payment_id: string | null;
  note: string;
  note_type: FinanceNoteType;
  created_by_user_profile_id: string | null;
  created_at: string;
}

