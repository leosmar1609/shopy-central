import { Link } from "@tanstack/react-router";
import { ShoppingBag, User, Search, LayoutDashboard, LogOut } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  const { count } = useCart();
  const { user, isAdmin, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="container-page flex h-16 items-center justify-between gap-6">
        <Link to="/" className="flex items-center gap-2 font-display text-2xl">
          <span className="inline-block h-2 w-2 rounded-full bg-accent" />
          Lumière
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium md:flex">
          <Link to="/" activeProps={{ className: "text-foreground" }} className="text-muted-foreground transition-colors hover:text-foreground" activeOptions={{ exact: true }}>Início</Link>
          <Link to="/shop" activeProps={{ className: "text-foreground" }} className="text-muted-foreground transition-colors hover:text-foreground">Loja</Link>
          <Link to="/shop" className="text-muted-foreground transition-colors hover:text-foreground">Promoções</Link>
        </nav>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/shop"><Search className="h-5 w-5" /></Link>
          </Button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon"><User className="h-5 w-5" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">{user.email}</div>
                <DropdownMenuSeparator />
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin" className="flex items-center gap-2"><LayoutDashboard className="h-4 w-4" /> Painel Admin</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => signOut()}>
                  <LogOut className="h-4 w-4 mr-2" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="ghost" size="icon" asChild>
              <Link to="/login"><User className="h-5 w-5" /></Link>
            </Button>
          )}

          <Button variant="ghost" size="icon" asChild className="relative">
            <Link to="/cart">
              <ShoppingBag className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-semibold text-accent-foreground">
                  {count}
                </span>
              )}
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
