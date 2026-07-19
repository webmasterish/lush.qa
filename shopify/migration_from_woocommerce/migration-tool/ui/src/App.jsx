import { useEffect, useState } from "react";
import Dashboard from "@/views/Dashboard";
import NewRun from "@/views/NewRun";
import RunPage from "@/views/RunPage";

// Tiny hash router: #/ (dashboard), #/new, #/runs/:id — keeps the served
// build free of server-side route handling beyond a static fallback.
function useHashRoute() {
  const [hash, setHash] = useState(location.hash || "#/");
  useEffect(() => {
    const onChange = () => setHash(location.hash || "#/");
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return hash;
}

export default function App() {
  const hash = useHashRoute();
  const runMatch = /^#\/runs\/(\d+)/.exec(hash);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-3">
          <a href="#/" className="font-semibold">migration-tool</a>
          <span className="text-xs text-muted-foreground">WooCommerce → Shopify</span>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-6">
        {runMatch ? <RunPage id={runMatch[1]} /> : hash.startsWith("#/new") ? <NewRun /> : <Dashboard />}
      </main>
    </div>
  );
}
