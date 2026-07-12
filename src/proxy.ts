import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionToken } from "@/lib/auth/session";

const authRoutes = new Set(["/login", "/signup"]);
const publicRoutes = new Set(["/login", "/signup"]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  const session = token ? await readSession(token) : null;
  const isAuthenticated = session !== null;
  const isAuthRoute = authRoutes.has(pathname);
  const isPublicRoute = publicRoutes.has(pathname);

  if (!isAuthenticated && !isPublicRoute) {
    return redirectToLogin(request, token !== undefined);
  }

  if (isAuthenticated && isAuthRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

async function readSession(token: string) {
  try {
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

function redirectToLogin(request: NextRequest, clearCookie: boolean) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);

  const response = NextResponse.redirect(loginUrl);

  if (clearCookie) {
    response.cookies.delete(SESSION_COOKIE_NAME);
  }

  return response;
}

export const config = {
  matcher: ["/", "/login", "/signup"],
};
