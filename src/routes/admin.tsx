import { createFileRoute, Outlet, Link, redirect, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LayoutDashboard, Package, Tag, ShoppingCart, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
  beforeLoad: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw redirect({ to: "/login" });
    const { data: role } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!role) throw redirect({ to: "/" });
  },
});

const items = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/products", label: "Produtos", icon: Package },
  { to: "/admin/categories", label: "Categorias", icon: Tag },
  { to: "/admin/orders", label: "Pedidos", icon: ShoppingCart },
];

function AdminLayout() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen bg-secondary/30">
      <aside className="hidden w-64 shrink-0 border-r border-border/60 bg-background p-6 md:block">
        <Link to="/" className="mb-8 flex items-center gap-2 font-display text-xl">
          <ArrowLeft className="h-4 w-4" /> Lumière Admin
        </Link>
        <nav className="space-y-1">
          {items.map((it) => {
            const active = it.exact ? path === it.to : path.startsWith(it.to);
            return (
              <Link
                key={it.to}
                to={it.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <it.icon className="h-4 w-4" /> {it.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 overflow-x-auto">{mounted && <Outlet />}</main>
    </div>
  );
}
