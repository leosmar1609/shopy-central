import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatBRL } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/products")({ component: AdminProducts });

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function AdminProducts() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data: products = [] } = useQuery({
    queryKey: ["admin", "products"],
    queryFn: async () => (await supabase.from("products").select("*, categories(name)").order("created_at", { ascending: false })).data ?? [],
  });

  const { data: cats = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await supabase.from("categories").select("*")).data ?? [],
  });

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name")),
      slug: slugify(String(fd.get("name"))),
      description: String(fd.get("description")),
      price: Number(fd.get("price")),
      sale_price: fd.get("sale_price") ? Number(fd.get("sale_price")) : null,
      stock: Number(fd.get("stock")),
      image_url: String(fd.get("image_url")),
      category_id: String(fd.get("category_id")) || null,
      featured: fd.get("featured") === "on",
      on_sale: fd.get("on_sale") === "on",
    };
    const { error } = editing
      ? await supabase.from("products").update(payload).eq("id", editing.id)
      : await supabase.from("products").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Salvo!");
    qc.invalidateQueries({ queryKey: ["admin", "products"] });
    qc.invalidateQueries({ queryKey: ["products"] });
    setOpen(false);
    setEditing(null);
  }

  async function del(id: string) {
    if (!confirm("Excluir produto?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Excluído");
    qc.invalidateQueries({ queryKey: ["admin", "products"] });
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl">Produtos</h1>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Novo produto</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{editing ? "Editar" : "Novo"} produto</DialogTitle></DialogHeader>
            <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><Label>Nome</Label><Input name="name" defaultValue={editing?.name} required /></div>
              <div className="sm:col-span-2"><Label>Descrição</Label><Textarea name="description" defaultValue={editing?.description} /></div>
              <div><Label>Preço</Label><Input name="price" type="number" step="0.01" defaultValue={editing?.price} required /></div>
              <div><Label>Preço promocional</Label><Input name="sale_price" type="number" step="0.01" defaultValue={editing?.sale_price ?? ""} /></div>
              <div><Label>Estoque</Label><Input name="stock" type="number" defaultValue={editing?.stock ?? 0} required /></div>
              <div>
                <Label>Categoria</Label>
                <Select name="category_id" defaultValue={editing?.category_id ?? undefined}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2"><Label>URL da imagem</Label><Input name="image_url" defaultValue={editing?.image_url} /></div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="featured" defaultChecked={editing?.featured} /> Em destaque</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="on_sale" defaultChecked={editing?.on_sale} /> Em promoção</label>
              <Button type="submit" className="sm:col-span-2">Salvar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-hidden rounded-2xl bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr><th className="p-3">Produto</th><th className="p-3">Categoria</th><th className="p-3">Preço</th><th className="p-3">Estoque</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-border/60">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    {p.image_url && <img src={p.image_url} alt="" className="h-10 w-10 rounded-md object-cover" />}
                    <span>{p.name}</span>
                  </div>
                </td>
                <td className="p-3 text-muted-foreground">{(p.categories as any)?.name ?? "—"}</td>
                <td className="p-3">{formatBRL(Number(p.price))}</td>
                <td className="p-3">{p.stock}</td>
                <td className="p-3 text-right">
                  <Button variant="ghost" size="icon" onClick={() => { setEditing(p); setOpen(true); }}><Edit2 className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => del(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
