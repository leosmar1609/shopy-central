import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border/60 bg-secondary/40">
      <div className="container-page grid gap-10 py-14 md:grid-cols-4">
        <div className="space-y-3">
          <div className="font-display text-2xl">Lumière</div>
          <p className="text-sm text-muted-foreground max-w-xs">
            Curadoria de produtos modernos para uma vida com mais brilho.
          </p>
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
            <li>Sobre nós</li>
            <li>Contato</li>
            <li>Trabalhe conosco</li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold">Newsletter</h4>
          <p className="text-sm text-muted-foreground mb-3">Receba novidades e ofertas.</p>
          <form className="flex gap-2">
            <input type="email" placeholder="Seu e-mail" className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
            <button className="rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90">OK</button>
          </form>
        </div>
      </div>
      <div className="border-t border-border/60 py-6">
        <div className="container-page flex flex-col items-center justify-between gap-2 text-xs text-muted-foreground md:flex-row">
          <span>© {new Date().getFullYear()} Lumière. Todos os direitos reservados.</span>
          <span>Feito com cuidado.</span>
        </div>
      </div>
    </footer>
  );
}
