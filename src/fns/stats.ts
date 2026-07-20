import { createServerFn } from '@tanstack/react-start';
import { setResponseHeaders } from '@tanstack/react-start/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';

export const fetchStatsFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    const u = verifyToken(data.token);
    if (!u.isAdmin) throw new Error('Acesso negado');
    setResponseHeaders({ 'Cache-Control': 'no-store' } as any);
    const [[pc], [oc], [ic]] = await Promise.all([
      db.query('SELECT COUNT(*) AS count FROM products'),
      db.query('SELECT COALESCE(SUM(total), 0) AS revenue, COUNT(*) AS count FROM orders'),
      db.query('SELECT COUNT(*) AS count FROM order_items'),
    ]);
    const od = (oc as any[])[0];
    return {
      products: Number((pc as any[])[0].count),
      orders: Number(od.count),
      items: Number((ic as any[])[0].count),
      revenue: Number(od.revenue),
    };
  });
