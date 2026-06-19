import { createServerFn } from '@tanstack/react-start';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';

export const fetchCategoriesFn = createServerFn({ method: 'GET' }).handler(async () => {
  const [rows] = await db.query('SELECT * FROM categories ORDER BY name');
  return rows as any[];
});

export const createCategoryFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { token: string; name: string; slug: string; image_url: string }) => data)
  .handler(async ({ data }) => {
    const u = verifyToken(data.token);
    if (!u.isAdmin) throw new Error('Acesso negado');
    await db.execute(
      'INSERT INTO categories (name, slug, image_url) VALUES (?, ?, ?)',
      [data.name, data.slug, data.image_url || null]
    );
  });

export const deleteCategoryFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { token: string; id: number }) => data)
  .handler(async ({ data }) => {
    const u = verifyToken(data.token);
    if (!u.isAdmin) throw new Error('Acesso negado');
    await db.execute('DELETE FROM categories WHERE id = ?', [data.id]);
  });
