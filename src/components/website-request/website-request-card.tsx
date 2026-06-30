"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Globe, Upload, X, CheckCircle } from "lucide-react";
import type { Business } from "@/types/database";

interface Props {
  business: Business;
  userEmail: string;
}

type Stage = "card" | "form" | "success";

export function WebsiteRequestCard({ business, userEmail }: Props) {
  const [stage, setStage] = useState<Stage>("card");
  const [dismissed, setDismissed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    description: "",
    products: "",
    services: "",
    colors: "",
    style: "",
  });

  if (dismissed) return null;

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const remaining = 3 - images.length;
    setImages((prev) => [...prev, ...files.slice(0, remaining)]);
    // Reset the input so the same file can be re-selected after removal
    e.target.value = "";
  }

  function removeImage(i: number) {
    setImages((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.description.trim()) return;
    setSubmitting(true);

    try {
      const supabase = createClient();
      const imageUrls: string[] = [];

      for (const file of images) {
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${business.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("website-request-images")
          .upload(path, file, { upsert: false });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("website-request-images")
          .getPublicUrl(path);
        imageUrls.push(urlData.publicUrl);
      }

      const res = await fetch("/api/website-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_email: userEmail,
          company_name: business.name,
          description: form.description,
          products: form.products || null,
          services: form.services || null,
          colors: form.colors || null,
          style: form.style || null,
          image_urls: imageUrls,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit");
      }

      setStage("success");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  }

  if (stage === "success") {
    return (
      <Card className="mb-6 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
        <CardContent className="flex items-start gap-4 pt-6">
          <CheckCircle className="mt-0.5 h-6 w-6 shrink-0 text-green-600" />
          <div>
            <p className="font-semibold text-green-800 dark:text-green-300">Request submitted!</p>
            <p className="mt-1 text-sm text-green-700 dark:text-green-400">
              Your complete website code will be sent to the Gmail you logged in with. We&apos;ll
              get started shortly.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (stage === "card") {
    return (
      <Card className="mb-6 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900">
              <Globe className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-base text-amber-900 dark:text-amber-100">
                You don&apos;t have a website yet
              </CardTitle>
              <CardDescription className="mt-1 text-amber-700 dark:text-amber-300">
                Want us to build a professional one for your company?
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button size="sm" onClick={() => setStage("form")}>
            Accept
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDismissed(true)}>
            Decline
          </Button>
        </CardContent>
      </Card>
    );
  }

  // stage === "form"
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Describe your company in detail</CardTitle>
        <CardDescription>
          Fill in the details below so we can build the perfect website for {business.name}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="wr-description">Describe your company in detail *</Label>
            <Textarea
              id="wr-description"
              rows={5}
              required
              placeholder="Tell us about your company, what you do, your mission, who you serve..."
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wr-products">Products (optional)</Label>
            <Input
              id="wr-products"
              placeholder="e.g. SaaS platform, mobile app..."
              value={form.products}
              onChange={(e) => update("products", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wr-services">Services (optional)</Label>
            <Input
              id="wr-services"
              placeholder="e.g. consulting, design, development..."
              value={form.services}
              onChange={(e) => update("services", e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="wr-colors">Preferred Colors (optional)</Label>
              <Input
                id="wr-colors"
                placeholder="e.g. blue and white, dark green..."
                value={form.colors}
                onChange={(e) => update("colors", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wr-style">Style / Vibe (optional)</Label>
              <Input
                id="wr-style"
                placeholder="e.g. modern, minimal, corporate..."
                value={form.style}
                onChange={(e) => update("style", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Logo &amp; Reference Images (up to 3, optional)</Label>
            <div
              role="button"
              tabIndex={0}
              className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 transition-colors hover:border-muted-foreground/50"
              onClick={() => images.length < 3 && fileInputRef.current?.click()}
              onKeyDown={(e) => e.key === "Enter" && images.length < 3 && fileInputRef.current?.click()}
            >
              <div className="text-center">
                <Upload className="mx-auto h-6 w-6 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  {images.length >= 3
                    ? "Maximum 3 images reached"
                    : "Click to upload your logo or reference images"}
                </p>
                <p className="text-xs text-muted-foreground">{images.length}/3 uploaded</p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
              disabled={images.length >= 3}
            />
            {images.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {images.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1 rounded-md border bg-muted px-2 py-1 text-xs"
                  >
                    <span className="max-w-[120px] truncate">{file.name}</span>
                    <button type="button" onClick={() => removeImage(i)} aria-label="Remove image">
                      <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Sending..." : "Send"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setStage("card")}>
              Back
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
