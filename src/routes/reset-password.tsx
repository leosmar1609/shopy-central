import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { z } from "zod";
import { resetPasswordFn } from "@/fns/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({ component: ResetPassword });

const schema = z.object({
  password: z.string().min(6, "A senha precisa ter no mínimo 6 caracteres").max(72, "A senha é muito longa"),
  confirm_password: z.string(),
});

function ResetPassword() {
  const [token, setToken] = useState<string | null>(null);
  const [tokenChecked, setTokenChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token"));
    setTokenChecked(true);
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;

    const parsed = schema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);

    if (parsed.data.password !== parsed.data.confirm_password) {
      return toast.error("As senhas não coincidem");
    }

    setLoading(true);
    try {
      await resetPasswordFn({ data: { token, new_password: parsed.data.password } });
      toast.success("Senha redefinida! Você já pode entrar.");
      navigate({ to: "/login" });
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao redefinir senha");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-page flex min-h-[80vh] items-center justify-center py-12">
      <div className="w-full max-w-md rounded-3xl bg-card p-8 shadow-elegant">
        <h1 className="mb-2 font-display text-3xl">Redefinir senha</h1>
        <p className="mb-6 text-sm text-muted-foreground">Escolha uma nova senha para sua conta.</p>

        {tokenChecked && !token ? (
          <div className="space-y-6">
            <p className="rounded-xl bg-secondary p-4 text-sm text-secondary-foreground">
              Link inválido. Solicite uma nova redefinição de senha.
            </p>
            <Link
              to="/forgot-password"
              className="block text-center text-sm font-medium text-accent hover:underline"
            >
              Solicitar nova redefinição
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="password">Nova senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
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
            <div>
              <Label htmlFor="confirm_password">Confirmar nova senha</Label>
              <div className="relative">
                <Input
                  id="confirm_password"
                  name="confirm_password"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  minLength={6}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  aria-label={showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={loading || !token}>
              {loading ? "Redefinindo..." : "Redefinir senha"}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Lembrou a senha? <Link to="/login" className="font-medium text-accent hover:underline">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
