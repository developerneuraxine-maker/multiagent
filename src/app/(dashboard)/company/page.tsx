"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useBusiness } from "@/hooks/use-business";
import { parseListInput } from "@/lib/utils";
import type { Business } from "@/types/database";
import { toast } from "sonner";

function businessToForm(business: Business) {
  return {
    name: business.name,
    industry: business.industry,
    website: business.website || "",
    instagram: business.instagram || "",
    facebook: business.facebook || "",
    linkedin: business.linkedin || "",
    products: business.products.join(", "),
    services: business.services.join(", "),
    problems: business.problems || "",
    goals: business.goals || "",
  };
}

function CompanyForm({
  business,
  onSaved,
}: {
  business: Business;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => businessToForm(business));

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const res = await fetch("/api/business", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: business.id,
        name: form.name,
        industry: form.industry,
        website: form.website || null,
        instagram: form.instagram || null,
        facebook: form.facebook || null,
        linkedin: form.linkedin || null,
        products: parseListInput(form.products),
        services: parseListInput(form.services),
        problems: form.problems,
        goals: form.goals,
      }),
    });

    setSaving(false);
    if (!res.ok) {
      toast.error("Failed to update profile");
      return;
    }
    toast.success("Company profile updated");
    onSaved();
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Business Name</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Industry</Label>
          <Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Website</Label>
        <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>Instagram</Label>
          <Input value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Facebook</Label>
          <Input value={form.facebook} onChange={(e) => setForm({ ...form, facebook: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>LinkedIn</Label>
          <Input value={form.linkedin} onChange={(e) => setForm({ ...form, linkedin: e.target.value })} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Products</Label>
        <Input value={form.products} onChange={(e) => setForm({ ...form, products: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>Services</Label>
        <Input value={form.services} onChange={(e) => setForm({ ...form, services: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>Problems</Label>
        <Textarea value={form.problems} onChange={(e) => setForm({ ...form, problems: e.target.value })} rows={3} />
      </div>
      <div className="space-y-2">
        <Label>Goals</Label>
        <Textarea value={form.goals} onChange={(e) => setForm({ ...form, goals: e.target.value })} rows={3} />
      </div>
      <Button type="submit" disabled={saving}>
        {saving ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}

export default function CompanyProfilePage() {
  const { business, loading, refetch } = useBusiness();

  if (loading) {
    return <p className="text-muted-foreground py-24 text-center">Loading...</p>;
  }

  if (!business) {
    return (
      <div className="py-24 text-center">
        <p className="text-muted-foreground mb-4">No business profile yet</p>
        <Button asChild>
          <a href="/setup">Complete Setup</a>
        </Button>
      </div>
    );
  }

  return (
    <>
      <PageHeader title="Company Profile" description="View and edit your business information" />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Business Details</CardTitle>
            </CardHeader>
            <CardContent>
              <CompanyForm
                key={`${business.id}-${business.updated_at}`}
                business={business}
                onSaved={refetch}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Health Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="mb-1 flex justify-between text-sm">
                  <span>Health Score</span>
                  <span>{Math.round(business.health_score)}%</span>
                </div>
                <Progress value={business.health_score} />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-sm">
                  <span>Growth Score</span>
                  <span>{Math.round(business.growth_score)}%</span>
                </div>
                <Progress value={business.growth_score} />
              </div>
              <Badge variant={business.setup_completed ? "success" : "warning"}>
                {business.setup_completed ? "Setup Complete" : "Setup Pending"}
              </Badge>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
