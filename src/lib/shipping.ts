// Cálculo de frete dinâmico baseado em regra: peso do pedido + região do CEP de
// destino, calibrado numa tabela de preços parecida com o PAC/Correios (base + valor
// por kg excedente). Não é uma cotação em tempo real de uma transportadora — é uma
// estimativa por regra, sem precisar de conta/API externa. Se um dia quiser cotação
// de verdade (Correios/Melhor Envio), essa função é o ponto único a trocar.

const FREE_SHIPPING_THRESHOLD = 199;
const ORIGIN_REGION_DIGIT = 0; // Origem dos envios: Correios de Itapevi/SP — CEP 06696-000

type RegionTier = {
  baseRate: number;
  perExtraKg: number;
  etaDays: number;
};

// Uma "regra" por grupo de dígito inicial do CEP (padrão dos Correios: cada dígito
// inicial cobre uma macrorregião do Brasil). Preços calibrados como referência PAC.
// Prazos de 5 a 7 dias úteis — o produto chega primeiro na origem (dropshipping) antes
// de ser despachado pra casa do cliente, então o prazo não pode ser tão curto quanto um
// envio direto normal.
const TIERS: Record<'near' | 'southeast_south' | 'central' | 'far', RegionTier> = {
  near: { baseRate: 12.9, perExtraKg: 2.5, etaDays: 5 },
  southeast_south: { baseRate: 17.9, perExtraKg: 3.5, etaDays: 6 },
  central: { baseRate: 22.9, perExtraKg: 4.5, etaDays: 7 },
  far: { baseRate: 27.9, perExtraKg: 5.5, etaDays: 7 },
};

// Mapeia o primeiro dígito do CEP de destino pra um "grupo" de distância a partir
// da origem (Itapevi/SP, dígito 0).
function regionTierForDigit(digit: number): RegionTier {
  if (digit === 0 || digit === 1) return TIERS.near; // Grande SP (inclui Itapevi)/interior de SP
  if (digit === 2 || digit === 3 || digit === 8) return TIERS.southeast_south; // RJ, ES, MG, PR, SC
  if (digit === 7 || digit === 9) return TIERS.central; // DF, GO, TO, MT, MS, RS
  return TIERS.far; // BA, SE, PE, AL, PB, RN, CE, PI, MA, PA, AM, AP, RR, AC, RO
}

export type ShippingEstimate = {
  cost: number;
  etaDays: number;
  free: boolean;
};

export function calculateShipping(params: {
  destinationCep: string;
  totalWeightKg: number;
  subtotal: number;
}): ShippingEstimate {
  if (params.subtotal >= FREE_SHIPPING_THRESHOLD) {
    return { cost: 0, etaDays: TIERS.near.etaDays, free: true };
  }

  const digits = params.destinationCep.replace(/\D/g, '');
  const firstDigit = digits.length >= 1 ? Number(digits[0]) : ORIGIN_REGION_DIGIT;
  const tier = regionTierForDigit(Number.isNaN(firstDigit) ? ORIGIN_REGION_DIGIT : firstDigit);

  const weight = Math.max(0, params.totalWeightKg || 0);
  const extraKg = Math.max(0, weight - 1); // a taxa base já cobre até 1kg
  const cost = Math.round((tier.baseRate + extraKg * tier.perExtraKg) * 100) / 100;

  return { cost, etaDays: tier.etaDays, free: false };
}

export function estimateCartWeightKg(items: Array<{ quantity: number; weight_kg?: number | null }>): number {
  const DEFAULT_ITEM_WEIGHT_KG = 0.3;
  return items.reduce((total, item) => total + item.quantity * (item.weight_kg ?? DEFAULT_ITEM_WEIGHT_KG), 0);
}
