export type AgentType =
  | "ceo"
  | "hr"
  | "marketing"
  | "sales"
  | "developer"
  | "support"
  | "finance"
  | "operations";

export type AgentStatus = "idle" | "working" | "reviewing" | "offline";

export type TaskStatus =
  | "pending"
  | "in_progress"
  | "review"
  | "completed"
  | "cancelled"
  | "failed";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type ApprovalStatus = "pending" | "approved" | "rejected";

export type ReportType =
  | "executive"
  | "department"
  | "performance"
  | "financial"
  | "operational"
  | "weekly";

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Business {
  id: string;
  owner_id: string;
  name: string;
  industry: string;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  linkedin: string | null;
  products: string[];
  services: string[];
  problems: string | null;
  goals: string | null;
  budget: number;
  health_score: number;
  growth_score: number;
  setup_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Agent {
  id: string;
  business_id: string;
  type: AgentType;
  name: string;
  status: AgentStatus;
  performance_score: number;
  current_task_id: string | null;
  last_activity_at: string;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  business_id: string;
  agent_id: string | null;
  parent_task_id: string | null;
  title: string;
  description: string | null;
  department: AgentType | null;
  status: TaskStatus;
  priority: TaskPriority;
  output: Record<string, unknown>;
  requires_approval: boolean;
  approved: boolean | null;
  due_at: string | null;
  completed_at: string | null;
  estimated_hours: number | null;
  created_at: string;
  updated_at: string;
}

export interface Report {
  id: string;
  business_id: string;
  agent_id: string | null;
  type: ReportType;
  title: string;
  content: Record<string, unknown>;
  summary: string | null;
  created_at: string;
}

export interface ActivityFeedItem {
  id: string;
  business_id: string;
  agent_id: string | null;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface Approval {
  id: string;
  business_id: string;
  task_id: string;
  agent_id: string | null;
  title: string;
  description: string | null;
  status: ApprovalStatus;
  created_at: string;
  resolved_at: string | null;
}

export interface RevenueOpportunity {
  id: string;
  business_id: string;
  title: string;
  description: string | null;
  potential_value: number;
  status: string;
  source_agent: AgentType | null;
  created_at: string;
}

export interface AgentWithStats extends Agent {
  assigned_tasks: number;
  completed_tasks: number;
  current_task?: Task | null;
}

export interface DashboardStats {
  health_score: number;
  growth_score: number;
  task_completion_pct: number;
  revenue_opportunities: RevenueOpportunity[];
  pending_approvals: number;
  active_agents: number;
  total_agents: number;
}

export interface BusinessSetupInput {
  name: string;
  industry: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  products: string[];
  services: string[];
  problems: string;
  goals: string;
  budget: number;
}

export interface KnowledgeBaseFile {
  id: string;
  business_id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
}

export interface Suggestion {
  id: string;
  business_id: string;
  content: string;
  type: string;
  created_at: string;
}

export interface ResearchResult {
  id: string;
  business_id: string;
  title: string;
  content: string;
  source: string | null;
  category: string | null;
  created_at: string;
}

export interface WeeklyReportContent {
  period_start: string;
  period_end: string;
  health_score: number;
  health_score_change: number;
  growth_score: number;
  growth_score_change: number;
  tasks_completed: number;
  tasks_by_department: Record<string, number>;
  tasks_pending_approval: number;
  top_suggestions: string[];
  knowledge_base_files_added: number;
  meetings_scheduled: number;
  connected_integrations: string[];
  email_sent: boolean;
}

export interface Integration {
  id: string;
  business_id: string;
  provider: string;
  status: "connected" | "disconnected" | "error" | "expired";
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  provider_user_id: string | null;
  provider_email: string | null;
  provider_name: string | null;
  provider_avatar: string | null;
  scopes: string | null;
  last_sync_at: string | null;
  webhook_status: string | null;
  metadata: Record<string, unknown>;
  connected_at: string | null;
  created_at: string;
}
