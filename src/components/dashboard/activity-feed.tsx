import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ActivityFeedItem, Agent } from "@/types/database";
import { formatRelativeTime } from "@/lib/utils";

interface ActivityFeedProps {
  items: ActivityFeedItem[];
  agents: Agent[];
}

export function ActivityFeed({ items, agents }: ActivityFeedProps) {
  const agentMap = new Map(agents.map((a) => [a.id, a]));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Agent Activity Feed</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No activity yet</p>
        ) : (
          <div className="space-y-4">
            {items.map((item) => {
              const agent = item.agent_id ? agentMap.get(item.agent_id) : null;
              return (
                <div key={item.id} className="flex gap-3">
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      {agent && <span className="font-medium">{agent.name}: </span>}
                      {item.action}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeTime(item.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
