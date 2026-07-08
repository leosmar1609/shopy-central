import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Mail, MessageCircle, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WHATSAPP_LINK } from "@/lib/social-links";

export const Route = createFileRoute("/contact")({ component: Contact });

const schema = z.object({
  name: z.string().min(2, "Informe seu nome"),
  email: z.string().email("Informe um e-mail válido"),
  subject: z.string().min(2, "Informe o assunto"),
  message: z.string().min(10, "Sua mensagem deve ter ao menos 10 caracteres"),
});

function Contact() {
  const [submitting, setSubmitting] = useState(false);
  const whatsappConfigured = WHATSAPP_LINK.trim().length > 0;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const parsed = schema.safeParse(Object.fromEntries(fd));
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setSubmitting(true);
    // Ainda não existe um backend real de atendimento (ticket/e-mail) conectado
    // a este formulário — um próximo passo é integrar com um serviço de suporte
    // ou envio de e-mail transacional. Por ora, apenas confirmamos visualmente.
    setTimeout(() => {
      toast.success("Mensagem enviada! Retornaremos em breve.");
      form.reset();
      setSubmitting(false);
    }, 400);
  }

  return (
    <div className="container-page py-12 md:py-16">
      <div className="mb-10 text-center">
        <h1 className="font-display text-4xl md:text-5xl">Fale com a gente</h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Dúvidas, sugestões ou precisa de ajuda com um pedido? Estamos por aqui para te ouvir.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <form onSubmit={handleSubmit} className="rounded-2xl bg-card p-6 shadow-card md:p-8">
          <h2 className="mb-4 font-display text-xl">Envie uma mensagem</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input id="name" name="name" required />
            </div>
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="subject">Assunto</Label>
              <Input id="subject" name="subject" required />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="message">Mensagem</Label>
              <Textarea id="message" name="message" rows={6} required />
            </div>
          </div>
          <Button type="submit" size="lg" className="mt-6 w-full sm:w-auto" disabled={submitting}>
            {submitting ? "Enviando..." : "Enviar mensagem"}
          </Button>
        </form>

        <aside className="h-fit space-y-6">
          <div className="rounded-2xl bg-card p-6 shadow-card">
            <h2 className="mb-4 font-display text-xl">Outros canais</h2>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-3">
                <Mail className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                {/* TODO: substituir pelo e-mail real da empresa */}
                <span>lumiereoficial2@gmail.com</span>
              </li>
              <li className="flex items-center gap-3">
                <MessageCircle className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                {whatsappConfigured ? (
                  <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer" className="hover:text-foreground">
                    Fale pelo WhatsApp
                  </a>
                ) : (
                  <span
                    aria-disabled="true"
                    title="WhatsApp — em breve"
                    className="cursor-not-allowed text-muted-foreground/60"
                  >
                    WhatsApp (em breve)
                  </span>
                )}
              </li>
              <li className="flex items-center gap-3">
                <Clock className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                {/* TODO: confirmar horário real de atendimento */}
                <span>Segunda a sexta, 9h às 18h</span>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                <span>Rua Apeninos, 1126 — Paraíso, São Paulo/SP — 04104-021</span>
              </li>
            </ul>
          </div>

          <div className="overflow-hidden rounded-2xl shadow-card">
            <iframe
              title="Localização da Lumière"
              src="https://www.google.com/maps?q=Rua+Apeninos,+1126,+Paraíso,+São+Paulo,+SP,+04104-021&output=embed"
              className="h-56 w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
