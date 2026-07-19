import { useEffect, useRef, useState } from "react";
import { api, post, STATUS_VARIANT, fmtDuration } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";

const STAT_COLS = ["extracted", "processed", "total", "created", "updated", "skipped", "failed", "translated", "published"];

export default function RunPage({ id }) {
  const [run, setRun] = useState(null);
  const [events, setEvents] = useState([]);
  const [showDebug, setShowDebug] = useState(false);
  const [error, setError] = useState(null);
  const lastEventId = useRef(0);
  const logRef = useRef(null);

  useEffect(() => {
    setRun(null);
    setEvents([]);
    lastEventId.current = 0;
    let live = true;
    const tick = async () => {
      try {
        const r = await api(`/api/runs/${id}`);
        if (!live) return;
        setRun(r);
        const levels = showDebug ? "debug,info,warn,error" : "info,warn,error";
        const ev = await api(`/api/runs/${id}/events?after_id=${lastEventId.current}&level=${levels}&limit=500`);
        if (!live) return;
        if (ev.length) {
          lastEventId.current = ev[ev.length - 1].id;
          setEvents((cur) => [...cur.slice(-1500), ...ev]);
          queueMicrotask(() => logRef.current?.scrollTo(0, logRef.current.scrollHeight));
        }
        setError(null);
      } catch (e) {
        if (live) setError(e.message);
      }
    };
    tick();
    const t = setInterval(tick, 2000);
    return () => (live = false, clearInterval(t));
  }, [id, showDebug]);

  if (error) return <p className="text-destructive p-6">{error}</p>;
  if (!run) return <p className="p-6 text-muted-foreground">Loading…</p>;

  const active = run.status === "running" || run.status === "queued";
  const stats = run.stats ?? {};
  const entityRows = Object.entries(stats).filter(([k]) => k !== "rebuilt");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-3">
            Run {run.id}
            <Badge variant={STATUS_VARIANT[run.status] ?? "outline"}>{run.status}</Badge>
          </h1>
          <p className="text-sm text-muted-foreground">
            {run.type} · {run.entities.join(", ")}
            {run.options.mode && ` · ${run.options.mode}`}
            {run.options.limit != null && ` · limit ${run.options.limit}`}
            {run.options.offset ? ` · offset ${run.options.offset}` : ""}
            {run.finished_at && ` · ${fmtDuration(run.started_at, run.finished_at)}`}
          </p>
        </div>
        <div className="flex gap-2">
          {active && (
            <Button variant="destructive" onClick={() => post(`/api/runs/${run.id}/cancel`)}>Cancel run</Button>
          )}
          <Button variant="outline" onClick={() => (location.hash = "#/")}>Dashboard</Button>
        </div>
      </div>

      {active && (
        <Alert>
          <AlertDescription>
            This run executes on the server — you can close this page; the run keeps going.
          </AlertDescription>
        </Alert>
      )}

      {entityRows.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Progress</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entity</TableHead>
                  {STAT_COLS.map((c) => <TableHead key={c} className="text-right">{c}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {entityRows.map(([name, s]) => (
                  <TableRow key={name}>
                    <TableCell className="capitalize font-medium">{name}</TableCell>
                    {STAT_COLS.map((c) => (
                      <TableCell key={c} className={`text-right ${c === "failed" && s[c] ? "text-destructive font-medium" : ""}`}>
                        {c === "extracted" && s.extracted && typeof s.extracted === "object"
                          ? Object.entries(s.extracted).map(([l, n]) => (l === "-" ? n : `${l}:${n}`)).join(" ")
                          : s[c] ?? ""}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {entityRows.some(([, s]) => s.verify) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Verify report</CardTitle>
            <CardDescription>staged vs migrated vs live store, spot checks, and orphans</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {entityRows.filter(([, s]) => s.verify).map(([name, s]) => {
              const v = s.verify;
              const problems = [...(v.flags ?? []), ...(v.spot_mismatches ?? [])];
              return (
                <div key={name} className="text-sm">
                  <span className="capitalize font-medium">{name}</span>: staged{" "}
                  {Object.entries(v.staged).map(([l, n]) => (l === "-" ? n : `${l}:${n}`)).join(" ")} · migrated {v.mapped} · live{" "}
                  {v.live ?? "n/a"} · orphans {v.orphans}
                  {problems.length === 0 ? (
                    <Badge className="ml-2" variant="secondary">ok</Badge>
                  ) : (
                    <ul className="list-disc ml-6 text-destructive">{problems.map((p, i) => <li key={i}>{p}</li>)}</ul>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Event log</CardTitle>
          <div className="flex items-center gap-2">
            <Checkbox id="dbg" checked={showDebug} onCheckedChange={(v) => setShowDebug(Boolean(v))} />
            <Label htmlFor="dbg" className="text-xs">show debug</Label>
          </div>
        </CardHeader>
        <CardContent>
          <div ref={logRef} className="h-96 overflow-y-auto font-mono text-xs space-y-0.5 bg-muted/40 rounded-md p-3">
            {events.map((e) => (
              <div key={e.id} className={e.level === "error" ? "text-destructive" : e.level === "warn" ? "text-amber-600 dark:text-amber-400" : ""}>
                <span className="text-muted-foreground">{e.ts.slice(11, 19)}</span> {e.level.toUpperCase()}{" "}
                {e.entity && <span>[{e.entity}{e.source_id ? `#${e.source_id}` : ""}]</span>} {e.message}
              </div>
            ))}
            {events.length === 0 && <p className="text-muted-foreground">No events yet.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
