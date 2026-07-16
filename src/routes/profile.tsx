import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  User as UserIcon,
  ShieldCheck,
  Lock,
  MapPin,
  Package,
  Heart,
  Ticket,
  Settings,
  Eye,
  EyeOff,
  Plus,
  Pencil,
  Trash2,
  Star as StarIcon,
  Copy,
  ChevronDown,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getStoredToken, storeToken } from "@/lib/auth-client";
import { maskCEP, maskCPF, maskPhone, onlyDigits } from "@/lib/masks";
import { fetchAddressByCep } from "@/lib/viacep";
import { formatBRL } from "@/lib/format";
import { fetchMyProfileFn, updateMyProfileFn, changePasswordFn } from "@/fns/account";
import {
  fetchMyAddressesFn,
  createAddressFn,
  updateAddressFn,
  deleteAddressFn,
  setDefaultAddressFn,
  type Address,
} from "@/fns/addresses";
import { fetchMyFavoritesFn, removeFavoriteFn } from "@/fns/favorites";
import { fetchMyOrdersFn } from "@/fns/orders";
import { fetchOrderPaymentFn } from "@/fns/payments";
import { fetchOrderTrackingFn } from "@/fns/tracking";
import { fetchActiveCouponsFn } from "@/fns/coupons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({ component: Profile });

// ---------- shared types/helpers ----------

type AddressInput = {
  label: string;
  recipient_name: string;
  phone: string;
  zip: string;
  address: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  country: string;
  is_default?: boolean;
};

const emptyAddressInput: AddressInput = {
  label: "",
  recipient_name: "",
  phone: "",
  zip: "",
  address: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  country: "Brasil",
  is_default: false,
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};

const ORDER_STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  paid: "bg-blue-100 text-blue-800 border-blue-200",
  shipped: "bg-purple-100 text-purple-800 border-purple-200",
  delivered: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
  refunded: "bg-slate-100 text-slate-800 border-slate-200",
};

function OrderStatusBadge({ status }: { status: string }) {
  const style = ORDER_STATUS_STYLES[status] ?? "bg-muted text-muted-foreground border-border";
  const label = ORDER_STATUS_LABELS[status] ?? status;
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${style}`}>
      {label}
    </span>
  );
}

type OrderPaymentResult =
  | { type: "paid"; order_id: string }
  | { type: "pix"; payment_id: string; order_id: string; qr_code: string; qr_code_base64: string }
  | { type: "boleto"; payment_id: string; order_id: string; boleto_url: string; barcode: string };

function copyToClipboard(text: string, label = "Código copiado!") {
  navigator.clipboard.writeText(text);
  toast.success(label);
}

function OrderPaymentPanel({ result }: { result: Exclude<OrderPaymentResult, { type: "paid" }> }) {
  if (result.type === "pix") {
    return (
      <div className="mt-4 rounded-2xl border border-border bg-muted/30 p-4">
        <p className="mb-3 text-sm text-muted-foreground">
          Escaneie o QR Code ou copie o código Pix no seu app bancário.
        </p>
        {result.qr_code_base64 && (
          <div className="mb-4 w-fit rounded-2xl border border-border bg-white p-3">
            <img
              src={`data:image/png;base64,${result.qr_code_base64}`}
              alt="QR Code PIX"
              className="h-40 w-40"
            />
          </div>
        )}
        {result.qr_code && (
          <div>
            <p className="mb-1 text-sm font-medium text-muted-foreground">Pix Copia e Cola</p>
            <div className="flex items-start gap-2 rounded-xl border border-input bg-muted p-3">
              <code className="flex-1 break-all text-xs leading-relaxed">{result.qr_code}</code>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="shrink-0 gap-1"
                onClick={() => copyToClipboard(result.qr_code)}
                aria-label="Copiar código Pix"
              >
                <Copy className="h-3.5 w-3.5" /> Copiar
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-border bg-muted/30 p-4">
      <p className="mb-3 text-sm text-muted-foreground">
        Pague até a data de vencimento em qualquer banco, app ou lotérica.
      </p>
      {result.boleto_url && (
        <a
          href={result.boleto_url}
          target="_blank"
          rel="noreferrer"
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Abrir boleto (PDF)
        </a>
      )}
      {result.barcode && (
        <div>
          <p className="mb-1 text-sm font-medium text-muted-foreground">Linha digitável</p>
          <div className="flex items-start gap-2 rounded-xl border border-input bg-muted p-3">
            <code className="flex-1 break-all text-xs leading-relaxed">{result.barcode}</code>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="shrink-0 gap-1"
              onClick={() => copyToClipboard(result.barcode)}
              aria-label="Copiar linha digitável"
            >
              <Copy className="h-3.5 w-3.5" /> Copiar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function OrderTrackingPanel({
  token,
  orderId,
  trackingCode,
}: {
  token: string;
  orderId: string;
  trackingCode: string;
}) {
  const { data: trackingInfo, isLoading } = useQuery({
    queryKey: ["order-tracking", orderId],
    queryFn: () => fetchOrderTrackingFn({ data: { token, order_id: orderId } }),
    enabled: !!token && !!trackingCode,
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando rastreio...</p>;
  }

  if (!trackingInfo) return null;

  return (
    <div className="rounded-xl border border-input bg-muted p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">{trackingInfo.tracking_code}</span>
          {trackingInfo.carrier && (
            <span className="text-xs text-muted-foreground">({trackingInfo.carrier})</span>
          )}
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="shrink-0 gap-1"
          onClick={() => copyToClipboard(trackingInfo.tracking_code, "Código de rastreio copiado!")}
          aria-label="Copiar código de rastreio"
        >
          <Copy className="h-3.5 w-3.5" /> Copiar
        </Button>
      </div>
      <p className="text-sm font-medium">{trackingInfo.status}</p>
      {trackingInfo.events.length > 0 && (
        <ul className="mt-3 space-y-3">
          {trackingInfo.events.map((event, idx) => (
            <li key={idx} className="border-l-2 border-accent/30 pl-3">
              {event.time && <p className="text-xs text-muted-foreground">{event.time}</p>}
              {event.location && <p className="text-xs font-medium">{event.location}</p>}
              <p className="text-sm">{event.description}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------- page ----------

function Profile() {
  const { user, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login" });
    }
  }, [loading, user, navigate]);

  if (loading || !user) return null;

  return (
    <div className="container-page py-12">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Minha conta</p>
          <h1 className="mt-2 font-display text-4xl">{user.fullName || "Minha conta"}</h1>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground/80">
          <UserIcon className="h-4 w-4" />
          {isAdmin ? "Administrador" : "Cliente"}
        </span>
      </div>

      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="mb-8 flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/60 p-1">
          <TabsTrigger value="personal" className="gap-1.5">
            <UserIcon className="h-4 w-4" /> Dados pessoais
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5">
            <Lock className="h-4 w-4" /> Alterar senha
          </TabsTrigger>
          <TabsTrigger value="addresses" className="gap-1.5">
            <MapPin className="h-4 w-4" /> Endereços
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-1.5">
            <Package className="h-4 w-4" /> Pedidos
          </TabsTrigger>
          <TabsTrigger value="favorites" className="gap-1.5">
            <Heart className="h-4 w-4" /> Favoritos
          </TabsTrigger>
          <TabsTrigger value="coupons" className="gap-1.5">
            <Ticket className="h-4 w-4" /> Cupons
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5">
            <Settings className="h-4 w-4" /> Configurações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal">
          <PersonalDataSection />
        </TabsContent>
        <TabsContent value="security">
          <ChangePasswordSection />
        </TabsContent>
        <TabsContent value="addresses">
          <AddressesSection />
        </TabsContent>
        <TabsContent value="orders">
          <OrdersSection />
        </TabsContent>
        <TabsContent value="favorites">
          <FavoritesSection />
        </TabsContent>
        <TabsContent value="coupons">
          <CouponsSection />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsSection isAdmin={isAdmin} onSignOut={signOut} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------- Dados pessoais ----------

function PersonalDataSection() {
  const token = getStoredToken() ?? "";
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["account", "profile"],
    queryFn: () => fetchMyProfileFn({ data: { token } }),
    enabled: !!token,
  });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (data && !initialized) {
      setFullName(data.fullName ?? "");
      setPhone(data.phone ? maskPhone(data.phone) : "");
      setInitialized(true);
    }
  }, [data, initialized]);

  const mutation = useMutation({
    mutationFn: () =>
      updateMyProfileFn({ data: { token, full_name: fullName.trim(), phone: onlyDigits(phone) } }),
    onSuccess: ({ token: newToken }) => {
      storeToken(newToken);
      toast.success("Dados atualizados com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["account", "profile"] });
    },
    onError: (err: any) => {
      toast.error(err.message ?? "Erro ao atualizar dados");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Informe seu nome completo");
      return;
    }
    mutation.mutate();
  }

  return (
    <div className="rounded-3xl bg-card p-8 shadow-elegant">
      <h2 className="mb-1 font-display text-2xl">Dados pessoais</h2>
      <p className="mb-6 text-sm text-muted-foreground">Atualize seu nome e telefone de contato.</p>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <form onSubmit={handleSubmit} className="grid max-w-lg gap-4">
          <div>
            <Label htmlFor="full_name">Nome completo</Label>
            <Input id="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              inputMode="tel"
              placeholder="(11) 99999-9999"
              value={phone}
              onChange={(e) => setPhone(maskPhone(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" value={data?.email ?? ""} readOnly disabled className="cursor-not-allowed opacity-70" />
          </div>
          <div>
            <Label htmlFor="cpf">CPF</Label>
            <Input
              id="cpf"
              value={data?.cpf ? maskCPF(data.cpf) : ""}
              readOnly
              disabled
              className="cursor-not-allowed opacity-70"
            />
          </div>
          <Button type="submit" className="mt-2 w-fit" disabled={mutation.isPending}>
            {mutation.isPending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </form>
      )}
    </div>
  );
}

// ---------- Alterar senha ----------

function PasswordField({
  id,
  label,
  value,
  onChange,
  show,
  onToggleShow,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          className="pr-10"
        />
        <button
          type="button"
          onClick={onToggleShow}
          aria-label={show ? "Ocultar senha" : "Mostrar senha"}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function ChangePasswordSection() {
  const token = getStoredToken() ?? "";
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      changePasswordFn({ data: { token, current_password: currentPassword, new_password: newPassword } }),
    onSuccess: () => {
      toast.success("Senha alterada com sucesso!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err: any) => {
      toast.error(err.message ?? "Erro ao alterar senha");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("A nova senha deve ter ao menos 6 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    mutation.mutate();
  }

  return (
    <div className="rounded-3xl bg-card p-8 shadow-elegant">
      <h2 className="mb-1 font-display text-2xl">Alterar senha</h2>
      <p className="mb-6 text-sm text-muted-foreground">Escolha uma nova senha de acesso.</p>
      <form onSubmit={handleSubmit} className="grid max-w-lg gap-4">
        <PasswordField
          id="current_password"
          label="Senha atual"
          value={currentPassword}
          onChange={setCurrentPassword}
          show={showCurrent}
          onToggleShow={() => setShowCurrent((v) => !v)}
        />
        <PasswordField
          id="new_password"
          label="Nova senha"
          value={newPassword}
          onChange={setNewPassword}
          show={showNew}
          onToggleShow={() => setShowNew((v) => !v)}
        />
        <PasswordField
          id="confirm_password"
          label="Confirmar nova senha"
          value={confirmPassword}
          onChange={setConfirmPassword}
          show={showConfirm}
          onToggleShow={() => setShowConfirm((v) => !v)}
        />
        <Button type="submit" className="mt-2 w-fit" disabled={mutation.isPending}>
          {mutation.isPending ? "Alterando..." : "Alterar senha"}
        </Button>
      </form>
    </div>
  );
}

// ---------- Endereços ----------

function AddressFormDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: Address | null;
  onSubmit: (input: AddressInput) => void;
  submitting: boolean;
}) {
  const [form, setForm] = useState<AddressInput>(emptyAddressInput);
  const [cepLoading, setCepLoading] = useState(false);
  const lastCepRef = useRef<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(
        initial
          ? {
              label: initial.label,
              recipient_name: initial.recipient_name,
              phone: maskPhone(initial.phone),
              zip: maskCEP(initial.zip),
              address: initial.address,
              number: initial.number,
              complement: initial.complement ?? "",
              neighborhood: initial.neighborhood,
              city: initial.city,
              state: initial.state,
              country: initial.country,
              is_default: !!initial.is_default,
            }
          : emptyAddressInput,
      );
      lastCepRef.current = null;
    }
  }, [open, initial]);

  function setField<K extends keyof AddressInput>(key: K, value: AddressInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleCepChange(e: React.ChangeEvent<HTMLInputElement>) {
    const masked = maskCEP(e.target.value);
    setField("zip", masked);
    const digits = onlyDigits(masked);
    if (digits.length !== 8) return;
    if (lastCepRef.current === digits) return;
    lastCepRef.current = digits;
    setCepLoading(true);
    try {
      const result = await fetchAddressByCep(digits);
      if (result.ok) {
        setForm((prev) => ({
          ...prev,
          address: result.address.street || prev.address,
          neighborhood: result.address.neighborhood || prev.neighborhood,
          city: result.address.city || prev.city,
          state: result.address.state || prev.state,
        }));
      } else if (result.reason === "not_found") {
        toast.error("CEP não encontrado. Verifique o número ou preencha o endereço manualmente.");
      } else if (result.reason === "network") {
        toast.error("Não foi possível consultar o CEP agora. Preencha o endereço manualmente.");
      }
    } finally {
      setCepLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (
      !form.label.trim() ||
      !form.recipient_name.trim() ||
      !form.address.trim() ||
      !form.number.trim() ||
      !form.neighborhood.trim() ||
      !form.city.trim() ||
      !form.state.trim() ||
      !form.zip.trim()
    ) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    onSubmit({
      ...form,
      phone: onlyDigits(form.phone),
      state: form.state.toUpperCase().slice(0, 2),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar endereço" : "Adicionar endereço"}</DialogTitle>
          <DialogDescription>
            Preencha os dados de entrega. O CEP preenche o endereço automaticamente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div>
            <Label htmlFor="addr_label">Identificação (ex: Casa, Trabalho)</Label>
            <Input id="addr_label" value={form.label} onChange={(e) => setField("label", e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="addr_recipient">Nome do destinatário</Label>
            <Input
              id="addr_recipient"
              value={form.recipient_name}
              onChange={(e) => setField("recipient_name", e.target.value)}
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="addr_zip">CEP</Label>
              <Input
                id="addr_zip"
                inputMode="numeric"
                placeholder="00000-000"
                value={form.zip}
                onChange={handleCepChange}
                required
              />
              {cepLoading && <p className="mt-1 text-xs text-muted-foreground">Buscando endereço...</p>}
            </div>
            <div>
              <Label htmlFor="addr_phone">Telefone</Label>
              <Input
                id="addr_phone"
                inputMode="tel"
                placeholder="(11) 99999-9999"
                value={form.phone}
                onChange={(e) => setField("phone", maskPhone(e.target.value))}
                required
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
            <div>
              <Label htmlFor="addr_address">Endereço</Label>
              <Input id="addr_address" value={form.address} onChange={(e) => setField("address", e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="addr_number">Número</Label>
              <Input id="addr_number" value={form.number} onChange={(e) => setField("number", e.target.value)} required />
            </div>
          </div>
          <div>
            <Label htmlFor="addr_complement">Complemento (opcional)</Label>
            <Input
              id="addr_complement"
              placeholder="Apto 42"
              value={form.complement}
              onChange={(e) => setField("complement", e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Label htmlFor="addr_neighborhood">Bairro</Label>
              <Input
                id="addr_neighborhood"
                value={form.neighborhood}
                onChange={(e) => setField("neighborhood", e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="addr_state">UF</Label>
              <Input
                id="addr_state"
                maxLength={2}
                placeholder="SP"
                value={form.state}
                onChange={(e) => setField("state", e.target.value.toUpperCase().slice(0, 2))}
                required
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="addr_city">Cidade</Label>
              <Input id="addr_city" value={form.city} onChange={(e) => setField("city", e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="addr_country">País</Label>
              <Input id="addr_country" value={form.country} onChange={(e) => setField("country", e.target.value)} required />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="addr_default"
              checked={!!form.is_default}
              onCheckedChange={(checked) => setField("is_default", checked === true)}
            />
            <Label htmlFor="addr_default" className="cursor-pointer font-normal text-muted-foreground">
              Definir como endereço padrão
            </Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Salvando..." : "Salvar endereço"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddressesSection() {
  const token = getStoredToken() ?? "";
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ["account", "addresses"],
    queryFn: () => fetchMyAddressesFn({ data: { token } }),
    enabled: !!token,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["account", "addresses"] });

  const createMutation = useMutation({
    mutationFn: (address: AddressInput) => createAddressFn({ data: { token, address } }),
    onSuccess: () => {
      toast.success("Endereço adicionado!");
      invalidate();
      setDialogOpen(false);
    },
    onError: (err: any) => toast.error(err.message ?? "Erro ao adicionar endereço"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, address }: { id: string; address: AddressInput }) =>
      updateAddressFn({ data: { token, id, address } }),
    onSuccess: () => {
      toast.success("Endereço atualizado!");
      invalidate();
      setDialogOpen(false);
      setEditingAddress(null);
    },
    onError: (err: any) => toast.error(err.message ?? "Erro ao atualizar endereço"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAddressFn({ data: { token, id } }),
    onSuccess: () => {
      toast.success("Endereço removido");
      invalidate();
    },
    onError: (err: any) => toast.error(err.message ?? "Erro ao remover endereço"),
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => setDefaultAddressFn({ data: { token, id } }),
    onSuccess: () => {
      toast.success("Endereço padrão atualizado");
      invalidate();
    },
    onError: (err: any) => toast.error(err.message ?? "Erro ao definir endereço padrão"),
  });

  function openCreateDialog() {
    setEditingAddress(null);
    setDialogOpen(true);
  }

  function openEditDialog(address: Address) {
    setEditingAddress(address);
    setDialogOpen(true);
  }

  function handleFormSubmit(input: AddressInput) {
    if (editingAddress) {
      updateMutation.mutate({ id: editingAddress.id, address: input });
    } else {
      createMutation.mutate(input);
    }
  }

  return (
    <div className="rounded-3xl bg-card p-8 shadow-elegant">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl">Endereços</h2>
          <p className="text-sm text-muted-foreground">Gerencie seus endereços de entrega.</p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="h-4 w-4" /> Adicionar endereço
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : addresses.length === 0 ? (
        <p className="text-sm text-muted-foreground">Você ainda não tem endereços salvos.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {addresses.map((addr) => (
            <div key={addr.id} className="rounded-2xl border border-border p-5">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="font-semibold">{addr.label}</span>
                {!!addr.is_default && <Badge>Padrão</Badge>}
              </div>
              <p className="text-sm">{addr.recipient_name}</p>
              <p className="text-sm text-muted-foreground">
                {addr.address}, {addr.number}
                {addr.complement ? ` - ${addr.complement}` : ""}
              </p>
              <p className="text-sm text-muted-foreground">
                {addr.neighborhood} - {addr.city}/{addr.state}
              </p>
              <p className="text-sm text-muted-foreground">CEP {addr.zip}</p>
              <p className="text-sm text-muted-foreground">{addr.phone}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => openEditDialog(addr)} className="gap-1">
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </Button>
                {!addr.is_default && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDefaultMutation.mutate(addr.id)}
                    disabled={setDefaultMutation.isPending}
                  >
                    Tornar padrão
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (confirm("Remover este endereço?")) deleteMutation.mutate(addr.id);
                  }}
                  className="gap-1 text-destructive hover:text-destructive"
                  aria-label="Remover endereço"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remover
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddressFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editingAddress}
        onSubmit={handleFormSubmit}
        submitting={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}

// ---------- Pedidos ----------

function OrdersSection() {
  const token = getStoredToken() ?? "";
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<number | string | null>(null);
  const [paymentResults, setPaymentResults] = useState<
    Record<string, Exclude<OrderPaymentResult, { type: "paid" }>>
  >({});
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["account", "orders"],
    queryFn: () => fetchMyOrdersFn({ data: { token } }),
    enabled: !!token,
  });

  const payNowMutation = useMutation({
    mutationFn: (order_id: string) => fetchOrderPaymentFn({ data: { token, order_id } }),
    onSuccess: (result, order_id) => {
      if (result.type === "paid") {
        toast.success("Pagamento confirmado!");
        queryClient.invalidateQueries({ queryKey: ["account", "orders"] });
        setPaymentResults((prev) => {
          const { [order_id]: _removed, ...rest } = prev;
          return rest;
        });
      } else {
        setPaymentResults((prev) => ({ ...prev, [order_id]: result }));
      }
    },
    onError: (err: any) => {
      toast.error(err.message ?? "Erro ao buscar pagamento");
    },
    onSettled: () => {
      setPayingOrderId(null);
    },
  });

  function handlePayNow(orderId: string) {
    setPayingOrderId(orderId);
    payNowMutation.mutate(orderId);
  }

  return (
    <div className="rounded-3xl bg-card p-8 shadow-elegant">
      <h2 className="mb-1 font-display text-2xl">Meus pedidos</h2>
      <p className="mb-6 text-sm text-muted-foreground">Acompanhe o histórico e status dos seus pedidos.</p>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="mb-4 text-sm text-muted-foreground">Você ainda não fez nenhum pedido.</p>
          <Button asChild>
            <Link to="/shop">Ir às compras</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order: any) => {
            const isOpen = expandedId === order.id;
            const orderId = String(order.id);
            const canPayNow =
              order.status === "pending" && (order.payment_method === "pix" || order.payment_method === "boleto");
            const paymentResult = paymentResults[orderId];
            const isPayingThis = payNowMutation.isPending && payingOrderId === orderId;
            return (
              <div key={order.id} className="rounded-2xl border border-border p-5">
                <button
                  type="button"
                  onClick={() => setExpandedId(isOpen ? null : order.id)}
                  className="flex w-full flex-wrap items-center justify-between gap-3 text-left"
                  aria-expanded={isOpen}
                >
                  <div>
                    <div className="font-semibold">Pedido #{String(order.id).slice(0, 8)}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <OrderStatusBadge status={order.status} />
                    <span className="font-semibold">{formatBRL(Number(order.total))}</span>
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                  </div>
                </button>

                {canPayNow && (
                  <div className="mt-4 border-t border-border pt-4">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handlePayNow(orderId)}
                      disabled={isPayingThis}
                    >
                      {isPayingThis ? "Buscando pagamento..." : "Pagar agora"}
                    </Button>
                    {paymentResult && <OrderPaymentPanel result={paymentResult} />}
                  </div>
                )}

                {order.tracking_code && (
                  <div className="mt-4 border-t border-border pt-4">
                    <p className="mb-2 text-sm font-medium">Rastreamento</p>
                    <OrderTrackingPanel token={token} orderId={orderId} trackingCode={order.tracking_code} />
                  </div>
                )}

                {isOpen && (
                  <div className="mt-4 space-y-4 border-t border-border pt-4">
                    <div>
                      <p className="mb-2 text-sm font-medium">Itens</p>
                      <ul className="space-y-2">
                        {(order.order_items ?? []).map((item: any) => (
                          <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
                            <span className="flex items-center gap-3">
                              {item.product_image && (
                                <img
                                  src={item.product_image}
                                  alt={item.product_name}
                                  className="h-10 w-10 rounded-lg object-cover"
                                />
                              )}
                              {item.product_name} × {item.quantity}
                            </span>
                            <span>{formatBRL(Number(item.unit_price))}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Endereço de entrega</p>
                        <p className="text-sm">{order.shipping_name}</p>
                        <p className="text-sm text-muted-foreground">{order.shipping_address}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Pagamento</p>
                        <p className="text-sm">{order.payment_method}</p>
                        {order.coupon_code && (
                          <p className="text-sm text-muted-foreground">Cupom: {order.coupon_code}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap justify-end gap-4 border-t border-border pt-3 text-sm">
                      <span>Subtotal: {formatBRL(Number(order.subtotal))}</span>
                      <span>Frete: {formatBRL(Number(order.shipping))}</span>
                      {!!order.discount && <span>Desconto: -{formatBRL(Number(order.discount))}</span>}
                      <span className="font-semibold">Total: {formatBRL(Number(order.total))}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------- Favoritos ----------

function FavoritesSection() {
  const token = getStoredToken() ?? "";
  const queryClient = useQueryClient();

  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ["account", "favorites"],
    queryFn: () => fetchMyFavoritesFn({ data: { token } }),
    enabled: !!token,
  });

  const removeMutation = useMutation({
    mutationFn: (product_id: string) => removeFavoriteFn({ data: { token, product_id } }),
    onSuccess: () => {
      toast.success("Removido dos favoritos");
      queryClient.invalidateQueries({ queryKey: ["account", "favorites"] });
    },
    onError: (err: any) => toast.error(err.message ?? "Erro ao remover favorito"),
  });

  return (
    <div className="rounded-3xl bg-card p-8 shadow-elegant">
      <h2 className="mb-1 font-display text-2xl">Favoritos</h2>
      <p className="mb-6 text-sm text-muted-foreground">Produtos que você salvou na sua conta.</p>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : favorites.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="mb-4 text-sm text-muted-foreground">Você ainda não tem favoritos salvos.</p>
          <Button asChild>
            <Link to="/shop">Explorar produtos</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {favorites.map((product) => {
            const finalPrice = product.on_sale && product.sale_price ? product.sale_price : product.price;
            return (
              <div key={product.id} className="flex gap-4 rounded-2xl border border-border p-4">
                <Link
                  to="/product/$slug"
                  params={{ slug: product.slug }}
                  className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted"
                >
                  {product.image_url && (
                    <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
                  )}
                </Link>
                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <Link to="/product/$slug" params={{ slug: product.slug }} className="font-medium hover:text-accent">
                      {product.name}
                    </Link>
                    {Number(product.rating ?? 0) > 0 && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <StarIcon className="h-3.5 w-3.5 fill-accent text-accent" /> {Number(product.rating ?? 0).toFixed(1)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{formatBRL(Number(finalPrice))}</span>
                    <button
                      type="button"
                      onClick={() => removeMutation.mutate(product.id)}
                      aria-label="Remover dos favoritos"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Heart className="h-4 w-4 fill-accent text-accent" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------- Cupons ----------

function CouponsSection() {
  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ["account", "coupons"],
    queryFn: () => fetchActiveCouponsFn(),
  });

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    toast.success("Código copiado!");
  }

  return (
    <div className="rounded-3xl bg-card p-8 shadow-elegant">
      <h2 className="mb-1 font-display text-2xl">Cupons disponíveis</h2>
      <p className="mb-6 text-sm text-muted-foreground">Promoções ativas na loja no momento.</p>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : coupons.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum cupom disponível no momento.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {coupons.map((coupon) => {
            const discountLabel =
              coupon.discount_type === "percentage"
                ? `${Number(coupon.discount_value)}% OFF`
                : `${formatBRL(Number(coupon.discount_value))} OFF`;
            return (
              <div
                key={coupon.code}
                className="flex items-center justify-between gap-4 rounded-2xl border border-dashed border-accent/40 bg-accent/5 p-5"
              >
                <div>
                  <p className="font-semibold text-accent">{discountLabel}</p>
                  <p className="text-sm">
                    Código <span className="font-mono font-semibold">{coupon.code}</span>
                  </p>
                  {Number(coupon.min_order_value) > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Pedido mínimo de {formatBRL(Number(coupon.min_order_value))}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => copyCode(coupon.code)}
                  className="gap-1"
                  aria-label={`Copiar código ${coupon.code}`}
                >
                  <Copy className="h-3.5 w-3.5" /> Copiar
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------- Configurações ----------

function SettingsSection({ isAdmin, onSignOut }: { isAdmin: boolean; onSignOut: () => void }) {
  const navigate = useNavigate();

  function handleSignOut() {
    onSignOut();
    toast.success("Você saiu da sua conta");
    navigate({ to: "/" });
  }

  return (
    <div className="rounded-3xl bg-card p-8 shadow-elegant">
      <h2 className="mb-1 font-display text-2xl">Configurações</h2>
      <p className="mb-6 text-sm text-muted-foreground">Gerencie o acesso à sua conta.</p>

      <div className="space-y-6">
        {isAdmin && (
          <div className="rounded-3xl border border-primary/20 bg-primary/5 p-6">
            <div className="flex items-center gap-2 text-primary">
              <ShieldCheck className="h-4 w-4" />
              Acesso administrativo
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Você tem acesso ao painel administrativo para gerenciar produtos, categorias e pedidos.
            </p>
            <Button asChild className="mt-5">
              <Link to="/admin">Ir para o painel admin</Link>
            </Button>
          </div>
        )}

        <div className="rounded-2xl border border-border p-6">
          <p className="mb-1 font-medium">Sair da conta</p>
          <p className="mb-4 text-sm text-muted-foreground">Encerre sua sessão neste dispositivo.</p>
          <Button variant="outline" onClick={handleSignOut} className="gap-2">
            <LogOut className="h-4 w-4" /> Sair
          </Button>
        </div>
      </div>
    </div>
  );
}
