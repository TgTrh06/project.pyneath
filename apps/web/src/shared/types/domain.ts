export type View = "landing" | "login" | "register" | "return" | "dashboard" | "camps" | "camp" | "pact" | "pacts" | "session" | "memory" | "settings" | "invite";
export type AppRoute = { view: View; id?: string };
