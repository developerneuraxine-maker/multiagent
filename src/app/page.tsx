import Link from "next/link";
import {
  Sparkles,
  Bot,
  BarChart3,
  Shield,
  ArrowRight,
  Crown,
  Megaphone,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const agents = [
  { name: "CEO Agent", icon: Crown, desc: "Strategic analysis & delegation" },
  { name: "Marketing Agent", icon: Megaphone, desc: "Content, campaigns & calendars" },
  { name: "Sales Agent", icon: TrendingUp, desc: "Leads, outreach & conversions" },
];

const features = [
  {
    title: "AI Company Structure",
    description:
      "Your business gets a full AI org chart — CEO plus 7 department agents working in coordination.",
    icon: Bot,
  },
  {
    title: "Real-Time Dashboard",
    description:
      "Track business health, growth scores, task completion, agent activity, and executive reports.",
    icon: BarChart3,
  },
  {
    title: "Enterprise Security",
    description:
      "Supabase Auth with row-level security ensures your business data stays private and protected.",
    icon: Shield,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold">AI Business OS</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="container mx-auto px-4 py-24 text-center">
        <Badge className="mb-4" variant="secondary">
          Powered by OpenAI GPT-4o
        </Badge>
        <h1 className="mx-auto max-w-4xl text-5xl font-bold tracking-tight sm:text-6xl">
          Your Business, Run by an{" "}
          <span className="text-primary">AI Executive Team</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Onboard your business in minutes. A CEO Agent analyzes your company, delegates to
          specialized AI agents, and delivers actionable reports — marketing, sales, finance,
          operations, and more.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button size="lg" asChild>
            <Link href="/signup">
              Start Free <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </section>

      <section className="border-y bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center text-3xl font-bold">Meet Your AI Agents</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {agents.map((agent) => {
              const Icon = agent.icon;
              return (
                <Card key={agent.name}>
                  <CardHeader>
                    <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>{agent.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{agent.desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <p className="mt-8 text-center text-muted-foreground">
            Plus HR, Developer, Support, Finance & Operations agents
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20">
        <h2 className="mb-12 text-center text-3xl font-bold">Everything You Need</h2>
        <div className="grid gap-8 md:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <Icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="border-t bg-primary py-16 text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold">Ready to build your AI company?</h2>
          <p className="mt-4 text-primary-foreground/80">
            Join business owners who automate strategy, marketing, and operations with AI.
          </p>
          <Button size="lg" variant="secondary" className="mt-8" asChild>
            <Link href="/signup">Create Your AI Company</Link>
          </Button>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} AI Business OS. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
