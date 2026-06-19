import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import { loadMercadoPago } from "@mercadopago/sdk-js";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/hooks/useAuth";
import { createMercadoPagoDirectPaymentFn, createMercadoPagoChargeFn } from "@/fns/payments";
import { getStoredToken } from "@/lib/auth-client";
import { formatBRL } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";

export const Route = createFileRoute("/checkout")({ component: Checkout });

function detectBrandFromNumber(num: string): string {
  if (/^4/.test(num)) return 'visa';
  if (/^5[1-5]/.test(num)) return 'master';
  if (/^3[47]/.test(num)) return 'amex';
  if (/^(636368|636369|438935|504175|451416|636297|5067|4576|4011)/.test(num)) return 'elo';
  if (/^(6011|622|64|65)/.test(num)) return 'discover';
  if (/^(?:2131|1800|35)/.test(num)) return 'jcb';
  return 'visa';
}

const schema = z.object({
  name: z.string().min(2, "Nome obrigatório").max(120),
  address: z.string().min(4, "Endereço obrigatório").max(200),
  city: z.string().min(2).max(80),
  zip: z.string().min(5).max(20),
  country: z.string().min(2).max(80),
  payment: z.enum(["credit", "pix", "boleto"]),
});

type PixResult = {
  type: 'pix';
  qr_code: string;
  qr_code_base64: string;
  payment_id: number;
  order_id: string;
};
type BoletoResult = {
  type: 'boleto';
  boleto_url: string;
  barcode: string;
  payment_id: number;
  order_id: string;
};
type PaymentResult = PixResult | BoletoResult;

function Checkout() {
  const { items, subtotal, clear } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [paymentType, setPaymentType] = useState<'card' | 'pix' | 'boleto'>('card');
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [mpReady, setMpReady] = useState(false);

  const shipping = subtotal === 0 ? 0 : subtotal >= 199 ? 0 : 24.9;
  const total = subtotal + shipping;

  useEffect(() => {
    loadMercadoPago()
      .then(() => setMpReady(true))
      .catch(() => toast.error('Erro ao carregar Mercado Pago. Recarregue a página.'));
  }, []);

  if (items.length === 0 && !paymentResult) {
    return (
      <div className="container-page py-24 text-center">
        <p className="text-muted-foreground">Adicione produtos ao carrinho primeiro.</p>
        <Button className="mt-4" asChild><Link to="/shop">Ir à loja</Link></Button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container-page py-24 text-center">
        <p className="mb-4 text-lg font-medium">Você precisa fazer login para finalizar a compra.</p>
        <Button className="mt-4" asChild><Link to="/login">Entrar agora</Link></Button>
      </div>
    );
  }

  // --- PIX result ---
  if (paymentResult?.type === 'pix') {
    return (
      <div className="container-page py-12">
        <div className="mx-auto max-w-md text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10 text-3xl">✅</div>
          <h1 className="mb-2 font-display text-3xl">PIX gerado!</h1>
          <p className="mb-6 text-muted-foreground">
            Escaneie o QR Code ou copie o código Pix no seu app bancário.
          </p>
          {paymentResult.qr_code_base64 && (
            <div className="mx-auto mb-5 w-fit rounded-2xl border border-border bg-white p-4 shadow-card">
              <img
                src={`data:image/png;base64,${paymentResult.qr_code_base64}`}
                alt="QR Code PIX"
                className="h-52 w-52"
              />
            </div>
          )}
          {paymentResult.qr_code && (
            <div className="mb-4 text-left">
              <p className="mb-1 text-sm font-medium text-muted-foreground">Pix Copia e Cola</p>
              <div className="flex items-start gap-2 rounded-xl border border-input bg-muted p-3">
                <code className="flex-1 break-all text-xs leading-relaxed">{paymentResult.qr_code}</code>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="shrink-0"
                  onClick={() => {
                    navigator.clipboard.writeText(paymentResult.qr_code);
                    toast.success('Código copiado!');
                  }}
                >
                  Copiar
                </Button>
              </div>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Pedido #{paymentResult.payment_id} criado. Válido por 24h.
          </p>
          <Button className="mt-6 w-full" asChild>
            <Link to="/profile">Ver meus pedidos</Link>
          </Button>
        </div>
      </div>
    );
  }

  // --- Boleto result ---
  if (paymentResult?.type === 'boleto') {
    return (
      <div className="container-page py-12">
        <div className="mx-auto max-w-md">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/10 text-3xl">📄</div>
          <h1 className="mb-2 font-display text-3xl">Boleto gerado!</h1>
          <p className="mb-6 text-muted-foreground">
            Pague até a data de vencimento em qualquer banco, app ou lotérica.
          </p>
          {paymentResult.boleto_url && (
            <a
              href={paymentResult.boleto_url}
              target="_blank"
              rel="noreferrer"
              className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              📄 Abrir boleto (PDF)
            </a>
          )}
          {paymentResult.barcode && (
            <div className="mb-4">
              <p className="mb-1 text-sm font-medium text-muted-foreground">Linha digitável</p>
              <div className="flex items-start gap-2 rounded-xl border border-input bg-muted p-3">
                <code className="flex-1 break-all text-xs leading-relaxed">{paymentResult.barcode}</code>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="shrink-0"
                  onClick={() => {
                    navigator.clipboard.writeText(paymentResult.barcode);
                    toast.success('Código copiado!');
                  }}
                >
                  Copiar
                </Button>
              </div>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Pedido #{paymentResult.payment_id} aguardando pagamento.
          </p>
          <Button className="mt-6 w-full" asChild>
            <Link to="/profile">Ver meus pedidos</Link>
          </Button>
        </div>
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
    const token = getStoredToken();
    if (!token) {
      toast.error("Sessão expirada. Faça login novamente.");
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
      if (paymentType === 'card') {
        if (!mpReady) throw new Error('Mercado Pago ainda está carregando. Aguarde um momento.');

        const publicKey = import.meta.env.VITE_MP_PUBLIC_KEY as string | undefined;
        if (!publicKey) throw new Error('VITE_MP_PUBLIC_KEY não configurada.');

        const mp = new (window as any).MercadoPago(publicKey);
        const rawNumber = String(fd.get('card_number') || '').replace(/\D/g, '');
        const bin = rawNumber.slice(0, 6);
        const detectedBrand = await mp
          .getPaymentMethods({ bin })
          .then((r: any) => r?.results?.[0]?.id ?? detectBrandFromNumber(rawNumber))
          .catch(() => detectBrandFromNumber(rawNumber));

        const cardToken = await mp.createCardToken({
          cardNumber: String(fd.get('card_number') || '').replace(/\s/g, ''),
          cardholderName: String(fd.get('card_holder') || v.name),
          cardholderIdentification: { type: 'CPF', number: String(fd.get('cpf') || '').replace(/\D/g, '') },
          securityCode: String(fd.get('card_cvv') || ''),
          expirationMonth: String(fd.get('card_exp_month') || '').padStart(2, '0'),
          expirationYear: String(fd.get('card_exp_year') || ''),
        }).catch((err: any) => { throw new Error(err?.message || 'Erro ao processar cartão'); });

        if (!cardToken?.id) throw new Error('Falha ao criar token do cartão');

        const charge = await createMercadoPagoChargeFn({
          data: {
            token,
            order: {
              subtotal, shipping, total,
              payment_method: paymentType,
              shipping_name: v.name,
              shipping_address: v.address,
              shipping_city: v.city,
              shipping_zip: v.zip,
              shipping_country: v.country,
            },
            items: items.map((i) => ({
              product_id: i.id,
              product_name: i.name,
              product_image: i.image_url,
              unit_price: i.price,
              quantity: i.quantity,
            })),
            card_token: cardToken.id,
            installments: Number(fd.get('installments') || 1),
            payment_method_id: detectedBrand,
            cpf: String(fd.get('cpf') || ''),
          },
        });

        if (charge.payment?.status === 'approved') {
          clear();
          toast.success('Pagamento aprovado! Pedido criado.');
          navigate({ to: '/profile' });
        } else {
          toast.success('Pagamento criado, aguarde a confirmação.');
        }
      } else {
        const cpf = String(fd.get('cpf') || '').replace(/\D/g, '');
        if (cpf.length < 11) {
          toast.error('Informe um CPF válido para continuar.');
          return;
        }

        const response = await createMercadoPagoDirectPaymentFn({
          data: {
            token,
            payment_type: paymentType as 'pix' | 'boleto',
            order: {
              subtotal, shipping, total,
              payment_method: paymentType,
              shipping_name: v.name,
              shipping_address: v.address,
              shipping_city: v.city,
              shipping_zip: v.zip,
              shipping_country: v.country,
            },
            items: items.map((i) => ({
              product_id: i.id,
              product_name: i.name,
              product_image: i.image_url,
              unit_price: i.price,
              quantity: i.quantity,
            })),
            cpf,
          },
        });

        clear();
        setPaymentResult(response as PaymentResult);
      }
    } catch (err: any) {
      const errorMsg = err.message ?? 'Erro ao criar pedido';
      console.error('[Checkout Error]:', errorMsg, err);
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container-page py-12">
      <h1 className="mb-8 font-display text-4xl">Checkout</h1>
      <form onSubmit={handleSubmit} className="grid gap-10 lg:grid-cols-[1fr_380px]">
        <input type="hidden" name="payment" value={paymentType} />
        <div className="space-y-8">
          <section className="rounded-2xl bg-card p-6 shadow-card">
            <h2 className="mb-4 font-display text-xl">Endereço de entrega</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="address">Endereço</Label>
                <Input id="address" name="address" required />
              </div>
              <div>
                <Label htmlFor="city">Cidade</Label>
                <Input id="city" name="city" required />
              </div>
              <div>
                <Label htmlFor="zip">CEP</Label>
                <Input id="zip" name="zip" required />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="country">País</Label>
                <Input id="country" name="country" defaultValue="Brasil" required />
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-card p-6 shadow-card">
            <h2 className="mb-4 font-display text-xl">Pagamento</h2>
            <RadioGroup
              value={paymentType}
              onValueChange={(v) => setPaymentType(v as 'card' | 'pix' | 'boleto')}
              className="space-y-3"
            >
              <div className="flex cursor-pointer items-center space-x-3 rounded-2xl border border-input p-4 transition-colors hover:bg-accent/5">
                <RadioGroupItem value="card" id="payment-card" />
                <Label htmlFor="payment-card" className="flex-1 cursor-pointer font-medium">💳 Cartão de crédito</Label>
              </div>
              <div className="flex cursor-pointer items-center space-x-3 rounded-2xl border border-input p-4 transition-colors hover:bg-accent/5">
                <RadioGroupItem value="pix" id="payment-pix" />
                <Label htmlFor="payment-pix" className="flex-1 cursor-pointer font-medium">📱 PIX</Label>
              </div>
              <div className="flex cursor-pointer items-center space-x-3 rounded-2xl border border-input p-4 transition-colors hover:bg-accent/5">
                <RadioGroupItem value="boleto" id="payment-boleto" />
                <Label htmlFor="payment-boleto" className="flex-1 cursor-pointer font-medium">📄 Boleto bancário</Label>
              </div>
            </RadioGroup>

            {paymentType === 'card' && (
              <div className="mt-4 space-y-3">
                <div>
                  <Label htmlFor="card_holder">Nome no cartão</Label>
                  <Input id="card_holder" name="card_holder" />
                </div>
                <div>
                  <Label htmlFor="card_number">Número do cartão</Label>
                  <Input id="card_number" name="card_number" inputMode="numeric" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label htmlFor="card_exp_month">Mês</Label>
                    <Input id="card_exp_month" name="card_exp_month" inputMode="numeric" placeholder="MM" />
                  </div>
                  <div>
                    <Label htmlFor="card_exp_year">Ano</Label>
                    <Input id="card_exp_year" name="card_exp_year" inputMode="numeric" placeholder="YYYY" />
                  </div>
                  <div>
                    <Label htmlFor="card_cvv">CVV</Label>
                    <Input id="card_cvv" name="card_cvv" inputMode="numeric" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="cpf_card">CPF do titular</Label>
                  <Input id="cpf_card" name="cpf" inputMode="numeric" placeholder="000.000.000-00" />
                </div>
                <div>
                  <Label htmlFor="installments">Parcelas</Label>
                  <Input id="installments" name="installments" defaultValue="1" />
                </div>
              </div>
            )}

            {paymentType === 'pix' && (
              <div className="mt-4 space-y-3">
                <div className="rounded-lg bg-accent/5 p-3 text-sm text-muted-foreground">
                  Após confirmar, o QR Code PIX será gerado aqui mesmo para você pagar pelo Nubank, PicPay ou qualquer app bancário.
                </div>
                <div>
                  <Label htmlFor="cpf_pix">CPF do pagador</Label>
                  <Input id="cpf_pix" name="cpf" inputMode="numeric" placeholder="000.000.000-00" required />
                </div>
              </div>
            )}

            {paymentType === 'boleto' && (
              <div className="mt-4 space-y-3">
                <div className="rounded-lg bg-accent/5 p-3 text-sm text-muted-foreground">
                  O boleto será gerado aqui com a linha digitável para copiar ou PDF para imprimir/pagar em lotérica.
                </div>
                <div>
                  <Label htmlFor="cpf_boleto">CPF do pagador</Label>
                  <Input id="cpf_boleto" name="cpf" inputMode="numeric" placeholder="000.000.000-00" required />
                </div>
              </div>
            )}
          </section>
        </div>

        <aside className="h-fit rounded-2xl bg-card p-6 shadow-card">
          <h2 className="mb-4 font-display text-xl">Seu pedido</h2>
          <ul className="space-y-2 text-sm">
            {items.map((i) => (
              <li key={i.id} className="flex justify-between">
                <span>{i.name} ×{i.quantity}</span>
                <span>{formatBRL(i.price * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="my-4 border-t border-border" />
          <div className="flex justify-between text-sm">
            <span>Subtotal</span><span>{formatBRL(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Frete</span><span>{shipping === 0 ? "Grátis" : formatBRL(shipping)}</span>
          </div>
          <div className="mt-3 flex justify-between text-lg font-semibold">
            <span>Total</span><span>{formatBRL(total)}</span>
          </div>
          <Button type="submit" size="lg" className="mt-6 w-full" disabled={submitting}>
            {submitting ? "Processando..." : "Confirmar pedido"}
          </Button>
        </aside>
      </form>
    </div>
  );
}
