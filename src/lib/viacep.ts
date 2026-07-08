export type ViaCepAddress = {
  street: string;
  neighborhood: string;
  city: string;
  state: string;
};

export type ViaCepResult =
  | { ok: true; address: ViaCepAddress }
  | { ok: false; reason: 'invalid' | 'not_found' | 'network' };

export async function fetchAddressByCep(cep: string): Promise<ViaCepResult> {
  const digits = cep.replace(/\D/g, '');
  if (digits.length !== 8) {
    return { ok: false, reason: 'invalid' };
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (!response.ok) {
      return { ok: false, reason: 'network' };
    }
    const data = await response.json();
    if (data.erro) {
      return { ok: false, reason: 'not_found' };
    }
    return {
      ok: true,
      address: {
        street: data.logradouro ?? '',
        neighborhood: data.bairro ?? '',
        city: data.localidade ?? '',
        state: data.uf ?? '',
      },
    };
  } catch {
    return { ok: false, reason: 'network' };
  }
}
