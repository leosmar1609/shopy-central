import { createServerFn } from '@tanstack/react-start';
import { setResponseHeaders } from '@tanstack/react-start/server';
import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';

export type Coupon = {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_value: number;
  max_uses: number | null;
  uses_count: number;
  valid_from: string | null;
  valid_until: string | null;
  active: number;
  created_at: string;
};

export type CouponValidationResult =
  | { valid: true; coupon: { code: string; discount_type: 'percentage' | 'fixed'; discount_value: number }; discount: number }
  | { valid: false; reason: string };

// Cupom público: usado no carrinho/checkout para calcular o desconto antes de fechar o pedido.
export const validateCouponFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { code: string; subtotal: number }) => data)
  .handler(async ({ data }): Promise<CouponValidationResult> => {
    const code = data.code.trim().toUpperCase();
    if (!code) return { valid: false, reason: 'Informe um código de cupom.' };

    const [rows] = await db.execute('SELECT * FROM coupons WHERE code = ?', [code]);
    const coupon = (rows as Coupon[])[0];
    if (!coupon) return { valid: false, reason: 'Cupom não encontrado.' };
    if (!coupon.active) return { valid: false, reason: 'Este cupom não está mais ativo.' };

    const now = Date.now();
    if (coupon.valid_from && now < new Date(coupon.valid_from).getTime()) {
      return { valid: false, reason: 'Este cupom ainda não é válido.' };
    }
    if (coupon.valid_until && now > new Date(coupon.valid_until).getTime()) {
      return { valid: false, reason: 'Este cupom expirou.' };
    }
    if (coupon.max_uses !== null && coupon.uses_count >= coupon.max_uses) {
      return { valid: false, reason: 'Este cupom atingiu o limite de usos.' };
    }
    if (data.subtotal < Number(coupon.min_order_value)) {
      return { valid: false, reason: `Pedido mínimo de R$ ${Number(coupon.min_order_value).toFixed(2)} para usar este cupom.` };
    }

    const discount =
      coupon.discount_type === 'percentage'
        ? Math.round(data.subtotal * (Number(coupon.discount_value) / 100) * 100) / 100
        : Math.min(Number(coupon.discount_value), data.subtotal);

    return {
      valid: true,
      coupon: { code: coupon.code, discount_type: coupon.discount_type, discount_value: Number(coupon.discount_value) },
      discount,
    };
  });

// Lista pública de cupons ativos e dentro da validade, para exibir como "promoções disponíveis"
// (não expõe uses_count/max_uses, só o necessário para o cliente decidir se quer usar).
export const fetchActiveCouponsFn = createServerFn({ method: 'GET' }).handler(async () => {
  setResponseHeaders({ 'Cache-Control': 'no-store' } as any);
  const [rows] = await db.execute(
    `SELECT code, discount_type, discount_value, min_order_value FROM coupons
     WHERE active = 1
       AND (valid_from IS NULL OR valid_from <= NOW())
       AND (valid_until IS NULL OR valid_until >= NOW())
       AND (max_uses IS NULL OR uses_count < max_uses)
     ORDER BY created_at DESC`,
  );
  return rows as Array<Pick<Coupon, 'code' | 'discount_type' | 'discount_value' | 'min_order_value'>>;
});

function assertAdmin(token: string) {
  const user = verifyToken(token);
  if (!user.isAdmin) throw new Error('Acesso negado');
}

export const fetchAdminCouponsFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    assertAdmin(data.token);
    // Sem isso, o refetch disparado logo após editar/excluir pode reaproveitar a resposta
    // GET anterior (sem Cache-Control ela fica sujeita a cache do navegador) e mostrar a lista velha.
    setResponseHeaders({ 'Cache-Control': 'no-store' } as any);
    const [rows] = await db.query('SELECT * FROM coupons ORDER BY created_at DESC');
    return rows as Coupon[];
  });

type CouponInput = {
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_value: number;
  max_uses: number | null;
  valid_from: string | null;
  valid_until: string | null;
  active: boolean;
};

export const createCouponFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { token: string; coupon: CouponInput }) => data)
  .handler(async ({ data }) => {
    assertAdmin(data.token);
    const c = data.coupon;
    const id = randomUUID();
    await db.execute(
      `INSERT INTO coupons (id, code, discount_type, discount_value, min_order_value, max_uses, valid_from, valid_until, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        c.code.trim().toUpperCase(),
        c.discount_type,
        c.discount_value,
        c.min_order_value,
        c.max_uses,
        c.valid_from,
        c.valid_until,
        c.active ? 1 : 0,
      ],
    );
    return { id };
  });

export const updateCouponFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { token: string; id: string; coupon: CouponInput }) => data)
  .handler(async ({ data }) => {
    assertAdmin(data.token);
    const c = data.coupon;
    await db.execute(
      `UPDATE coupons SET code=?, discount_type=?, discount_value=?, min_order_value=?, max_uses=?, valid_from=?, valid_until=?, active=?
       WHERE id = ?`,
      [
        c.code.trim().toUpperCase(),
        c.discount_type,
        c.discount_value,
        c.min_order_value,
        c.max_uses,
        c.valid_from,
        c.valid_until,
        c.active ? 1 : 0,
        data.id,
      ],
    );
  });

export const deleteCouponFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { token: string; id: string }) => data)
  .handler(async ({ data }) => {
    assertAdmin(data.token);
    await db.execute('DELETE FROM coupons WHERE id = ?', [data.id]);
  });
