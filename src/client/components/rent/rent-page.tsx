import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Receipt, Sparkles } from "lucide-react";
import { useApp } from "@/context";
import { addMonths, cn, currentPeriod, formatDate, formatMoney, formatPeriod } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PaymentDialog } from "./payment-dialog";
import type { ChargeStatus, RentCharge } from "@/types";

const STATUS_TONE: Record<ChargeStatus, string> = {
  open: "bg-sky-100 text-sky-800 border-sky-200",
  partial: "bg-amber-100 text-amber-800 border-amber-200",
  paid: "bg-emerald-100 text-emerald-800 border-emerald-200",
  overdue: "bg-rose-100 text-rose-800 border-rose-200",
  waived: "bg-slate-100 text-slate-700 border-slate-200",
};

export function RentPage() {
  const app = useApp();
  const [period, setPeriod] = useState<string>(currentPeriod());
  const [charges, setCharges] = useState<RentCharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentTarget, setPaymentTarget] = useState<RentCharge | null>(null);
  const [generating, setGenerating] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const list = await app.listCharges(period);
      setCharges(list);
    } catch (err) {
      app.setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [period]);

  async function generate() {
    setGenerating(true);
    try {
      const res = await app.generateCharges(period);
      await load();
      app.setError(res.created ? null : "All active leases already have a charge for this period.");
    } catch (err) {
      app.setError((err as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  const totals = useMemo(() => {
    const charged = charges.reduce((s, c) => s + (c.amount ?? 0), 0);
    const collected = charges.reduce((s, c) => s + (c.amount_paid ?? 0), 0);
    const outstanding = Math.max(0, charged - collected);
    const overdue = charges
      .filter((c) => c.status === "overdue" || (c.status !== "paid" && c.status !== "waived" && c.due_date < new Date().toISOString().slice(0, 10) && c.amount_paid < c.amount))
      .reduce((s, c) => s + ((c.amount ?? 0) - (c.amount_paid ?? 0)), 0);
    return { charged, collected, outstanding, overdue };
  }, [charges]);

  return (
    <div className="flex-1 overflow-auto">
      <div className="mx-auto w-full max-w-7xl space-y-6 p-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Rent ledger</h1>
            <p className="text-sm text-muted-foreground">Charges and payments per period</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center rounded-md border bg-background p-1">
              <Button variant="ghost" size="icon" onClick={() => setPeriod((p) => addMonths(p, -1))} aria-label="Previous month">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <button
                type="button"
                onClick={() => setPeriod(currentPeriod())}
                className={cn(
                  "rounded px-3 py-1.5 text-sm font-medium",
                  period === currentPeriod() ? "bg-primary text-primary-foreground hover:bg-primary/90" : "hover:bg-accent",
                )}
              >
                {formatPeriod(period)}
              </button>
              <Button variant="ghost" size="icon" onClick={() => setPeriod((p) => addMonths(p, 1))} aria-label="Next month">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={generate} disabled={generating}>
              <Sparkles className="mr-1 h-4 w-4" /> Generate charges
            </Button>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="Charged" value={formatMoney(totals.charged, app.settings.currency)} />
          <Stat label="Collected" value={formatMoney(totals.collected, app.settings.currency)} tone="positive" />
          <Stat
            label="Outstanding"
            value={formatMoney(totals.outstanding, app.settings.currency)}
            tone={totals.outstanding > 0 ? "warn" : "default"}
          />
          <Stat
            label="Overdue"
            value={formatMoney(totals.overdue, app.settings.currency)}
            tone={totals.overdue > 0 ? "danger" : "default"}
          />
        </section>

        {loading ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">Loading…</Card>
        ) : charges.length === 0 ? (
          <Card className="flex flex-col items-center justify-center gap-2 p-12 text-center">
            <Receipt className="h-7 w-7 text-muted-foreground" />
            <p className="font-medium">No rent charges for {formatPeriod(period)}</p>
            <p className="text-sm text-muted-foreground">
              Generate charges from active leases for this month.
            </p>
            <Button className="mt-2" onClick={generate} disabled={generating}>
              <Sparkles className="mr-1 h-4 w-4" /> Generate charges
            </Button>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property · Unit</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="text-right">Charged</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {charges.map((c) => {
                  const balance = Math.max(0, (c.amount ?? 0) - (c.amount_paid ?? 0));
                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="text-sm">
                          <span className="text-muted-foreground">{c.property_name}</span>
                          <span className="px-1 text-muted-foreground/40">·</span>
                          <span className="font-medium">{c.unit_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {c.tenant_first_name ? (
                          <span className="text-sm">{c.tenant_first_name} {c.tenant_last_name}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(c.due_date)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatMoney(c.amount, app.settings.currency)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatMoney(c.amount_paid, app.settings.currency)}</TableCell>
                      <TableCell className={cn("text-right tabular-nums font-medium", balance > 0 && "text-amber-700", c.status === "overdue" && "text-rose-700")}>
                        {formatMoney(balance, app.settings.currency)}
                      </TableCell>
                      <TableCell>
                        <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize", STATUS_TONE[c.status])}>
                          {c.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {c.status !== "paid" && c.status !== "waived" && (
                          <Button size="sm" variant="outline" onClick={() => setPaymentTarget(c)}>
                            Record payment
                          </Button>
                        )}
                        {(c.status === "paid" || c.amount_paid > 0) && (
                          <Button size="sm" variant="ghost" onClick={() => setPaymentTarget(c)}>
                            View
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      <PaymentDialog
        open={paymentTarget !== null}
        onOpenChange={(o) => { if (!o) setPaymentTarget(null); }}
        charge={paymentTarget}
        onSaved={load}
      />
    </div>
  );
}

function Stat({
  label, value, tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "positive" | "warn" | "danger";
}) {
  return (
    <Card className="p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn(
        "mt-1 text-xl font-semibold tabular-nums",
        tone === "positive" && "text-emerald-700",
        tone === "warn" && "text-amber-700",
        tone === "danger" && "text-rose-700",
      )}>
        {value}
      </div>
    </Card>
  );
}
