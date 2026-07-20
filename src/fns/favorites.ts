import { createServerFn } from '@tanstack/react-start';
import { setResponseHeaders } from '@tanstack/react-start/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';

export type FavoriteProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  sale_price: number | null;
  on_sale: number;
  image_url: string | null;
  rating: number;
};

export const fetchMyFavoritesFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    const user = verifyToken(data.token);
    setResponseHeaders({ 'Cache-Control': 'no-store' } as any);
    const [rows] = await db.execute(
      `SELECT p.id, p.name, p.slug, p.price, p.sale_price, p.on_sale, p.image_url, p.rating
       FROM favorites f
       JOIN products p ON p.id = f.product_id
       WHERE f.user_id = ?
       ORDER BY f.created_at DESC`,
      [user.id],
    );
    return rows as FavoriteProduct[];
  });

export const addFavoriteFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { token: string; product_id: string }) => data)
  .handler(async ({ data }) => {
    const user = verifyToken(data.token);
    await db.execute(
      'INSERT IGNORE INTO favorites (user_id, product_id) VALUES (?, ?)',
      [user.id, data.product_id],
    );
  });

export const removeFavoriteFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { token: string; product_id: string }) => data)
  .handler(async ({ data }) => {
    const user = verifyToken(data.token);
    await db.execute('DELETE FROM favorites WHERE user_id = ? AND product_id = ?', [user.id, data.product_id]);
  });
