import { createServerFn } from '@tanstack/react-start';
import { db } from '@/lib/db';

export const fetchReviewsFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { productId: number }) => data)
  .handler(async ({ data }) => {
    const [rows] = await db.query(
      'SELECT * FROM reviews WHERE product_id = ? ORDER BY created_at DESC',
      [data.productId]
    );
    return rows as any[];
  });
