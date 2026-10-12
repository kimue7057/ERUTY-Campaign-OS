import { LoginForm } from "@/components/login-form";

export const dynamic = "force-dynamic";
export default function LoginPage() {
  return <LoginForm enabled={process.env.AUTH_MODE === "supabase" && !!process.env.SUPABASE_URL && !!process.env.SUPABASE_PUBLISHABLE_KEY} />;
}
