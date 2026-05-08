import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatBRL } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/orders")({ component: AdminOrders });

const STATUSES = ["pending", "paid", "shipped", "delivered", "cancelled"];

function AdminOrders() {
  const qc = useQueryClient();
  const { data: orders = [] } = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: async () => (await supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false })).data ?? [],
  });

  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Atualizado");
    qc.invalidateQueries({ queryKey: ["admin", "orders"] });
  }

  return (
    <div className="p-8">
      <h1 className="mb-6 font-display text-3xl">Pedidos</h1>
      {orders.length === 0 ? (
        <p className="text-muted-foreground">Ainda não há pedidos.</p>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <div key={o.id} className="rounded-2xl bg-card p-5 shadow-card">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-medium">#{o.id.slice(0, 8)} · {o.shipping_name}</div>
                  <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("pt-BR")}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{formatBRL(Number(o.total))}</span>
                  <Select value={o.status} onValueChange={(v) => setStatus(o.id, v)}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {(o.order_items as any[])?.map((i) => `${i.product_name} ×${i.quantity}`).join(", ")}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
