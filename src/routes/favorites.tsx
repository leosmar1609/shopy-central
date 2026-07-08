import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, X } from "lucide-react";
import { useWishlist } from "@/contexts/WishlistContext";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/favorites")({ component: Favorites });

function Favorites() {
  const { items, remove } = useWishlist();

  if (items.length === 0) {
    return (
      <div className="container-page flex flex-col items-center py-24 text-center">
        <Heart className="mb-4 h-12 w-12 text-muted-foreground" />
        <h1 className="font-display text-3xl">Você ainda não tem favoritos</h1>
        <p className="mt-2 text-muted-foreground">
          Salve os produtos que você mais gosta para encontrá-los rapidamente por aqui.
        </p>
        <Button className="mt-6" asChild>
          <Link to="/shop">Explorar produtos</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container-page py-12">
      <h1 className="mb-8 font-display text-4xl">Meus Favoritos</h1>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <div key={item.id} className="relative">
            <button
              type="button"
              onClick={() => remove(item.id)}
              aria-label={`Remover ${item.name} dos favoritos`}
              className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-background/90 text-foreground shadow-card transition-colors hover:bg-destructive hover:text-destructive-foreground"
            >
              <X className="h-4 w-4" />
            </button>
            <ProductCard
              id={item.id}
              slug={item.slug}
              name={item.name}
              price={item.price}
              sale_price={null}
              image_url={item.image_url}
              on_sale={false}
              rating={0}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
