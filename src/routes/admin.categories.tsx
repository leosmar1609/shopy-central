import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { fetchCategoriesFn, createCategoryFn, deleteCategoryFn } from "@/fns/categories";
import { getStoredToken } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/categories")({ component: AdminCategories });

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function AdminCategories() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const token = () => getStoredToken() ?? "";

  const { data: cats = [] } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: () => fetchCategoriesFn(),
  });

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name"));
    try {
      await createCategoryFn({ data: { token: token(), name, slug: slugify(name), image_url: String(fd.get("image_url")) } });
      toast.success("Criada");
      qc.invalidateQueries({ queryKey: ["admin", "categories"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao criar");
    }
  }

  async function del(id: number) {
    if (!confirm("Excluir?")) return;
    try {
      await deleteCategoryFn({ data: { token: token(), id } });
      toast.success("Excluída");
      qc.invalidateQueries({ queryKey: ["admin", "categories"] });
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao excluir");
    }
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl">Categorias</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Nova</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova categoria</DialogTitle></DialogHeader>
            <form onSubmit={add} className="space-y-4">
              <div><Label>Nome</Label><Input name="name" required /></div>
              <div><Label>URL da imagem</Label><Input name="image_url" /></div>
              <Button type="submit" className="w-full">Salvar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cats.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-xl bg-card p-4 shadow-card">
            <div className="flex items-center gap-3">
              {c.image_url && <img src={c.image_url} alt="" className="h-12 w-12 rounded-lg object-cover" />}
              <div>
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-muted-foreground">{c.slug}</div>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => del(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}
