import type { Role } from "@/lib/types";

export const roleRedirects: Partial<Record<Role, string>> = {
  platform_super_admin: "/dashboard/super-admin",
  school_owner: "/dashboard/school-admin",
  principal: "/dashboard/school-admin",
  head_teacher: "/dashboard/school-admin",
  school_admin: "/dashboard/school-admin",
  teacher: "/dashboard/teacher",
  class_teacher: "/dashboard/teacher",
  parent: "/dashboard/parent",
  bursar: "/dashboard/bursar",
  exam_officer: "/dashboard/exam-officer",
};

const priority: Role[] = [
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
];

export function getRoleRedirect(roles: string[]) {
  const role = priority.find((item) => roles.includes(item));
  return role ? roleRedirects[role] ?? "/dashboard" : "/dashboard";
}
