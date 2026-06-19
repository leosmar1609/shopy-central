import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Package, ShoppingCart, Users, TrendingUp } from "lucide-react";
import { fetchStatsFn } from "@/fns/stats";
import { getStoredToken } from "@/lib/auth-client";
import { formatBRL } from "@/lib/format";

export const Route = createFileRoute("/admin/")({ component: Dashboard });

function Dashboard() {
  const token = getStoredToken() ?? "";

  const { data: stats } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => fetchStatsFn({ data: { token } }),
  });

  const cards = [
    { label: "Receita total", value: formatBRL(stats?.revenue ?? 0), icon: TrendingUp },
    { label: "Pedidos", value: stats?.orders ?? 0, icon: ShoppingCart },
    { label: "Produtos", value: stats?.products ?? 0, icon: Package },
    { label: "Itens vendidos", value: stats?.items ?? 0, icon: Users },
  ];

  return (
    <div className="p-8">
      <h1 className="mb-8 font-display text-3xl">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl bg-card p-6 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{c.label}</span>
              <c.icon className="h-4 w-4 text-accent" />
            </div>
            <div className="mt-3 text-3xl font-semibold">{c.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
