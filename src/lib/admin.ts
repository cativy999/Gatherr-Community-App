// Admin dashboard config.
// Only this email sees the Admin Dashboard entry on the Profile page.
export const ADMIN_EMAIL = "hsinpeiwang1001@gmail.com";

// Pei's own accounts (main + 2 testing Gmail logins). Used to separate
// "real outside users" from her own in-app testing activity in the
// admin stats. These are Supabase auth user_id UUIDs, not emails.
export const OWNER_USER_IDS = [
  "57ff4ff5-bbeb-40f4-a518-4688ba45552c", // hsinpeiwang1001@gmail.com (admin/main)
  "4359038f-435a-455e-b56a-c93d4c93fdc1", // ivoryivy333@gmail.com (testing)
  "701862f8-389b-4565-b412-ba1e6d42d4f9", // singwitivy@gmail.com (testing)
];

export const isOwnerUserId = (id: string | null | undefined): boolean =>
  !!id && OWNER_USER_IDS.includes(id);
