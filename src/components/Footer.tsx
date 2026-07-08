import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Instagram,
  Facebook,
  Youtube,
  Linkedin,
  Twitter,
  Music2,
  MessageCircle,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import { SOCIAL_LINKS, WHATSAPP_LINK, isSocialLinkConfigured, type SocialLink } from "@/lib/social-links";

// lucide-react (v0.575) não possui ícones oficiais de TikTok ou WhatsApp.
// Usamos Music2 como substituto visual para TikTok e MessageCircle para WhatsApp.
const SOCIAL_ICONS: Record<SocialLink["icon"], React.ComponentType<{ className?: string }>> = {
  instagram: Instagram,
  facebook: Facebook,
  tiktok: Music2,
  youtube: Youtube,
  linkedin: Linkedin,
  x: Twitter,
  whatsapp: MessageCircle,
};

function SocialIconLink({ link }: { link: SocialLink }) {
  const Icon = SOCIAL_ICONS[link.icon];
  const configured = isSocialLinkConfigured(link);

  if (!configured) {
    return (
      <span
        aria-disabled="true"
        aria-label={`${link.name} (em breve)`}
        title={`${link.name} — em breve`}
        className="flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-full border border-border/60 text-muted-foreground/50"
      >
        <Icon className="h-4 w-4" />
      </span>
    );
  }

  return (
    <a
      href={link.href}
      target="_blank"
      rel="noreferrer"
      aria-label={link.name}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-colors hover:border-accent hover:text-accent"
    >
      <Icon className="h-4 w-4" />
    </a>
  );
}

function WhatsAppIconLink() {
  const configured = WHATSAPP_LINK.trim().length > 0;

  if (!configured) {
    return (
      <span
        aria-disabled="true"
        aria-label="WhatsApp (em breve)"
        title="WhatsApp — em breve"
        className="flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-full border border-border/60 text-muted-foreground/50"
      >
        <MessageCircle className="h-4 w-4" />
      </span>
    );
  }

  return (
    <a
      href={WHATSAPP_LINK}
      target="_blank"
      rel="noreferrer"
      aria-label="WhatsApp"
      className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-colors hover:border-accent hover:text-accent"
    >
      <MessageCircle className="h-4 w-4" />
    </a>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function Footer() {
  const [email, setEmail] = useState("");

  function handleNewsletterSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      toast.error("Informe um e-mail válido.");
      return;
    }
    // Não há integração real com um serviço de newsletter ainda — este é um
    // retorno apenas visual. Uma integração futura (ex: Mailchimp/Resend) deve
    // substituir este comentário por uma chamada de servidor real.
    toast.success("Inscrito com sucesso!");
    setEmail("");
  }

  return (
    <footer className="mt-24 border-t border-border/60 bg-secondary/40">
      <div className="container-page grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-1">
          <div className="font-display text-2xl">Lumière</div>
          <p className="max-w-xs text-sm text-muted-foreground">
            Curadoria de produtos modernos para uma vida com mais brilho.
          </p>
          <div className="flex flex-wrap gap-2">
            {SOCIAL_LINKS.map((link) => (
              <SocialIconLink key={link.name} link={link} />
            ))}
            <WhatsAppIconLink />
          </div>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold">Loja</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/shop" className="hover:text-foreground">Todos os produtos</Link></li>
            <li><Link to="/shop" className="hover:text-foreground">Categorias</Link></li>
            <li><Link to="/shop" className="hover:text-foreground">Promoções</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold">Empresa</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/about" className="hover:text-foreground">Sobre nós</Link></li>
            <li><Link to="/contact" className="hover:text-foreground">Contato</Link></li>
            <li><Link to="/faq" className="hover:text-foreground">Perguntas frequentes</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold">Legal</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/privacy" className="hover:text-foreground">Política de privacidade</Link></li>
            <li><Link to="/terms" className="hover:text-foreground">Termos de uso</Link></li>
            <li><Link to="/returns" className="hover:text-foreground">Trocas e devoluções</Link></li>
          </ul>
        </div>

        <div className="space-y-6 md:col-span-2 lg:col-span-1">
          <div>
            <h4 className="mb-3 text-sm font-semibold">Contato</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {/* TODO: telefone ainda é placeholder — substitua pelo número real */}
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                <span>(11) 94942-2043</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                <span>lumiereoficial2@gmail.com</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                <span>Rua Apeninos, 1126 — Paraíso, São Paulo/SP — 04104-021</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold">Newsletter</h4>
            <p className="mb-3 text-sm text-muted-foreground">Receba novidades e ofertas.</p>
            <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
              <label htmlFor="footer-newsletter-email" className="sr-only">
                Seu e-mail
              </label>
              <input
                id="footer-newsletter-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Seu e-mail"
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="submit"
                className="rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                OK
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="border-t border-border/60 py-6">
        <div className="container-page flex flex-col items-center justify-between gap-3 text-xs text-muted-foreground md:flex-row">
          <span>© {new Date().getFullYear()} Lumière. Todos os direitos reservados.</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
              Compra 100% segura
            </span>
            <span className="flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
              PIX, Boleto e Cartão
            </span>
          </div>
          <span>Feito com cuidado.</span>
        </div>
      </div>
    </footer>
  );
}
