"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBusiness } from "@/hooks/use-business";
import { toast } from "sonner";
import {
  Plug, Mail, Calendar, Sheet, CreditCard, MessageCircle,
  Camera, Share2, CheckCircle2, XCircle, X, Eye, EyeOff,
  RefreshCw, Settings, LogOut, Clock, Key, Wifi,
} from "lucide-react";
import type { Integration } from "@/types/database";

// ─── Integration definitions ───────────────────────────────────────────────

type OAuthGroup = "google" | "meta" | "razorpay" | "gmail_form";

interface IntegrationDef {
  provider: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  oauthGroup: OAuthGroup;
  agentFor: string;
}

const INTEGRATIONS: IntegrationDef[] = [
  {
    provider: "gmail",
    name: "Gmail",
    description: "Sales Agent uses Gmail to send follow-ups, proposals, and outreach emails",
    icon: Mail,
    color: "text-red-500",
    oauthGroup: "gmail_form",
    agentFor: "Sales Agent",
  },
  {
    provider: "google_calendar",
    name: "Google Calendar",
    description: "CEO Agent creates real meetings and sends calendar invites automatically",
    icon: Calendar,
    color: "text-blue-500",
    oauthGroup: "google",
    agentFor: "CEO Agent",
  },
  {
    provider: "google_sheets",
    name: "Google Sheets",
    description: "Operations Agent exports reports, task data, and analytics to your spreadsheets",
    icon: Sheet,
    color: "text-green-500",
    oauthGroup: "google",
    agentFor: "Operations Agent",
  },
  {
    provider: "instagram",
    name: "Instagram",
    description: "Marketing Agent posts content, Reels, and stories to your Instagram Business",
    icon: Camera,
    color: "text-pink-500",
    oauthGroup: "meta",
    agentFor: "Marketing Agent",
  },
  {
    provider: "facebook",
    name: "Facebook",
    description: "Marketing Agent publishes posts and manages your Facebook Page",
    icon: Share2,
    color: "text-blue-700",
    oauthGroup: "meta",
    agentFor: "Marketing Agent",
  },
  {
    provider: "whatsapp",
    name: "WhatsApp Business",
    description: "Support Agent sends notifications, responds to customers via WhatsApp Cloud API",
    icon: MessageCircle,
    color: "text-green-600",
    oauthGroup: "meta",
    agentFor: "Support Agent",
  },
  {
    provider: "razorpay",
    name: "Razorpay",
    description: "Finance Agent monitors payments, tracks revenue, and analyzes financial data",
    icon: CreditCard,
    color: "text-blue-600",
    oauthGroup: "razorpay",
    agentFor: "Finance Agent",
  },
];

// ─── Manage dialog ──────────────────────────────────────────────────────────

function ManageDialog({
  intg,
  def,
  onClose,
  onDisconnect,
  onRefresh,
}: {
  intg: Integration;
  def: IntegrationDef;
  onClose: () => void;
  onDisconnect: () => void;
  onRefresh: () => void;
}) {
  const isExpired = intg.token_expires_at
    ? new Date(intg.token_expires_at) < new Date()
    : false;

  const Icon = def.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="w-full max-w-md rounded-xl border bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border bg-background">
              <Icon className={`h-5 w-5 ${def.color}`} />
            </div>
            <div>
              <h2 className="font-semibold">{def.name}</h2>
              <p className="text-xs text-muted-foreground">Integration Details</p>
            </div>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {/* Account info */}
          {intg.provider_name && (
            <div className="flex items-center gap-3 rounded-lg border p-3">
              {intg.provider_avatar ? (
                <img src={intg.provider_avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-lg font-bold">
                  {(intg.provider_name || "?")[0].toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-sm font-medium">{intg.provider_name}</p>
                {intg.provider_email && (
                  <p className="text-xs text-muted-foreground">{intg.provider_email}</p>
                )}
              </div>
              <Badge variant="success" className="ml-auto">Connected</Badge>
            </div>
          )}

          {/* Details grid */}
          <div className="space-y-2.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />Connected
              </span>
              <span>{intg.connected_at ? new Date(intg.connected_at).toLocaleDateString("en-IN") : "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <RefreshCw className="h-3.5 w-3.5" />Last Sync
              </span>
              <span>{intg.last_sync_at ? new Date(intg.last_sync_at).toLocaleDateString("en-IN") : "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Key className="h-3.5 w-3.5" />Token Expiry
              </span>
              <span className={isExpired ? "text-red-500 font-medium" : ""}>
                {intg.token_expires_at
                  ? isExpired ? "Expired — Reconnect" : new Date(intg.token_expires_at).toLocaleDateString("en-IN")
                  : "Long-lived"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Wifi className="h-3.5 w-3.5" />Webhook
              </span>
              <span>{intg.webhook_status || "—"}</span>
            </div>
            {intg.scopes && (
              <div className="pt-1">
                <p className="text-muted-foreground mb-1.5">Permissions</p>
                <div className="flex flex-wrap gap-1.5">
                  {intg.scopes.split(/[\s,]+/).filter(Boolean).map((s) => (
                    <Badge key={s} variant="outline" className="text-xs font-normal truncate max-w-[160px]">{s}</Badge>
                  ))}
                </div>
              </div>
            )}
            {/* Razorpay-specific */}
            {intg.provider === "razorpay" && Boolean(intg.metadata?.mode) && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Mode</span>
                <Badge variant={intg.metadata.mode === "live" ? "success" : "warning"}>
                  {String(intg.metadata.mode).toUpperCase()}
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="gap-2" onClick={onRefresh}>
            <RefreshCw className="h-3.5 w-3.5" />Refresh Token
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="gap-2 ml-auto"
            onClick={onDisconnect}
          >
            <LogOut className="h-3.5 w-3.5" />Disconnect
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Razorpay form ──────────────────────────────────────────────────────────

function RazorpayForm({
  businessId,
  onSuccess,
  onClose,
}: {
  businessId: string;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const [keyId, setKeyId] = useState("");
  const [keySecret, setKeySecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleConnect() {
    if (!keyId.trim() || !keySecret.trim()) { toast.error("Enter both Key ID and Key Secret"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/oauth/razorpay/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, keyId: keyId.trim(), keySecret: keySecret.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Connection failed");
      toast.success(`Razorpay connected! Mode: ${data.mode?.toUpperCase()}`);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="w-full max-w-md rounded-xl border bg-card shadow-xl p-6 space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-600" />Connect Razorpay
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Razorpay Dashboard → Settings → API Keys
            </p>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Key ID</Label>
            <Input placeholder="rzp_test_... or rzp_live_..." value={keyId} onChange={(e) => setKeyId(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Key Secret</Label>
            <div className="relative">
              <Input
                type={showSecret ? "text" : "password"}
                placeholder="••••••••••••••••••••"
                value={keySecret}
                onChange={(e) => setKeySecret(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-blue-200/50 bg-blue-50/50 dark:bg-blue-950/20 px-3 py-2 text-xs text-blue-700 dark:text-blue-400">
          Credentials are validated against Razorpay API and stored encrypted. Test keys start with rzp_test_, live keys with rzp_live_.
        </div>

        <div className="flex gap-3">
          <Button onClick={handleConnect} disabled={saving} className="flex-1 gap-2">
            <Plug className="h-4 w-4" />
            {saving ? "Connecting..." : "Connect & Verify"}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Gmail form (no OAuth — uses App Password) ───────────────────────────────

function GmailAppPasswordForm({
  businessId,
  onSuccess,
  onClose,
}: {
  businessId: string;
  onSuccess: (gmailUser?: string) => void;
  onClose: () => void;
}) {
  const [gmailUser, setGmailUser] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleConnect() {
    if (!gmailUser.trim() || !appPassword.trim()) { toast.error("Fill in both fields"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/integrations/gmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, gmailUser: gmailUser.trim(), appPassword: appPassword.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Connection failed");
      toast.success("Gmail connected! A test email was sent to you.");
      onSuccess(gmailUser.trim());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="w-full max-w-md rounded-xl border bg-card shadow-xl p-6 space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Mail className="h-5 w-5 text-red-500" />Connect Gmail
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">Use Gmail App Password for direct SMTP</p>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          Gmail → Settings → Security → 2-Step Verification ON → App Passwords → Create "AI Business OS"
        </div>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Gmail Address</Label>
            <Input type="email" placeholder="you@gmail.com" value={gmailUser} onChange={(e) => setGmailUser(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label>App Password (16 chars)</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="xxxx xxxx xxxx xxxx"
                value={appPassword}
                onChange={(e) => setAppPassword(e.target.value)}
                className="pr-10"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleConnect} disabled={saving} className="flex-1 gap-2">
            <Plug className="h-4 w-4" />{saving ? "Connecting..." : "Connect & Test"}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  const { business } = useBusiness();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
  const [managingProvider, setManagingProvider] = useState<string | null>(null);
  const [razorpayFormOpen, setRazorpayFormOpen] = useState(false);
  const [gmailFormOpen, setGmailFormOpen] = useState(false);
  const popupRef = useRef<Window | null>(null);
  const listenerRef = useRef<((e: MessageEvent) => void) | null>(null);

  const loadIntegrations = useCallback(async () => {
    if (!business?.id) return;
    try {
      const res = await fetch(`/api/integrations?businessId=${business.id}`);
      const json = await res.json();
      setIntegrations((json.integrations as Integration[]) || []);
    } catch {
      setIntegrations([]);
    }
    setLoading(false);
  }, [business?.id]);

  useEffect(() => { loadIntegrations(); }, [loadIntegrations]);

  // Clean up popup listener on unmount
  useEffect(() => {
    return () => {
      if (listenerRef.current) window.removeEventListener("message", listenerRef.current);
      if (popupRef.current && !popupRef.current.closed) popupRef.current.close();
    };
  }, []);

  function getIntegration(provider: string): Integration | undefined {
    return integrations.find((i) => i.provider === provider);
  }

  function isConnected(provider: string): boolean {
    return getIntegration(provider)?.status === "connected";
  }

  // Start OAuth popup
  function startOAuthPopup(oauthGroup: OAuthGroup, triggerProvider: string) {
    if (!business?.id) return;

    setConnectingProvider(triggerProvider);

    // Always use actual window origin — never rely on env var for security checks
    const origin = window.location.origin;
    let startUrl = "";

    if (oauthGroup === "google") {
      startUrl = `/api/oauth/google/start?businessId=${business.id}`;
    } else if (oauthGroup === "meta") {
      startUrl = `/api/oauth/meta/start?businessId=${business.id}`;
    }

    // Remove old listener
    if (listenerRef.current) window.removeEventListener("message", listenerRef.current);

    // Open popup
    const popup = window.open(
      startUrl,
      "oauth_popup",
      "width=600,height=700,scrollbars=yes,resizable=yes,top=100,left=200"
    );
    popupRef.current = popup;

    if (!popup) {
      toast.error("Popup blocked. Please allow popups for this site and try again.");
      setConnectingProvider(null);
      return;
    }

    let messageReceived = false;

    // Listen for OAuth result via postMessage
    const listener = (event: MessageEvent) => {
      // Only accept messages from same origin
      if (event.origin !== origin) return;
      const { type, provider, name, email, avatar, error } = event.data || {};
      if (type !== "OAUTH_SUCCESS" && type !== "OAUTH_ERROR") return;

      messageReceived = true;
      window.removeEventListener("message", listener);
      setConnectingProvider(null);

      if (type === "OAUTH_SUCCESS") {
        loadIntegrations();
        const connectedProviders = oauthGroup === "google"
          ? "Gmail, Google Calendar & Sheets"
          : oauthGroup === "meta"
          ? "Facebook, Instagram & WhatsApp"
          : provider;
        toast.success(`${connectedProviders} connected! ${name ? `(${name})` : ""}`);
        void email; void avatar;
      } else {
        toast.error(`Connection failed: ${error || "Unknown error"}`);
      }
    };

    listenerRef.current = listener;
    window.addEventListener("message", listener);

    // Poll for popup close — also reload integrations as fallback
    // (catches cases where postMessage wasn't received but OAuth did succeed)
    const pollClose = setInterval(() => {
      if (!popup.closed) return;
      clearInterval(pollClose);
      window.removeEventListener("message", listener);
      setConnectingProvider(null);
      // Always reload from DB when popup closes — covers both success and cancel
      loadIntegrations();
      if (!messageReceived) {
        // Popup closed without sending message — user may have cancelled
        // loadIntegrations() above will pick up any successful connections
      }
    }, 500);
  }

  function handleConnect(def: IntegrationDef) {
    if (!business?.id) return;

    if (def.oauthGroup === "razorpay") {
      setRazorpayFormOpen(true);
      return;
    }

    if (def.oauthGroup === "gmail_form") {
      setGmailFormOpen(true);
      return;
    }

    // Check if any integration from this group is already connected
    if (def.oauthGroup === "google") {
      const alreadyConnected = ["gmail", "google_calendar", "google_sheets"].some(isConnected);
      if (alreadyConnected) {
        toast.info("Google account already connected — all Google services share the same account.");
        return;
      }
    }

    if (def.oauthGroup === "meta") {
      const alreadyConnected = ["facebook", "instagram", "whatsapp"].some(isConnected);
      if (alreadyConnected) {
        toast.info("Meta account already connected — Facebook, Instagram & WhatsApp share the same account.");
        return;
      }
    }

    startOAuthPopup(def.oauthGroup, def.provider);
  }

  async function handleDisconnect(provider: string) {
    if (!business?.id) return;
    try {
      await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: business.id, provider, action: "disconnect" }),
      });

      // Disconnect all providers in the same group
      const def = INTEGRATIONS.find((d) => d.provider === provider);
      let toDisconnect = [provider];
      if (def?.oauthGroup === "google") toDisconnect = ["gmail", "google_calendar", "google_sheets"];
      if (def?.oauthGroup === "meta") toDisconnect = ["facebook", "instagram", "whatsapp"];

      for (const p of toDisconnect) {
        await fetch("/api/integrations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ businessId: business.id, provider: p, action: "disconnect" }),
        });
      }

      setIntegrations((prev) =>
        prev.map((i) =>
          toDisconnect.includes(i.provider) ? { ...i, status: "disconnected" } : i
        )
      );
      setManagingProvider(null);
      toast.success(`${provider} disconnected`);
    } catch {
      toast.error("Failed to disconnect");
    }
  }

  async function handleRefreshToken(provider: string) {
    if (!business?.id) return;
    try {
      const res = await fetch("/api/integrations/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: business.id, provider }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Refresh failed");
      toast.success("Token refreshed successfully!");
      loadIntegrations();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Token refresh failed");
    }
  }

  const managingDef = INTEGRATIONS.find((d) => d.provider === managingProvider);
  const managingIntg = managingProvider ? getIntegration(managingProvider) : undefined;

  return (
    <>
      <PageHeader
        title="Integrations"
        description="Connect your services — AI agents use these to work autonomously"
        actions={
          <Button variant="outline" size="sm" onClick={loadIntegrations} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh Status
          </Button>
        }
      />

      {/* Manage dialog */}
      {managingProvider && managingDef && managingIntg && (
        <ManageDialog
          intg={managingIntg}
          def={managingDef}
          onClose={() => setManagingProvider(null)}
          onDisconnect={() => handleDisconnect(managingProvider)}
          onRefresh={() => handleRefreshToken(managingProvider)}
        />
      )}

      {/* Razorpay form */}
      {razorpayFormOpen && business?.id && (
        <RazorpayForm
          businessId={business.id}
          onSuccess={() => {
            // Optimistic update: show connected immediately
            setIntegrations((prev) => {
              const now = new Date().toISOString();
              const exists = prev.find((i) => i.provider === "razorpay");
              if (exists) return prev.map((i) => i.provider === "razorpay" ? { ...i, status: "connected" as const, connected_at: now } : i);
              return [...prev, { id: `tmp-${Date.now()}`, business_id: business!.id, provider: "razorpay", status: "connected" as const, access_token: null, refresh_token: null, token_expires_at: null, provider_user_id: null, provider_email: null, provider_name: null, provider_avatar: null, scopes: null, last_sync_at: null, webhook_status: null, metadata: {}, connected_at: now, created_at: now }];
            });
            setRazorpayFormOpen(false);
            setTimeout(() => loadIntegrations(), 300); // DB reload to get real data
          }}
          onClose={() => setRazorpayFormOpen(false)}
        />
      )}

      {/* Gmail App Password form */}
      {gmailFormOpen && business?.id && (
        <GmailAppPasswordForm
          businessId={business.id}
          onSuccess={(gmailUser?: string) => {
            // Optimistic update: show connected immediately
            setIntegrations((prev) => {
              const now = new Date().toISOString();
              const exists = prev.find((i) => i.provider === "gmail");
              if (exists) return prev.map((i) => i.provider === "gmail" ? { ...i, status: "connected" as const, provider_email: gmailUser || i.provider_email, connected_at: now } : i);
              return [...prev, { id: `tmp-${Date.now()}`, business_id: business!.id, provider: "gmail", status: "connected" as const, access_token: null, refresh_token: null, token_expires_at: null, provider_user_id: null, provider_email: gmailUser || null, provider_name: gmailUser || null, provider_avatar: null, scopes: null, last_sync_at: null, webhook_status: null, metadata: {}, connected_at: now, created_at: now }];
            });
            setGmailFormOpen(false);
            setTimeout(() => loadIntegrations(), 300); // DB reload to get real data
          }}
          onClose={() => setGmailFormOpen(false)}
        />
      )}

      {/* Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 max-w-5xl">
        {INTEGRATIONS.map((def) => {
          const intg = getIntegration(def.provider);
          const connected = intg?.status === "connected";
          const isConnecting = connectingProvider === def.provider
            || (def.oauthGroup === "google" && connectingProvider !== null && ["gmail","google_calendar","google_sheets"].includes(connectingProvider))
            || (def.oauthGroup === "meta" && connectingProvider !== null && ["facebook","instagram","whatsapp"].includes(connectingProvider));
          const Icon = def.icon;

          return (
            <Card
              key={def.provider}
              className={`transition-all duration-300 ${connected ? "border-green-400/60 shadow-green-100/50 dark:shadow-green-900/20 shadow-sm" : ""}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl border bg-background transition-all ${connected ? "ring-2 ring-green-400/40" : ""}`}>
                      {connected && intg?.provider_avatar ? (
                        <img src={intg.provider_avatar} alt="" className="h-full w-full rounded-xl object-cover" />
                      ) : (
                        <Icon className={`h-5 w-5 ${def.color}`} />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-sm">{def.name}</CardTitle>
                      {connected && intg?.provider_name ? (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-0.5 truncate max-w-[120px]">
                          {intg.provider_name}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-0.5">{def.agentFor}</p>
                      )}
                    </div>
                  </div>
                  {connected ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 animate-in fade-in" />
                  ) : (
                    <XCircle className="h-5 w-5 text-muted-foreground/40 shrink-0" />
                  )}
                </div>

                <CardDescription className="text-xs mt-2">{def.description}</CardDescription>

                {connected && intg?.provider_email && (
                  <p className="text-xs text-muted-foreground truncate">{intg.provider_email}</p>
                )}

                {connected && intg?.connected_at && (
                  <p className="text-xs text-muted-foreground">
                    Connected {new Date(intg.connected_at).toLocaleDateString("en-IN")}
                  </p>
                )}
              </CardHeader>

              <CardContent className="pt-0 space-y-2">
                {connected ? (
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-1.5 text-xs"
                      onClick={() => setManagingProvider(def.provider)}
                    >
                      <Settings className="h-3 w-3" />Manage
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs"
                      onClick={() => {
                        const group = def.oauthGroup;
                        const triggerProvider = group === "google" ? "gmail"
                          : group === "meta" ? "facebook"
                          : def.provider;
                        if (group === "razorpay") { setRazorpayFormOpen(true); return; }
                        if (group === "gmail_form") { setGmailFormOpen(true); return; }
                        startOAuthPopup(group, triggerProvider);
                      }}
                    >
                      <RefreshCw className="h-3 w-3" />Reconnect
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => handleDisconnect(def.provider)}
                    >
                      <LogOut className="h-3 w-3" />Disconnect
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    className="w-full gap-2"
                    disabled={isConnecting || loading}
                    onClick={() => handleConnect(def)}
                  >
                    {isConnecting ? (
                      <>
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Plug className="h-3.5 w-3.5" />Connect
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info footer */}
      <div className="mt-6 max-w-5xl rounded-lg border border-dashed px-4 py-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Google:</span> One sign-in connects Gmail, Calendar & Sheets. &nbsp;
        <span className="font-medium text-foreground">Meta:</span> One login connects Facebook, Instagram & WhatsApp.&nbsp;
        <span className="font-medium text-foreground">Razorpay:</span> Uses your API keys securely (stored encrypted).
      </div>
    </>
  );
}
