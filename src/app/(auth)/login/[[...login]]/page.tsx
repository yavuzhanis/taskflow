import Link from "next/link";
import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <div className="grid gap-3">
      <SignIn path="/login" routing="path" signUpUrl="/signup" fallbackRedirectUrl="/dashboard" />
      <Link href="/forgot-password" className="text-center text-sm font-medium text-primary hover:underline">Şifremi unuttum</Link>
    </div>
  );
}
