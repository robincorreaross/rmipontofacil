export function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function cleanCPF(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

export function validateCPF(cpf: string): boolean {
  const cleaned = cleanCPF(cpf);
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleaned)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(cleaned.charAt(9))) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(cleaned.charAt(10))) return false;

  return true;
}

export function getRecordTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    entrada: 'Entrada',
    intervalo: 'Intervalo',
    fim_intervalo: 'Fim do Intervalo',
    saida: 'Saída',
  };
  return labels[type] || type;
}

export function getRecordTypeColor(type: string): string {
  const colors: Record<string, string> = {
    entrada: 'bg-success text-success-foreground',
    intervalo: 'bg-warning text-warning-foreground',
    fim_intervalo: 'bg-info text-info-foreground',
    saida: 'bg-destructive text-destructive-foreground',
  };
  return colors[type] || 'bg-muted text-muted-foreground';
}
