import { compare, hash } from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getRequiredEnv, isSupabaseConfigured } from "@/lib/env";
import { getServiceSupabase } from "@/lib/supabase";
import type { SessionUser, UserRole } from "@/lib/types";

const SESSION_COOKIE = "frikfrak_session";

function getJwtSecret() {
  return new TextEncoder().encode(getRequiredEnv("AUTH_SECRET"));
}

interface SessionPayload {
  sub: string;
  username: string;
  role: UserRole;
}

export async function hashPassword(password: string) {
  return hash(password, 10);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return compare(password, passwordHash);
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({
    username: user.username,
    role: user.role,
  } satisfies Omit<SessionPayload, "sub">)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getJwtSecret());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  if (!isSupabaseConfigured()) return null;

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const verified = await jwtVerify(token, getJwtSecret());
    const payload = verified.payload as Partial<SessionPayload>;

    if (
      typeof payload.sub !== "string" ||
      typeof payload.username !== "string" ||
      (payload.role !== "user" && payload.role !== "admin")
    ) {
      return null;
    }

    return {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/feed");
  return user;
}

export async function authenticateWithUsername(username: string, password: string) {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("users")
    .select("id, username, role, password_hash")
    .eq("username_lower", username.toLowerCase())
    .maybeSingle();

  if (error || !data) return null;
  const valid = await verifyPassword(password, data.password_hash);
  if (!valid) return null;

  return {
    id: data.id,
    username: data.username,
    role: data.role as UserRole,
  } satisfies SessionUser;
}

export async function shouldUserBeAdmin(username: string) {
  const supabase = getServiceSupabase();
  const firstAdmin = process.env.FIRST_ADMIN_USERNAME?.toLowerCase().trim();

  if (firstAdmin) {
    return firstAdmin === username.toLowerCase();
  }

  const { count } = await supabase
    .from("users")
    .select("id", { count: "exact", head: true });

  return (count ?? 0) === 0;
}
