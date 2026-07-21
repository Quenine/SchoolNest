-- Run after database/schema.sql. Seeds are idempotent.

insert into public.roles (code, name, is_platform_role) values
  ('platform_super_admin', 'Platform Super Admin', true),
  ('school_owner', 'School Owner', false),
  ('principal', 'Principal', false),
  ('head_teacher', 'Head Teacher', false),
  ('school_admin', 'School Admin', false),
  ('bursar', 'Bursar', false),
  ('exam_officer', 'Exam Officer', false),
  ('teacher', 'Teacher', false),
  ('class_teacher', 'Class Teacher', false),
  ('parent', 'Parent', false),
  ('student', 'Student', false),
  ('librarian', 'Librarian', false),
  ('nurse', 'Nurse', false),
  ('storekeeper', 'Storekeeper', false),
  ('transport_officer', 'Transport Officer', false),
  ('hostel_officer', 'Hostel Officer', false),
  ('club_coordinator', 'Club Coordinator', false),
  ('sports_coordinator', 'Sports Coordinator', false)
on conflict (code) do update set
  name = excluded.name,
  is_platform_role = excluded.is_platform_role;

insert into public.feature_flags (key, name) values
  ('student_management', 'Student management'),
  ('staff_management', 'Staff management'),
  ('parent_management', 'Parent management'),
  ('attendance', 'Attendance'),
  ('fees_manual', 'Manual fees'),
  ('receipt_generation', 'Receipt generation'),
  ('result_management', 'Result management'),
  ('report_card_pdf', 'Report card PDF'),
  ('parent_portal', 'Parent portal'),
  ('online_payments', 'Online payments'),
  ('sms_alerts', 'SMS alerts'),
  ('email_alerts', 'Email alerts'),
  ('whatsapp_alerts', 'WhatsApp alerts'),
  ('cbt', 'Computer-based testing'),
  ('payroll', 'Payroll'),
  ('inventory', 'Inventory'),
  ('library', 'Library'),
  ('transport', 'Transport'),
  ('hostel', 'Hostel'),
  ('clinic', 'Clinic'),
  ('inter_house_sports', 'Inter-house sports'),
  ('clubs_and_societies', 'Clubs and societies'),
  ('extracurricular_activities', 'Extracurricular activities'),
  ('events_calendar', 'Events calendar'),
  ('ai_report_comments', 'AI report comments'),
  ('multi_branch', 'Multi-branch'),
  ('custom_branding', 'Custom branding'),
  ('data_export', 'Data export'),
  ('advanced_analytics', 'Advanced analytics')
on conflict (key) do update set name = excluded.name;

insert into public.subscription_plans (
  code, name, description, billing_type, allowed_billing_cycles,
  max_students, max_staff, max_classes, watermarked_report_cards,
  enabled_feature_keys, metadata, sort_order
) values
  (
    'free', 'Free', 'A practical start for small schools.', 'free', '{}',
    50, 5, 3, true,
    array['student_management','staff_management','parent_management','attendance','fees_manual','receipt_generation','result_management','report_card_pdf','parent_portal'],
    '{"custom_branding":false,"online_payments":false,"sms_alerts":false,"whatsapp_alerts":false,"parent_portal_access":"limited"}',
    10
  ),
  (
    'basic', 'Basic', 'Core school administration with a one-time setup or licence.', 'one_time', '{}',
    null, null, null, false,
    array['student_management','staff_management','parent_management','attendance','fees_manual','receipt_generation','result_management','report_card_pdf'],
    '{"includes":["class_setup","basic_announcements"]}',
    20
  ),
  (
    'premium_lite', 'Premium Lite', 'Parent communication, payments, and school branding.', 'recurring', array['session','term']::public.subscription_billing_cycle[],
    null, null, null, false,
    array['student_management','staff_management','parent_management','attendance','fees_manual','receipt_generation','result_management','report_card_pdf','parent_portal','email_alerts','online_payments','custom_branding'],
    '{}', 30
  ),
  (
    'premium_standard', 'Premium Standard', 'Operational tools for established schools.', 'recurring', array['session','term']::public.subscription_billing_cycle[],
    null, null, null, false,
    array['student_management','staff_management','parent_management','attendance','fees_manual','receipt_generation','result_management','report_card_pdf','parent_portal','email_alerts','online_payments','custom_branding','sms_alerts','cbt','payroll','inventory','events_calendar'],
    '{"payment_provider":"paystack"}', 40
  ),
  (
    'premium_pro', 'Premium Pro', 'A complete operating system for complex schools.', 'recurring', array['session','term']::public.subscription_billing_cycle[],
    null, null, null, false,
    array['student_management','staff_management','parent_management','attendance','fees_manual','receipt_generation','result_management','report_card_pdf','parent_portal','email_alerts','online_payments','custom_branding','sms_alerts','cbt','payroll','inventory','events_calendar','library','transport','hostel','clinic','inter_house_sports','clubs_and_societies','extracurricular_activities','advanced_analytics'],
    '{"payment_provider":"paystack"}', 50
  ),
  (
    'enterprise', 'Enterprise', 'Multi-branch support and tailored service.', 'recurring', array['session','term']::public.subscription_billing_cycle[],
    null, null, null, false,
    array['student_management','staff_management','parent_management','attendance','fees_manual','receipt_generation','result_management','report_card_pdf','parent_portal','email_alerts','online_payments','custom_branding','sms_alerts','whatsapp_alerts','cbt','payroll','inventory','events_calendar','library','transport','hostel','clinic','inter_house_sports','clubs_and_societies','extracurricular_activities','advanced_analytics','multi_branch','data_export','ai_report_comments'],
    '{"custom_support":true,"custom_feature_overrides":true}', 60
  )
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  billing_type = excluded.billing_type,
  allowed_billing_cycles = excluded.allowed_billing_cycles,
  max_students = excluded.max_students,
  max_staff = excluded.max_staff,
  max_classes = excluded.max_classes,
  watermarked_report_cards = excluded.watermarked_report_cards,
  enabled_feature_keys = excluded.enabled_feature_keys,
  metadata = excluded.metadata,
  sort_order = excluded.sort_order;

-- Step 3 school setup note:
-- Do not create school-specific setup records globally. During school setup, schools
-- may create these Nigerian defaults through the dashboard:
-- Sections: Nursery, Primary, Junior Secondary, Senior Secondary.
-- Classes: Creche, Playgroup, Nursery 1, Nursery 2, Nursery 3,
-- Primary 1 to Primary 6, JSS 1 to JSS 3, SS 1 to SS 3.

-- Step 4 finance note:
-- Do not create school-specific fee categories globally. Schools can create
-- default categories from the finance dashboard: Tuition, Development Levy,
-- Books, Uniform, Transport, Feeding, Boarding, PTA, Examination, and Other.

