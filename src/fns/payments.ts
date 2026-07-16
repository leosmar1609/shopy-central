import { createServerFn } from '@tanstack/react-start';
import { getRequestIP } from '@tanstack/react-start/server';
import crypto from 'crypto';
import https from 'node:https';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { getEnv } from '@/lib/env';
import { calculateShipping, estimateCartWeightKg } from '@/lib/shipping';

function getAsaasConfig(): { apiKey: string; baseUrl: string } {
  const rawKey = getEnv('ASAAS_API_KEY')?.trim();
  if (!rawKey) {
    throw new Error('ASAAS_API_KEY inválido ou não configurado.');
  }
  // Chaves do Asaas sempre começam com "$", mas esse caractere é interpretado como
  // referência de variável de shell pelo dotenv-expand (usado internamente pelo Vite
  // para carregar o .env) e acaba sendo removido silenciosamente se não vier escapado
  // como "\$" — o que já causou chave "inválida" duas vezes. Guarde a chave no .env
  // SEM o "$" (ex: ASAAS_API_KEY=aact_prod_...) e completamos aqui, sem depender de
  // ninguém lembrar de escapar nada na hora de trocar a chave.
  const apiKey = rawKey.startsWith('$') ? rawKey : `$${rawKey}`;
  const baseUrl = getEnv('ASAAS_BASE_URL', 'https://api.asaas.com/v3')?.trim().replace(/\/+$/, '') || 'https://api.asaas.com/v3';
  return { apiKey, baseUrl };
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
  shipping_neighborhood?: string;
  shipping_state?: string;
  shipping_complement?: string;
  coupon_code?: string;
  discount?: number;
};

type PaymentItem = {
  product_id: string | number;
  product_name: string;
  product_image?: string | null;
  unit_price: number;
  quantity: number;
};

function asaasRequest<T>(
  method: 'GET' | 'POST',
  path: string,
  apiKey: string,
  baseUrl: string,
  body?: object,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const url = new URL(baseUrl + path);
    const payload = body ? Buffer.from(JSON.stringify(body), 'utf-8') : undefined;
    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method,
        rejectUnauthorized: false,
        headers: {
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': payload.byteLength } : {}),
          access_token: apiKey,
          'User-Agent': 'shopy-central-integration',
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
            console.error('[Asaas API Error] status:', status, 'body:', text);
            const errors = Array.isArray(parsed?.errors)
              ? (parsed.errors as any[]).map((e) => e.description).filter(Boolean).join(' | ')
              : '';
            reject(new Error(errors || `Asaas erro HTTP ${status}`));
          } else {
            resolve(parsed as T);
          }
        });
      },
    );
    req.on('error', (err: Error) => reject(new Error(`Falha ao conectar com o Asaas: ${err.message}`)));
    if (payload) req.write(payload);
    req.end();
  });
}

function formatDueDate(daysAhead: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toISOString().slice(0, 10);
}

async function findOrCreateAsaasCustomer(
  apiKey: string,
  baseUrl: string,
  params: {
    name: string;
    cpfCnpj: string;
    email?: string;
    phone?: string;
    postalCode?: string;
    address?: string;
    addressNumber?: string;
  },
): Promise<string> {
  const cpfCnpj = params.cpfCnpj.replace(/\D/g, '');

  type CustomerListResponse = { data: Array<{ id: string }> };
  const existing = await asaasRequest<CustomerListResponse>(
    'GET',
    `/customers?cpfCnpj=${cpfCnpj}`,
    apiKey,
    baseUrl,
  );
  if (existing.data?.length) return existing.data[0].id;

  type CustomerResponse = { id: string };
  const created = await asaasRequest<CustomerResponse>('POST', '/customers', apiKey, baseUrl, {
    name: params.name,
    cpfCnpj,
    email: params.email,
    phone: params.phone,
    postalCode: params.postalCode,
    address: params.address,
    addressNumber: params.addressNumber,
  });
  return created.id;
}

// Nunca confia no frete/total calculado no navegador — recalcula aqui usando o peso
// real de cada produto (buscado no banco, não o que o cliente mandou) e o CEP de
// destino informado. Mesma lógica de "recomputa no servidor" já usada pro desconto
// de cupom (validateCouponFn), agora também pro frete dinâmico.
async function recomputeAuthoritativeShipping(
  conn: Awaited<ReturnType<typeof db.getConnection>>,
  order: OrderPayload,
  items: PaymentItem[],
): Promise<OrderPayload> {
  const productIds = items.map((i) => i.product_id).filter((id) => id != null);
  const weightByProductId: Record<string, number> = {};

  if (productIds.length) {
    const placeholders = productIds.map(() => '?').join(',');
    const [rows] = await conn.execute(
      `SELECT id, weight_kg FROM products WHERE id IN (${placeholders})`,
      productIds,
    );
    for (const row of rows as any[]) {
      weightByProductId[String(row.id)] = Number(row.weight_kg);
    }
  }

  const totalWeightKg = estimateCartWeightKg(
    items.map((item) => ({
      quantity: item.quantity,
      weight_kg: weightByProductId[String(item.product_id)],
    })),
  );

  const { cost: shipping } = calculateShipping({
    destinationCep: order.shipping_zip,
    totalWeightKg,
    subtotal: order.subtotal,
  });

  const discount = order.discount ?? 0;
  const total = Math.max(0, order.subtotal - discount + shipping);

  return { ...order, shipping, total };
}

async function insertOrder(
  conn: Awaited<ReturnType<typeof db.getConnection>>,
  userId: string | number,
  order: OrderPayload,
): Promise<string> {
  const id = crypto.randomUUID();
  await conn.execute(
    `INSERT INTO orders
      (id, user_id, status, subtotal, shipping, total, payment_method, shipping_name, shipping_address,
       shipping_city, shipping_zip, shipping_country, shipping_neighborhood, shipping_state, shipping_complement,
       coupon_code, discount)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      order.shipping_neighborhood ?? null,
      order.shipping_state ?? null,
      order.shipping_complement ?? null,
      order.coupon_code ?? null,
      order.discount ?? 0,
    ],
  );
  if (order.coupon_code) {
    await conn.execute('UPDATE coupons SET uses_count = uses_count + 1 WHERE code = ?', [
      order.coupon_code.trim().toUpperCase(),
    ]);
  }
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

// A condição `stock >= ?` faz a dedução falhar (affectedRows = 0) em vez de deixar o
// estoque negativo — é o jeito seguro de checar+debitar em uma única query atômica.
async function deductStock(
  conn: Awaited<ReturnType<typeof db.getConnection>>,
  items: PaymentItem[],
): Promise<void> {
  for (const item of items) {
    const [result] = await conn.execute(
      'UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?',
      [item.quantity, item.product_id, item.quantity],
    );
    if ((result as any).affectedRows === 0) {
      throw new Error(`Estoque insuficiente para "${item.product_name}".`);
    }
  }
}

// PIX e Boleto: cria a cobrança no Asaas e retorna QR code ou linha digitável
export const createAsaasDirectPaymentFn = createServerFn({ method: 'POST' })
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
    const { apiKey, baseUrl } = getAsaasConfig();

    const conn = await db.getConnection();
    let orderId: string | undefined;
    let order: OrderPayload = data.order;
    try {
      await conn.beginTransaction();
      order = await recomputeAuthoritativeShipping(conn, data.order, data.items);
      orderId = await insertOrder(conn, user.id, order);
      await insertOrderItems(conn, orderId, data.items);
      await deductStock(conn, data.items);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    const customerId = await findOrCreateAsaasCustomer(apiKey, baseUrl, {
      name: order.shipping_name || user.fullName || 'Cliente',
      cpfCnpj: data.cpf,
      email: user.email,
      postalCode: order.shipping_zip,
      address: order.shipping_address,
    });

    type AsaasPaymentResponse = {
      id: string;
      status: string;
      bankSlipUrl?: string;
      invoiceUrl?: string;
    };

    const billingType = data.payment_type === 'pix' ? 'PIX' : 'BOLETO';
    const payment = await asaasRequest<AsaasPaymentResponse>('POST', '/payments', apiKey, baseUrl, {
      customer: customerId,
      billingType,
      value: Number(order.total),
      dueDate: formatDueDate(data.payment_type === 'pix' ? 1 : 3),
      description: 'Pedido Lumiere',
      externalReference: orderId ?? '',
    });

    // Guardamos o ID do pagamento no Asaas para poder buscar de novo o QR/boleto depois
    // (ex: cliente perdeu o código) sem precisar gerar uma nova cobrança.
    await db.execute('UPDATE orders SET asaas_payment_id = ? WHERE id = ?', [payment.id, orderId]);

    if (data.payment_type === 'pix') {
      type PixQrCodeResponse = { encodedImage?: string; payload?: string };
      const qr = await asaasRequest<PixQrCodeResponse>(
        'GET',
        `/payments/${payment.id}/pixQrCode`,
        apiKey,
        baseUrl,
      );
      return {
        type: 'pix' as const,
        payment_id: payment.id,
        order_id: orderId ?? '',
        qr_code: qr.payload ?? '',
        qr_code_base64: qr.encodedImage ?? '',
      };
    } else {
      type IdentificationFieldResponse = { identificationField?: string };
      const boleto = await asaasRequest<IdentificationFieldResponse>(
        'GET',
        `/payments/${payment.id}/identificationField`,
        apiKey,
        baseUrl,
      );
      return {
        type: 'boleto' as const,
        payment_id: payment.id,
        order_id: orderId ?? '',
        boleto_url: payment.bankSlipUrl ?? payment.invoiceUrl ?? '',
        barcode: boleto.identificationField ?? '',
      };
    }
  });

// Cartão de crédito: envia os dados direto pro Asaas (tokenização é feita no lado deles)
export const createAsaasChargeFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      token: string;
      order: OrderPayload;
      items: PaymentItem[];
      cpf: string;
      phone: string;
      address_number: string;
      card_holder_name: string;
      card_number: string;
      card_expiry_month: string;
      card_expiry_year: string;
      card_cvv: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const user = verifyToken(data.token);
    const { apiKey, baseUrl } = getAsaasConfig();

    const conn = await db.getConnection();
    let orderId: string | undefined;
    let order: OrderPayload = data.order;
    try {
      await conn.beginTransaction();
      order = await recomputeAuthoritativeShipping(conn, data.order, data.items);
      orderId = await insertOrder(conn, user.id, order);
      await insertOrderItems(conn, orderId, data.items);
      await deductStock(conn, data.items);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    const customerId = await findOrCreateAsaasCustomer(apiKey, baseUrl, {
      name: order.shipping_name || user.fullName || 'Cliente',
      cpfCnpj: data.cpf,
      email: user.email,
      phone: data.phone,
      postalCode: order.shipping_zip,
      address: order.shipping_address,
      addressNumber: data.address_number,
    });

    const remoteIp = getRequestIP({ xForwardedFor: true }) ?? '127.0.0.1';

    type AsaasPaymentResponse = { id: string; status: string };

    const payment = await asaasRequest<AsaasPaymentResponse>('POST', '/payments', apiKey, baseUrl, {
      customer: customerId,
      billingType: 'CREDIT_CARD',
      value: Number(order.total),
      dueDate: formatDueDate(0),
      description: `Pedido #${orderId}`,
      externalReference: orderId ?? '',
      creditCard: {
        holderName: data.card_holder_name,
        number: data.card_number.replace(/\s/g, ''),
        expiryMonth: data.card_expiry_month.padStart(2, '0'),
        expiryYear: data.card_expiry_year,
        ccv: data.card_cvv,
      },
      creditCardHolderInfo: {
        name: data.card_holder_name,
        email: user.email,
        cpfCnpj: data.cpf.replace(/\D/g, ''),
        postalCode: (order.shipping_zip || '').replace(/\D/g, ''),
        addressNumber: data.address_number || 'S/N',
        phone: data.phone.replace(/\D/g, ''),
      },
      remoteIp,
    });

    let status: 'pending' | 'paid' | 'cancelled' = 'pending';
    if (payment.status === 'CONFIRMED' || payment.status === 'RECEIVED') status = 'paid';

    await db.execute('UPDATE orders SET status = ?, asaas_payment_id = ? WHERE id = ?', [
      status,
      payment.id,
      orderId,
    ]);

    return {
      orderId,
      payment,
      order_status: status,
    };
  });

// Retoma um pagamento PIX/boleto pendente (ex: cliente perdeu o QR code ou a linha
// digitável) buscando de novo direto no Asaas usando o ID já salvo no pedido — nunca
// gera uma cobrança nova. De brinde, sincroniza o status local se já tiver sido pago.
export const fetchOrderPaymentFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { token: string; order_id: string }) => data)
  .handler(async ({ data }) => {
    const user = verifyToken(data.token);
    const { apiKey, baseUrl } = getAsaasConfig();

    const [rows] = await db.execute(
      'SELECT id, user_id, status, payment_method, asaas_payment_id FROM orders WHERE id = ?',
      [data.order_id],
    );
    const order = (rows as any[])[0];
    if (!order) throw new Error('Pedido não encontrado.');
    if (String(order.user_id) !== String(user.id) && !user.isAdmin) {
      throw new Error('Acesso negado.');
    }
    if (!order.asaas_payment_id) {
      throw new Error('Este pedido não possui um pagamento associado.');
    }
    if (order.payment_method !== 'pix' && order.payment_method !== 'boleto') {
      throw new Error('Este método de pagamento não pode ser retomado por aqui.');
    }

    type AsaasPaymentResponse = { id: string; status: string; bankSlipUrl?: string; invoiceUrl?: string };
    const payment = await asaasRequest<AsaasPaymentResponse>(
      'GET',
      `/payments/${order.asaas_payment_id}`,
      apiKey,
      baseUrl,
    );

    const isPaid = payment.status === 'CONFIRMED' || payment.status === 'RECEIVED';
    if (isPaid && order.status !== 'paid') {
      await db.execute('UPDATE orders SET status = ? WHERE id = ?', ['paid', order.id]);
    }
    if (isPaid) {
      return { type: 'paid' as const, order_id: order.id };
    }

    if (order.payment_method === 'pix') {
      type PixQrCodeResponse = { encodedImage?: string; payload?: string };
      const qr = await asaasRequest<PixQrCodeResponse>(
        'GET',
        `/payments/${order.asaas_payment_id}/pixQrCode`,
        apiKey,
        baseUrl,
      );
      return {
        type: 'pix' as const,
        payment_id: order.asaas_payment_id,
        order_id: order.id,
        qr_code: qr.payload ?? '',
        qr_code_base64: qr.encodedImage ?? '',
      };
    } else {
      type IdentificationFieldResponse = { identificationField?: string };
      const boleto = await asaasRequest<IdentificationFieldResponse>(
        'GET',
        `/payments/${order.asaas_payment_id}/identificationField`,
        apiKey,
        baseUrl,
      );
      return {
        type: 'boleto' as const,
        payment_id: order.asaas_payment_id,
        order_id: order.id,
        boleto_url: payment.bankSlipUrl ?? payment.invoiceUrl ?? '',
        barcode: boleto.identificationField ?? '',
      };
    }
  });

// Reembolsa um pedido: estorna a cobrança no Asaas, devolve o estoque dos itens e
// marca o pedido como 'refunded'. Ação exclusiva de admin.
export const refundOrderFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { token: string; order_id: string; reason?: string }) => data)
  .handler(async ({ data }) => {
    const user = verifyToken(data.token);
    if (!user.isAdmin) throw new Error('Acesso negado.');
    const { apiKey, baseUrl } = getAsaasConfig();

    const [rows] = await db.execute(
      'SELECT id, status, asaas_payment_id FROM orders WHERE id = ?',
      [data.order_id],
    );
    const order = (rows as any[])[0];
    if (!order) throw new Error('Pedido não encontrado.');
    if (order.status === 'refunded') throw new Error('Este pedido já foi reembolsado.');
    if (order.status === 'cancelled') throw new Error('Pedido cancelado não pode ser reembolsado.');
    if (!order.asaas_payment_id) throw new Error('Este pedido não possui um pagamento associado no Asaas.');

    // Se o Asaas recusar (ex: saldo insuficiente pra estornar boleto já sacado), o erro
    // já sobe com a mensagem real deles — nada é alterado no banco antes de confirmar.
    await asaasRequest('POST', `/payments/${order.asaas_payment_id}/refund`, apiKey, baseUrl, {});

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const [items] = await conn.execute(
        'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
        [data.order_id],
      );
      for (const item of items as any[]) {
        if (item.product_id) {
          await conn.execute('UPDATE products SET stock = stock + ? WHERE id = ?', [
            item.quantity,
            item.product_id,
          ]);
        }
      }
      await conn.execute(
        'UPDATE orders SET status = ?, refunded_at = NOW(), refund_reason = ? WHERE id = ?',
        ['refunded', data.reason ?? null, data.order_id],
      );
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  });
