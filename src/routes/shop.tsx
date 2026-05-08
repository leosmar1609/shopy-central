import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/ProductCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/shop")({ component: Shop });

function Shop() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", "all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await supabase.from("categories").select("*")).data ?? [],
  });

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesQ = !q || p.name.toLowerCase().includes(q.toLowerCase());
      const matchesC = !cat || p.category_id === cat;
      return matchesQ && matchesC;
    });
  }, [products, q, cat]);

  return (
    <div className="container-page py-12">
      <header className="mb-10">
        <h1 className="font-display text-4xl md:text-5xl">Loja</h1>
        <p className="mt-2 text-muted-foreground">Explore toda a nossa coleção.</p>
      </header>

      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar produtos..." className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant={cat === null ? "default" : "outline"} size="sm" onClick={() => setCat(null)}>Todas</Button>
          {categories.map((c) => (
            <Button key={c.id} variant={cat === c.id ? "default" : "outline"} size="sm" onClick={() => setCat(c.id)}>{c.name}</Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-20 text-center text-muted-foreground">Nenhum produto encontrado.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((p) => <ProductCard key={p.id} {...p} />)}
        </div>
      )}
    </div>
  );
}
