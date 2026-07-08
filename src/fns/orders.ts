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

export const fetchMyOrdersFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    const user = verifyToken(data.token);
    const [orders] = await db.execute('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [user.id]);
    const list = orders as any[];
    if (list.length === 0) return [];
    const ids = list.map((o) => o.id);
    const [items] = await db.query(
      `SELECT * FROM order_items WHERE order_id IN (${ids.map(() => '?').join(',')})`,
      ids
    );
    const itemMap: Record<string, any[]> = {};
    for (const item of items as any[]) {
      if (!itemMap[item.order_id]) itemMap[item.order_id] = [];
      itemMap[item.order_id].push(item);
    }
    return list.map((o) => ({ ...o, order_items: itemMap[o.id] ?? [] }));
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
  .inputValidator((data: { token: string; id: string | number; status: string }) => data)
  .handler(async ({ data }) => {
    const u = verifyToken(data.token);
    if (!u.isAdmin) throw new Error('Acesso negado');

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [rows] = await conn.execute('SELECT status FROM orders WHERE id = ?', [data.id]);
      const current = (rows as any[])[0];
      if (!current) throw new Error('Pedido não encontrado');

      // Cancelar um pedido devolve ao estoque o que havia sido debitado na criação —
      // só roda uma vez (guarda contra cancelar um pedido já cancelado).
      if (data.status === 'cancelled' && current.status !== 'cancelled') {
        const [items] = await conn.execute(
          'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
          [data.id],
        );
        for (const item of items as any[]) {
          if (item.product_id) {
            await conn.execute('UPDATE products SET stock = stock + ? WHERE id = ?', [
              item.quantity,
              item.product_id,
            ]);
          }
        }
      }

      await conn.execute('UPDATE orders SET status = ? WHERE id = ?', [data.status, data.id]);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  });
