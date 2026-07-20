import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  Star,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  Truck,
  ShieldCheck,
  Heart,
  Share2,
} from "lucide-react";
import { fetchProductBySlugFn, fetchProductsFn } from "@/fns/products";
import { fetchReviewsFn, createReviewFn } from "@/fns/reviews";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ProductCard } from "@/components/ProductCard";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useAuth } from "@/hooks/useAuth";
import { getStoredToken } from "@/lib/auth-client";
import { formatBRL } from "@/lib/format";
import { calculateMaxInstallments } from "@/lib/installments";
import { toast } from "sonner";

export const Route = createFileRoute("/product/$slug")({ component: Product });

const CLOTHING_SIZES = ["P", "M", "G", "GG"];

function Product() {
  const { slug } = Route.useParams();
  const { add } = useCart();
  const { has, toggle } = useWishlist();
  const [qty, setQty] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => fetchProductBySlugFn({ data: { slug } }),
  });

  const { data: allProducts = [] } = useQuery({
    queryKey: ["products", "all"],
    queryFn: () => fetchProductsFn(),
    enabled: !!product,
  });

  const relatedProducts = product
    ? allProducts
        .filter((p) => p.id !== product.id && p.category_id === product.category_id)
        .slice(0, 4)
    : [];

  const [zoomActive, setZoomActive] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const imageRef = useRef<HTMLDivElement>(null);

  const handleImageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = imageRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({ x, y });
  };

  const handleShare = () => {
    if (!product) return;
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: product.name, text: product.name, url }).catch(() => {});
    } else {
      navigator.clipboard
        .writeText(url)
        .then(() => toast.success("Link copiado!"))
        .catch(() => {});
    }
  };

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

  const hasSalePrice = Number(product.sale_price) > 0 && Number(product.sale_price) < Number(product.price);
  const finalPrice = hasSalePrice ? Number(product.sale_price) : Number(product.price);
  const maxInstallments = calculateMaxInstallments(finalPrice);

  return (
    <div className="container-page py-10">
      <Link to="/shop" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Voltar à loja
      </Link>

      <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground">Início</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link to="/shop" className="hover:text-foreground">Loja</Link>
        {product.categories && (
          <>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="hover:text-foreground">{product.categories.name}</span>
          </>
        )}
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid gap-12 lg:grid-cols-2">
        <div className="space-y-4">
          <div
            ref={imageRef}
            onMouseEnter={() => setZoomActive(true)}
            onMouseLeave={() => setZoomActive(false)}
            onMouseMove={handleImageMouseMove}
            className="relative aspect-square cursor-zoom-in overflow-hidden rounded-3xl bg-muted shadow-card"
          >
            {activeImage ? (
              <>
                <img src={activeImage} alt={product.name} className="h-full w-full object-cover" />
                {zoomActive && (
                  <div
                    className="pointer-events-none absolute inset-0 hidden bg-no-repeat md:block"
                    style={{
                      backgroundImage: `url(${activeImage})`,
                      backgroundSize: "200%",
                      backgroundPosition: `${zoomPos.x}% ${zoomPos.y}%`,
                    }}
                  />
                )}
              </>
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
            {reviews.length > 0 && (
              <div className="mt-3 flex items-center gap-2 text-sm">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-accent text-accent" /> {Number(product.rating ?? 0).toFixed(1)}
                </div>
                <span className="text-muted-foreground">({reviews.length} avaliações)</span>
              </div>
            )}
          </div>

          <div className="flex items-end gap-3">
            <div className="text-4xl font-semibold">{formatBRL(finalPrice)}</div>
            {hasSalePrice && (
              <div className="text-lg text-muted-foreground line-through">{formatBRL(Number(product.price))}</div>
            )}
          </div>
          {maxInstallments > 1 && (
            <p className="text-sm text-muted-foreground">
              ou em até {maxInstallments}x de {formatBRL(finalPrice / maxInstallments)} sem juros no cartão
            </p>
          )}

          <p className="text-muted-foreground leading-relaxed">{product.description}</p>

          <div className="text-sm">
            {product.stock > 0 ? (
              <span className="text-success">● Em estoque ({product.stock} unidades)</span>
            ) : (
              <span className="text-destructive">● Esgotado</span>
            )}
          </div>

          {/* No `sku` column exists on `products` — derived a stable display code from the numeric id instead of fabricating one. */}
          <div className="text-xs text-muted-foreground">
            SKU: SKU-{String(product.id).padStart(6, "0")}
          </div>

          {Boolean(product.is_clothing) && (
            <div>
              <p className="mb-2 text-sm font-medium">Tamanho</p>
              <div className="flex gap-2">
                {CLOTHING_SIZES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSelectedSize(s)}
                    className={`flex h-10 w-12 items-center justify-center rounded-lg border text-sm font-medium transition-colors ${
                      selectedSize === s ? "border-accent bg-accent text-accent-foreground" : "border-input hover:bg-secondary"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-full border border-input">
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                aria-label="Diminuir quantidade"
                className="px-4 py-2 text-lg"
              >
                −
              </button>
              <span className="w-10 text-center">{qty}</span>
              <button
                onClick={() => setQty(qty + 1)}
                aria-label="Aumentar quantidade"
                className="px-4 py-2 text-lg"
              >
                +
              </button>
            </div>
            <Button
              size="lg"
              className="flex-1"
              disabled={product.stock <= 0}
              onClick={() => {
                if (Boolean(product.is_clothing) && !selectedSize) {
                  toast.error("Escolha um tamanho antes de adicionar ao carrinho.");
                  return;
                }
                add(
                  {
                    id: product.id,
                    name: product.name,
                    price: finalPrice,
                    image_url: product.image_url,
                    slug: product.slug,
                    weight_kg: Number(product.weight_kg) || undefined,
                    size: selectedSize,
                  },
                  qty,
                );
                toast.success("Adicionado ao carrinho");
              }}
            >
              <ShoppingBag className="mr-2 h-4 w-4" /> Adicionar ao carrinho
            </Button>
            <button
              type="button"
              onClick={() =>
                toggle({ id: product.id, name: product.name, price: finalPrice, image_url: product.image_url, slug: product.slug })
              }
              aria-label={has(product.id) ? "Remover dos favoritos" : "Adicionar aos favoritos"}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-input transition hover:bg-secondary"
            >
              <Heart className={`h-4 w-4 ${has(product.id) ? "fill-accent text-accent" : ""}`} />
            </button>
            <button
              type="button"
              onClick={handleShare}
              aria-label="Compartilhar produto"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-input transition hover:bg-secondary"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-2xl bg-secondary/50 p-4 text-sm">
            <div className="flex items-center gap-2"><Truck className="h-4 w-4 text-accent" /> Frete grátis acima R$199</div>
            <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-accent" /> Troca grátis em até 7 dias</div>
          </div>
        </div>
      </div>

      <ReviewsSection productId={product.id} reviews={reviews} />

      {relatedProducts.length > 0 && (
        <section className="mt-20">
          <h2 className="mb-6 font-display text-2xl">Produtos relacionados</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} {...p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ReviewsSection({ productId, reviews }: { productId: string; reviews: any[] }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const myReview = user ? reviews.find((r) => String(r.user_id) === String(user.id)) : null;

  const [rating, setRating] = useState(myReview?.rating ?? 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState(myReview?.comment ?? "");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setRating(myReview?.rating ?? 0);
    setComment(myReview?.comment ?? "");
  }, [myReview?.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (rating < 1) {
      toast.error("Selecione de 1 a 5 estrelas.");
      return;
    }
    setSubmitting(true);
    try {
      await createReviewFn({ data: { token: getStoredToken() ?? "", productId, rating, comment } });
      toast.success(myReview ? "Avaliação atualizada!" : "Avaliação enviada, obrigado!");

      // Atualiza a lista na hora — sem isso, a avaliação só aparecia depois de um novo
      // round-trip de rede (invalidateQueries + refetch), o que na prática parecia travado.
      qc.setQueryData<any[]>(["reviews", productId], (old = []) => {
        const mine = {
          id: myReview?.id ?? `local-${user.id}`,
          product_id: productId,
          user_id: user.id,
          rating,
          comment,
          full_name: user.fullName ?? myReview?.full_name ?? "Você",
          created_at: new Date().toISOString(),
        };
        return [mine, ...old.filter((r) => String(r.user_id) !== String(user.id))];
      });
      qc.invalidateQueries({ queryKey: ["product"] });
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao enviar avaliação");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-20">
      <h2 className="mb-6 font-display text-2xl">Avaliações e comentários</h2>

      {user ? (
        <form onSubmit={handleSubmit} className="mb-8 rounded-2xl border border-border/60 bg-card p-5">
          <p className="mb-3 text-sm font-medium">
            {myReview ? "Editar sua avaliação" : "Deixe sua avaliação"}
          </p>
          <div className="mb-1 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                onMouseEnter={() => setHoverRating(n)}
                onMouseLeave={() => setHoverRating(0)}
                aria-label={`${n} estrela${n === 1 ? "" : "s"}`}
                className="p-1"
              >
                <Star className={`h-8 w-8 ${(hoverRating || rating) >= n ? "fill-accent text-accent" : "text-muted-foreground"}`} />
              </button>
            ))}
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            {rating > 0 ? `Sua nota: ${rating} de 5 estrelas` : "Toque em uma estrela para dar sua nota"}
          </p>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Conte o que achou do produto (opcional)"
            className="mb-3"
          />
          <Button type="submit" disabled={submitting}>
            {submitting ? "Enviando..." : myReview ? "Atualizar avaliação" : "Enviar avaliação"}
          </Button>
        </form>
      ) : (
        <div className="mb-8 rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
          <Link to="/login" className="font-medium text-accent hover:underline">Faça login</Link> para deixar uma avaliação ou comentário.
        </div>
      )}

      {reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ainda não há avaliações para este produto.</p>
      ) : (
        <ul className="space-y-4">
          {reviews.map((r) => (
            <li
              key={r.id}
              className={`rounded-xl border p-4 ${
                user && String(r.user_id) === String(user.id) ? "border-accent/40 bg-accent/5" : "border-border/60 bg-card"
              }`}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-medium">
                  {r.full_name ?? "Cliente Lumière"}
                  {user && String(r.user_id) === String(user.id) && (
                    <span className="ml-2 text-xs font-normal text-accent">(sua avaliação)</span>
                  )}
                </span>
                <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("pt-BR")}</span>
              </div>
              <div className="mb-2 flex items-center gap-1 text-accent">
                {Array.from({ length: r.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-accent" />
                ))}
              </div>
              {r.comment && <p className="text-sm">{r.comment}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
