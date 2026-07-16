import { createFileRoute, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LayoutDashboard, Package, Tag, ShoppingCart, Ticket, ArrowLeft, Menu } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export const Route = createFileRoute("/admin")({ component: AdminLayout });

const items = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/products", label: "Produtos", icon: Package },
  { to: "/admin/categories", label: "Categorias", icon: Tag },
  { to: "/admin/orders", label: "Pedidos", icon: ShoppingCart },
  { to: "/admin/coupons", label: "Cupons", icon: Ticket },
];

function AdminNavLinks({ path, onNavigate }: { path: string; onNavigate?: () => void }) {
  return (
    <nav className="space-y-1">
      {items.map((it) => {
        const active = it.exact ? path === it.to : path.startsWith(it.to);
        return (
          <Link
            key={it.to}
            to={it.to}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <it.icon className="h-4 w-4" /> {it.label}
          </Link>
        );
      })}
    </nav>
  );
}

function AdminLayout() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!loading) {
      if (!user) navigate({ to: "/login" });
      else if (!isAdmin) navigate({ to: "/" });
    }
  }, [user, isAdmin, loading, navigate]);

  useEffect(() => setDrawerOpen(false), [path]);

  if (loading || !isAdmin) return null;

  return (
    <div className="flex min-h-screen flex-col bg-secondary/30 md:flex-row">
      <header className="flex items-center justify-between border-b border-border/60 bg-background p-4 md:hidden">
        <Link to="/" className="flex items-center gap-2 font-display text-lg">
          <ArrowLeft className="h-4 w-4" /> Lumière Admin
        </Link>
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Abrir menu do admin">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex w-full max-w-xs flex-col gap-6 overflow-y-auto" aria-label="Menu do admin">
            <SheetHeader>
              <SheetTitle className="font-display text-xl">Lumière Admin</SheetTitle>
            </SheetHeader>
            <AdminNavLinks path={path} onNavigate={() => setDrawerOpen(false)} />
          </SheetContent>
        </Sheet>
      </header>

      <aside className="hidden w-64 shrink-0 border-r border-border/60 bg-background p-6 md:block">
        <Link to="/" className="mb-8 flex items-center gap-2 font-display text-xl">
          <ArrowLeft className="h-4 w-4" /> Lumière Admin
        </Link>
        <AdminNavLinks path={path} />
      </aside>

      <main className="min-w-0 flex-1 overflow-x-auto">{mounted && <Outlet />}</main>
    </div>
  );
}
