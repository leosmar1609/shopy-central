// Pura, sem I/O — pode ser importada tanto no client (pra mostrar as opções no checkout)
// quanto no server (fns/payments.ts recalcula o máximo autoritativo antes de cobrar no Asaas).
export const MIN_ORDER_FOR_INSTALLMENTS = 200;
export const MIN_INSTALLMENT_VALUE = 50;
export const MAX_INSTALLMENTS = 12;

// Evita parcelas ridículas (ex: R$200 em 12x de ~R$16,67): o número de parcelas cresce
// com o valor do pedido, sempre respeitando um mínimo de R$ por parcela.
export function calculateMaxInstallments(total: number): number {
  if (!Number.isFinite(total) || total < MIN_ORDER_FOR_INSTALLMENTS) return 1;
  return Math.max(1, Math.min(MAX_INSTALLMENTS, Math.floor(total / MIN_INSTALLMENT_VALUE)));
}
