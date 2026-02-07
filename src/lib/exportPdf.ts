import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { getRecordTypeLabel, formatCPF } from './cpf';

interface Employee {
  name: string;
  cpf: string;
  position?: string;
}

interface TimeRecord {
  recorded_at: string;
  record_type: string;
}

interface CompanySettings {
  nome_fantasia: string;
  razao_social: string;
  cnpj: string;
  endereco: string;
  telefone: string;
}

interface SupabaseError {
  code: string;
  message: string;
}

interface DayGroup {
  date: string;
  in: string;
  pause: string;
  resume: string;
  out: string;
}

interface jsPDFWithAutoTable extends jsPDF {
  lastAutoTable: {
    finalY: number;
  };
}

type DynamicSupabase = {
  from: (table: string) => {
    select: (columns: string) => {
      single: () => Promise<{ data: CompanySettings | null; error: SupabaseError | null }>;
    };
  };
};

export const exportEmployeeMonthlyReport = async (
  employee: Employee, 
  records: TimeRecord[], 
  dateFilter: string
) => {
  const dynamicDb = supabase as unknown as DynamicSupabase;
  const { data: company } = await dynamicDb
    .from('company_settings')
    .select('*')
    .single();

  const doc = new jsPDF('l', 'mm', 'a4') as jsPDFWithAutoTable;
  const selectedDate = parseISO(dateFilter);
  const monthLabel = format(selectedDate, 'MMMM / yyyy', { locale: ptBR });
  
  // Cabeçalho Centralizado
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(company?.nome_fantasia?.toUpperCase() || 'PONTO FÁCIL', 148, 15, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const infoEmpresa = `${company?.razao_social || ''} - CNPJ: ${company?.cnpj || ''} - ${company?.telefone || ''}`;
  doc.text(infoEmpresa, 148, 20, { align: 'center' });
  doc.text(company?.endereco || '', 148, 24, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('FOLHA DE FREQUÊNCIA INDIVIDUAL', 148, 32, { align: 'center' });

  // Divisor e Info Funcionário
  doc.setDrawColor(200);
  doc.line(14, 35, 283, 35);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('FUNCIONÁRIO:', 14, 42);
  doc.setFont('helvetica', 'normal');
  doc.text(employee.name.toUpperCase(), 45, 42);

  doc.setFont('helvetica', 'bold');
  doc.text('CARGO:', 14, 48);
  doc.setFont('helvetica', 'normal');
  doc.text(employee.position?.toUpperCase() || 'NÃO INFORMADO', 45, 48);

  doc.setFont('helvetica', 'bold');
  doc.text('CPF:', 120, 48);
  doc.setFont('helvetica', 'normal');
  doc.text(formatCPF(employee.cpf), 132, 48);

  doc.setFont('helvetica', 'bold');
  doc.text('MÊS REFERÊNCIA:', 220, 42);
  doc.setFont('helvetica', 'normal');
  doc.text(monthLabel.toUpperCase(), 258, 42);

  // Agrupamento de registros por dia
  const groupedRecords: Record<string, DayGroup> = {};
  
  records.forEach(rec => {
    const dateKey = format(new Date(rec.recorded_at), 'yyyy-MM-dd');
    if (!groupedRecords[dateKey]) {
      groupedRecords[dateKey] = { date: dateKey, in: '-', pause: '-', resume: '-', out: '-' };
    }
    
    const time = format(new Date(rec.recorded_at), 'HH:mm');
    if (rec.record_type === 'entrada') groupedRecords[dateKey].in = time;
    if (rec.record_type === 'intervalo') groupedRecords[dateKey].pause = time;
    if (rec.record_type === 'fim_intervalo') groupedRecords[dateKey].resume = time;
    if (rec.record_type === 'saida') groupedRecords[dateKey].out = time;
  });

  const tableBody = Object.values(groupedRecords).map(day => [
    format(parseISO(day.date), 'dd/MM/yyyy'),
    format(parseISO(day.date), 'EEEE', { locale: ptBR }),
    day.in,
    day.pause,
    day.resume,
    day.out,
    '' 
  ]);

  autoTable(doc, {
    startY: 55,
    head: [['DATA', 'DIA DA SEMANA', 'ENTRADA', 'SAÍDA ALMOÇO', 'VOLTA ALMOÇO', 'SAÍDA FINAL', 'VISTO']],
    body: tableBody,
    theme: 'grid',
    headStyles: { fillColor: [40, 40, 40], halign: 'center' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 30 },
      1: { cellWidth: 40 },
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'center' },
      5: { halign: 'center' },
      6: { cellWidth: 30 }
    },
    styles: { fontSize: 9 }
  });

  // Assinatura do Funcionário (Centralizada)
  const finalY = doc.lastAutoTable.finalY + 35;
  doc.line(98, finalY, 198, finalY); // Linha centralizada
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('ASSINATURA DO FUNCIONÁRIO', 148, finalY + 5, { align: 'center' });
  
  // Data de Geração
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 200);

  doc.save(`Folha_Ponto_${employee.name.replace(/\s+/g, '_')}.pdf`);
};