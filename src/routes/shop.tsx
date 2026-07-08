import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Search } from "lucide-react";
import { fetchProductsFn, fetchProductsCountFn, type ProductSortOption } from "@/fns/products";
import { fetchCategoriesFn } from "@/fns/categories";
import { ProductCard } from "@/components/ProductCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PAGE_SIZE = 24;
const DEBOUNCE_MS = 300;

// URL-synced filter/sort/pagination state — keeps the shop page shareable and refresh-safe.
// `q`/`category` are kept as plain strings so links from other parts of the app (e.g. the
// Navbar search bar / categories dropdown navigating to `/shop?q=...&category=...`) integrate
// without needing to know an internal numeric id.
const shopSearchSchema = z.object({
  q: z.string().trim().min(1).optional().catch(undefined),
  category: z.string().trim().min(1).optional().catch(undefined),
  sort: z
    .enum(["relevance", "price_asc", "price_desc", "newest", "rating"])
    .optional()
    .catch(undefined),
  minPrice: z.coerce.number().nonnegative().optional().catch(undefined),
  maxPrice: z.coerce.number().nonnegative().optional().catch(undefined),
  inStock: z
    .preprocess((v) => (v === "true" ? true : v === "false" ? false : v), z.boolean())
    .optional()
    .catch(undefined),
  page: z.coerce.number().int().positive().optional().catch(undefined),
});

export type ShopSearch = z.infer<typeof shopSearchSchema>;

export const Route = createFileRoute("/shop")({
  component: Shop,
  validateSearch: shopSearchSchema,
});

const SORT_OPTIONS: { value: ProductSortOption; label: string }[] = [
  { value: "relevance", label: "Relevância" },
  { value: "price_asc", label: "Menor preço" },
  { value: "price_desc", label: "Maior preço" },
  { value: "newest", label: "Mais recentes" },
  { value: "rating", label: "Melhor avaliados" },
];

function Shop() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const page = search.page ?? 1;
  const sort = search.sort ?? "relevance";

  // Local text-input state so typing doesn't spam navigation — synced to the URL with a debounce.
  const [qInput, setQInput] = useState(search.q ?? "");
  const [minPriceInput, setMinPriceInput] = useState(search.minPrice != null ? String(search.minPrice) : "");
  const [maxPriceInput, setMaxPriceInput] = useState(search.maxPrice != null ? String(search.maxPrice) : "");

  // Keep local inputs in sync when the URL changes externally (Navbar search, back/forward nav, etc).
  useEffect(() => setQInput(search.q ?? ""), [search.q]);
  useEffect(() => {
    setMinPriceInput(search.minPrice != null ? String(search.minPrice) : "");
  }, [search.minPrice]);
  useEffect(() => {
    setMaxPriceInput(search.maxPrice != null ? String(search.maxPrice) : "");
  }, [search.maxPrice]);

  // Any filter/sort change resets pagination back to page 1.
  const updateSearch = (changes: Partial<Omit<ShopSearch, "page">>) => {
    navigate({ search: (prev) => ({ ...prev, ...changes, page: undefined }) });
  };

  const qDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleQChange = (value: string) => {
    setQInput(value);
    if (qDebounceRef.current) clearTimeout(qDebounceRef.current);
    qDebounceRef.current = setTimeout(() => {
      updateSearch({ q: value.trim() ? value.trim() : undefined });
    }, DEBOUNCE_MS);
  };

  const priceDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handlePriceChange = (which: "min" | "max", value: string) => {
    if (which === "min") setMinPriceInput(value);
    else setMaxPriceInput(value);
    if (priceDebounceRef.current) clearTimeout(priceDebounceRef.current);
    priceDebounceRef.current = setTimeout(() => {
      const parsed = value.trim() === "" ? undefined : Number(value);
      const safe = parsed != null && !Number.isNaN(parsed) ? parsed : undefined;
      updateSearch(which === "min" ? { minPrice: safe } : { maxPrice: safe });
    }, DEBOUNCE_MS);
  };

  useEffect(
    () => () => {
      if (qDebounceRef.current) clearTimeout(qDebounceRef.current);
      if (priceDebounceRef.current) clearTimeout(priceDebounceRef.current);
    },
    []
  );

  const filters = {
    q: search.q,
    category: search.category,
    sort,
    minPrice: search.minPrice,
    maxPrice: search.maxPrice,
    inStock: search.inStock,
  };

  const { data: products = [], isLoading, isFetching, isPlaceholderData } = useQuery({
    queryKey: ["products", "shop", filters, page],
    queryFn: () => fetchProductsFn({ data: { ...filters, page, pageSize: PAGE_SIZE } }),
    placeholderData: keepPreviousData,
  });

  const { data: total = 0 } = useQuery({
    queryKey: ["products", "shop-count", filters],
    queryFn: () =>
      fetchProductsCountFn({
        data: {
          q: filters.q,
          category: filters.category,
          minPrice: filters.minPrice,
          maxPrice: filters.maxPrice,
          inStock: filters.inStock,
        },
      }),
    placeholderData: keepPreviousData,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => fetchCategoriesFn(),
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const goToPage = (nextPage: number) => {
    navigate({ search: (prev) => ({ ...prev, page: nextPage <= 1 ? undefined : nextPage }) });
  };

  return (
    <div className="container-page py-12">
      <header className="mb-10">
        <h1 className="font-display text-4xl md:text-5xl">Loja</h1>
        <p className="mt-2 text-muted-foreground">Explore toda a nossa coleção.</p>
      </header>

      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={qInput}
            onChange={(e) => handleQChange(e.target.value)}
            placeholder="Buscar produtos..."
            className="pl-9"
          />
        </div>

        <Select
          value={sort}
          onValueChange={(value) =>
            updateSearch({ sort: value === "relevance" ? undefined : (value as ProductSortOption) })
          }
        >
          <SelectTrigger className="w-full md:w-56">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-8 md:grid-cols-[220px_1fr]">
        <aside className="space-y-8">
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Categorias
            </h3>
            <div className="flex flex-wrap gap-2 md:flex-col md:items-start">
              <Button
                variant={!search.category ? "default" : "outline"}
                size="sm"
                onClick={() => updateSearch({ category: undefined })}
              >
                Todas
              </Button>
              {categories.map((c) => (
                <Button
                  key={c.id}
                  variant={search.category === c.slug ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateSearch({ category: c.slug })}
                >
                  {c.name}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Preço
            </h3>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                inputMode="decimal"
                placeholder="Mín."
                value={minPriceInput}
                onChange={(e) => handlePriceChange("min", e.target.value)}
              />
              <span className="text-muted-foreground">–</span>
              <Input
                type="number"
                min={0}
                inputMode="decimal"
                placeholder="Máx."
                value={maxPriceInput}
                onChange={(e) => handlePriceChange("max", e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="in-stock"
              checked={!!search.inStock}
              onCheckedChange={(checked) => updateSearch({ inStock: checked === true ? true : undefined })}
            />
            <Label htmlFor="in-stock" className="cursor-pointer text-sm font-normal">
              Em estoque
            </Label>
          </div>
        </aside>

        <div>
          {isLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <p className="py-20 text-center text-muted-foreground">Nenhum produto encontrado.</p>
          ) : (
            <div
              className={`grid gap-6 sm:grid-cols-2 lg:grid-cols-3 transition-opacity ${
                isFetching && isPlaceholderData ? "opacity-60" : ""
              }`}
            >
              {products.map((p) => (
                <ProductCard key={p.id} {...p} />
              ))}
            </div>
          )}

          {!isLoading && products.length > 0 && totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => goToPage(page - 1)}>
                Anterior
              </Button>
              <span className="px-3 text-sm text-muted-foreground">
                Página {page} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => goToPage(page + 1)}
              >
                Próxima
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
