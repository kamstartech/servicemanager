"use client";

import { gql, useQuery } from "@apollo/client";
import { useParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar } from "lucide-react";
import Link from "next/link";
import { PageWorkflowsManager } from "@/components/workflows/page-workflows-manager";

const PAGE_QUERY = gql`
  query AppScreenPage($screenId: ID!, $pageId: ID!) {
    appScreen(id: $screenId) {
      id
      name
      context
      icon
    }
    pageWorkflows(pageId: $pageId) {
      id
      order
      workflow {
        id
        name
      }
      page {
        id
        name
        icon
        isActive
        isTesting
        createdAt
        updatedAt
        screen {
          id
          name
          context
          icon
        }
      }
    }
  }
`;

export default function AppScreenPageDetailPage() {
  const params = useParams();
  const screenId = params.id as string;
  const pageId = params.pageId as string;

  const { data, loading, error } = useQuery(PAGE_QUERY, {
    variables: { screenId, pageId },
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background px-4 py-6">
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (error || !data?.pageWorkflows?.[0]?.page) {
    return (
      <div className="min-h-screen bg-background px-4 py-6">
        <div className="text-center py-8 text-destructive">
          Page not found or error loading data
        </div>
      </div>
    );
  }

  const screen = data.appScreen;
  const page = data.pageWorkflows[0]?.page;

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mb-6">
        <Link href={`/system/app-screens/${screenId}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to {screen.name}
          </Button>
        </Link>
      </div>

      {/* Page Info Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <span className="text-4xl">{page.icon}</span>
              <div>
                <CardTitle className="text-2xl">{page.name}</CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline">
                    {screen.icon} {screen.name}
                  </Badge>
                  <Badge variant={page.isActive ? "default" : "secondary"}>
                    {page.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <Badge variant={page.isTesting ? "default" : "outline"}>
                    {page.isTesting ? "Testing" : "Live"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Screen:</span> {screen.name}
            </div>
            <div>
              <span className="text-muted-foreground">Context:</span> {screen.context}
            </div>
            <div>
              <span className="text-muted-foreground">Created:</span>{" "}
              <span className="inline-flex items-center gap-2 text-sm text-gray-600">
                <Calendar size={16} />
                {new Date(page.createdAt).toLocaleString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Updated:</span>{" "}
              <span className="inline-flex items-center gap-2 text-sm text-gray-600">
                <Calendar size={16} />
                {new Date(page.updatedAt).toLocaleString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workflows Manager */}
      <PageWorkflowsManager pageId={pageId} />
    </div>
  );
}
