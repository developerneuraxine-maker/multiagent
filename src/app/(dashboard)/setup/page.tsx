"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { parseListInput } from "@/lib/utils";
import { toast } from "sonner";
import { useBusiness } from "@/hooks/use-business";
import { createClient } from "@/lib/supabase/client";
import { WebsiteRequestCard } from "@/components/website-request/website-request-card";

export default function BusinessSetupPage() {
  const router = useRouter();
  const { business } = useBusiness();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setUserEmail(data.user?.email ?? null));
  }, []);

  const [form, setForm] = useState({
    name: "",
    industry: "",
    website: "",
    instagram: "",
    facebook: "",
    linkedin: "",
    products: "",
    services: "",
    problems: "",
    goals: "",
  });

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/business", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        industry: form.industry,
        website: form.website || undefined,
        instagram: form.instagram || undefined,
        facebook: form.facebook || undefined,
        linkedin: form.linkedin || undefined,
        products: parseListInput(form.products),
        services: parseListInput(form.services),
        problems: form.problems,
        goals: form.goals,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error || "Setup failed");
      return;
    }

    toast.success("Business onboarded! Add your documents to the Knowledge Base.");
    router.push("/knowledge-base");
  }

  return (
    <>
      <PageHeader
        title="Business Setup"
        description="Tell us about your business so your AI agents can get to work"
      />

      {business && !business.website && userEmail && (
        <WebsiteRequestCard business={business} userEmail={userEmail} />
      )}

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
          <CardDescription>
            This information powers your CEO Agent and all department agents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Business Name *</Label>
                <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industry *</Label>
                <Input id="industry" value={form.industry} onChange={(e) => update("industry", e.target.value)} required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input id="website" type="url" placeholder="https://" value={form.website} onChange={(e) => update("website", e.target.value)} />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram</Label>
                <Input id="instagram" placeholder="@handle" value={form.instagram} onChange={(e) => update("instagram", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="facebook">Facebook</Label>
                <Input id="facebook" value={form.facebook} onChange={(e) => update("facebook", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn</Label>
                <Input id="linkedin" value={form.linkedin} onChange={(e) => update("linkedin", e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="products">Products (comma-separated)</Label>
              <Input id="products" placeholder="Product A, Product B" value={form.products} onChange={(e) => update("products", e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="services">Services (comma-separated)</Label>
              <Input id="services" placeholder="Consulting, Support" value={form.services} onChange={(e) => update("services", e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="problems">Current Problems *</Label>
              <Textarea id="problems" rows={3} placeholder="What challenges is your business facing?" value={form.problems} onChange={(e) => update("problems", e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="goals">Business Goals *</Label>
              <Textarea id="goals" rows={3} placeholder="What do you want to achieve?" value={form.goals} onChange={(e) => update("goals", e.target.value)} required />
            </div>

            <Button type="submit" size="lg" disabled={loading}>
              {loading ? "Creating AI Company..." : "Launch AI Company"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
