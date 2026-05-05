import { User, Session } from "@supabase/supabase-js";

const EMERGENCY_SECRET = import.meta.env.VITE_EMERGENCY_OTP_SECRET || "westmed-emergency-fallback-key";

export const generateDailyEmergencyCode = async (role: "admin" | "manager"): Promise<string> => {
  const date = new Date().toISOString().slice(0, 10);
  const input = `${EMERGENCY_SECRET}:${date}:${role}`;
  const encoded = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  const num = new DataView(hashBuffer).getUint32(0, false);
  return String(num % 1000000).padStart(6, "0");
};

// ── TEMP FALLBACK CODE ──
const TEMP_FALLBACK_OTP = "333892";

export const performEmergencySignIn = async (
  email: string,
  role: "admin" | "manager",
  otp: string,
): Promise<{
  error: any;
  mockUser?: User;
  mockSession?: Session;
  profile?: any;
}> => {
  try {
    const expectedCode = await generateDailyEmergencyCode(role);

    // Accept either the daily code OR the temp fallback OTP
    if (otp !== expectedCode && otp !== TEMP_FALLBACK_OTP) {
      return { error: { message: "Invalid emergency access code." } };
    }

    const mockId = `emergency_${role}_${Date.now()}`;
    const mockUser = {
      id: mockId,
      email: email,
      app_metadata: {},
      aud: "authenticated",
      created_at: new Date().toISOString(),
      user_metadata: {
        full_name: email.split("@")[0],
        role: role,
        user_type: "staff",
        emergency_session: true,
      },
    } as User;

    const expAt = Date.now() + 8 * 60 * 60 * 1000;
    const mockSession = {
      user: mockUser,
      access_token: `emergency_${crypto.randomUUID()}`,
      refresh_token: "",
      expires_in: Math.floor((expAt - Date.now()) / 1000),
      expires_at: Math.floor(expAt / 1000),
      token_type: "bearer",
    } as Session;

    window.localStorage.setItem("emergency_session", "true");

    return {
      error: null,
      mockUser,
      mockSession,
      profile: {
        role: role,
        full_name: email.split("@")[0],
        id: mockId,
        user_type: "staff",
        emergency_session: true,
      },
    };
  } catch (error: any) {
    return { error: { message: "Emergency login failed. Please try again." } };
  }
};
