import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { fetchAdminOrdersFn, updateOrderStatusFn } from "@/fns/orders";
import { refundOrderFn } from "@/fns/payments";
import { setOrderTrackingFn } from "@/fns/tracking";
import { getStoredToken } from "@/lib/auth-client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatBRL } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/orders")({ component: AdminOrders });

const STATUSES = ["pending", "paid", "shipped", "delivered", "cancelled"];

function AdminOrders() {
  const qc = useQueryClient();
  const token = () => getStoredToken() ?? "";

  const { data: orders = [] } = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: () => fetchAdminOrdersFn({ data: { token: token() } }),
  });

  async function setStatus(id: number, status: string) {
    try {
      await updateOrderStatusFn({ data: { token: token(), id, status } });
      toast.success("Atualizado");
      qc.invalidateQueries({ queryKey: ["admin", "orders"] });
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao atualizar");
    }
  }

  async function refund(id: number | string) {
    if (!confirm(`Reembolsar pedido #${id}? Isso estorna o pagamento no Asaas e devolve o estoque.`)) return;
    try {
      await refundOrderFn({ data: { token: token(), order_id: String(id) } });
      toast.success("Pedido reembolsado.");
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao reembolsar");
    } finally {
      qc.invalidateQueries({ queryKey: ["admin", "orders"] });
    }
  }

  async function saveTracking(id: number | string, tracking_code: string, carrier: string) {
    if (!tracking_code.trim()) {
      toast.error("Informe o código de rastreio");
      return;
    }
    try {
      await setOrderTrackingFn({ data: { token: token(), order_id: String(id), tracking_code: tracking_code.trim(), carrier: carrier.trim() } });
      toast.success("Rastreio salvo.");
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao salvar rastreio");
    } finally {
      qc.invalidateQueries({ queryKey: ["admin", "orders"] });
    }
  }

  return (
    <div className="p-8">
      <h1 className="mb-6 font-display text-3xl">Pedidos</h1>
      {orders.length === 0 ? (
        <p className="text-muted-foreground">Ainda não há pedidos.</p>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => {
            const isRefunded = o.status === "refunded";
            const canRefund = !isRefunded && o.status !== "cancelled";
            return (
              <div key={o.id} className="rounded-2xl bg-card p-5 shadow-card">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">#{String(o.id).slice(0, 8)} · {o.shipping_name}</div>
                    <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("pt-BR")}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{formatBRL(Number(o.total))}</span>
                    {isRefunded ? (
                      <Badge variant="secondary" className="w-fit">Reembolsado</Badge>
                    ) : (
                      <Select value={o.status} onValueChange={(v) => setStatus(o.id, v)}>
                        <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    )}
                    {canRefund && (
                      <Button type="button" variant="destructive" size="sm" onClick={() => refund(o.id)}>
                        Reembolsar
                      </Button>
                    )}
                  </div>
                </div>
                <div className="mb-3 text-sm text-muted-foreground">
                  {(o.order_items as any[])?.map((i) => `${i.product_name} ×${i.quantity}`).join(", ")}
                </div>
                <TrackingForm order={o} onSave={saveTracking} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TrackingForm({
  order,
  onSave,
}: {
  order: { id: number | string; tracking_code: string | null; carrier: string | null };
  onSave: (id: number | string, tracking_code: string, carrier: string) => void | Promise<void>;
}) {
  const [trackingCode, setTrackingCode] = useState(order.tracking_code ?? "");
  const [carrier, setCarrier] = useState(order.carrier ?? "");

  return (
    <div className="flex flex-wrap items-end gap-3 border-t border-border/60 pt-3">
      <div className="min-w-[10rem] flex-1">
        <Label htmlFor={`tracking-code-${order.id}`} className="text-xs">Código de rastreio</Label>
        <Input
          id={`tracking-code-${order.id}`}
          value={trackingCode}
          onChange={(e) => setTrackingCode(e.target.value)}
          placeholder="Ex: BR1234567890"
        />
      </div>
      <div className="min-w-[10rem] flex-1">
        <Label htmlFor={`carrier-${order.id}`} className="text-xs">Transportadora</Label>
        <Input
          id={`carrier-${order.id}`}
          value={carrier}
          onChange={(e) => setCarrier(e.target.value)}
          placeholder="Ex: Correios, Outro"
        />
      </div>
      <Button type="button" size="sm" onClick={() => onSave(order.id, trackingCode, carrier)}>
        Salvar
      </Button>
    </div>
  );
}
