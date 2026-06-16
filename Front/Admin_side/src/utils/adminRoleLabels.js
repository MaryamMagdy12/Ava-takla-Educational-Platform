export const ADMIN_ROLE_LABELS = {
  super: "مشرف عام (كل الواجهات)",
  student: " مدرسة الشمامسة ",
  general_assembly: " الاجتماع العام ",
  special: " الدورات المتخصصة",
};

export const ADMIN_INTERFACE_LABELS = {
  student: "واجهة مدرسة الشمامسة",
  general_assembly: "واجهة الاجتماع العام",
  special: "واجهة الدورات المتخصصة",
};

export function adminRoleLabel(role, { isSystem = false } = {}) {
  if (isSystem) return "المشرف الرئيسي";
  return ADMIN_ROLE_LABELS[role] ?? "مشرف";
}

export function adminInterfaceRoleTitle(interfaceKey) {
  if (interfaceKey === "student") return ADMIN_ROLE_LABELS.student;
  if (interfaceKey === "general_assembly") return ADMIN_ROLE_LABELS.general_assembly;
  if (interfaceKey === "special") return ADMIN_ROLE_LABELS.special;
  return ADMIN_ROLE_LABELS.student;
}
