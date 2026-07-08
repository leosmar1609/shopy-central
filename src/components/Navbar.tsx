import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import {
  ShoppingBag,
  User,
  Search,
  LayoutDashboard,
  LogOut,
  Heart,
  Menu,
  ChevronDown,
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useAuth } from "@/hooks/useAuth";
import { fetchCategoriesFn } from "@/fns/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";

type Category = { id: number; name: string; slug: string; image_url: string | null };

// `/shop` doesn't declare a `validateSearch` schema yet, so we type these search
// params as `any` — this keeps the Navbar navigating to `/shop?q=...` /
// `/shop?category=...` correctly regardless of what (if anything) shop.tsx
// ends up validating on its side.
function toShopSearch(params: Record<string, string | number>) {
  return params as any;
}

export function Navbar() {
  const { count, clear } = useCart();
  const { count: favCount } = useWishlist();
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => fetchCategoriesFn(),
  });

  function goToSearch(term: string) {
    const value = term.trim();
    navigate({ to: "/shop", search: toShopSearch(value ? { q: value } : {}) });
    setMobileSearchOpen(false);
    setDrawerOpen(false);
  }

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    goToSearch(query);
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex shrink-0 items-center gap-2 font-display text-2xl">
          <span className="inline-block h-2 w-2 rounded-full bg-accent" />
          Lumière
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium md:flex">
          <Link to="/" activeProps={{ className: "text-foreground" }} className="text-muted-foreground transition-colors hover:text-foreground" activeOptions={{ exact: true }}>Início</Link>
          <Link to="/shop" activeProps={{ className: "text-foreground" }} className="text-muted-foreground transition-colors hover:text-foreground">Loja</Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Abrir menu de categorias"
              >
                Categorias <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {categories.length === 0 ? (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">Nenhuma categoria</div>
              ) : (
                categories.map((c) => (
                  <DropdownMenuItem key={c.id} asChild>
                    <Link to="/shop" search={toShopSearch({ category: c.id })}>{c.name}</Link>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Link to="/shop" className="text-muted-foreground transition-colors hover:text-foreground">Promoções</Link>
        </nav>

        <form onSubmit={handleSearchSubmit} className="relative hidden w-full max-w-xs md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar produtos..."
            className="pl-9"
            aria-label="Buscar produtos"
          />
        </form>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label={mobileSearchOpen ? "Fechar busca" : "Buscar"}
            onClick={() => setMobileSearchOpen((v) => !v)}
          >
            <Search className="h-5 w-5" />
          </Button>

          <Button variant="ghost" size="icon" asChild className="relative" aria-label="Favoritos">
            <Link to="/favorites">
              <Heart className="h-5 w-5" />
              {favCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-semibold text-accent-foreground">
                  {favCount}
                </span>
              )}
            </Link>
          </Button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Abrir menu da conta"><User className="h-5 w-5" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">{user.email}</div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center gap-2"><User className="h-4 w-4" /> Perfil</Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin" className="flex items-center gap-2"><LayoutDashboard className="h-4 w-4" /> Painel Admin</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => {
                  clear();
                  signOut();
                }}>
                  <LogOut className="h-4 w-4 mr-2" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="ghost" size="icon" asChild aria-label="Entrar na conta">
              <Link to="/login"><User className="h-5 w-5" /></Link>
            </Button>
          )}

          <Button variant="ghost" size="icon" asChild className="relative" aria-label="Carrinho de compras">
            <Link to="/cart">
              <ShoppingBag className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-semibold text-accent-foreground">
                  {count}
                </span>
              )}
            </Link>
          </Button>

          <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Abrir menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex w-full max-w-xs flex-col gap-6 overflow-y-auto" aria-label="Menu de navegação">
              <SheetHeader>
                <SheetTitle className="font-display text-xl">Lumière</SheetTitle>
              </SheetHeader>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  goToSearch(query);
                }}
                className="relative"
              >
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar produtos..."
                  className="pl-9"
                  aria-label="Buscar produtos"
                />
              </form>

              <nav className="flex flex-col gap-1 text-sm font-medium">
                <Link
                  to="/"
                  onClick={() => setDrawerOpen(false)}
                  activeOptions={{ exact: true }}
                  activeProps={{ className: "bg-accent/10 text-foreground" }}
                  className="rounded-md px-2 py-2 text-foreground transition-colors hover:bg-accent/10"
                >
                  Início
                </Link>
                <Link
                  to="/shop"
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-md px-2 py-2 text-foreground transition-colors hover:bg-accent/10"
                >
                  Loja
                </Link>
                <Link
                  to="/shop"
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-md px-2 py-2 text-foreground transition-colors hover:bg-accent/10"
                >
                  Promoções
                </Link>
              </nav>

              {categories.length > 0 && (
                <div>
                  <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Categorias</p>
                  <nav className="flex flex-col gap-1 text-sm">
                    {categories.map((c) => (
                      <Link
                        key={c.id}
                        to="/shop"
                        search={toShopSearch({ category: c.id })}
                        onClick={() => setDrawerOpen(false)}
                        className="rounded-md px-2 py-2 text-foreground transition-colors hover:bg-accent/10"
                      >
                        {c.name}
                      </Link>
                    ))}
                  </nav>
                </div>
              )}

              <div className="mt-auto flex flex-col gap-1 border-t border-border pt-4 text-sm font-medium">
                {user ? (
                  <>
                    <Link
                      to="/profile"
                      onClick={() => setDrawerOpen(false)}
                      className="flex items-center gap-2 rounded-md px-2 py-2 text-foreground transition-colors hover:bg-accent/10"
                    >
                      <User className="h-4 w-4" /> Perfil
                    </Link>
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setDrawerOpen(false)}
                        className="flex items-center gap-2 rounded-md px-2 py-2 text-foreground transition-colors hover:bg-accent/10"
                      >
                        <LayoutDashboard className="h-4 w-4" /> Painel Admin
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        clear();
                        signOut();
                        setDrawerOpen(false);
                      }}
                      className="flex items-center gap-2 rounded-md px-2 py-2 text-left text-foreground transition-colors hover:bg-accent/10"
                    >
                      <LogOut className="h-4 w-4" /> Sair
                    </button>
                  </>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setDrawerOpen(false)}
                    className="flex items-center gap-2 rounded-md px-2 py-2 text-foreground transition-colors hover:bg-accent/10"
                  >
                    <User className="h-4 w-4" /> Entrar
                  </Link>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {mobileSearchOpen && (
        <div className="border-t border-border/60 px-4 py-3 md:hidden">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar produtos..."
              className="pl-9"
              aria-label="Buscar produtos"
            />
          </form>
        </div>
      )}
    </header>
  );
}
