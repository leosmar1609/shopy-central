import { createServerFn } from '@tanstack/react-start';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';

const withCategory = (row: any) => ({
  ...row,
  categories: row.category_name ? { name: row.category_name } : null,
});

export const fetchProductsFn = createServerFn({ method: 'GET' }).handler(async () => {
  const [rows] = await db.query('SELECT * FROM products ORDER BY created_at DESC');
  return rows as any[];
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
