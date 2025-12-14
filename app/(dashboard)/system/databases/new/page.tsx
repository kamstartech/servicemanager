"use client";

import { useState } from "react";
import { gql, useMutation } from "@apollo/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const CREATE_DB_CONNECTION = gql`
  mutation CreateDbConnection($input: DatabaseConnectionInput!) {
    createDbConnection(input: $input) {
      id
    }
  }
`;

export default function NewDatabaseConnectionPage() {
  const router = useRouter();
  const [createConnection, { loading }] = useMutation(CREATE_DB_CONNECTION);
  const [form, setForm] = useState({
    name: "",
    engine: "postgres",
    host: "localhost",
    port: 5432,
    database: "",
    username: "",
    password: "",
    isReadOnly: true,
  });

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await createConnection({ variables: { input: form } });
    router.push("/system/databases");
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>New Database Connection</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Engine</label>
                <Input value={form.engine} readOnly className="bg-muted" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Host</label>
                <Input
                  value={form.host}
                  onChange={(e) => setForm({ ...form, host: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Port</label>
                <Input
                  type="number"
                  value={form.port}
                  onChange={(e) =>
                    setForm({ ...form, port: Number(e.target.value) || 0 })
                  }
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Database</label>
                <Input
                  value={form.database}
                  onChange={(e) => setForm({ ...form, database: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Username</label>
                <Input
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Password</label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/system/databases")}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
