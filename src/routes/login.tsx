import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { z } from "zod";
import { loginFn, resendVerificationEmailFn } from "@/fns/auth";
import { storeToken } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({ component: Login });

const schema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(6, "Mínimo 6 caracteres").max(72),
});

function Login() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = schema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setUnverifiedEmail(null);
    setLoading(true);
    try {
      const { token } = await loginFn({ data: parsed.data });
      storeToken(token, remember);
      toast.success("Bem-vindo de volta!");
      navigate({ to: "/" });
    } catch (err: any) {
      if (err.message === "EMAIL_NOT_VERIFIED") {
        setUnverifiedEmail(parsed.data.email);
      } else {
        toast.error(err.message ?? "Erro ao entrar");
      }
    } finally {
      setLoading(false);
    }
  }

  async function onResendVerification() {
    if (!unverifiedEmail) return;
    setResending(true);
    try {
      await resendVerificationEmailFn({ data: { email: unverifiedEmail } });
      toast.success("Se a conta existir, um novo e-mail foi enviado.");
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao reenviar e-mail");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="container-page flex min-h-[80vh] items-center justify-center py-12">
      <div className="w-full max-w-md rounded-3xl bg-card p-8 shadow-elegant">
        <h1 className="mb-2 font-display text-3xl">Entrar</h1>
        <p className="mb-6 text-sm text-muted-foreground">Acesse sua conta Lumière</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Senha</Label>
              <Link to="/forgot-password" className="text-xs font-medium text-accent hover:underline">
                Esqueci minha senha
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="remember"
              checked={remember}
              onCheckedChange={(checked) => setRemember(checked === true)}
            />
            <Label htmlFor="remember" className="cursor-pointer font-normal text-muted-foreground">
              Lembrar-me
            </Label>
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</Button>
        </form>

        {unverifiedEmail && (
          <div className="mt-6 space-y-3 rounded-xl bg-secondary p-4 text-sm text-secondary-foreground">
            <p>
              Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada para concluir o login.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              disabled={resending}
              onClick={onResendVerification}
            >
              {resending ? "Reenviando..." : "Reenviar e-mail de confirmação"}
            </Button>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Não tem conta? <Link to="/signup" className="font-medium text-accent hover:underline">Cadastre-se</Link>
        </p>
      </div>
    </div>
  );
}
