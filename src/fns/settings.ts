import { createServerFn } from '@tanstack/react-start';
import { setResponseHeaders } from '@tanstack/react-start/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';

export type SiteSettings = {
  hero_image_url: string | null;
};

export const fetchSiteSettingsFn = createServerFn({ method: 'GET' }).handler(async () => {
  setResponseHeaders({ 'Cache-Control': 'no-store' } as any);
  const [rows] = await db.query('SELECT hero_image_url FROM site_settings WHERE id = 1');
  const row = (rows as SiteSettings[])[0];
  return row ?? { hero_image_url: null };
});

export const updateSiteSettingsFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { token: string; settings: SiteSettings }) => data)
  .handler(async ({ data }) => {
    const u = verifyToken(data.token);
    if (!u.isAdmin) throw new Error('Acesso negado');
    await db.execute('UPDATE site_settings SET hero_image_url = ? WHERE id = 1', [
      data.settings.hero_image_url || null,
    ]);
  });
