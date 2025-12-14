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

const MOBILE_USERS_QUERY = gql`
  query MobileUsers($context: MobileUserContext) {
    mobileUsers(context: $context) {
      id
      context
      username
      phoneNumber
      isActive
      createdAt
    }
  }
`;

export default function MobileUsersPage() {
  const { data, loading, error, refetch } = useQuery(MOBILE_USERS_QUERY);
  const { translate } = useI18n();

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{translate("mobileUsers.title")}</CardTitle>
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
                  <TableHead>{translate("mobileUsers.columns.identifier")}</TableHead>
                  <TableHead>{translate("mobileUsers.columns.context")}</TableHead>
                  <TableHead>{translate("mobileUsers.columns.username")}</TableHead>
                  <TableHead>{translate("mobileUsers.columns.phone")}</TableHead>
                  <TableHead>{translate("mobileUsers.columns.status")}</TableHead>
                  <TableHead>{translate("mobileUsers.columns.createdAt")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.mobileUsers?.map((mobileUser: any) => (
                  <TableRow key={mobileUser.id}>
                    <TableCell>{mobileUser.id}</TableCell>
                    <TableCell>{mobileUser.context}</TableCell>
                    <TableCell>{mobileUser.username ?? "-"}</TableCell>
                    <TableCell>{mobileUser.phoneNumber ?? "-"}</TableCell>
                    <TableCell>
                      {mobileUser.isActive
                        ? translate("common.status.active")
                        : translate("common.status.inactive")}
                    </TableCell>
                    <TableCell>
                      {new Date(mobileUser.createdAt).toLocaleString()}
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
