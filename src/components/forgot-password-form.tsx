"use client";
import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordForm() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const router = useRouter();
  const [emailAddress, setEmailAddress] = React.useState("");
  const [code, setCode] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [codeSent, setCodeSent] = React.useState(false);
  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    const a = await signIn.create({ identifier: emailAddress });
    if (a.error) return;
    const b = await signIn.resetPasswordEmailCode.sendCode();
    if (!b.error) setCodeSent(true);
  }
  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    await signIn.resetPasswordEmailCode.verifyCode({ code });
  }
  async function submitNewPassword(e: React.FormEvent) {
    e.preventDefault();
    const r = await signIn.resetPasswordEmailCode.submitPassword({
      password,
      signOutOfOtherSessions: true,
    });
    if (r.error) return;
    if (signIn.status === "complete")
      await signIn.finalize({
        navigate: async ({ session, decorateUrl }) => {
          if (session?.currentTask) return;
          const url = decorateUrl("/dashboard");
          if (url.startsWith("http")) window.location.href = url;
          else router.push(url);
        },
      });
  }
  const field = (
    errors as unknown as {
      fields?: Record<string, { message?: string }>;
    }
  )?.fields;
  return (
    <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm">
      <h1 className="text-2xl font-semibold">Şifreni sıfırla</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        E-posta adresine gönderilen kodla yeni şifre oluştur.
      </p>
      {!codeSent && (
        <form onSubmit={sendCode} className="mt-6 space-y-4">
          <label className="block text-sm font-medium">
            E-posta
            <input
              type="email"
              required
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
              className="mt-2 h-11 w-full rounded-xl border bg-background px-3 outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          {field?.identifier?.message && (
            <p className="text-sm text-destructive">
              {field.identifier.message}
            </p>
          )}
          <Button className="w-full" disabled={fetchStatus === "fetching"}>
            Sıfırlama kodu gönder
          </Button>
        </form>
      )}
      {codeSent && signIn.status !== "needs_new_password" && (
        <form onSubmit={verifyCode} className="mt-6 space-y-4">
          <label className="block text-sm font-medium">
            Doğrulama kodu
            <input
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="mt-2 h-11 w-full rounded-xl border bg-background px-3 outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          {field?.code?.message && (
            <p className="text-sm text-destructive">{field.code.message}</p>
          )}
          <Button className="w-full" disabled={fetchStatus === "fetching"}>
            Kodu doğrula
          </Button>
        </form>
      )}
      {signIn.status === "needs_new_password" && (
        <form onSubmit={submitNewPassword} className="mt-6 space-y-4">
          <label className="block text-sm font-medium">
            Yeni şifre
            <input
              type="password"
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 h-11 w-full rounded-xl border bg-background px-3 outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          {field?.password?.message && (
            <p className="text-sm text-destructive">{field.password.message}</p>
          )}
          <Button className="w-full" disabled={fetchStatus === "fetching"}>
            Yeni şifreyi kaydet
          </Button>
        </form>
      )}
      <p className="mt-5 text-center text-sm text-muted-foreground">
        <Link
          href="/login"
          className="font-medium text-primary hover:underline"
        >
          Giriş ekranına dön
        </Link>
      </p>
    </div>
  );
}
