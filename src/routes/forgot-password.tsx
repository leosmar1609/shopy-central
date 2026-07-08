import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { requestPasswordResetFn } from "@/fns/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({ component: ForgotPassword });

const schema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
});

function ForgotPassword() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = schema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);

    setLoading(true);
    try {
      await requestPasswordResetFn({ data: parsed.data });
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao solicitar redefinição de senha");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-page flex min-h-[80vh] items-center justify-center py-12">
      <div className="w-full max-w-md rounded-3xl bg-card p-8 shadow-elegant">
        <h1 className="mb-2 font-display text-3xl">Esqueci minha senha</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Informe seu e-mail e enviaremos instruções para redefinir sua senha.
        </p>

        {submitted ? (
          <div className="space-y-6">
            <p className="rounded-xl bg-secondary p-4 text-sm text-secondary-foreground">
              Se este e-mail estiver cadastrado, você receberá instruções em breve.
            </p>
            <Link to="/login" className="block text-center text-sm font-medium text-accent hover:underline">
              Voltar para o login
            </Link>
          </div>
        ) : (
          <>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" name="email" type="email" required autoFocus />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? "Enviando..." : "Enviar instruções"}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Lembrou a senha? <Link to="/login" className="font-medium text-accent hover:underline">Entrar</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
