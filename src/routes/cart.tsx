import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Trash2, Minus, Plus, ShoppingBag, Tag, Truck, X } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { formatBRL } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { validateCouponFn } from "@/fns/coupons";
import { calculateShipping, estimateCartWeightKg } from "@/lib/shipping";
import { maskCEP, onlyDigits } from "@/lib/masks";

export const Route = createFileRoute("/cart")({ component: Cart });

// Persisted so checkout.tsx can pick it up and re-validate server-side after navigation.
const COUPON_KEY = "lovable_coupon_v1";
// Bonus continuity: if checkout.tsx ever wants to prefill its address CEP, it can read
// this. Cart-local shipping estimate remains fully authoritative-free either way —
// checkout always recomputes shipping server-side from the address the user confirms there.
const CEP_KEY = "lovable_cart_cep_v1";

type AppliedCoupon = { code: string; discount: number };

function Cart() {
  const { items, setQty, remove, subtotal } = useCart();
  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [cep, setCep] = useState("");
  const discount = appliedCoupon?.discount ?? 0;

  const cepDigits = onlyDigits(cep);
  const freeAlready = subtotal >= 199;

  // Pure/synchronous — no loading state needed. Recalculates whenever the CEP, cart
  // contents, or subtotal change. Before a valid 8-digit CEP is entered we don't show a
  // shipping estimate at all, unless the subtotal already qualifies for free shipping
  // (in which case the CEP digits don't affect the result anyway).
  const shippingEstimate = useMemo(() => {
    if (!freeAlready && cepDigits.length < 8) return null;
    return calculateShipping({
      destinationCep: cep,
      totalWeightKg: estimateCartWeightKg(items),
      subtotal,
    });
  }, [cep, cepDigits, items, subtotal, freeAlready]);

  const shipping = shippingEstimate?.cost ?? 0;
  const total = Math.max(0, subtotal - discount + shipping);

  const handleApplyCoupon = async () => {
    const code = coupon.trim();
    if (!code) return;
    setApplyingCoupon(true);
    try {
      const result = await validateCouponFn({ data: { code, subtotal } });
      if (result.valid) {
        setAppliedCoupon({ code: result.coupon.code, discount: result.discount });
        toast.success(`Cupom ${result.coupon.code} aplicado!`);
      } else {
        setAppliedCoupon(null);
        toast.error(result.reason);
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Não foi possível validar o cupom.");
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCoupon("");
  };

  const handleCheckoutClick = () => {
    try {
      if (appliedCoupon) {
        sessionStorage.setItem(COUPON_KEY, JSON.stringify({ code: appliedCoupon.code }));
      } else {
        sessionStorage.removeItem(COUPON_KEY);
      }
      if (cepDigits.length === 8) {
        sessionStorage.setItem(CEP_KEY, cep);
      } else {
        sessionStorage.removeItem(CEP_KEY);
      }
    } catch {}
  };

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
                    <button
                      className="px-2 py-1"
                      aria-label="Diminuir quantidade"
                      onClick={() => setQty(it.id, it.quantity - 1)}
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-8 text-center text-sm transition-all">{it.quantity}</span>
                    <button
                      className="px-2 py-1"
                      aria-label="Aumentar quantidade"
                      onClick={() => setQty(it.id, it.quantity + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <button
                    onClick={() => remove(it.id)}
                    aria-label="Remover item do carrinho"
                    className="text-muted-foreground hover:text-destructive"
                  >
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

          <div className="mb-4">
            <label htmlFor="coupon" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Cupom de desconto
            </label>
            {appliedCoupon ? (
              <div className="flex items-center gap-1.5 rounded-xl border border-accent/30 bg-accent/5 px-3 py-2 text-sm font-medium text-accent">
                <Tag className="h-4 w-4" /> {appliedCoupon.code} aplicado
              </div>
            ) : (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="coupon"
                    value={coupon}
                    onChange={(e) => setCoupon(e.target.value)}
                    placeholder="Digite o código"
                    className="pl-9"
                    disabled={applyingCoupon}
                  />
                </div>
                <Button type="button" variant="outline" onClick={handleApplyCoupon} disabled={applyingCoupon}>
                  {applyingCoupon ? "..." : "Aplicar"}
                </Button>
              </div>
            )}
          </div>

          <div className="mb-4">
            <label htmlFor="cep" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Calcular frete
            </label>
            <div className="relative">
              <Truck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="cep"
                value={cep}
                onChange={(e) => setCep(maskCEP(e.target.value))}
                placeholder="00000-000"
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={9}
                className="pl-9"
              />
            </div>
            {shippingEstimate && !shippingEstimate.free && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                Chegará em até {shippingEstimate.etaDays} dia{shippingEstimate.etaDays === 1 ? "" : "s"} útil{shippingEstimate.etaDays === 1 ? "" : "eis"}
              </p>
            )}
          </div>

          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatBRL(subtotal)}</dd></div>
            {appliedCoupon && (
              <div className="flex justify-between text-accent">
                <dt className="flex items-center gap-1">
                  Desconto ({appliedCoupon.code})
                  <button type="button" onClick={handleRemoveCoupon} aria-label="Remover cupom" className="text-muted-foreground hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </dt>
                <dd>-{formatBRL(discount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt>Frete</dt>
              <dd>
                {shippingEstimate === null ? (
                  <span className="text-muted-foreground">Informe o CEP</span>
                ) : shippingEstimate.free ? (
                  "Grátis"
                ) : (
                  formatBRL(shippingEstimate.cost)
                )}
              </dd>
            </div>
          </dl>
          <div className="my-4 border-t border-border" />
          <div className="flex justify-between text-lg font-semibold"><span>Total</span><span>{formatBRL(total)}</span></div>
          <Button className="mt-6 w-full" size="lg" asChild>
            <Link to="/checkout" onClick={handleCheckoutClick}>Finalizar compra</Link>
          </Button>
          <Button variant="outline" className="mt-2 w-full" asChild>
            <Link to="/shop">Continuar comprando</Link>
          </Button>
        </aside>
      </div>
    </div>
  );
}
