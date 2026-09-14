"use client";

import { BookOpen, Plus } from "lucide-react";
import * as React from "react";

import { PageHeader } from "@/components/dashboard/shell";
import { EndpointGenerator } from "@/components/webhooks/endpoint-generator";
import { PayloadHelper } from "@/components/webhooks/payload-helper";
import { TerminalFeed } from "@/components/webhooks/terminal-feed";
import { Button } from "@/components/ui/button";
import { WEBHOOK_KEY } from "@/lib/webhook";

export default function WebhooksPage() {
  const [key, setKey] = React.useState(WEBHOOK_KEY);
  const handleKeyChange = React.useCallback((k: string) => setKey(k), []);

  return (
    <>
      <PageHeader
        title="Webhook execution hub"
        badge="Pro"
        description="One signed endpoint between your alerts and your brokerage. Verify the payload, watch the fills land, replay anything that failed."
        actions={
          <>
            <Button variant="secondary" size="sm">
              <BookOpen />
              API reference
            </Button>
            <Button size="sm">
              <Plus />
              New endpoint
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 p-4 lg:p-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <div className="space-y-4">
          <EndpointGenerator onKeyChange={handleKeyChange} />
          <PayloadHelper webhookKey={key} />
        </div>

        <div className="min-h-[560px] xl:h-[calc(100dvh-8.5rem)] xl:min-h-0">
          <TerminalFeed />
        </div>
      </div>
    </>
  );
}
