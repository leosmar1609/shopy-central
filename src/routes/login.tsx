import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { loginFn } from "@/fns/auth";
import { storeToken } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({ component: Login });

const schema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(6, "Mínimo 6 caracteres").max(72),
});

function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = schema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setLoading(true);
    try {
      const { token } = await loginFn({ data: parsed.data });
      storeToken(token);
      toast.success("Bem-vindo de volta!");
      navigate({ to: "/" });
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao entrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-page flex min-h-[80vh] items-center justify-center py-12">
      <div className="w-full max-w-md rounded-3xl bg-card p-8 shadow-elegant">
        <h1 className="mb-2 font-display text-3xl">Entrar</h1>
        <p className="mb-6 text-sm text-muted-foreground">Acesse sua conta Lumière</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div><Label htmlFor="email">E-mail</Label><Input id="email" name="email" type="email" required /></div>
          <div><Label htmlFor="password">Senha</Label><Input id="password" name="password" type="password" required /></div>
          <Button type="submit" className="w-full" size="lg" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Não tem conta? <Link to="/signup" className="font-medium text-accent hover:underline">Cadastre-se</Link>
        </p>
      </div>
    </div>
  );
}
