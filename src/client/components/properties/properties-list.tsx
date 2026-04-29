import { useState } from "react";
import { Building2, MapPin, Plus } from "lucide-react";
import { useApp } from "@/context";
import { cn, colorClasses } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PropertyDialog } from "./property-dialog";
import type { Property } from "@/types";

const TYPE_LABEL: Record<string, string> = {
  single_family: "Single-family",
  multi_family: "Multi-family",
  condo: "Condo",
  townhouse: "Townhouse",
  commercial: "Commercial",
};

export function PropertiesList({ navigate }: { navigate: (to: string) => void }) {
  const { properties } = useApp();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Property | undefined>(undefined);

  const totalUnits = properties.reduce((sum, p) => sum + (p.unit_count ?? 0), 0);
  const occupied = properties.reduce((sum, p) => sum + (p.occupied_count ?? 0), 0);

  return (
    <div className="flex-1 overflow-auto">
      <div className="mx-auto w-full max-w-7xl space-y-6 p-6">
        <header className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Properties</h1>
            <p className="text-sm text-muted-foreground">
              {properties.length} propert{properties.length === 1 ? "y" : "ies"} · {totalUnits} unit{totalUnits === 1 ? "" : "s"} · {occupied}/{totalUnits || 0} occupied
            </p>
          </div>
          <Button onClick={() => { setEditing(undefined); setDialogOpen(true); }}>
            <Plus className="mr-1 h-4 w-4" />
            New property
          </Button>
        </header>

        {properties.length === 0 ? (
          <Card className="flex flex-col items-center justify-center gap-2 p-16 text-center">
            <Building2 className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">No properties yet</p>
            <p className="text-sm text-muted-foreground">Add your first property to start managing units, leases, and rent.</p>
            <Button className="mt-2" onClick={() => { setEditing(undefined); setDialogOpen(true); }}>
              <Plus className="mr-1 h-4 w-4" /> New property
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {properties.map((p) => {
              const palette = colorClasses(p.color);
              const occRate = p.unit_count
                ? Math.round(((p.occupied_count ?? 0) / p.unit_count) * 100)
                : 0;
              return (
                <Card
                  key={p.id}
                  className={cn(
                    "group relative cursor-pointer overflow-hidden p-5 transition-shadow hover:shadow-md",
                  )}
                  onClick={() => navigate(`/properties/${p.id}`)}
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", palette.bg, palette.text)}>
                      <Building2 className="h-5 w-5" />
                    </div>
                    <span className="rounded-full border bg-muted/30 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {TYPE_LABEL[p.type] ?? p.type}
                    </span>
                  </div>
                  <h3 className="font-semibold tracking-tight">{p.name}</h3>
                  {(p.address || p.city) && (
                    <p className="mt-1 flex items-center gap-1 truncate text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {[p.address, p.city, p.state].filter(Boolean).join(", ")}
                    </p>
                  )}
                  <div className="mt-4 grid grid-cols-3 gap-3 border-t pt-4 text-sm">
                    <Stat label="Units" value={p.unit_count ?? 0} />
                    <Stat label="Occupied" value={`${p.occupied_count ?? 0}/${p.unit_count ?? 0}`} />
                    <Stat label="Occupancy" value={`${occRate}%`} />
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setEditing(p); setDialogOpen(true); }}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Edit
                    </button>
                    {p.year_built && (
                      <span className="text-xs text-muted-foreground">Built {p.year_built}</span>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <PropertyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        property={editing}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-base font-semibold tabular-nums">{value}</div>
    </div>
  );
}
