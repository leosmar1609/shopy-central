import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { signupFn } from "@/fns/auth";
import { storeToken } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({ component: Signup });

const schema = z.object({
  full_name: z.string().trim().min(2, "Informe seu nome").max(120),
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(6, "Mínimo 6 caracteres").max(72),
});

function Signup() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = schema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setLoading(true);
    try {
      const { token } = await signupFn({ data: parsed.data });
      storeToken(token);
      toast.success("Conta criada com sucesso!");
      navigate({ to: "/" });
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-page flex min-h-[80vh] items-center justify-center py-12">
      <div className="w-full max-w-md rounded-3xl bg-card p-8 shadow-elegant">
        <h1 className="mb-2 font-display text-3xl">Criar conta</h1>
        <p className="mb-6 text-sm text-muted-foreground">É rápido e gratuito.</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div><Label htmlFor="full_name">Nome completo</Label><Input id="full_name" name="full_name" required /></div>
          <div><Label htmlFor="email">E-mail</Label><Input id="email" name="email" type="email" required /></div>
          <div><Label htmlFor="password">Senha</Label><Input id="password" name="password" type="password" required /></div>
          <Button type="submit" className="w-full" size="lg" disabled={loading}>{loading ? "Criando..." : "Cadastrar"}</Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Já tem conta? <Link to="/login" className="font-medium text-accent hover:underline">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
