import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Truck, ShieldCheck, RefreshCw, Sparkles } from "lucide-react";
import { fetchFeaturedProductsFn, fetchSaleProductsFn } from "@/fns/products";
import { fetchCategoriesFn } from "@/fns/categories";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { data: featured = [] } = useQuery({
    queryKey: ["products", "featured"],
    queryFn: () => fetchFeaturedProductsFn(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => fetchCategoriesFn(),
  });

  const { data: sale = [] } = useQuery({
    queryKey: ["products", "sale"],
    queryFn: () => fetchSaleProductsFn(),
  });

  return (
    <div>
      {/* Hero */}
      <section className="gradient-hero">
        <div className="container-page grid gap-10 py-20 md:grid-cols-2 md:py-28 md:gap-16 items-center">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-background/80 px-3 py-1 text-xs font-medium backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-accent" /> Coleção Outono · 2026
            </span>
            <h1 className="font-display text-5xl leading-[1.05] md:text-7xl">
              Curadoria que <span className="italic text-accent">brilha</span> no seu dia a dia.
            </h1>
            <p className="max-w-md text-muted-foreground md:text-lg">
              Produtos selecionados com design impecável, qualidade premium e entrega rápida para todo o Brasil.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link to="/shop">Comprar agora <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/shop">Ver promoções</Link>
              </Button>
            </div>
          </div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-3xl shadow-elegant md:aspect-square">
            <img
              src="https://www.ellymodasonline.com.br/arquivos/PRODUTOS/7511713811406625171/7511713811406625171_G_1.jpg"
              alt="Coleção em destaque"
              className="h-full w-full object-cover"
            />
            <div className="absolute bottom-6 left-6 rounded-2xl bg-background/90 p-4 backdrop-blur shadow-card">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Destaque</div>
              <div className="font-display text-xl">Até 30% OFF</div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-y border-border/60 bg-card">
        <div className="container-page grid grid-cols-2 gap-8 py-8 text-sm md:grid-cols-4">
          {[
            { icon: Truck, t: "Frete grátis", d: "acima de R$ 199" },
            { icon: ShieldCheck, t: "Pagamento seguro", d: "compra protegida" },
            { icon: RefreshCw, t: "Trocas em 30 dias", d: "fácil e rápido" },
            { icon: Sparkles, t: "Curadoria premium", d: "qualidade garantida" },
          ].map((i) => (
            <div key={i.t} className="flex items-center gap-3">
              <i.icon className="h-5 w-5 text-accent" />
              <div>
                <div className="font-medium">{i.t}</div>
                <div className="text-xs text-muted-foreground">{i.d}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="container-page py-20">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <h2 className="font-display text-3xl md:text-4xl">Explore por categoria</h2>
            <p className="mt-2 text-muted-foreground">Encontre exatamente o que combina com você.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((c) => (
            <Link
              key={c.id}
              to="/shop"
              className="group relative aspect-[4/5] overflow-hidden rounded-2xl shadow-card"
            >
              {c.image_url && (
                <img src={c.image_url} alt={c.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <div className="font-display text-2xl">{c.name}</div>
                <div className="mt-1 inline-flex items-center text-sm opacity-90">Comprar <ArrowRight className="ml-1 h-3.5 w-3.5" /></div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="container-page py-10">
        <div className="mb-10 flex items-end justify-between">
          <h2 className="font-display text-3xl md:text-4xl">Em destaque</h2>
          <Link to="/shop" className="text-sm font-medium text-accent hover:underline">Ver tudo →</Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((p) => <ProductCard key={p.id} {...p} />)}
        </div>
      </section>

      {/* Promo banner */}
      <section className="container-page py-20">
        <div className="gradient-accent relative overflow-hidden rounded-3xl px-8 py-14 text-accent-foreground shadow-elegant md:px-16 md:py-20">
          <div className="relative max-w-xl space-y-4">
            <div className="text-xs font-semibold uppercase tracking-widest opacity-80">Promoção da semana</div>
            <h3 className="font-display text-4xl md:text-5xl">Até 40% OFF em itens selecionados</h3>
            <p className="opacity-90">Aproveite descontos exclusivos por tempo limitado. Renove seu estilo e seu setup.</p>
            <Button size="lg" variant="secondary" asChild>
              <Link to="/shop">Ver ofertas</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Sale grid */}
      {sale.length > 0 && (
        <section className="container-page pb-24">
          <h2 className="mb-10 font-display text-3xl md:text-4xl">Ofertas imperdíveis</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {sale.map((p) => <ProductCard key={p.id} {...p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
