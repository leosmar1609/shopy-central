import { createServerFn } from '@tanstack/react-start';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';

export const createOrderFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { token: string; order: any; items: any[] }) => data)
  .handler(async ({ data }) => {
    const user = verifyToken(data.token);
    const o = data.order;
    const [result] = await db.execute(
      'INSERT INTO orders (user_id, status, subtotal, shipping, total, payment_method, shipping_name, shipping_address, shipping_city, shipping_zip, shipping_country) VALUES (?, "pending", ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [user.id, o.subtotal, o.shipping, o.total, o.payment_method, o.shipping_name, o.shipping_address, o.shipping_city, o.shipping_zip, o.shipping_country]
    );
    const orderId = (result as any).insertId;
    if (data.items.length > 0) {
      const placeholders = data.items.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
      const params = data.items.flatMap((i) => [
        orderId, i.product_id, i.product_name, i.product_image ?? null, i.unit_price, i.quantity,
      ]);
      await db.execute(
        `INSERT INTO order_items (order_id, product_id, product_name, product_image, unit_price, quantity) VALUES ${placeholders}`,
        params
      );
    }
    return { id: orderId };
  });

export const fetchAdminOrdersFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    const u = verifyToken(data.token);
    if (!u.isAdmin) throw new Error('Acesso negado');
    const [orders] = await db.query('SELECT * FROM orders ORDER BY created_at DESC');
    const list = orders as any[];
    if (list.length === 0) return [];
    const ids = list.map((o) => o.id);
    const [items] = await db.query(
      `SELECT * FROM order_items WHERE order_id IN (${ids.map(() => '?').join(',')})`,
      ids
    );
    const itemMap: Record<number, any[]> = {};
    for (const item of items as any[]) {
      if (!itemMap[item.order_id]) itemMap[item.order_id] = [];
      itemMap[item.order_id].push(item);
    }
    return list.map((o) => ({ ...o, order_items: itemMap[o.id] ?? [] }));
  });

export const updateOrderStatusFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { token: string; id: number; status: string }) => data)
  .handler(async ({ data }) => {
    const u = verifyToken(data.token);
    if (!u.isAdmin) throw new Error('Acesso negado');
    await db.execute('UPDATE orders SET status = ? WHERE id = ?', [data.status, data.id]);
  });
