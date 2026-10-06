import { auth, currentUser } from "@clerk/nextjs/server";
import { getPrisma } from "@/lib/db/prisma";

export async function requireUserId() {
  const { userId } = await auth();
  if (!userId) throw new Error("UNAUTHORIZED");
  return userId;
}

export async function ensureCurrentUser() {
  const userId = await requireUserId();
  const clerkUser = await currentUser();
  if (!clerkUser) throw new Error("UNAUTHORIZED");

  const email = clerkUser.primaryEmailAddress?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) throw new Error("AUTH_EMAIL_MISSING");

  const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || clerkUser.username || null;
  const prisma = getPrisma();

  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const existing = await prisma.user.findUnique({ where: { id: userId } });

  let shouldBeAdmin = false;
  if (adminEmails.includes(email.toLowerCase())) {
    shouldBeAdmin = true;
  } else if (existing?.role === "ADMIN") {
    shouldBeAdmin = true;
  } else {
    // Sistemde henüz hiç admin yoksa (0 admin), aktif kullanıcıyı otomatik admin yap
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount === 0) {
      shouldBeAdmin = true;
    }
  }

  const role = shouldBeAdmin ? "ADMIN" : existing?.role ?? "USER";

  return prisma.user.upsert({
    where: { id: userId },
    create: { id: userId, email, name, avatarUrl: clerkUser.imageUrl, role },
    update: {
      email,
      name,
      avatarUrl: clerkUser.imageUrl,
      ...(shouldBeAdmin ? { role: "ADMIN" } : {}),
    },
  });
}

export async function ensureAdminUser() {
  const user = await ensureCurrentUser();
  if (user.role !== "ADMIN") {
    throw new Error("FORBIDDEN");
  }
  return user;
}

