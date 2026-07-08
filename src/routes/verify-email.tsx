import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { verifyEmailFn, resendVerificationEmailFn } from "@/fns/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/verify-email")({ component: VerifyEmail });

const emailSchema = z.string().trim().email("E-mail inválido").max(255);

type Status = "loading" | "success" | "error";

function ResendForm() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  async function onResend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);

    setSending(true);
    try {
      await resendVerificationEmailFn({ data: { email: parsed.data } });
    } finally {
      setSending(false);
      toast.success(
        "Se esse e-mail existir e ainda não tiver sido confirmado, você receberá um novo link."
      );
    }
  }

  return (
    <form onSubmit={onResend} className="mt-6 space-y-3 border-t border-border pt-6 text-left">
      <p className="text-sm text-muted-foreground">
        Não conseguiu confirmar? Informe seu e-mail para receber um novo link.
      </p>
      <div>
        <Label htmlFor="resend-email">E-mail</Label>
        <Input
          id="resend-email"
          name="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <Button type="submit" className="w-full" size="lg" disabled={sending}>
        {sending ? "Enviando..." : "Reenviar e-mail de confirmação"}
      </Button>
    </form>
  );
}

function VerifyEmail() {
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      setStatus("error");
      setErrorMessage("Link de confirmação inválido: nenhum token foi informado.");
      return;
    }

    let cancelled = false;
    verifyEmailFn({ data: { token } })
      .then(() => {
        if (!cancelled) setStatus("success");
      })
      .catch((err: any) => {
        if (!cancelled) {
          setStatus("error");
          setErrorMessage(err?.message ?? "Não foi possível confirmar seu e-mail.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="container-page flex min-h-[80vh] items-center justify-center py-12">
      <div className="w-full max-w-md rounded-3xl bg-card p-8 shadow-elegant text-center">
        {status === "loading" && (
          <>
            <h1 className="mb-2 font-display text-3xl">Confirmando e-mail...</h1>
            <p className="text-sm text-muted-foreground">Aguarde um instante enquanto validamos seu link.</p>
          </>
        )}

        {status === "success" && (
          <>
            <h1 className="mb-2 font-display text-3xl">E-mail confirmado!</h1>
            <p className="mb-6 text-sm text-muted-foreground">Você já pode entrar.</p>
            <Link to="/login" className="font-medium text-accent hover:underline">
              Ir para o login
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <h1 className="mb-2 font-display text-3xl">Não foi possível confirmar</h1>
            <p className="mb-2 text-sm text-muted-foreground">{errorMessage}</p>
            <Link to="/login" className="text-sm font-medium text-accent hover:underline">
              Voltar para o login
            </Link>
            <ResendForm />
          </>
        )}
      </div>
    </div>
  );
}
