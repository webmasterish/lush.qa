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
      <h1 className="text-2xl font-semibold">New run</h1>

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
