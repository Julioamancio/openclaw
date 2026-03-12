export function onlyDigits(v: string) {
  return (v || "").replace(/\D/g, "");
}

export function isValidCpfOrCnpj(value: string) {
  const d = onlyDigits(value);
  if (d.length === 11) return isValidCPF(d);
  if (d.length === 14) return isValidCNPJ(d);
  return false;
}

function isValidCPF(cpf: string) {
  if (/^(\d)\1+$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(cpf[i]) * (10 - i);
  let r = (sum * 10) % 11;
  if (r === 10) r = 0;
  if (r !== Number(cpf[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(cpf[i]) * (11 - i);
  r = (sum * 10) % 11;
  if (r === 10) r = 0;
  return r === Number(cpf[10]);
}

function isValidCNPJ(cnpj: string) {
  if (/^(\d)\1+$/.test(cnpj)) return false;
  const calc = (base: string, factors: number[]) => {
    let total = 0;
    for (let i = 0; i < factors.length; i++) total += Number(base[i]) * factors[i];
    const rem = total % 11;
    return rem < 2 ? 0 : 11 - rem;
  };
  const d1 = calc(cnpj, [5,4,3,2,9,8,7,6,5,4,3,2]);
  const d2 = calc(cnpj, [6,5,4,3,2,9,8,7,6,5,4,3,2]);
  return d1 === Number(cnpj[12]) && d2 === Number(cnpj[13]);
}
