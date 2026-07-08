import { createServerFn } from '@tanstack/react-start';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';

const withCategory = (row: any) => ({
  ...row,
  categories: row.category_name ? { name: row.category_name } : null,
});

export type ProductSortOption = 'relevance' | 'price_asc' | 'price_desc' | 'newest' | 'rating';

export type ProductsQuery = {
  q?: string;
  /** Either a numeric category id or a category slug — both are accepted, see buildProductFilters. */
  category?: string;
  sort?: ProductSortOption;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  page?: number;
  pageSize?: number;
};

// Allowlist mapping each sort key to a hardcoded, safe ORDER BY clause.
// ORDER BY targets can't be parameterized with `?`, so user input must never be interpolated here directly.
const SORT_COLUMNS: Record<ProductSortOption, string> = {
  relevance: 'p.created_at DESC',
  price_asc: 'p.price ASC',
  price_desc: 'p.price DESC',
  newest: 'p.created_at DESC',
  rating: 'p.rating DESC',
};

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 100;

type ProductFilters = Pick<ProductsQuery, 'q' | 'category' | 'minPrice' | 'maxPrice' | 'inStock'>;

function buildProductFilters(filters: ProductFilters) {
  const conditions: string[] = [];
  const params: any[] = [];

  if (filters.q && filters.q.trim()) {
    conditions.push('p.name LIKE ?');
    params.push(`%${filters.q.trim()}%`);
  }

  if (filters.category && filters.category.trim()) {
    const raw = filters.category.trim();
    const asId = Number(raw);
    // `category` travels through the URL as a string; accept either a numeric category id
    // or a category slug so this stays compatible regardless of which one the caller sends.
    if (Number.isInteger(asId) && String(asId) === raw) {
      conditions.push('(p.category_id = ? OR c.slug = ?)');
      params.push(asId, raw);
    } else {
      conditions.push('c.slug = ?');
      params.push(raw);
    }
  }

  if (filters.minPrice != null && filters.maxPrice != null) {
    conditions.push('p.price BETWEEN ? AND ?');
    params.push(filters.minPrice, filters.maxPrice);
  } else if (filters.minPrice != null) {
    conditions.push('p.price >= ?');
    params.push(filters.minPrice);
  } else if (filters.maxPrice != null) {
    conditions.push('p.price <= ?');
    params.push(filters.maxPrice);
  }

  if (filters.inStock) {
    conditions.push('p.stock > 0');
  }

  return {
    from: 'products p LEFT JOIN categories c ON p.category_id = c.id',
    where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
  };
}

export const fetchProductsFn = createServerFn({ method: 'GET' })
  .inputValidator((data?: ProductsQuery) => data ?? {})
  .handler(async ({ data }) => {
    const page = data.page && data.page > 0 ? Math.floor(data.page) : 1;
    const pageSize =
      data.pageSize && data.pageSize > 0 ? Math.min(Math.floor(data.pageSize), MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE;
    const offset = (page - 1) * pageSize;
    const orderBy = SORT_COLUMNS[data.sort ?? 'relevance'] ?? SORT_COLUMNS.relevance;
    const { from, where, params } = buildProductFilters(data);

    const [rows] = await db.query(
      `SELECT p.* FROM ${from} ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );
    return rows as any[];
  });

// Companion to fetchProductsFn: total row count for the same filters, used to drive pagination
// controls without changing fetchProductsFn's existing array-shaped return value.
export const fetchProductsCountFn = createServerFn({ method: 'GET' })
  .inputValidator((data?: ProductFilters) => data ?? {})
  .handler(async ({ data }) => {
    const { from, where, params } = buildProductFilters(data);
    const [rows] = await db.query(`SELECT COUNT(*) AS total FROM ${from} ${where}`, params);
    return Number((rows as any[])[0]?.total ?? 0);
  });

export const fetchFeaturedProductsFn = createServerFn({ method: 'GET' }).handler(async () => {
  const [rows] = await db.query('SELECT * FROM products WHERE featured = 1 LIMIT 8');
  return rows as any[];
});

export const fetchSaleProductsFn = createServerFn({ method: 'GET' }).handler(async () => {
  const [rows] = await db.query('SELECT * FROM products WHERE on_sale = 1 LIMIT 4');
  return rows as any[];
});

export const fetchProductBySlugFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const [rows] = await db.query(
      'SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.slug = ? LIMIT 1',
      [data.slug]
    );
    const row = (rows as any[])[0];
    return row ? withCategory(row) : null;
  });

export const fetchAdminProductsFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    verifyToken(data.token);
    const [rows] = await db.query(
      'SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id ORDER BY p.created_at DESC'
    );
    return (rows as any[]).map(withCategory);
  });

export const createProductFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { token: string; payload: any }) => data)
  .handler(async ({ data }) => {
    const u = verifyToken(data.token);
    if (!u.isAdmin) throw new Error('Acesso negado');
    const p = data.payload;
    await db.execute(
      'INSERT INTO products (name, slug, description, price, sale_price, stock, image_url, image_urls, category_id, featured, on_sale) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        p.name,
        p.slug,
        p.description ?? null,
        p.price,
        p.sale_price ?? null,
        p.stock,
        p.image_url ?? null,
        p.image_urls && p.image_urls.length ? JSON.stringify(p.image_urls) : null,
        p.category_id ?? null,
        p.featured ? 1 : 0,
        p.on_sale ? 1 : 0,
      ]
    );
  });

export const updateProductFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { token: string; id: number; payload: any }) => data)
  .handler(async ({ data }) => {
    const u = verifyToken(data.token);
    if (!u.isAdmin) throw new Error('Acesso negado');
    const p = data.payload;
    await db.execute(
      'UPDATE products SET name=?, slug=?, description=?, price=?, sale_price=?, stock=?, image_url=?, image_urls=?, category_id=?, featured=?, on_sale=? WHERE id=?',
      [
        p.name,
        p.slug,
        p.description ?? null,
        p.price,
        p.sale_price ?? null,
        p.stock,
        p.image_url ?? null,
        p.image_urls && p.image_urls.length ? JSON.stringify(p.image_urls) : null,
        p.category_id ?? null,
        p.featured ? 1 : 0,
        p.on_sale ? 1 : 0,
        data.id,
      ]
    );
  });

export const deleteProductFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { token: string; id: number }) => data)
  .handler(async ({ data }) => {
    const u = verifyToken(data.token);
    if (!u.isAdmin) throw new Error('Acesso negado');
    await db.execute('DELETE FROM products WHERE id = ?', [data.id]);
  });
