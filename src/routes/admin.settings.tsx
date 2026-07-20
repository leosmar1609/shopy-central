import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { fetchSiteSettingsFn, updateSiteSettingsFn } from "@/fns/settings";
import { getStoredToken } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/settings")({ component: AdminSettings });

function AdminSettings() {
  const qc = useQueryClient();
  const token = () => getStoredToken() ?? "";
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [imageBroken, setImageBroken] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["site-settings"],
    queryFn: () => fetchSiteSettingsFn(),
  });

  useEffect(() => setHeroImageUrl(settings?.hero_image_url ?? ""), [settings?.hero_image_url]);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    try {
      const hero_image_url = heroImageUrl.trim() || null;
      await updateSiteSettingsFn({ data: { token: token(), settings: { hero_image_url } } });
      toast.success("Salvo!");
      // Atualiza a home na hora, sem esperar um novo round-trip de rede.
      qc.setQueryData(["site-settings"], { hero_image_url });
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8">
      <h1 className="mb-6 font-display text-3xl">Configurações</h1>
      <div className="max-w-xl rounded-2xl bg-card p-6 shadow-card">
        <form onSubmit={save} className="space-y-4">
          <div>
            <Label htmlFor="hero_image_url">Imagem de destaque da tela inicial</Label>
            <Input
              id="hero_image_url"
              value={heroImageUrl}
              onChange={(e) => {
                setHeroImageUrl(e.target.value);
                setImageBroken(false);
              }}
              placeholder="https://..."
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Cole a URL direta do arquivo de imagem (termina em .jpg/.png/.webp), não um link de compartilhamento de
              página. Deixe em branco para usar a imagem padrão.
            </p>
          </div>
          {heroImageUrl && (
            <div className="aspect-video w-full overflow-hidden rounded-xl bg-muted">
              {imageBroken ? (
                <p className="p-3 text-xs text-destructive">
                  Essa URL não carregou como imagem — confira se é o link direto do arquivo.
                </p>
              ) : (
                <img
                  src={heroImageUrl}
                  alt="Pré-visualização"
                  className="h-full w-full object-cover"
                  onError={() => setImageBroken(true)}
                />
              )}
            </div>
          )}
          <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
        </form>
      </div>
    </div>
  );
}
