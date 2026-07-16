import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { fetchAdminProductsFn, createProductFn, updateProductFn, deleteProductFn } from "@/fns/products";
import { fetchCategoriesFn } from "@/fns/categories";
import { getStoredToken } from "@/lib/auth-client";
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
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function parseImageUrls(value: string | null) {
  if (!value) return [];
  return String(value)
    .split(/\r?\n|,/) 
    .map((url) => url.trim())
    .filter(Boolean);
}

function AdminProducts() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const token = () => getStoredToken() ?? "";

  const { data: products = [] } = useQuery({
    queryKey: ["admin", "products"],
    queryFn: () => fetchAdminProductsFn({ data: { token: token() } }),
  });

  const { data: cats = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => fetchCategoriesFn(),
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
      weight_kg: Number(fd.get("weight_kg")) || 0.3,
      image_url: String(fd.get("image_url")),
      image_urls: parseImageUrls(fd.get("image_urls") as string | null),
      category_id: String(fd.get("category_id")) || null,
      featured: fd.get("featured") === "on",
      on_sale: fd.get("on_sale") === "on",
    };
    try {
      if (editing) {
        await updateProductFn({ data: { token: token(), id: editing.id, payload } });
      } else {
        await createProductFn({ data: { token: token(), payload } });
      }
      toast.success("Salvo!");
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      setOpen(false);
      setEditing(null);
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao salvar");
    }
  }

  async function del(id: number) {
    if (!confirm("Excluir produto?")) return;
    try {
      await deleteProductFn({ data: { token: token(), id } });
      toast.success("Excluído");
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao excluir");
    }
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
                <Label>Peso (kg)</Label>
                <Input name="weight_kg" type="number" step="0.001" min="0" defaultValue={editing?.weight_kg ?? 0.3} />
                <p className="text-xs text-muted-foreground">Usado para calcular o frete automaticamente</p>
              </div>
              <div>
                <Label>Categoria</Label>
                <Select name="category_id" defaultValue={editing?.category_id ? String(editing.category_id) : undefined}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{cats.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2"><Label>URL da imagem</Label><Input name="image_url" defaultValue={editing?.image_url} /></div>
              <div className="sm:col-span-2">
                <Label>URLs adicionais de imagens</Label>
                <Textarea
                  name="image_urls"
                  defaultValue={Array.isArray(editing?.image_urls) ? editing.image_urls.join("\n") : ""}
                  placeholder="Cole uma URL por linha"
                />
                <p className="text-xs text-muted-foreground">A primeira imagem continua sendo a principal. Use uma URL por linha para imagens extras.</p>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="featured" defaultChecked={editing?.featured} /> Em destaque</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="on_sale" defaultChecked={editing?.on_sale} /> Em promoção</label>
              <Button type="submit" className="sm:col-span-2">Salvar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-card shadow-card">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr><th className="p-3">Produto</th><th className="p-3">Categoria</th><th className="p-3">Preço</th><th className="p-3">Estoque</th><th className="p-3">Peso (kg)</th><th className="p-3"></th></tr>
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
                <td className="p-3 text-muted-foreground">{p.categories?.name ?? "—"}</td>
                <td className="p-3">{formatBRL(Number(p.price))}</td>
                <td className="p-3">{p.stock}</td>
                <td className="p-3">{p.weight_kg ?? "—"}</td>
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
