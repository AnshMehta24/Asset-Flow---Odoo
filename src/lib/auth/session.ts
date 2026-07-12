import { SignJWT, jwtVerify } from "jose";
import type { JWTPayload } from "jose";
import {
  SESSION_AUDIENCE,
  SESSION_DURATION_SECONDS,
  SESSION_ISSUER,
} from "@/lib/auth/constants";
import type { SessionPayload } from "@/lib/auth/types";

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    throw new Error("SESSION_SECRET is not configured.");
  }

  return new TextEncoder().encode(secret);
}

export async function createSessionToken(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setIssuer(SESSION_ISSUER)
    .setAudience(SESSION_AUDIENCE)
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSessionSecret());
}

export async function verifySessionToken(token: string) {
  const { payload } = await jwtVerify(token, getSessionSecret(), {
    algorithms: ["HS256"],
    issuer: SESSION_ISSUER,
    audience: SESSION_AUDIENCE,
  });

  return mapSessionPayload(payload);
}

function mapSessionPayload(payload: JWTPayload): SessionPayload {
  const subject = payload.sub;
  const role = payload.role;
  const status = payload.status;
  const departmentId =
    typeof payload.departmentId === "string" ? payload.departmentId : null;

  if (
    typeof subject !== "string" ||
    typeof role !== "string" ||
    typeof status !== "string"
  ) {
    throw new Error("Invalid session payload.");
  }

  return {
    sub: subject,
    role: role as SessionPayload["role"],
    status: status as SessionPayload["status"],
    departmentId,
  };
}
