"use client";

import { gql, useQuery } from "@apollo/client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/providers/i18n-provider";

const ADMIN_WEB_USERS_QUERY = gql`
  query AdminWebUsers {
    adminWebUsers {
      id
      email
      name
      isActive
      createdAt
    }
  }
`;

export default function AdminWebUsersPage() {
  const { data, loading, error, refetch } = useQuery(ADMIN_WEB_USERS_QUERY);
  const { translate } = useI18n();

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{translate("adminUsers.title")}</CardTitle>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            {translate("common.actions.refresh")}
          </Button>
        </CardHeader>
        <CardContent>
          {loading && (
            <p className="text-sm text-muted-foreground">
              {translate("common.state.loading")}
            </p>
          )}
          {error && (
            <p className="text-sm text-destructive">
              {translate("common.state.error")}: {error.message}
            </p>
          )}
          {!loading && !error && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{translate("adminUsers.columns.identifier")}</TableHead>
                  <TableHead>{translate("adminUsers.columns.email")}</TableHead>
                  <TableHead>{translate("adminUsers.columns.name")}</TableHead>
                  <TableHead>{translate("adminUsers.columns.status")}</TableHead>
                  <TableHead>{translate("adminUsers.columns.createdAt")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.adminWebUsers?.map((user: any) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.id}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.name ?? "-"}</TableCell>
                    <TableCell>
                      {user.isActive
                        ? translate("common.status.active")
                        : translate("common.status.inactive")}
                    </TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
