import { Link } from "@tanstack/react-router";
import { Heart, ShoppingBag, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { formatBRL } from "@/lib/format";
import { toast } from "sonner";

export type ProductCardProps = {
  id: string;
  slug: string;
  name: string;
  price: number;
  sale_price: number | null;
  image_url: string | null;
  image_urls?: string[];
  on_sale: boolean;
  rating: number | string | null | undefined;
  weight_kg?: number | string | null;
  is_clothing?: boolean | number;
};

export function ProductCard(p: ProductCardProps) {
  const { add } = useCart();
  const { has, toggle } = useWishlist();
  const hasSalePrice = Number(p.sale_price) > 0 && Number(p.sale_price) < Number(p.price);
  const finalPrice = hasSalePrice ? p.sale_price! : p.price;
  const rating = Number(p.rating ?? 0) || 0;
  const imageUrl = (Array.isArray(p.image_urls) && p.image_urls[0]) || p.image_url;
  const isFavorite = has(p.id);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl bg-card shadow-card transition-all hover:-translate-y-1 hover:shadow-elegant">
      <Link to="/product/$slug" params={{ slug: p.slug }} className="relative block aspect-square overflow-hidden bg-muted">
        {imageUrl && (
          <img
            src={imageUrl}
            alt={p.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        )}
        {hasSalePrice && (
          <span className="absolute left-3 top-3 rounded-full bg-sale px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-sale-foreground">
            Oferta
          </span>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggle({ id: p.id, name: p.name, price: finalPrice, image_url: p.image_url, slug: p.slug });
          }}
          aria-label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-background/70 text-foreground backdrop-blur transition hover:bg-background"
        >
          <Heart className={`h-4 w-4 ${isFavorite ? "fill-accent text-accent" : ""}`} />
        </button>
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-5">
        {rating > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="h-3.5 w-3.5 fill-accent text-accent" /> {rating.toFixed(1)}
          </div>
        )}
        <Link to="/product/$slug" params={{ slug: p.slug }} className="font-medium leading-snug hover:text-accent">
          {p.name}
        </Link>
        <div className="mt-auto flex items-end justify-between gap-2">
          <div>
            {hasSalePrice && (
              <div className="text-xs text-muted-foreground line-through">{formatBRL(p.price)}</div>
            )}
            <div className="text-lg font-semibold">{formatBRL(finalPrice)}</div>
          </div>
          {Boolean(p.is_clothing) ? (
            <Button size="icon" variant="default" asChild aria-label="Escolher tamanho">
              <Link to="/product/$slug" params={{ slug: p.slug }}>
                <ShoppingBag className="h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <Button
              size="icon"
              variant="default"
              onClick={() => {
                add({ id: p.id, name: p.name, price: finalPrice, image_url: p.image_url, slug: p.slug, weight_kg: Number(p.weight_kg) || undefined });
                toast.success("Adicionado ao carrinho");
              }}
              aria-label="Adicionar ao carrinho"
            >
              <ShoppingBag className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
