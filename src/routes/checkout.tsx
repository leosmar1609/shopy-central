import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";

export const Route = createFileRoute("/checkout")({ component: Checkout });

const schema = z.object({
  name: z.string().min(2, "Nome obrigatório").max(120),
  address: z.string().min(4, "Endereço obrigatório").max(200),
  city: z.string().min(2).max(80),
  zip: z.string().min(5).max(20),
  country: z.string().min(2).max(80),
  payment: z.enum(["credit", "pix", "boleto"]),
});

function Checkout() {
  const { items, subtotal, clear } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const shipping = subtotal === 0 ? 0 : subtotal >= 199 ? 0 : 24.9;
  const total = subtotal + shipping;

  if (items.length === 0) {
    return (
      <div className="container-page py-24 text-center">
        <p className="text-muted-foreground">Adicione produtos ao carrinho primeiro.</p>
        <Button className="mt-4" asChild><Link to="/shop">Ir à loja</Link></Button>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) {
      toast.error("Você precisa entrar para finalizar a compra");
      navigate({ to: "/login" });
      return;
    }
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse(Object.fromEntries(fd));
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    const v = parsed.data;
    setSubmitting(true);
    try {
      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          status: "pending",
          subtotal,
          shipping,
          total,
          payment_method: v.payment,
          shipping_name: v.name,
          shipping_address: v.address,
          shipping_city: v.city,
          shipping_zip: v.zip,
          shipping_country: v.country,
        })
        .select()
        .single();
      if (error) throw error;

      const { error: itemsErr } = await supabase.from("order_items").insert(
        items.map((i) => ({
          order_id: order.id,
          product_id: i.id,
          product_name: i.name,
          product_image: i.image_url,
          unit_price: i.price,
          quantity: i.quantity,
        }))
      );
      if (itemsErr) throw itemsErr;

      clear();
      toast.success("Pedido realizado com sucesso!");
      navigate({ to: "/" });
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao criar pedido");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container-page py-12">
      <h1 className="mb-8 font-display text-4xl">Checkout</h1>
      <form onSubmit={handleSubmit} className="grid gap-10 lg:grid-cols-[1fr_380px]">
        <div className="space-y-8">
          <section className="rounded-2xl bg-card p-6 shadow-card">
            <h2 className="mb-4 font-display text-xl">Endereço de entrega</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><Label htmlFor="name">Nome completo</Label><Input id="name" name="name" required /></div>
              <div className="sm:col-span-2"><Label htmlFor="address">Endereço</Label><Input id="address" name="address" required /></div>
              <div><Label htmlFor="city">Cidade</Label><Input id="city" name="city" required /></div>
              <div><Label htmlFor="zip">CEP</Label><Input id="zip" name="zip" required /></div>
              <div className="sm:col-span-2"><Label htmlFor="country">País</Label><Input id="country" name="country" defaultValue="Brasil" required /></div>
            </div>
          </section>

          <section className="rounded-2xl bg-card p-6 shadow-card">
            <h2 className="mb-4 font-display text-xl">Pagamento</h2>
            <RadioGroup name="payment" defaultValue="credit" className="grid gap-3">
              {[
                { v: "credit", l: "Cartão de crédito" },
                { v: "pix", l: "PIX (5% off)" },
                { v: "boleto", l: "Boleto bancário" },
              ].map((o) => (
                <label key={o.v} className="flex cursor-pointer items-center gap-3 rounded-xl border border-input p-3 has-[:checked]:border-accent has-[:checked]:bg-accent/5">
                  <RadioGroupItem value={o.v} id={o.v} />
                  <span>{o.l}</span>
                </label>
              ))}
            </RadioGroup>
          </section>
        </div>

        <aside className="h-fit rounded-2xl bg-card p-6 shadow-card">
          <h2 className="mb-4 font-display text-xl">Seu pedido</h2>
          <ul className="space-y-2 text-sm">
            {items.map((i) => (
              <li key={i.id} className="flex justify-between"><span>{i.name} ×{i.quantity}</span><span>{formatBRL(i.price * i.quantity)}</span></li>
            ))}
          </ul>
          <div className="my-4 border-t border-border" />
          <div className="flex justify-between text-sm"><span>Subtotal</span><span>{formatBRL(subtotal)}</span></div>
          <div className="flex justify-between text-sm"><span>Frete</span><span>{shipping === 0 ? "Grátis" : formatBRL(shipping)}</span></div>
          <div className="mt-3 flex justify-between text-lg font-semibold"><span>Total</span><span>{formatBRL(total)}</span></div>
          <Button type="submit" size="lg" className="mt-6 w-full" disabled={submitting}>
            {submitting ? "Processando..." : "Confirmar pedido"}
          </Button>
        </aside>
      </form>
    </div>
  );
}
