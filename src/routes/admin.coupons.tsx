import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { fetchAdminCouponsFn, createCouponFn, updateCouponFn, deleteCouponFn, type Coupon } from "@/fns/coupons";
import { getStoredToken } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatBRL } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/coupons")({ component: AdminCoupons });

type DiscountType = "percentage" | "fixed";

type CouponInput = {
  code: string;
  discount_type: DiscountType;
  discount_value: number;
  min_order_value: number;
  max_uses: number | null;
  valid_from: string | null;
  valid_until: string | null;
  active: boolean;
};

function toDateInputValue(value: string | null | undefined) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function formatDiscount(c: Coupon) {
  return c.discount_type === "percentage" ? `${Number(c.discount_value)}%` : formatBRL(Number(c.discount_value));
}

function formatValidity(c: Coupon) {
  const from = c.valid_from ? new Date(c.valid_from).toLocaleDateString("pt-BR") : null;
  const until = c.valid_until ? new Date(c.valid_until).toLocaleDateString("pt-BR") : null;
  if (!from && !until) return "Sem prazo";
  if (from && until) return `${from} até ${until}`;
  if (from) return `A partir de ${from}`;
  return `Até ${until}`;
}

function AdminCoupons() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [discountType, setDiscountType] = useState<DiscountType>("percentage");
  const token = () => getStoredToken() ?? "";

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ["admin", "coupons"],
    queryFn: () => fetchAdminCouponsFn({ data: { token: token() } }),
  });

  function openEdit(c: Coupon) {
    setEditing(c);
    setDiscountType(c.discount_type);
    setOpen(true);
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const code = String(fd.get("code") ?? "").trim();
    const discount_value = Number(fd.get("discount_value"));
    const min_order_value = Number(fd.get("min_order_value") || 0);
    const maxUsesRaw = String(fd.get("max_uses") ?? "").trim();
    const validFromRaw = String(fd.get("valid_from") ?? "").trim();
    const validUntilRaw = String(fd.get("valid_until") ?? "").trim();

    if (!code) {
      toast.error("Informe o código do cupom.");
      return;
    }
    if (!Number.isFinite(discount_value) || discount_value <= 0) {
      toast.error("O valor do desconto deve ser maior que zero.");
      return;
    }
    if (discountType === "percentage" && discount_value > 100) {
      toast.error("O desconto percentual não pode ser maior que 100%.");
      return;
    }
    if (!Number.isFinite(min_order_value) || min_order_value < 0) {
      toast.error("O valor mínimo do pedido não pode ser negativo.");
      return;
    }
    if (validFromRaw && validUntilRaw && validFromRaw > validUntilRaw) {
      toast.error('"Válido até" deve ser posterior a "válido de".');
      return;
    }

    const coupon: CouponInput = {
      code,
      discount_type: discountType,
      discount_value,
      min_order_value,
      max_uses: maxUsesRaw ? Number(maxUsesRaw) : null,
      valid_from: validFromRaw || null,
      valid_until: validUntilRaw || null,
      active: fd.get("active") === "on",
    };

    try {
      if (editing) {
        await updateCouponFn({ data: { token: token(), id: editing.id, coupon } });
      } else {
        await createCouponFn({ data: { token: token(), coupon } });
      }
      toast.success("Salvo!");
      qc.invalidateQueries({ queryKey: ["admin", "coupons"] });
      setOpen(false);
      setEditing(null);
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao salvar cupom");
    }
  }

  async function del(id: string) {
    if (!confirm("Excluir este cupom?")) return;
    try {
      await deleteCouponFn({ data: { token: token(), id } });
      toast.success("Excluído");
      qc.invalidateQueries({ queryKey: ["admin", "coupons"] });
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao excluir cupom");
    }
  }

  async function toggleActive(c: Coupon) {
    try {
      await updateCouponFn({
        data: {
          token: token(),
          id: c.id,
          coupon: {
            code: c.code,
            discount_type: c.discount_type,
            discount_value: Number(c.discount_value),
            min_order_value: Number(c.min_order_value),
            max_uses: c.max_uses,
            valid_from: c.valid_from,
            valid_until: c.valid_until,
            active: !c.active,
          },
        },
      });
      qc.invalidateQueries({ queryKey: ["admin", "coupons"] });
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao atualizar cupom");
    }
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl">Cupons</h1>
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) setEditing(null);
          }}
        >
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditing(null);
                setDiscountType("percentage");
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Novo cupom
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar" : "Novo"} cupom</DialogTitle>
            </DialogHeader>
            <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Código</Label>
                <Input
                  name="code"
                  defaultValue={editing?.code}
                  required
                  placeholder="EX: BEMVINDO10"
                  onChange={(e) => {
                    const pos = e.target.selectionStart;
                    e.target.value = e.target.value.toUpperCase();
                    if (pos !== null) e.target.setSelectionRange(pos, pos);
                  }}
                />
              </div>
              <div>
                <Label>Tipo de desconto</Label>
                <Select value={discountType} onValueChange={(v) => setDiscountType(v as DiscountType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentual</SelectItem>
                    <SelectItem value="fixed">Valor fixo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor do desconto {discountType === "percentage" ? "(%)" : "(R$)"}</Label>
                <Input
                  name="discount_value"
                  type="number"
                  step="0.01"
                  min="0"
                  max={discountType === "percentage" ? 100 : undefined}
                  defaultValue={editing?.discount_value}
                  required
                />
              </div>
              <div>
                <Label>Pedido mínimo (R$)</Label>
                <Input name="min_order_value" type="number" step="0.01" min="0" defaultValue={editing?.min_order_value ?? 0} />
              </div>
              <div>
                <Label>Limite de usos</Label>
                <Input name="max_uses" type="number" min="1" defaultValue={editing?.max_uses ?? ""} placeholder="Sem limite" />
              </div>
              <div />
              <div>
                <Label>Válido de</Label>
                <Input name="valid_from" type="date" defaultValue={toDateInputValue(editing?.valid_from)} />
              </div>
              <div>
                <Label>Válido até</Label>
                <Input name="valid_until" type="date" defaultValue={toDateInputValue(editing?.valid_until)} />
              </div>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input type="checkbox" name="active" defaultChecked={editing ? !!editing.active : true} /> Ativo
              </label>
              <Button type="submit" className="sm:col-span-2">
                Salvar
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-card shadow-card">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Código</th>
              <th className="p-3">Desconto</th>
              <th className="p-3">Pedido mín.</th>
              <th className="p-3">Usos</th>
              <th className="p-3">Validade</th>
              <th className="p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="p-3 text-muted-foreground" colSpan={7}>
                  Carregando...
                </td>
              </tr>
            ) : coupons.length === 0 ? (
              <tr>
                <td className="p-3 text-muted-foreground" colSpan={7}>
                  Nenhum cupom cadastrado.
                </td>
              </tr>
            ) : (
              coupons.map((c) => (
                <tr key={c.id} className="border-t border-border/60">
                  <td className="p-3 font-medium">{c.code}</td>
                  <td className="p-3">{formatDiscount(c)}</td>
                  <td className="p-3 text-muted-foreground">{formatBRL(Number(c.min_order_value))}</td>
                  <td className="p-3 text-muted-foreground">
                    {c.uses_count} / {c.max_uses ?? "∞"}
                  </td>
                  <td className="p-3 text-muted-foreground">{formatValidity(c)}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={!!c.active}
                        onCheckedChange={() => toggleActive(c)}
                        aria-label={c.active ? "Desativar cupom" : "Ativar cupom"}
                      />
                      <Badge variant={c.active ? "default" : "secondary"}>{c.active ? "Ativo" : "Inativo"}</Badge>
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <Button variant="ghost" size="icon" aria-label="Editar cupom" onClick={() => openEdit(c)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="Excluir cupom" onClick={() => del(c.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
