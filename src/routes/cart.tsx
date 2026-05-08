import { createFileRoute, Link } from "@tanstack/react-router";
import { Trash2, Minus, Plus, ShoppingBag } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { formatBRL } from "@/lib/format";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/cart")({ component: Cart });

function Cart() {
  const { items, setQty, remove, subtotal } = useCart();
  const shipping = subtotal === 0 ? 0 : subtotal >= 199 ? 0 : 24.9;
  const total = subtotal + shipping;

  if (items.length === 0) {
    return (
      <div className="container-page flex flex-col items-center py-24 text-center">
        <ShoppingBag className="mb-4 h-12 w-12 text-muted-foreground" />
        <h1 className="font-display text-3xl">Seu carrinho está vazio</h1>
        <p className="mt-2 text-muted-foreground">Que tal explorar nossa coleção?</p>
        <Button className="mt-6" asChild><Link to="/shop">Ir para a loja</Link></Button>
      </div>
    );
  }

  return (
    <div className="container-page py-12">
      <h1 className="mb-8 font-display text-4xl">Carrinho</h1>
      <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
        <ul className="space-y-4">
          {items.map((it) => (
            <li key={it.id} className="flex gap-4 rounded-2xl bg-card p-4 shadow-card">
              <div className="h-24 w-24 overflow-hidden rounded-xl bg-muted">
                {it.image_url && <img src={it.image_url} alt={it.name} className="h-full w-full object-cover" />}
              </div>
              <div className="flex flex-1 flex-col">
                <Link to="/product/$slug" params={{ slug: it.slug }} className="font-medium hover:text-accent">{it.name}</Link>
                <div className="mt-1 text-sm text-muted-foreground">{formatBRL(it.price)}</div>
                <div className="mt-auto flex items-center justify-between">
                  <div className="flex items-center rounded-full border border-input">
                    <button className="px-2 py-1" onClick={() => setQty(it.id, it.quantity - 1)}><Minus className="h-3 w-3" /></button>
                    <span className="w-8 text-center text-sm">{it.quantity}</span>
                    <button className="px-2 py-1" onClick={() => setQty(it.id, it.quantity + 1)}><Plus className="h-3 w-3" /></button>
                  </div>
                  <button onClick={() => remove(it.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="text-right font-semibold">{formatBRL(it.price * it.quantity)}</div>
            </li>
          ))}
        </ul>

        <aside className="h-fit rounded-2xl bg-card p-6 shadow-card">
          <h2 className="mb-4 font-display text-xl">Resumo</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatBRL(subtotal)}</dd></div>
            <div className="flex justify-between"><dt>Frete</dt><dd>{shipping === 0 ? "Grátis" : formatBRL(shipping)}</dd></div>
          </dl>
          <div className="my-4 border-t border-border" />
          <div className="flex justify-between text-lg font-semibold"><span>Total</span><span>{formatBRL(total)}</span></div>
          <Button className="mt-6 w-full" size="lg" asChild>
            <Link to="/checkout">Finalizar compra</Link>
          </Button>
          <Button variant="outline" className="mt-2 w-full" asChild>
            <Link to="/shop">Continuar comprando</Link>
          </Button>
        </aside>
      </div>
    </div>
  );
}
