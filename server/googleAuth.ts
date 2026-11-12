import { randomUUID } from "crypto";
import { parse as parseCookie } from "cookie";
import type { Express, Request } from "express";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { getOnboardingProfile, upsertGoogleAdmin } from "./db";
import { COOKIE_NAME, ONE_YEAR_MS } from "../shared/const";
import { getPostOnboardingPath } from "./onboardingProfile";

const GOOGLE_STATE_COOKIE = "jajananku_google_state";
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
const PRODUCTION_GOOGLE_CALLBACK = "https://jajananku.lol/api/auth/google/callback";

export function getGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

export function getGoogleRedirectUri(req: Request) {
  const protocol = req.get("x-forwarded-proto")?.split(",")[0]?.trim() || req.protocol;
  const forwardedHost = req.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = (forwardedHost || req.get("host"))?.toLowerCase();
  if (process.env.NODE_ENV === "production" || host === "jajananku.lol" || host === "www.jajananku.lol" || host?.endsWith(".a.run.app")) return PRODUCTION_GOOGLE_CALLBACK;
  return `${protocol}://${host}/api/auth/google/callback`;
}

export function registerGoogleAuthRoutes(app: Express) {
  app.get("/api/auth/google/start", (req, res) => {
    const config = getGoogleOAuthConfig();
    if (!config) return res.redirect("/login?google=setup");
    const state = randomUUID();
    res.cookie(GOOGLE_STATE_COOKIE, state, { ...getSessionCookieOptions(req), maxAge: 10 * 60 * 1000 });
    const search = new URLSearchParams({ client_id: config.clientId, redirect_uri: getGoogleRedirectUri(req), response_type: "code", scope: "openid email profile", state, prompt: "select_account" });
    return res.redirect(`${GOOGLE_AUTH_URL}?${search}`);
  });

  app.get("/api/auth/google/callback", async (req, res) => {
    const config = getGoogleOAuthConfig();
    const cookies = parseCookie(req.headers.cookie || "");
    if (!config || req.query.state !== cookies[GOOGLE_STATE_COOKIE] || typeof req.query.code !== "string") return res.redirect("/login?google=failed");
    try {
      const tokenResponse = await fetch(GOOGLE_TOKEN_URL, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code: req.query.code, client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: getGoogleRedirectUri(req), grant_type: "authorization_code" }) });
      const token = await tokenResponse.json() as { access_token?: string; error?: string; error_description?: string };
      if (!tokenResponse.ok || !token.access_token) {
        const reason = token.error ? `${token.error}${token.error_description ? `: ${token.error_description}` : ""}` : `HTTP ${tokenResponse.status}`;
        throw new Error(`Token Google tidak tersedia (${reason}).`);
      }
      const profileResponse = await fetch(GOOGLE_USERINFO_URL, { headers: { Authorization: `Bearer ${token.access_token}` } });
      const profile = await profileResponse.json() as { sub?: string; email?: string; name?: string };
      if (!profileResponse.ok || !profile.sub || !profile.email) throw new Error("Profil Google tidak lengkap.");
      const user = await upsertGoogleAdmin({ subject: profile.sub, email: profile.email, name: profile.name || profile.email.split("@")[0] });
      const session = await sdk.createSessionToken(user.openId, { name: user.name || profile.email, expiresInMs: ONE_YEAR_MS });
      res.cookie(COOKIE_NAME, session, { ...getSessionCookieOptions(req), maxAge: ONE_YEAR_MS });
      res.clearCookie(GOOGLE_STATE_COOKIE, { ...getSessionCookieOptions(req), maxAge: -1 });
      const onboarding = await getOnboardingProfile(user.id);
      return res.redirect(getPostOnboardingPath(onboarding.completed));
    } catch (error) {
      console.error("[Google OAuth]", error);
      return res.redirect("/login?google=failed");
    }
  });
}
