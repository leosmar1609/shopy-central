# Debug - Erro de Conexão com Mercado Pago

## Problemas Resolvidos ✅

### 1. "Message Channel Closed" + "Erro de conexão com Mercado Pago"
**Causa**: Timeout na requisição ao Mercado Pago (> 30s do Cloudflare Worker)

**Soluções Implementadas**:
- ✅ Timeout explícito em 25 segundos (menos que Worker timeout de 30s)
- ✅ Sistema de retry automático (até 2 tentativas)
- ✅ AbortController para cancelar requisições lentas
- ✅ Backoff exponencial entre tentativas
- ✅ Logs detalhados em console para debug

## Como Debugar

### 1. Verificar Variáveis de Ambiente
```bash
# Abra o DevTools (F12) → Console
# Você deve ver logs como:

[MP Request] 1/3 - POST /checkout/preferences
[MP Success] Response recebida com sucesso
```

### 2. Se Receber "Erro de conexão"
Verifique no **Console do DevTools**:

```javascript
// Boa:
[MP Request] 1/3 - POST /checkout/preferences
[MP Success] Response recebida com sucesso

// Problema - Timeout:
[MP Timeout] Requisição excedeu 25000ms
[MP Retry] Tentativa 2 após timeout...

// Problema - Credencial inválida:
[MP Error] 401 - Invalid access token
```

### 3. Testar Manualmente
```javascript
// No Console do DevTools
console.log('MP_ACCESS_TOKEN:', import.meta.env.MP_ACCESS_TOKEN)
console.log('VITE_MP_PUBLIC_KEY:', import.meta.env.VITE_MP_PUBLIC_KEY)
```

## Checklist de Verificação

- [ ] `.env.local` ou `.env` possui todas as variáveis?
- [ ] `MP_ACCESS_TOKEN` começa com `APP_USR-`?
- [ ] `VITE_MP_PUBLIC_KEY` começa com `APP_USR-`?
- [ ] `MP_BASE_URL` é `https://api.mercadopago.com`?
- [ ] Acesso à internet está funcionando?
- [ ] Credenciais do Mercado Pago são válidas?

## Logs no Console

### Cartão de Crédito
```
[Checkout] Tokenizando cartão...
[Checkout] Cartão tokenizado com sucesso
[MP Request] 1/3 - POST /v1/payments
[MP Success] Response recebida com sucesso
```

### PIX / Boleto
```
[Checkout] Criando preferência para pix
[MP Request] 1/3 - POST /checkout/preferences
[MP Success] Response recebida com sucesso
[Checkout] Link gerado com sucesso: https://...
```

## Se Ainda Não Funcionar

1. **Copie os logs do console** (F12 → Console → Clicar direito → Save As)
2. **Verifique no Network tab** (F12 → Network) se a requisição chega ao Mercado Pago
3. **Teste em incognito** para descartar cache
4. **Reinicie o servidor** com `npm run dev`

## Arquivos Modificados

- `/src/fns/payments.ts` - Retry + timeout + logs
- `/src/routes/checkout.tsx` - Timeout cartão + logs
- `/src/server.ts` - SSR error wrapper (sem alterações necessárias)
