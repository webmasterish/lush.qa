import { useMemo, useState } from "react";
import { post, ENTITY_ORDER, withDependencies } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

const MODES = [
  ["create_missing", "Create missing", "Only records never migrated. Safe default; re-runs resume after failures."],
  ["sync_changed", "Sync changed", "Create missing + update records edited at the source (orders never update)."],
  ["force_all", "Force all", "Update everything regardless of change detection (orders never update)."],
];

function HelpPanel() {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">How runs work</CardTitle>
          <CardDescription>Nothing starts until you press "Start run" at the bottom of this page.</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => setOpen(!open)}>{open ? "Hide help" : "Show help"}</Button>
      </CardHeader>
      {open && (
        <CardContent className="space-y-4 text-sm">
          <div>
            <p className="font-medium mb-1">Run types</p>
            <ul className="list-disc ml-5 space-y-1 text-muted-foreground">
              <li><span className="text-foreground font-medium">extract</span> — copies data from WooCommerce into the tool's local staging database. Writes nothing to Shopify. After the first pull, products and orders refresh incrementally (only changed records); categories and customers always re-fetch fully.</li>
              <li><span className="text-foreground font-medium">load</span> — pushes staged data into Shopify: creates or updates records, registers Arabic translations, publishes products/collections to the Online Store, and marks everything with migration metafields.</li>
              <li><span className="text-foreground font-medium">full</span> — extract, then load, then verify, in one go. The normal choice.</li>
              <li><span className="text-foreground font-medium">verify</span> — compares source counts vs migrated vs the live store and spot-checks records. Writes nothing.</li>
              <li><span className="text-foreground font-medium">rebuild-map</span> — recovery only: rebuilds the local id map by reading the migration metafields back from Shopify.</li>
            </ul>
          </div>
          <div>
            <p className="font-medium mb-1">Modes (for load / full)</p>
            <ul className="list-disc ml-5 space-y-1 text-muted-foreground">
              <li><span className="text-foreground font-medium">Create missing</span> — only records never migrated before. Safe to re-run any time: everything already done skips instantly, so this is also how you continue after a cancel or failure.</li>
              <li><span className="text-foreground font-medium">Sync changed</span> — Create missing plus updates for records edited on the WooCommerce side since their last sync. Orders are never updated, only added.</li>
              <li><span className="text-foreground font-medium">Force all</span> — re-pushes every record whether changed or not. Rarely needed.</li>
            </ul>
          </div>
          <div>
            <p className="font-medium mb-1">Stopping and continuing (chunking)</p>
            <p className="text-muted-foreground">
              Leave Limit empty to process everything, and press Cancel on the run page whenever you want to stop — completed work is always kept. Re-running the same setup with Create missing continues exactly where it stopped. No offset math needed. Limit/Offset exist for small controlled test slices (records are ordered by source id, so offset chunks never overlap).
            </p>
          </div>
          <div>
            <p className="font-medium mb-1">Shopify limitation — orders</p>
            <p className="text-muted-foreground">
              Development stores allow only ~5 new orders per minute, so the full order history (~3,190 orders) needs ~11 hours of total running time no matter how it is split. Cancel and resume as often as you like — the total is the same. The tool waits out the cap automatically. The cap disappears once the store is on a paid plan.
            </p>
          </div>
          <div>
            <p className="font-medium mb-1">Recommended full migration sequence</p>
            <ol className="list-decimal ml-5 space-y-1 text-muted-foreground">
              <li><span className="text-foreground">full · products</span> (categories join automatically as a dependency) · Create missing · no limit — roughly 1.5–2 hours.</li>
              <li><span className="text-foreground">full · customers</span> · Create missing · no limit — well under an hour.</li>
              <li><span className="text-foreground">full · orders</span> · Create missing · no limit — cancel and resume at your convenience until it completes (see the orders limitation above).</li>
            </ol>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function NewRun() {
  const [type, setType] = useState("full");
  const [selected, setSelected] = useState(["products"]);
  const [includeDeps, setIncludeDeps] = useState(true);
  const [mode, setMode] = useState("create_missing");
  const [limit, setLimit] = useState("");
  const [offset, setOffset] = useState("");
  const [extractFull, setExtractFull] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const effective = useMemo(
    () => (includeDeps ? withDependencies(selected) : ENTITY_ORDER.filter((e) => selected.includes(e))),
    [selected, includeDeps]
  );

  const toggle = (name) =>
    setSelected((cur) => (cur.includes(name) ? cur.filter((n) => n !== name) : [...cur, name]));

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const { id } = await post("/api/runs", {
        type,
        entities: effective,
        options: {
          mode,
          limit: limit || undefined,
          offset: offset || undefined,
          include_dependencies: includeDeps,
          extract_full: extractFull || undefined,
        },
      });
      location.hash = `#/runs/${id}`;
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  const showLoadOptions = type === "load" || type === "full";
  const showExtractOptions = type === "extract" || type === "full";

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Set up a run</h1>
      <HelpPanel />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Run type</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="full">full — extract, load, verify</SelectItem>
              <SelectItem value="extract">extract — source → staging only</SelectItem>
              <SelectItem value="load">load — staging → Shopify only</SelectItem>
              <SelectItem value="verify">verify — counts + spot checks</SelectItem>
              <SelectItem value="rebuild-map">rebuild-map — recover id map from Shopify</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Entities</CardTitle>
          <CardDescription>
            Effective (dependency order): <span className="font-medium">{effective.join(" → ") || "none"}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {ENTITY_ORDER.map((name) => (
            <div key={name} className="flex items-center gap-2">
              <Checkbox
                id={name}
                checked={effective.includes(name)}
                disabled={includeDeps && !selected.includes(name) && effective.includes(name)}
                onCheckedChange={() => toggle(name)}
              />
              <Label htmlFor={name} className="capitalize">
                {name}
                {includeDeps && !selected.includes(name) && effective.includes(name) && (
                  <span className="text-muted-foreground text-xs ml-1">(dependency)</span>
                )}
              </Label>
            </div>
          ))}
          <div className="flex items-center gap-2 pt-2 border-t">
            <Checkbox id="deps" checked={includeDeps} onCheckedChange={(v) => setIncludeDeps(Boolean(v))} />
            <Label htmlFor="deps">Include dependencies (orders link to customers and products)</Label>
          </div>
        </CardContent>
      </Card>

      {showLoadOptions && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mode</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup value={mode} onValueChange={setMode} className="space-y-2">
              {MODES.map(([value, label, desc]) => (
                <div key={value} className="flex items-start gap-2">
                  <RadioGroupItem value={value} id={value} className="mt-1" />
                  <div>
                    <Label htmlFor={value}>{label}</Label>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scope</CardTitle>
          <CardDescription>
            Leave limit empty to process everything. Chunks: records are ordered by source id, so offset 0/100/200… never overlaps.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div>
            <Label htmlFor="limit" className="text-xs">Limit</Label>
            <Input id="limit" type="number" min="1" placeholder="all" value={limit} onChange={(e) => setLimit(e.target.value)} className="w-32" />
          </div>
          <div>
            <Label htmlFor="offset" className="text-xs">Offset</Label>
            <Input id="offset" type="number" min="0" placeholder="0" value={offset} onChange={(e) => setOffset(e.target.value)} className="w-32" />
          </div>
          {showExtractOptions && (
            <div className="flex items-end gap-2 pb-1">
              <Checkbox id="extractFull" checked={extractFull} onCheckedChange={(v) => setExtractFull(Boolean(v))} />
              <Label htmlFor="extractFull" className="text-sm">
                Full re-extract <span className="text-muted-foreground text-xs">(default is incremental for products/orders)</span>
              </Label>
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
      )}

      <div className="flex gap-2">
        <Button onClick={submit} disabled={busy || effective.length === 0}>Start run</Button>
        <Button variant="outline" onClick={() => (location.hash = "#/")}>Cancel</Button>
      </div>
    </div>
  );
}
