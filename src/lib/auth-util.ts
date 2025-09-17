export function isAdminGroup(groups?: string[]) {
  const admin = (process.env.ADMIN_GROUP || process.env.NEXT_PUBLIC_ADMIN_GROUP || "devops").toLowerCase();
  return !!groups?.some(g => {
    const s = String(g).toLowerCase();
    if (s === admin) return true;
    if (s.startsWith("/")) {
      const parts = s.split("/").filter(Boolean);
      return parts.includes(admin);
    }
    return false;
  });
}

