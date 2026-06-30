import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ADMIN_EMAIL = "socialsprouts1@gmail.com";

interface WebsiteRequest {
  id: string;
  customer_email: string;
  company_name: string;
  description: string;
  products: string | null;
  services: string | null;
  colors: string | null;
  style: string | null;
  image_urls: string[];
  status: string;
  created_at: string;
}

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== ADMIN_EMAIL) {
    redirect("/dashboard");
  }

  const serviceClient = await createServiceClient();
  const { data: requests, error } = await serviceClient
    .from("website_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        Error loading requests: {error.message}
      </p>
    );
  }

  const rows = (requests ?? []) as WebsiteRequest[];

  return (
    <>
      <PageHeader
        title="Admin — Website Requests"
        description={`${rows.length} request${rows.length !== 1 ? "s" : ""} received`}
      />

      {rows.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">No requests yet.</p>
      ) : (
        <div className="space-y-6">
          {rows.map((req) => (
            <Card key={req.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base">{req.company_name}</CardTitle>
                  <p className="mt-0.5 text-sm text-muted-foreground">{req.customer_email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={req.status === "new" ? "default" : "secondary"}>
                    {req.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(req.created_at).toLocaleString("en-IN", {
                      timeZone: "Asia/Kolkata",
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Description
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{req.description}</p>
                </div>

                {(req.products || req.services || req.colors || req.style) && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {req.products && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Products
                        </p>
                        <p className="mt-1 text-sm">{req.products}</p>
                      </div>
                    )}
                    {req.services && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Services
                        </p>
                        <p className="mt-1 text-sm">{req.services}</p>
                      </div>
                    )}
                    {req.colors && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Preferred Colors
                        </p>
                        <p className="mt-1 text-sm">{req.colors}</p>
                      </div>
                    )}
                    {req.style && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Style / Vibe
                        </p>
                        <p className="mt-1 text-sm">{req.style}</p>
                      </div>
                    )}
                  </div>
                )}

                {req.image_urls && req.image_urls.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Images ({req.image_urls.length})
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3">
                      {req.image_urls.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group relative block overflow-hidden rounded-lg border bg-muted"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt={`Image ${i + 1}`}
                            className="h-24 w-24 object-cover transition-opacity group-hover:opacity-80"
                          />
                          <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                            Download
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
