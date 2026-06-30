"use client";

import { useState, useRef, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/hooks/use-business";
import { toast } from "sonner";
import { Upload, Palette, Clock, User, Building2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const THEMES = [
  { id: "default", label: "Default", color: "bg-slate-800" },
  { id: "blue", label: "Ocean Blue", color: "bg-blue-600" },
  { id: "purple", label: "Royal Purple", color: "bg-purple-600" },
  { id: "green", label: "Forest Green", color: "bg-emerald-600" },
  { id: "orange", label: "Sunset Orange", color: "bg-orange-500" },
];

export default function SettingsPage() {
  const { business, refetch } = useBusiness();
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState("default");
  const [savingTheme, setSavingTheme] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (business) {
      const b = business as unknown as Record<string, unknown>;
      setSelectedTheme((b.theme as string) || "default");
      setLogoUrl((b.logo_url as string) || null);
    }
  }, [business]);

  async function updateProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Profile updated");
  }

  async function saveTheme(themeId: string) {
    if (!business?.id) return;
    setSelectedTheme(themeId);
    setSavingTheme(true);
    const res = await fetch("/api/business", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: business.id, theme: themeId }),
    });
    setSavingTheme(false);
    if (res.ok) { toast.success("Theme saved!"); refetch(); }
    else toast.error("Failed to save theme");
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !business?.id) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Logo must be under 2 MB"); return; }

    setUploadingLogo(true);
    try {
      const supabase = createClient();
      const path = `${business.id}/logo.${file.name.split(".").pop()}`;
      const { error: uploadErr } = await supabase.storage
        .from("business-logos")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("business-logos").getPublicUrl(path);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const res = await fetch("/api/business", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: business.id, logo_url: publicUrl }),
      });
      if (!res.ok) throw new Error("Failed to save logo URL");
      setLogoUrl(publicUrl);
      toast.success("Logo uploaded!");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }

  async function removeLogo() {
    if (!business?.id) return;
    const res = await fetch("/api/business", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: business.id, logo_url: null }),
    });
    if (res.ok) { setLogoUrl(null); toast.success("Logo removed"); refetch(); }
  }

  return (
    <>
      <PageHeader title="Settings" description="Manage your account and preferences" />

      <div className="max-w-2xl space-y-6">
        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User className="h-4 w-4" />Profile</CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={updateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
              </div>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Profile"}</Button>
            </form>
          </CardContent>
        </Card>

        {/* Logo Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building2 className="h-4 w-4" />Company Logo</CardTitle>
            <CardDescription>Your logo appears in the sidebar. PNG, JPG, SVG — max 2 MB</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {logoUrl && (
              <div className="flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoUrl} alt="Logo" className="h-16 w-16 rounded-xl object-cover border" />
                <Button variant="outline" size="sm" onClick={removeLogo} className="text-destructive border-destructive">
                  Remove Logo
                </Button>
              </div>
            )}
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            <Button
              variant="outline"
              onClick={() => logoInputRef.current?.click()}
              disabled={uploadingLogo || !business}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {uploadingLogo ? "Uploading..." : logoUrl ? "Change Logo" : "Upload Logo"}
            </Button>
          </CardContent>
        </Card>

        {/* Theme Picker */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Palette className="h-4 w-4" />Dashboard Theme</CardTitle>
            <CardDescription>Choose a color theme for your dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {THEMES.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => saveTheme(theme.id)}
                  disabled={savingTheme}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all hover:border-primary",
                    selectedTheme === theme.id ? "border-primary ring-2 ring-primary/30" : "border-border"
                  )}
                >
                  <div className={`h-8 w-8 rounded-full ${theme.color}`} />
                  <span className="text-xs font-medium">{theme.label}</span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {savingTheme ? "Saving theme..." : `Current: ${THEMES.find((t) => t.id === selectedTheme)?.label || "Default"}`}
            </p>
          </CardContent>
        </Card>

        {/* Daily Auto-Run */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Clock className="h-4 w-4" />Daily Auto-Run</CardTitle>
            <CardDescription>
              The CEO Agent automatically analyzes every business once a day.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 rounded-lg border p-3 text-sm">
              <Check className="h-4 w-4 text-green-600" />
              <span>Runs daily at <strong>9:00 AM IST</strong> for all businesses</span>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Need an analysis right now instead of waiting? Use &quot;Run Now&quot; on the CEO Agent page.
            </p>
          </CardContent>
        </Card>

        {/* Connected Services */}
        <Card>
          <CardHeader>
            <CardTitle>Connected Services</CardTitle>
            <CardDescription>Core platform integrations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div><p className="font-medium">OpenAI / Gemini</p><p className="text-muted-foreground text-xs">AI agent engine</p></div>
              <span className="text-green-600 text-xs font-medium">Configured</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div><p className="font-medium">n8n Workflows</p><p className="text-muted-foreground text-xs">Automation engine</p></div>
              <span className="text-green-600 text-xs font-medium">Active</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div><p className="font-medium">Supabase</p><p className="text-muted-foreground text-xs">Database & Auth & Storage</p></div>
              <span className="text-green-600 text-xs font-medium">Active</span>
            </div>
            <Separator className="my-2" />
            <Button variant="outline" asChild size="sm">
              <a href="/integrations">Manage All Integrations →</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
