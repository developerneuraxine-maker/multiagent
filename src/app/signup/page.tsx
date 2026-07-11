"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });

      if (error) {
        const message =
          error.message.includes("Database error saving new user")
            ? "Signup failed: database not set up. Run supabase/migrations/003_fix_signup_trigger.sql in your Supabase SQL Editor, then try again."
            : error.message;
        toast.error(message);
        setLoading(false);
        return;
      }

      setConfirmed(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Signup failed");
      setLoading(false);
    }
  }

  if (confirmed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <MailCheck className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl">Check your inbox!</CardTitle>
            <CardDescription className="text-base">
              We&apos;ve sent a confirmation email to
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="rounded-lg bg-muted px-4 py-2 font-medium text-foreground">
              {email}
            </p>
            <div className="space-y-2 text-sm text-muted-foreground text-left">
              <p className="font-medium text-foreground">To activate your account:</p>
              <ol className="list-decimal list-inside space-y-1 leading-relaxed">
                <li>Open your Gmail (or email app)</li>
                <li>Look for an email from <strong>AI Business OS</strong></li>
                <li>Click the <strong>&quot;Confirm your email&quot;</strong> button inside that email</li>
                <li>Once confirmed, come back here and sign in</li>
              </ol>
            </div>
            <p className="text-xs text-muted-foreground">
              Can&apos;t find the email? Check your <strong>Spam</strong> or <strong>Promotions</strong> folder.
            </p>
            <Button asChild className="w-full">
              <Link href="/login">Go to Sign In</Link>
            </Button>
            <p className="text-xs text-muted-foreground">
              Wrong email?{" "}
              <button
                onClick={() => { setConfirmed(false); setLoading(false); setEmail(""); setPassword(""); }}
                className="text-primary hover:underline"
              >
                Sign up again
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
            <Sparkles className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Create your account</CardTitle>
          <CardDescription>Start building your AI-powered company</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                placeholder="Jane Smith"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Min. 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
