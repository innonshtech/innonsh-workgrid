// src/lib/auth-util.js
import { jwtVerify } from "jose";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET;
const secret = new TextEncoder().encode(JWT_SECRET);

/**
 * Verifies the JWT from cookies and returns the user payload.
 * Throws an error if unauthorized.
 */
export async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("authToken")?.value || cookieStore.get("employee_token")?.value;

  if (!token) {
    throw new Error("Unauthorized: No token provided");
  }

  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    throw new Error("Unauthorized: Invalid token");
  }
}

/**
 * Checks if the user has the required roles.
 */
export function authorize(user, allowedRoles = []) {
  if (allowedRoles.length === 0) return true;
  if (!allowedRoles.includes(user.role)) {
    throw new Error(`Forbidden: Role ${user.role} does not have access`);
  }
  return true;
}
