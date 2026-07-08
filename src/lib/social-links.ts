export type SocialLink = {
  name: string;
  href: string;
  icon: 'instagram' | 'facebook' | 'tiktok' | 'youtube' | 'linkedin' | 'x' | 'whatsapp';
};

// Preencha os campos `href` com os links reais das redes sociais da loja.
// Enquanto vazios, o botão correspondente fica visível mas desabilitado (não quebra a UI).
export const SOCIAL_LINKS: SocialLink[] = [
  { name: 'Instagram', href: 'https://www.instagram.com/lumiereoficial20', icon: 'instagram' },
  { name: 'Facebook', href: '', icon: 'facebook' },
  { name: 'TikTok', href: 'https://www.tiktok.com/@lojalumiereofc', icon: 'tiktok' },
  { name: 'YouTube', href: '', icon: 'youtube' },
  { name: 'LinkedIn', href: '', icon: 'linkedin' },
  { name: 'X (Twitter)', href: '', icon: 'x' },
];

// Link de WhatsApp (formato: https://wa.me/55DDDNUMERO) — preencha com o número real.
export const WHATSAPP_LINK = '';

export function isSocialLinkConfigured(link: SocialLink): boolean {
  return link.href.trim().length > 0;
}
