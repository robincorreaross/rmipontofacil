import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { getRecordTypeLabel, formatCPF } from "./cpf";

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
      single: () => Promise<{
        data: CompanySettings | null;
        error: SupabaseError | null;
      }>;
    };
  };
};

// ... (mantenha as interfaces anteriores: Employee, TimeRecord, etc.)

export const exportEmployeeMonthlyReport = async (
  employees: Employee[], // Agora aceita um array
  allRecords: TimeRecord[],
  dateFilter: string,
) => {
  const dynamicDb = supabase as unknown as DynamicSupabase;
  const { data: company } = await dynamicDb
    .from("company_settings")
    .select("*")
    .single();

  const doc = new jsPDF("l", "mm", "a4") as jsPDFWithAutoTable;
  const selectedDate = parseISO(dateFilter);
  const monthLabel = format(selectedDate, "MMMM / yyyy", { locale: ptBR });

  // Iterar sobre cada funcionário para criar uma página por pessoa
  employees.forEach((employee, index) => {
    if (index > 0) doc.addPage(); // Adiciona nova página se não for o primeiro

    // Filtrar registros específicos deste funcionário
    // Nota: assumindo que o campo employee_id existe no TimeRecord vindo do banco
    const employeeRecords = (allRecords as any[]).filter(
      (r) => r.employee_id === (employee as any).id || employees.length === 1,
    );

    // --- Cabeçalho (igual ao anterior) ---
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(company?.nome_fantasia?.toUpperCase() || "PONTO FÁCIL", 148, 15, {
      align: "center",
    });

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(
      `${company?.razao_social || ""} - CNPJ: ${company?.cnpj || ""}`,
      148,
      20,
      { align: "center" },
    );

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("FOLHA DE FREQUÊNCIA INDIVIDUAL", 148, 32, { align: "center" });

    // --- Info Funcionário ---
    doc.setDrawColor(200);
    doc.line(14, 35, 283, 35);
    doc.setFontSize(10);
    doc.text(`FUNCIONÁRIO: ${employee.name.toUpperCase()}`, 14, 42);
    doc.text(
      `CARGO: ${employee.position?.toUpperCase() || "NÃO INFORMADO"}`,
      14,
      48,
    );
    doc.text(`CPF: ${formatCPF(employee.cpf)}`, 120, 48);
    doc.text(`MÊS REFERÊNCIA: ${monthLabel.toUpperCase()}`, 220, 42);

    // --- Lógica de Agrupamento ---
    const groupedRecords: Record<string, DayGroup> = {};
    employeeRecords.forEach((rec) => {
      const dateKey = format(new Date(rec.recorded_at), "yyyy-MM-dd");
      if (!groupedRecords[dateKey]) {
        groupedRecords[dateKey] = {
          date: dateKey,
          in: "-",
          pause: "-",
          resume: "-",
          out: "-",
        };
      }
      const time = format(new Date(rec.recorded_at), "HH:mm");
      if (rec.record_type === "entrada") groupedRecords[dateKey].in = time;
      if (rec.record_type === "intervalo") groupedRecords[dateKey].pause = time;
      if (rec.record_type === "fim_intervalo")
        groupedRecords[dateKey].resume = time;
      if (rec.record_type === "saida") groupedRecords[dateKey].out = time;
    });

    const tableBody = Object.values(groupedRecords).map((day) => [
      format(parseISO(day.date), "dd/MM/yyyy"),
      format(parseISO(day.date), "EEEE", { locale: ptBR }),
      day.in,
      day.pause,
      day.resume,
      day.out,
      "",
    ]);

    autoTable(doc, {
      startY: 55,
      head: [
        [
          "DATA",
          "DIA DA SEMANA",
          "ENTRADA",
          "SAÍDA ALMOÇO",
          "VOLTA ALMOÇO",
          "SAÍDA FINAL",
          "VISTO",
        ],
      ],
      body: tableBody,
      theme: "grid",
      headStyles: { fillColor: [40, 40, 40], halign: "center" },
      styles: { fontSize: 9 },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 30;
    doc.line(98, finalY, 198, finalY);
    doc.text("ASSINATURA DO FUNCIONÁRIO", 148, finalY + 5, { align: "center" });
  });

  const fileName =
    employees.length === 1
      ? `Ponto_${employees[0].name.replace(/\s+/g, "_")}_${dateFilter}.pdf`
      : `Folha_Mensal_Geral_${dateFilter}.pdf`;

  doc.save(fileName);
};
