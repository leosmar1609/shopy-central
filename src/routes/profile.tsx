import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ShieldCheck, User as UserIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/profile")({ component: Profile });

function Profile() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login" });
    }
  }, [loading, user, navigate]);

  if (loading || !user) return null;

  return (
    <div className="container-page py-12">
      <div className="rounded-3xl bg-card p-8 shadow-elegant">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Minha conta</p>
            <h1 className="mt-2 text-3xl font-semibold">{user.fullName ?? "Perfil do usuário"}</h1>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground/80">
            <UserIcon className="h-4 w-4" />
            {isAdmin ? "Administrador" : "Cliente"}
          </span>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <div className="rounded-3xl border border-border p-6">
            <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">E-mail</p>
            <p className="mt-2 text-base font-semibold">{user.email}</p>
          </div>
          <div className="rounded-3xl border border-border p-6">
            <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">ID de usuário</p>
            <p className="mt-2 break-all text-base font-semibold">{user.id}</p>
          </div>
          {user.fullName && (
            <div className="rounded-3xl border border-border p-6 sm:col-span-2">
              <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">Nome completo</p>
              <p className="mt-2 text-base font-semibold">{user.fullName}</p>
            </div>
          )}
        </div>

        {isAdmin && (
          <div className="mt-10 rounded-3xl border border-primary/20 bg-primary/5 p-6">
            <div className="flex items-center gap-2 text-primary">
              <ShieldCheck className="h-4 w-4" />
              Acesso administrativo
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Você tem acesso ao painel administrativo para gerenciar produtos, categorias e pedidos.
            </p>
            <Button asChild className="mt-5">
              <Link to="/admin">Ir para o painel admin</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
