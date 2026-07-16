import { createServerFn } from '@tanstack/react-start';
import https from 'node:https';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { getEnv } from '@/lib/env';

function get17TrackApiKey(): string {
  const key = getEnv('TRACK17_API_KEY')?.trim();
  if (!key) {
    throw new Error('TRACK17_API_KEY não configurado.');
  }
  return key;
}

function track17Request<T>(path: string, apiKey: string, body: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    const payload = Buffer.from(JSON.stringify(body), 'utf-8');
    const req = https.request(
      {
        hostname: 'api.17track.net',
        path,
        method: 'POST',
        rejectUnauthorized: false,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': payload.byteLength,
          '17token': apiKey,
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
            reject(new Error(`17TRACK erro HTTP ${status}: ${text}`));
          } else {
            resolve(parsed as T);
          }
        });
      },
    );
    req.on('error', (err: Error) => reject(new Error(`Falha ao conectar com a 17TRACK: ${err.message}`)));
    req.write(payload);
    req.end();
  });
}

export type TrackingEvent = {
  time: string;
  location: string;
  description: string;
};

export type TrackingInfo = {
  tracking_code: string;
  carrier: string | null;
  status: string;
  events: TrackingEvent[];
};

// Chamado pelo admin ao adicionar/atualizar o código de rastreio de um pedido.
// Marca o pedido como 'shipped' e registra o número na 17TRACK (best-effort — se a
// chave não estiver configurada ainda, o rastreio salva normalmente no banco e a
// consulta de status na tela do cliente só não vai ter eventos até isso ser configurado).
export const setOrderTrackingFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { token: string; order_id: string; tracking_code: string; carrier: string }) => data)
  .handler(async ({ data }) => {
    const user = verifyToken(data.token);
    if (!user.isAdmin) throw new Error('Acesso negado.');

    const [rows] = await db.execute('SELECT status FROM orders WHERE id = ?', [data.order_id]);
    const order = (rows as any[])[0];
    if (!order) throw new Error('Pedido não encontrado.');

    const nextStatus = order.status === 'pending' || order.status === 'paid' ? 'shipped' : order.status;

    await db.execute(
      'UPDATE orders SET tracking_code = ?, carrier = ?, status = ?, shipped_at = NOW() WHERE id = ?',
      [data.tracking_code, data.carrier, nextStatus, data.order_id],
    );

    try {
      const apiKey = get17TrackApiKey();
      // Sem carrier explícito = a 17TRACK tenta detectar automaticamente pelo formato
      // do código. Mapear cada transportadora pro código numérico da 17TRACK exigiria
      // validar contra a conta real — deixamos o auto-detect, que cobre a maioria dos casos.
      await track17Request('/track/v2.2/register', apiKey, [{ number: data.tracking_code }]);
    } catch (err) {
      console.error('[tracking] Falha ao registrar na 17TRACK:', err);
    }
  });

// Mapa dos status gerais que a 17TRACK retorna em track_info.latest_status.status
// (em inglês) para um rótulo amigável em pt-BR.
const STATUS_LABELS: Record<string, string> = {
  NotFound: 'Ainda sem informações',
  InfoReceived: 'Informação recebida pela transportadora',
  InTransit: 'Em trânsito',
  Expired: 'Rastreio expirado',
  AvailableForPickup: 'Disponível para retirada',
  OutForDelivery: 'Saiu para entrega',
  Delivered: 'Entregue',
  Exception: 'Ocorrência com a entrega',
  Undelivered: 'Não entregue',
};

// Esquema confirmado em 2026-07-09 direto com a conta real (a 17TRACK usa um formato
// bem diferente do documentado como "v2.2" clássico): os eventos ficam em
// data.accepted[0].track_info.tracking.providers[].events[], já em ordem do mais
// recente pro mais antigo, cada um com { time_iso, description, location, address }.
function formatEventTime(isoTime: string): string {
  if (!isoTime) return '';
  const date = new Date(isoTime);
  if (Number.isNaN(date.getTime())) return isoTime;
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function normalizeTrackingEvents(accepted: any): TrackingEvent[] {
  const providers = accepted?.track_info?.tracking?.providers ?? [];
  const events: TrackingEvent[] = [];
  for (const provider of providers) {
    for (const e of provider?.events ?? []) {
      events.push({
        time: formatEventTime(e?.time_iso ?? e?.time_utc ?? ''),
        location: e?.location || e?.address?.city || e?.address?.country || '',
        description: e?.description ?? '',
      });
    }
  }
  return events.filter((e) => e.time || e.description);
}

function friendlyStatus(accepted: any): string | null {
  const status = accepted?.track_info?.latest_status?.status;
  if (!status) return null;
  return STATUS_LABELS[status] ?? status;
}

// Consultado pelo cliente (Minha Conta > Pedidos) e pelo admin para exibir a
// localização/eventos de rastreio. Nunca lança erro por falta de dados — se ainda não
// há rastreio ou a 17TRACK não tem eventos, retorna uma lista vazia, sem quebrar a tela.
export const fetchOrderTrackingFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { token: string; order_id: string }) => data)
  .handler(async ({ data }): Promise<TrackingInfo | null> => {
    const user = verifyToken(data.token);

    const [rows] = await db.execute(
      'SELECT user_id, tracking_code, carrier, status FROM orders WHERE id = ?',
      [data.order_id],
    );
    const order = (rows as any[])[0];
    if (!order) throw new Error('Pedido não encontrado.');
    if (String(order.user_id) !== String(user.id) && !user.isAdmin) throw new Error('Acesso negado.');
    if (!order.tracking_code) return null;

    let events: TrackingEvent[] = [];
    let status: string | null = null;
    try {
      const apiKey = get17TrackApiKey();
      const result = await track17Request<any>('/track/v2.2/gettrackinfo', apiKey, [
        { number: order.tracking_code },
      ]);
      const accepted = result?.data?.accepted?.[0];
      if (accepted) {
        events = normalizeTrackingEvents(accepted);
        status = friendlyStatus(accepted);
      }
    } catch (err) {
      console.error('[tracking] Falha ao consultar a 17TRACK:', err);
    }

    return {
      tracking_code: order.tracking_code,
      carrier: order.carrier ?? null,
      status: status || events[0]?.description || 'Aguardando primeira atualização da transportadora',
      events,
    };
  });
