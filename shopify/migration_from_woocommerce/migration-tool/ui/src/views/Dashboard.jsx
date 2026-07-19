import { useEffect, useState } from "react";
import { api, post, ENTITY_ORDER, STATUS_VARIANT, fmtDuration } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function Dashboard() {
  const [status, setStatus] = useState(null);
  const [runs, setRuns] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let live = true;
    const tick = () =>
      Promise.all([api("/api/status"), api("/api/runs")])
        .then(([s, r]) => live && (setStatus(s), setRuns(r), setError(null)))
        .catch((e) => live && setError(e.message));
    tick();
    const t = setInterval(tick, 2000);
    return () => (live = false, clearInterval(t));
  }, []);

  const testRun = async () => {
    const { id } = await post("/api/runs", {
      type: "load",
      entities: ["products"],
      options: { limit: 10, mode: "create_missing", include_dependencies: true },
    });
    location.hash = `#/runs/${id}`;
  };

  if (error) return <p className="text-destructive p-6">{error} — is the server running?</p>;
  if (!status) return <p className="p-6 text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{status.project}</h1>
          <p className="text-sm text-muted-foreground">
            {status.source.url} → {status.target.store_domain} · {status.target.currency} ·{" "}
            {status.target.locales.join("/")}
            {status.target.production && <Badge variant="destructive" className="ml-2">production</Badge>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={testRun}>Test run (10 products)</Button>
          <Button onClick={() => (location.hash = "#/new")}>New run</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {ENTITY_ORDER.map((name) => {
          const e = status.entities[name];
          const stagedTotal = Object.values(e.staged).reduce((a, b) => a + b, 0);
          return (
            <Card key={name}>
              <CardHeader className="pb-2">
                <CardTitle className="capitalize text-base">{name}</CardTitle>
                <CardDescription>
                  {Object.entries(e.staged).map(([l, n]) => (l === "-" ? n : `${l}: ${n}`)).join(" · ") || "not extracted"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{e.mapped}</div>
                <p className="text-xs text-muted-foreground">
                  migrated{stagedTotal ? ` of ${e.staged.en ?? e.staged["-"] ?? stagedTotal}` : ""}
                  {e.immutable && " · immutable"}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent runs</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Entities</TableHead>
                <TableHead>Options</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((r) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => (location.hash = `#/runs/${r.id}`)}>
                  <TableCell>{r.id}</TableCell>
                  <TableCell>{r.type}</TableCell>
                  <TableCell>{r.entities.join(", ")}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {[r.options.mode, r.options.limit != null && `limit ${r.options.limit}`, r.options.offset ? `offset ${r.options.offset}` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </TableCell>
                  <TableCell><Badge variant={STATUS_VARIANT[r.status] ?? "outline"}>{r.status}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.started_at ?? r.created_at}</TableCell>
                  <TableCell className="text-xs">{fmtDuration(r.started_at, r.finished_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
