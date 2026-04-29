import { useEffect, useMemo, useState } from "react";
import { Mail, Phone, Plus, Search, User } from "lucide-react";
import { useApp } from "@/context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TenantDialog } from "./tenant-dialog";
import type { Tenant } from "@/types";

export function TenantsList({ navigate }: { navigate: (to: string) => void }) {
  const app = useApp();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const list = await app.listTenants();
      setTenants(list);
    } catch (err) {
      app.setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const filtered = useMemo(() => {
    if (!q.trim()) return tenants;
    const needle = q.toLowerCase();
    return tenants.filter((t) =>
      `${t.first_name} ${t.last_name} ${t.email ?? ""} ${t.phone ?? ""} ${t.active_property_name ?? ""} ${t.active_unit_name ?? ""}`.toLowerCase().includes(needle),
    );
  }, [tenants, q]);

  return (
    <div className="flex-1 overflow-auto">
      <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
        <header className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Tenants</h1>
            <p className="text-sm text-muted-foreground">{tenants.length} record{tenants.length === 1 ? "" : "s"}</p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> New tenant
          </Button>
        </header>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, phone, property, or unit"
            className="pl-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {loading ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">Loading…</Card>
        ) : filtered.length === 0 ? (
          <Card className="flex flex-col items-center justify-center gap-2 p-12 text-center">
            <User className="h-7 w-7 text-muted-foreground" />
            <p className="font-medium">{tenants.length === 0 ? "No tenants yet" : "No matches"}</p>
            <p className="text-sm text-muted-foreground">{tenants.length === 0 ? "Add a tenant to start signing leases." : "Try a different search."}</p>
            {tenants.length === 0 && (
              <Button className="mt-2" onClick={() => setDialogOpen(true)}>
                <Plus className="mr-1 h-4 w-4" /> New tenant
              </Button>
            )}
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Active unit</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => (
                  <TableRow key={t.id} className="cursor-pointer" onClick={() => navigate(`/tenants/${t.id}`)}>
                    <TableCell className="font-medium">
                      {t.first_name} {t.last_name}
                    </TableCell>
                    <TableCell>
                      {t.active_unit_name ? (
                        <span className="text-sm">
                          {t.active_property_name && <span className="text-muted-foreground">{t.active_property_name} · </span>}
                          {t.active_unit_name}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {t.email ? (
                        <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" /> {t.email}
                        </span>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {t.phone ? (
                        <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" /> {t.phone}
                        </span>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      <TenantDialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) load(); }} />
    </div>
  );
}
