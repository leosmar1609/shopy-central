import { createServerFn } from '@tanstack/react-start';
import crypto from 'crypto';
import https from 'node:https';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';

function getMpAccessToken(): string {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token || (!token.startsWith('APP_USR-') && !token.startsWith('TEST-'))) {
    throw new Error('MP_ACCESS_TOKEN inválido ou não configurado.');
  }
  return token;
}
type OrderPayload = {
  subtotal: number;
  shipping: number;
  total: number;
  payment_method: string;
  shipping_name: string;
  shipping_address: string;
  shipping_city: string;
  shipping_zip: string;
  shipping_country: string;
};

type PaymentItem = {
  product_id: string | number;
  product_name: string;
  product_image?: string | null;
  unit_price: number;
  quantity: number;
};

function mpPost<T>(path: string, body: object, accessToken: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const payload = Buffer.from(JSON.stringify(body), 'utf-8');
    const req = https.request(
      {
        hostname: 'api.mercadopago.com',
        path,
        method: 'POST',
        rejectUnauthorized: false,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': payload.byteLength,
          Authorization: `Bearer ${accessToken}`,
          'X-Idempotency-Key': crypto.randomUUID(),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf-8');
          let parsed: any;
          try {
            parsed = JSON.parse(text);
          } catch {
            parsed = {};
          }
          const status = res.statusCode ?? 0;
          if (status >= 400) {
            console.error('[MP API Error] status:', status, 'body:', text);
            const base = (parsed?.message as string | undefined) ?? `Mercado Pago erro HTTP ${status}`;
            const causes = Array.isArray(parsed?.cause)
              ? (parsed.cause as any[]).map((c) => `${c.code ?? ''} ${c.description ?? ''}`.trim()).filter(Boolean).join(' | ')
              : (parsed?.cause?.description as string | undefined) ?? '';
            reject(new Error(causes ? `${base}: ${causes}` : base));
          } else {
            resolve(parsed as T);
          }
        });
      },
    );
    req.on('error', (err: Error) =>
      reject(new Error(`Falha ao conectar com o Mercado Pago: ${err.message}`)),
    );
    req.write(payload);
    req.end();
  });
}


function formatPayerName(fullName?: string): { name: string; surname: string } {
  const full = String(fullName ?? '').trim();
  if (!full) return { name: 'Cliente', surname: '' };
  const [name, ...rest] = full.split(/\s+/);
  return { name, surname: rest.join(' ') || name };
}

async function insertOrder(
  conn: Awaited<ReturnType<typeof db.getConnection>>,
  userId: string | number,
  order: OrderPayload,
): Promise<string> {
  const id = crypto.randomUUID();
  await conn.execute(
    'INSERT INTO orders (id, user_id, status, subtotal, shipping, total, payment_method, shipping_name, shipping_address, shipping_city, shipping_zip, shipping_country) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      id,
      userId,
      'pending',
      order.subtotal,
      order.shipping,
      order.total,
      order.payment_method,
      order.shipping_name,
      order.shipping_address,
      order.shipping_city,
      order.shipping_zip,
      order.shipping_country,
    ],
  );
  return id;
}

async function insertOrderItems(
  conn: Awaited<ReturnType<typeof db.getConnection>>,
  orderId: string,
  items: PaymentItem[],
): Promise<void> {
  if (items.length === 0) return;
  const placeholders = items.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
  const params = items.flatMap((item) => [
    orderId,
    item.product_id,
    item.product_name,
    item.product_image ?? null,
    item.unit_price,
    item.quantity,
  ]);
  await conn.execute(
    `INSERT INTO order_items (order_id, product_id, product_name, product_image, unit_price, quantity) VALUES ${placeholders}`,
    params,
  );
}

// PIX e Boleto: cria pagamento direto via /v1/payments e retorna QR code ou linha digitável
export const createMercadoPagoDirectPaymentFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      token: string;
      payment_type: 'pix' | 'boleto';
      order: OrderPayload;
      items: PaymentItem[];
      cpf: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const user = verifyToken(data.token);

    const conn = await db.getConnection();
    let orderId: string | undefined;
    try {
      await conn.beginTransaction();
      orderId = await insertOrder(conn, user.id, data.order);
      await insertOrderItems(conn, orderId, data.items);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    const { name, surname } = formatPayerName(user.fullName);
    const accessToken = getMpAccessToken();
    const paymentMethodId = data.payment_type === 'pix' ? 'pix' : 'bolbradesco';

    type MpPaymentResponse = {
      id: number;
      status: string;
      point_of_interaction?: {
        transaction_data?: {
          qr_code?: string;
          qr_code_base64?: string;
        };
      };
      transaction_details?: {
        external_resource_url?: string;
      };
      barcode?: {
        content?: string;
      };
    };

    // Em sandbox (TEST-), o email do pagador não pode ser o mesmo do vendedor.
    const isTestMode = accessToken.startsWith('TEST-');
    if (isTestMode && !process.env.MP_TEST_BUYER_EMAIL) {
      throw new Error('Configure MP_TEST_BUYER_EMAIL no .env com o email de um test buyer do Mercado Pago.');
    }
    const payerEmail = isTestMode ? process.env.MP_TEST_BUYER_EMAIL! : user.email;

    const result = await mpPost<MpPaymentResponse>(
      '/v1/payments',
      {
        transaction_amount: Number(data.order.total),
        description: 'Pedido Lumiere',
        payment_method_id: paymentMethodId,
        payer: {
          email: payerEmail,
          first_name: name,
          last_name: surname || name,
          identification: {
            type: 'CPF',
            number: data.cpf.replace(/\D/g, ''),
          },
        },
        external_reference: orderId ?? '',
      },
      accessToken,
    );

    if (data.payment_type === 'pix') {
      return {
        type: 'pix' as const,
        payment_id: result.id,
        order_id: orderId ?? '',
        qr_code: result.point_of_interaction?.transaction_data?.qr_code ?? '',
        qr_code_base64: result.point_of_interaction?.transaction_data?.qr_code_base64 ?? '',
      };
    } else {
      return {
        type: 'boleto' as const,
        payment_id: result.id,
        order_id: orderId ?? '',
        boleto_url: result.transaction_details?.external_resource_url ?? '',
        barcode: result.barcode?.content ?? '',
      };
    }
  });

// Cartão de crédito: tokeniza no frontend e cobra direto
export const createMercadoPagoChargeFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      token: string;
      order: OrderPayload;
      items: PaymentItem[];
      card_token: string;
      installments?: number;
      payment_method_id?: string;
      cpf?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const user = verifyToken(data.token);

    const conn = await db.getConnection();
    let orderId: string | undefined;
    try {
      await conn.beginTransaction();
      orderId = await insertOrder(conn, user.id, data.order);
      await insertOrderItems(conn, orderId, data.items);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    const accessToken = getMpAccessToken();

    type MpPaymentResponse = {
      id: number;
      status: string;
      status_detail: string;
    };

    const result = await mpPost<MpPaymentResponse>(
      '/v1/payments',
      {
        transaction_amount: Number(data.order.total),
        token: data.card_token,
        description: `Pedido #${orderId}`,
        installments: data.installments ?? 1,
        payment_method_id: data.payment_method_id ?? 'visa',
        payer: {
          email: user.email,
          identification: {
            type: 'CPF',
            number: (data.cpf ?? '').replace(/\D/g, ''),
          },
        },
        external_reference: orderId ?? '',
      },
      accessToken,
    );

    let status: 'pending' | 'paid' | 'cancelled' = 'pending';
    if (result.status === 'approved') status = 'paid';
    else if (result.status === 'rejected') status = 'cancelled';

    await db.execute('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);

    return {
      orderId,
      payment: result,
      order_status: status,
    };
  });
