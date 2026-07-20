import { createServerFn } from '@tanstack/react-start';
import { setResponseHeaders } from '@tanstack/react-start/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';

export const fetchReviewsFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { productId: string }) => data)
  .handler(async ({ data }) => {
    // Sem isso, GET sem Cache-Control explícito pode ser reaproveitado pelo navegador/proxy
    // e mostrar uma avaliação antiga depois que o usuário já atualizou a dela.
    // `setResponseHeaders`'s bundled type (TypedHeaders<ResponseHeaderMap>) wrongly demands a
    // Headers-like instance instead of the plain object the runtime (and TanStack's own docs) accept.
    setResponseHeaders({ 'Cache-Control': 'no-store' } as any);
    const [rows] = await db.query(
      `SELECT r.*, u.full_name FROM reviews r JOIN users u ON u.id = r.user_id
       WHERE r.product_id = ? ORDER BY r.created_at DESC`,
      [data.productId]
    );
    return rows as any[];
  });

async function recomputeProductRating(conn: Awaited<ReturnType<typeof db.getConnection>>, productId: string) {
  const [rows] = await conn.query('SELECT AVG(rating) AS avg_rating FROM reviews WHERE product_id = ?', [productId]);
  const avg = (rows as any[])[0]?.avg_rating;
  await conn.query('UPDATE products SET rating = ? WHERE id = ?', [avg != null ? Number(avg) : 5.0, productId]);
}

// Um usuário só pode ter uma avaliação por produto — reenviar edita a existente
// em vez de criar duplicata (garantido também pela constraint única no banco).
export const createReviewFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { token: string; productId: string; rating: number; comment?: string }) => data)
  .handler(async ({ data }) => {
    const u = verifyToken(data.token);
    const rating = Math.round(Number(data.rating));
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      throw new Error('A avaliação deve ser de 1 a 5 estrelas.');
    }
    const comment = data.comment?.trim() || null;

    const conn = await db.getConnection();
    try {
      await conn.execute(
        `INSERT INTO reviews (product_id, user_id, rating, comment) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment), created_at = CURRENT_TIMESTAMP`,
        [data.productId, u.id, rating, comment]
      );
      await recomputeProductRating(conn, data.productId);
    } finally {
      conn.release();
    }
  });
