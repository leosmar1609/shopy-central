import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { z } from "zod";
import { signupFn } from "@/fns/auth";
import { maskCPF, isValidCPF } from "@/lib/masks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({ component: Signup });

const schema = z.object({
  full_name: z.string().trim().min(2, "Informe seu nome completo").max(120),
  cpf: z.string().trim().min(11, "Informe um CPF válido"),
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z
    .string()
    .min(6, "A senha precisa ter no mínimo 6 caracteres")
    .max(72, "A senha é muito longa"),
  confirm_password: z.string(),
});

type PasswordStrength = "empty" | "weak" | "medium" | "strong";

function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return "empty";
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return "weak";
  if (score <= 3) return "medium";
  return "strong";
}

const STRENGTH_LABEL: Record<PasswordStrength, string> = {
  empty: "",
  weak: "Fraca",
  medium: "Média",
  strong: "Forte",
};

const STRENGTH_SEGMENTS: Record<PasswordStrength, number> = {
  empty: 0,
  weak: 1,
  medium: 2,
  strong: 3,
};

const STRENGTH_COLOR: Record<PasswordStrength, string> = {
  empty: "bg-muted",
  weak: "bg-destructive",
  medium: "bg-accent",
  strong: "bg-success",
};

function PasswordStrengthMeter({ password }: { password: string }) {
  const strength = useMemo(() => getPasswordStrength(password), [password]);
  if (!password) return null;
  const activeSegments = STRENGTH_SEGMENTS[strength];
  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i < activeSegments ? STRENGTH_COLOR[strength] : "bg-muted"
            }`}
          />
        ))}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Força da senha: <span className="font-medium">{STRENGTH_LABEL[strength]}</span>
      </p>
    </div>
  );
}

function Signup() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [signupResult, setSignupResult] = useState<{ email: string; emailSent: boolean } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!acceptedTerms) {
      return toast.error("É preciso aceitar os Termos de Uso e a Política de Privacidade");
    }

    const parsed = schema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);

    if (parsed.data.password !== parsed.data.confirm_password) {
      return toast.error("As senhas não coincidem");
    }

    const cpf = parsed.data.cpf.replace(/\D/g, "");
    if (!isValidCPF(cpf)) {
      return toast.error("CPF inválido. Verifique os números digitados.");
    }

    setLoading(true);
    try {
      const { emailSent } = await signupFn({
        data: {
          full_name: parsed.data.full_name,
          email: parsed.data.email,
          password: parsed.data.password,
          cpf,
        },
      });
      setSignupResult({ email: parsed.data.email, emailSent });
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  }

  if (signupResult) {
    return (
      <div className="container-page flex min-h-[80vh] items-center justify-center py-12">
        <div className="w-full max-w-md rounded-3xl bg-card p-8 shadow-elegant text-center">
          {signupResult.emailSent ? (
            <>
              <h1 className="mb-2 font-display text-3xl">Verifique seu e-mail</h1>
              <p className="mb-6 text-sm text-muted-foreground">
                Enviamos um e-mail de confirmação para <span className="font-medium text-foreground">{signupResult.email}</span>.
                Clique no link para ativar sua conta antes de entrar.
              </p>
            </>
          ) : (
            <>
              <h1 className="mb-2 font-display text-3xl">Conta criada</h1>
              <p className="mb-6 text-sm text-muted-foreground">
                Sua conta foi criada, mas não conseguimos enviar o e-mail de confirmação agora. Você pode{" "}
                <Link to="/verify-email" className="font-medium text-accent hover:underline">
                  tentar reenviar o e-mail de confirmação
                </Link>{" "}
                mais tarde, ou entrar em contato com o suporte.
              </p>
            </>
          )}
          <Link to="/login" className="font-medium text-accent hover:underline">
            Voltar para o login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page flex min-h-[80vh] items-center justify-center py-12">
      <div className="w-full max-w-md rounded-3xl bg-card p-8 shadow-elegant">
        <h1 className="mb-2 font-display text-3xl">Criar conta</h1>
        <p className="mb-6 text-sm text-muted-foreground">É rápido e gratuito.</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="full_name">Nome completo</Label>
            <Input id="full_name" name="full_name" required />
          </div>
          <div>
            <Label htmlFor="cpf">CPF</Label>
            <Input
              id="cpf"
              name="cpf"
              inputMode="numeric"
              placeholder="000.000.000-00"
              required
              onChange={(e) => { e.target.value = maskCPF(e.target.value); }}
            />
          </div>
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
            <PasswordStrengthMeter password={password} />
          </div>
          <div>
            <Label htmlFor="confirm_password">Confirmar senha</Label>
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
          <div className="flex items-start gap-2">
            <Checkbox
              id="terms"
              checked={acceptedTerms}
              onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
              className="mt-0.5"
            />
            <Label htmlFor="terms" className="cursor-pointer font-normal leading-snug text-muted-foreground">
              Concordo com os{" "}
              <Link to="/terms" className="font-medium text-accent hover:underline">
                Termos de Uso
              </Link>{" "}
              e a{" "}
              <Link to="/privacy" className="font-medium text-accent hover:underline">
                Política de Privacidade
              </Link>
            </Label>
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={loading || !acceptedTerms}>
            {loading ? "Criando..." : "Cadastrar"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Já tem conta? <Link to="/login" className="font-medium text-accent hover:underline">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
