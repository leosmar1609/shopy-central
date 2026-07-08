import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { X } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/hooks/useAuth";
import { createAsaasDirectPaymentFn, createAsaasChargeFn } from "@/fns/payments";
import { validateCouponFn } from "@/fns/coupons";
import { fetchMyAddressesFn, createAddressFn, type Address } from "@/fns/addresses";
import { fetchMyProfileFn } from "@/fns/account";
import { getStoredToken } from "@/lib/auth-client";
import { formatBRL } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import {
  maskCEP,
  maskCPF,
  maskCardNumber,
  maskCVV,
  maskExpiryMonth,
  maskExpiryYear,
  maskPhone,
  isValidCPF,
  onlyDigits,
} from "@/lib/masks";
import { fetchAddressByCep } from "@/lib/viacep";

export const Route = createFileRoute("/checkout")({ component: Checkout });

// Written by cart.tsx when the user clicks "Finalizar compra" with a coupon applied.
// We only ever persist the code — the discount is always re-validated server-side here,
// since the subtotal (and therefore the amount charged via Asaas) is safety-critical.
const COUPON_KEY = "lovable_coupon_v1";

type AppliedCoupon = { code: string; discount: number };

const schema = z.object({
  name: z.string().min(2, "Nome obrigatório").max(120),
  address: z.string().min(4, "Endereço obrigatório").max(200),
  number: z.string().min(1, "Número obrigatório").max(20),
  complement: z.string().max(100).optional(),
  neighborhood: z.string().min(2, "Bairro obrigatório").max(100),
  city: z.string().min(2, "Cidade obrigatória").max(80),
  state: z.string().length(2, "UF deve ter 2 letras"),
  zip: z.string().min(8, "CEP obrigatório").max(20),
  country: z.string().min(2).max(80),
  phone: z.string().min(8, "Telefone obrigatório").max(20),
  payment: z.enum(["card", "pix", "boleto"]),
});

type AddressState = {
  address: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  zip: string;
  country: string;
};

type PixResult = {
  type: 'pix';
  qr_code: string;
  qr_code_base64: string;
  payment_id: string;
  order_id: string;
};
type BoletoResult = {
  type: 'boleto';
  boleto_url: string;
  barcode: string;
  payment_id: string;
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
  const [address, setAddress] = useState<AddressState>({
    address: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    zip: "",
    country: "Brasil",
  });
  const [cepLoading, setCepLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const lastCepRef = useRef<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const couponCheckedRef = useRef(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("new");
  const [saveNewAddress, setSaveNewAddress] = useState(false);
  const defaultAddressAppliedRef = useRef(false);

  const token = getStoredToken();
  const addressesQuery = useQuery({
    queryKey: ["my-addresses"],
    queryFn: () => fetchMyAddressesFn({ data: { token: token ?? "" } }),
    enabled: !!user && !!token,
  });
  const profileQuery = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => fetchMyProfileFn({ data: { token: token ?? "" } }),
    enabled: !!user && !!token,
  });

  function applyAddress(addr: Address) {
    setAddress({
      address: addr.address,
      number: addr.number,
      complement: addr.complement ?? "",
      neighborhood: addr.neighborhood,
      city: addr.city,
      state: addr.state,
      zip: maskCEP(addr.zip),
      country: addr.country,
    });
    if (nameInputRef.current) nameInputRef.current.value = addr.recipient_name;
    if (phoneInputRef.current) phoneInputRef.current.value = maskPhone(addr.phone);
    lastCepRef.current = onlyDigits(addr.zip);
    setFieldErrors({});
  }

  function clearAddressForm() {
    setAddress({
      address: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      zip: "",
      country: "Brasil",
    });
    if (nameInputRef.current) nameInputRef.current.value = "";
    if (phoneInputRef.current) phoneInputRef.current.value = "";
    lastCepRef.current = null;
    setFieldErrors({});
  }

  // Pré-seleciona o endereço padrão (ou o primeiro salvo) assim que a lista carrega.
  useEffect(() => {
    if (defaultAddressAppliedRef.current) return;
    const list = addressesQuery.data;
    if (!list) return;
    defaultAddressAppliedRef.current = true;
    const preferred = list.find((a) => a.is_default) ?? list[0];
    if (preferred) {
      setSelectedAddressId(preferred.id);
      applyAddress(preferred);
    }
  }, [addressesQuery.data]);

  // Re-validate whatever coupon code cart.tsx persisted, server-side, against this
  // cart's current subtotal — never trust a client-stored discount amount.
  useEffect(() => {
    if (couponCheckedRef.current) return;
    if (items.length === 0) return; // wait for cart items to hydrate from sessionStorage
    couponCheckedRef.current = true;

    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem(COUPON_KEY);
    } catch {}
    if (!raw) return;

    let code: string | undefined;
    try {
      code = JSON.parse(raw)?.code;
    } catch {}
    if (!code) return;

    validateCouponFn({ data: { code, subtotal } })
      .then((result) => {
        if (result.valid) {
          setAppliedCoupon({ code: result.coupon.code, discount: result.discount });
        } else {
          try {
            sessionStorage.removeItem(COUPON_KEY);
          } catch {}
          toast("Cupom removido", { description: result.reason });
        }
      })
      .catch(() => {
        // Validation failed unexpectedly — drop the coupon silently rather than block checkout.
        try {
          sessionStorage.removeItem(COUPON_KEY);
        } catch {}
      });
  }, [items.length, subtotal]);

  function handleRemoveCoupon() {
    setAppliedCoupon(null);
    try {
      sessionStorage.removeItem(COUPON_KEY);
    } catch {}
  }

  // Best-effort: se falhar, não deve derrubar um pedido que já foi criado com sucesso.
  async function maybeSaveAddress(v: z.infer<typeof schema>, authToken: string) {
    if (selectedAddressId !== "new" || !saveNewAddress) return;
    try {
      await createAddressFn({
        data: {
          token: authToken,
          address: {
            label: "Endereço",
            recipient_name: v.name,
            phone: v.phone,
            zip: v.zip,
            address: v.address,
            number: v.number,
            complement: v.complement || undefined,
            neighborhood: v.neighborhood,
            city: v.city,
            state: v.state,
            country: v.country,
            is_default: (addressesQuery.data?.length ?? 0) === 0,
          },
        },
      });
    } catch {}
  }

  function clearFieldError(field: string) {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function setAddressField<K extends keyof AddressState>(key: K, value: AddressState[K]) {
    setAddress((prev) => ({ ...prev, [key]: value }));
    clearFieldError(key);
  }

  async function handleCepChange(e: React.ChangeEvent<HTMLInputElement>) {
    const masked = maskCEP(e.target.value);
    setAddressField("zip", masked);
    const digits = onlyDigits(masked);
    if (digits.length !== 8) return;
    if (lastCepRef.current === digits) return;
    lastCepRef.current = digits;
    setCepLoading(true);
    try {
      const result = await fetchAddressByCep(digits);
      if (result.ok) {
        setAddress((prev) => ({
          ...prev,
          address: result.address.street || prev.address,
          neighborhood: result.address.neighborhood || prev.neighborhood,
          city: result.address.city || prev.city,
          state: result.address.state || prev.state,
        }));
        clearFieldError("address");
        clearFieldError("neighborhood");
        clearFieldError("city");
        clearFieldError("state");
      } else if (result.reason === "not_found") {
        toast.error("CEP não encontrado. Verifique o número ou preencha o endereço manualmente.");
      } else if (result.reason === "network") {
        toast.error("Não foi possível consultar o CEP agora. Preencha o endereço manualmente.");
      }
    } finally {
      setCepLoading(false);
    }
  }

  const shipping = subtotal === 0 ? 0 : subtotal >= 199 ? 0 : 24.9;
  const discount = appliedCoupon?.discount ?? 0;
  const total = Math.max(0, subtotal - discount + shipping);

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
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        if (!errs[key]) errs[key] = issue.message;
      }
      setFieldErrors(errs);
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setFieldErrors({});
    const v = parsed.data;
    setSubmitting(true);

    try {
      const shippingAddress = `${v.address}, ${v.number}`;

      if (paymentType === 'card') {
        const cpf = String(fd.get('cpf') || '').replace(/\D/g, '');
        if (!isValidCPF(cpf)) {
          toast.error('CPF inválido. Verifique os números digitados.');
          setFieldErrors((prev) => ({ ...prev, cpf: 'CPF inválido. Verifique os números digitados.' }));
          setSubmitting(false);
          return;
        }

        const charge = await createAsaasChargeFn({
          data: {
            token,
            order: {
              subtotal, shipping, total,
              payment_method: paymentType,
              shipping_name: v.name,
              shipping_address: shippingAddress,
              shipping_city: v.city,
              shipping_zip: v.zip,
              shipping_country: v.country,
              shipping_neighborhood: v.neighborhood,
              shipping_state: v.state,
              shipping_complement: v.complement || undefined,
              coupon_code: appliedCoupon?.code,
              discount,
            },
            items: items.map((i) => ({
              product_id: i.id,
              product_name: i.name,
              product_image: i.image_url,
              unit_price: i.price,
              quantity: i.quantity,
            })),
            cpf,
            phone: v.phone,
            address_number: v.number,
            card_holder_name: String(fd.get('card_holder') || v.name),
            card_number: String(fd.get('card_number') || '').replace(/\s/g, ''),
            card_expiry_month: String(fd.get('card_exp_month') || ''),
            card_expiry_year: String(fd.get('card_exp_year') || ''),
            card_cvv: String(fd.get('card_cvv') || ''),
          },
        });

        handleRemoveCoupon();
        await maybeSaveAddress(v, token);

        if (charge.order_status === 'paid') {
          clear();
          toast.success('Pagamento aprovado! Pedido criado.');
          navigate({ to: '/profile' });
        } else {
          toast.success('Pagamento criado, aguarde a confirmação.');
        }
      } else {
        const cpf = String(fd.get('cpf') || '').replace(/\D/g, '');
        if (!isValidCPF(cpf)) {
          toast.error('CPF inválido. Verifique os números digitados.');
          setFieldErrors((prev) => ({ ...prev, cpf: 'CPF inválido. Verifique os números digitados.' }));
          setSubmitting(false);
          return;
        }

        const response = await createAsaasDirectPaymentFn({
          data: {
            token,
            payment_type: paymentType as 'pix' | 'boleto',
            order: {
              subtotal, shipping, total,
              payment_method: paymentType,
              shipping_name: v.name,
              shipping_address: shippingAddress,
              shipping_city: v.city,
              shipping_zip: v.zip,
              shipping_country: v.country,
              shipping_neighborhood: v.neighborhood,
              shipping_state: v.state,
              shipping_complement: v.complement || undefined,
              coupon_code: appliedCoupon?.code,
              discount,
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

        handleRemoveCoupon();
        await maybeSaveAddress(v, token);
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

            {addressesQuery.data && addressesQuery.data.length > 0 && (
              <div className="mb-6">
                <p className="mb-2 text-sm font-medium text-muted-foreground">Endereços salvos</p>
                <RadioGroup
                  value={selectedAddressId}
                  onValueChange={(val) => {
                    setSelectedAddressId(val);
                    if (val === "new") {
                      clearAddressForm();
                    } else {
                      const addr = addressesQuery.data?.find((a) => a.id === val);
                      if (addr) applyAddress(addr);
                    }
                  }}
                  className="space-y-2"
                >
                  {addressesQuery.data.map((addr) => (
                    <label
                      key={addr.id}
                      htmlFor={`addr-${addr.id}`}
                      className="flex cursor-pointer items-start gap-3 rounded-xl border border-input p-3 text-sm transition-colors hover:bg-accent/5"
                    >
                      <RadioGroupItem value={addr.id} id={`addr-${addr.id}`} className="mt-0.5" />
                      <span>
                        <span className="font-medium">{addr.label}</span>
                        {!!addr.is_default && (
                          <span className="ml-2 rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent">
                            Padrão
                          </span>
                        )}
                        <br />
                        <span className="text-muted-foreground">
                          {addr.address}, {addr.number}
                          {addr.complement ? ` - ${addr.complement}` : ""} — {addr.neighborhood},{" "}
                          {addr.city}/{addr.state}
                        </span>
                      </span>
                    </label>
                  ))}
                  <label
                    htmlFor="addr-new"
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-input p-3 text-sm transition-colors hover:bg-accent/5"
                  >
                    <RadioGroupItem value="new" id="addr-new" />
                    <span className="font-medium">Usar um novo endereço</span>
                  </label>
                </RadioGroup>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input
                  id="name"
                  name="name"
                  ref={nameInputRef}
                  required
                  onChange={() => clearFieldError("name")}
                />
                {fieldErrors.name && <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>}
              </div>
              <div>
                <Label htmlFor="zip">CEP</Label>
                <Input
                  id="zip"
                  name="zip"
                  inputMode="numeric"
                  placeholder="00000-000"
                  value={address.zip}
                  onChange={handleCepChange}
                  required
                />
                {cepLoading && (
                  <p className="mt-1 text-xs text-muted-foreground">Buscando endereço...</p>
                )}
                {fieldErrors.zip && <p className="mt-1 text-xs text-red-600">{fieldErrors.zip}</p>}
              </div>
              <div>
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  name="address"
                  value={address.address}
                  onChange={(e) => setAddressField("address", e.target.value)}
                  required
                />
                {fieldErrors.address && <p className="mt-1 text-xs text-red-600">{fieldErrors.address}</p>}
              </div>
              <div>
                <Label htmlFor="number">Número</Label>
                <Input
                  id="number"
                  name="number"
                  value={address.number}
                  onChange={(e) => setAddressField("number", e.target.value)}
                  required
                />
                {fieldErrors.number && <p className="mt-1 text-xs text-red-600">{fieldErrors.number}</p>}
              </div>
              <div>
                <Label htmlFor="complement">Complemento (opcional)</Label>
                <Input
                  id="complement"
                  name="complement"
                  placeholder="Apto 42"
                  value={address.complement}
                  onChange={(e) => setAddressField("complement", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="neighborhood">Bairro</Label>
                <Input
                  id="neighborhood"
                  name="neighborhood"
                  value={address.neighborhood}
                  onChange={(e) => setAddressField("neighborhood", e.target.value)}
                  required
                />
                {fieldErrors.neighborhood && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.neighborhood}</p>
                )}
              </div>
              <div>
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  name="city"
                  value={address.city}
                  onChange={(e) => setAddressField("city", e.target.value)}
                  required
                />
                {fieldErrors.city && <p className="mt-1 text-xs text-red-600">{fieldErrors.city}</p>}
              </div>
              <div>
                <Label htmlFor="state">Estado (UF)</Label>
                <Input
                  id="state"
                  name="state"
                  maxLength={2}
                  placeholder="SP"
                  value={address.state}
                  onChange={(e) => setAddressField("state", e.target.value.toUpperCase().slice(0, 2))}
                  required
                />
                {fieldErrors.state && <p className="mt-1 text-xs text-red-600">{fieldErrors.state}</p>}
              </div>
              <div>
                <Label htmlFor="country">País</Label>
                <Input
                  id="country"
                  name="country"
                  value={address.country}
                  onChange={(e) => setAddressField("country", e.target.value)}
                  required
                />
                {fieldErrors.country && <p className="mt-1 text-xs text-red-600">{fieldErrors.country}</p>}
              </div>
              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  name="phone"
                  ref={phoneInputRef}
                  inputMode="tel"
                  placeholder="(11) 99999-9999"
                  onChange={(e) => {
                    e.target.value = maskPhone(e.target.value);
                    clearFieldError("phone");
                  }}
                  required
                />
                {fieldErrors.phone && <p className="mt-1 text-xs text-red-600">{fieldErrors.phone}</p>}
              </div>
            </div>

            {selectedAddressId === "new" && (
              <div className="mt-4 flex items-center gap-2">
                <Checkbox
                  id="save_address"
                  checked={saveNewAddress}
                  onCheckedChange={(checked) => setSaveNewAddress(checked === true)}
                />
                <Label htmlFor="save_address" className="cursor-pointer text-sm font-normal">
                  Salvar este endereço para próximas compras
                </Label>
              </div>
            )}
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
                  <Input
                    id="card_number"
                    name="card_number"
                    inputMode="numeric"
                    placeholder="0000 0000 0000 0000"
                    onChange={(e) => { e.target.value = maskCardNumber(e.target.value); }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label htmlFor="card_exp_month">Mês</Label>
                    <Input
                      id="card_exp_month"
                      name="card_exp_month"
                      inputMode="numeric"
                      placeholder="MM"
                      onChange={(e) => { e.target.value = maskExpiryMonth(e.target.value); }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="card_exp_year">Ano</Label>
                    <Input
                      id="card_exp_year"
                      name="card_exp_year"
                      inputMode="numeric"
                      placeholder="YYYY"
                      onChange={(e) => { e.target.value = maskExpiryYear(e.target.value); }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="card_cvv">CVV</Label>
                    <Input
                      id="card_cvv"
                      name="card_cvv"
                      inputMode="numeric"
                      onChange={(e) => { e.target.value = maskCVV(e.target.value); }}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="cpf_card">CPF do titular</Label>
                  <Input
                    id="cpf_card"
                    name="cpf"
                    inputMode="numeric"
                    placeholder="000.000.000-00"
                    defaultValue={maskCPF(profileQuery.data?.cpf ?? "")}
                    onChange={(e) => { e.target.value = maskCPF(e.target.value); clearFieldError("cpf"); }}
                  />
                  {fieldErrors.cpf && <p className="mt-1 text-xs text-red-600">{fieldErrors.cpf}</p>}
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
                  <Input
                    id="cpf_pix"
                    name="cpf"
                    inputMode="numeric"
                    placeholder="000.000.000-00"
                    defaultValue={maskCPF(profileQuery.data?.cpf ?? "")}
                    onChange={(e) => { e.target.value = maskCPF(e.target.value); clearFieldError("cpf"); }}
                    required
                  />
                  {fieldErrors.cpf && <p className="mt-1 text-xs text-red-600">{fieldErrors.cpf}</p>}
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
                  <Input
                    id="cpf_boleto"
                    name="cpf"
                    inputMode="numeric"
                    placeholder="000.000.000-00"
                    defaultValue={maskCPF(profileQuery.data?.cpf ?? "")}
                    onChange={(e) => { e.target.value = maskCPF(e.target.value); clearFieldError("cpf"); }}
                    required
                  />
                  {fieldErrors.cpf && <p className="mt-1 text-xs text-red-600">{fieldErrors.cpf}</p>}
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
          {appliedCoupon && (
            <div className="mt-2 flex justify-between text-sm text-accent">
              <span className="flex items-center gap-1">
                Desconto ({appliedCoupon.code})
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  aria-label="Remover cupom"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
              <span>-{formatBRL(discount)}</span>
            </div>
          )}
          <div className="mt-2 flex justify-between text-sm">
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
