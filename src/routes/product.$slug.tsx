import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Star, ShoppingBag, ChevronLeft, Truck, ShieldCheck } from "lucide-react";
import { fetchProductBySlugFn } from "@/fns/products";
import { fetchReviewsFn } from "@/fns/reviews";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { formatBRL } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/product/$slug")({ component: Product });

function Product() {
  const { slug } = Route.useParams();
  const { add } = useCart();
  const [qty, setQty] = useState(1);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => fetchProductBySlugFn({ data: { slug } }),
  });

  const productImages = product
    ? Array.from(
        new Set([
          product.image_url,
          ...(Array.isArray(product.image_urls)
            ? product.image_urls
            : typeof product.image_urls === "string"
            ? JSON.parse(product.image_urls)
            : []),
        ]
          .filter(Boolean) as string[])
      )
    : [];

  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    setSelectedImage(null);
  }, [product?.id]);

  const activeImage = selectedImage || productImages[0] || null;

  const { data: reviews = [] } = useQuery({
    queryKey: ["reviews", product?.id],
    enabled: !!product?.id,
    queryFn: () => fetchReviewsFn({ data: { productId: product!.id } }),
  });

  if (isLoading) return <div className="container-page py-20 text-center text-muted-foreground">Carregando...</div>;
  if (!product) return <div className="container-page py-20 text-center">Produto não encontrado</div>;

  const finalPrice = product.on_sale && product.sale_price ? Number(product.sale_price) : Number(product.price);

  return (
    <div className="container-page py-10">
      <Link to="/shop" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Voltar à loja
      </Link>

      <div className="grid gap-12 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="aspect-square overflow-hidden rounded-3xl bg-muted shadow-card">
            {activeImage ? (
              <img src={activeImage} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">Sem imagem</div>
            )}
          </div>
          {productImages.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {productImages.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedImage(src)}
                  className={`aspect-square overflow-hidden rounded-xl border transition ${src === activeImage ? "border-accent" : "border-transparent"}`}>
                  <img src={src} alt={`${product.name} ${i + 1}`} className="h-full w-full object-cover opacity-80" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div>
            {product.categories && (
              <div className="text-xs font-medium uppercase tracking-widest text-accent">{product.categories.name}</div>
            )}
            <h1 className="mt-2 font-display text-4xl md:text-5xl">{product.name}</h1>
            <div className="mt-3 flex items-center gap-2 text-sm">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-accent text-accent" /> {Number(product.rating ?? 0).toFixed(1)}
              </div>
              <span className="text-muted-foreground">({reviews.length} avaliações)</span>
            </div>
          </div>

          <div className="flex items-end gap-3">
            <div className="text-4xl font-semibold">{formatBRL(finalPrice)}</div>
            {product.on_sale && product.sale_price && (
              <div className="text-lg text-muted-foreground line-through">{formatBRL(Number(product.price))}</div>
            )}
          </div>

          <p className="text-muted-foreground leading-relaxed">{product.description}</p>

          <div className="text-sm">
            {product.stock > 0 ? (
              <span className="text-success">● Em estoque ({product.stock} unidades)</span>
            ) : (
              <span className="text-destructive">● Esgotado</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-full border border-input">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-4 py-2 text-lg">−</button>
              <span className="w-10 text-center">{qty}</span>
              <button onClick={() => setQty(qty + 1)} className="px-4 py-2 text-lg">+</button>
            </div>
            <Button
              size="lg"
              className="flex-1"
              disabled={product.stock <= 0}
              onClick={() => {
                add({ id: product.id, name: product.name, price: finalPrice, image_url: product.image_url, slug: product.slug }, qty);
                toast.success("Adicionado ao carrinho");
              }}
            >
              <ShoppingBag className="mr-2 h-4 w-4" /> Adicionar ao carrinho
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-2xl bg-secondary/50 p-4 text-sm">
            <div className="flex items-center gap-2"><Truck className="h-4 w-4 text-accent" /> Frete grátis acima R$199</div>
            <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-accent" /> Garantia de 12 meses</div>
          </div>
        </div>
      </div>

      <section className="mt-20">
        <h2 className="mb-6 font-display text-2xl">Avaliações</h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ainda não há avaliações para este produto.</p>
        ) : (
          <ul className="space-y-4">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-xl border border-border/60 bg-card p-4">
                <div className="mb-2 flex items-center gap-1 text-accent">
                  {Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="h-4 w-4 fill-accent" />)}
                </div>
                <p className="text-sm">{r.comment}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
