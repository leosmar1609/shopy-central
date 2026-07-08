import { createServerFn } from '@tanstack/react-start';
import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';

export type Address = {
  id: string;
  user_id: string;
  label: string;
  recipient_name: string;
  phone: string;
  zip: string;
  address: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  country: string;
  is_default: number;
  created_at: string;
};

type AddressInput = {
  label: string;
  recipient_name: string;
  phone: string;
  zip: string;
  address: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  country: string;
  is_default?: boolean;
};

export const fetchMyAddressesFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    const user = verifyToken(data.token);
    const [rows] = await db.execute(
      'SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC',
      [user.id],
    );
    return rows as Address[];
  });

async function clearDefaultAddress(userId: string | number): Promise<void> {
  await db.execute('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [userId]);
}

export const createAddressFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { token: string; address: AddressInput }) => data)
  .handler(async ({ data }) => {
    const user = verifyToken(data.token);
    const a = data.address;
    const id = randomUUID();

    if (a.is_default) await clearDefaultAddress(user.id);

    await db.execute(
      `INSERT INTO addresses
        (id, user_id, label, recipient_name, phone, zip, address, number, complement, neighborhood, city, state, country, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        user.id,
        a.label,
        a.recipient_name,
        a.phone,
        a.zip,
        a.address,
        a.number,
        a.complement ?? null,
        a.neighborhood,
        a.city,
        a.state,
        a.country,
        a.is_default ? 1 : 0,
      ],
    );
    return { id };
  });

export const updateAddressFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { token: string; id: string; address: AddressInput }) => data)
  .handler(async ({ data }) => {
    const user = verifyToken(data.token);
    const a = data.address;

    if (a.is_default) await clearDefaultAddress(user.id);

    await db.execute(
      `UPDATE addresses SET
        label = ?, recipient_name = ?, phone = ?, zip = ?, address = ?, number = ?,
        complement = ?, neighborhood = ?, city = ?, state = ?, country = ?, is_default = ?
       WHERE id = ? AND user_id = ?`,
      [
        a.label,
        a.recipient_name,
        a.phone,
        a.zip,
        a.address,
        a.number,
        a.complement ?? null,
        a.neighborhood,
        a.city,
        a.state,
        a.country,
        a.is_default ? 1 : 0,
        data.id,
        user.id,
      ],
    );
  });

export const deleteAddressFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { token: string; id: string }) => data)
  .handler(async ({ data }) => {
    const user = verifyToken(data.token);
    await db.execute('DELETE FROM addresses WHERE id = ? AND user_id = ?', [data.id, user.id]);
  });

export const setDefaultAddressFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { token: string; id: string }) => data)
  .handler(async ({ data }) => {
    const user = verifyToken(data.token);
    await clearDefaultAddress(user.id);
    await db.execute('UPDATE addresses SET is_default = 1 WHERE id = ? AND user_id = ?', [data.id, user.id]);
  });
