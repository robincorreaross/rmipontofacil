import jsPDF from "jspdf";
import autoTable, { RowInput } from "jspdf-autotable";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { formatCPF } from "./cpf";

interface Employee {
  name: string;
  cpf: string;
  position?: string;
}

interface TimeRecord {
  recorded_at: string;
  record_type: string;
  employee_id?: string;
}

interface CompanySettings {
  nome_fantasia: string;
  razao_social: string;
  cnpj: string;
  endereco: string;
  telefone: string;
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

// Funções Auxiliares
const calculateDiff = (start: string, end: string): number => {
  if (start === "-" || end === "-") return 0;
  const [h1, m1] = start.split(":").map(Number);
  const [h2, m2] = end.split(":").map(Number);
  const diff = h2 * 60 + m2 - (h1 * 60 + m1);
  return diff > 0 ? diff : 0;
};

const formatMinutes = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

export const exportEmployeeMonthlyReport = async (
  employees: Employee[],
  allRecords: TimeRecord[],
  dateFilter: string,
) => {
  const { data: company } = await (supabase as any)
    .from("company_settings")
    .select("*")
    .single();

  const doc = new jsPDF("l", "mm", "a4") as jsPDFWithAutoTable;
  const selectedDate = parseISO(dateFilter);
  const monthLabel = format(selectedDate, "MMMM / yyyy", { locale: ptBR });

  employees.forEach((employee, index) => {
    if (index > 0) doc.addPage();

    const employeeRecords = (allRecords as any[]).filter(
      (r) =>
        (r as any).employee_id === (employee as any).id ||
        employees.length === 1,
    );

    // --- CABEÇALHO DA EMPRESA ---
    doc.setFontSize(18).setFont("helvetica", "bold");
    doc.text(company?.nome_fantasia?.toUpperCase() || "PONTO FÁCIL", 148, 12, {
      align: "center",
    });

    doc.setFontSize(9).setFont("helvetica", "normal");
    const infoEmpresa = `${company?.razao_social || ""} - CNPJ: ${company?.cnpj || ""}`;
    doc.text(infoEmpresa, 148, 17, { align: "center" });

    // Inclusão do Endereço e Telefone
    if (company?.endereco) {
      doc.text(company.endereco, 148, 21, { align: "center" });
    }
    if (company?.telefone) {
      doc.text(`Telefone: ${company.telefone}`, 148, 25, { align: "center" });
    }

    doc.setFontSize(12).setFont("helvetica", "bold");
    doc.text("FOLHA DE FREQUÊNCIA INDIVIDUAL", 148, 33, { align: "center" });

    // --- INFO FUNCIONÁRIO (EMPILHADO À ESQUERDA) ---
    doc.setDrawColor(200).line(14, 36, 283, 36);

    doc.setFontSize(10).setFont("helvetica", "bold");
    doc.text("FUNCIONÁRIO:", 14, 42);
    doc.setFont("helvetica", "normal");
    doc.text(employee.name.toUpperCase(), 45, 42);

    doc.setFont("helvetica", "bold");
    doc.text("CARGO:", 14, 48);
    doc.setFont("helvetica", "normal");
    doc.text(employee.position?.toUpperCase() || "NÃO INFORMADO", 45, 48);

    doc.setFont("helvetica", "bold");
    doc.text("CPF:", 14, 54); // CPF agora abaixo do Cargo
    doc.setFont("helvetica", "normal");
    doc.text(formatCPF(employee.cpf), 45, 54);

    // Mês de Referência (Alinhado à direita)
    doc.setFont("helvetica", "bold");
    doc.text("MÊS REFERÊNCIA:", 210, 42);
    doc.setFont("helvetica", "normal");
    doc.text(monthLabel.toUpperCase(), 245, 42);

    // --- Processamento dos Dados ---
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

    let totalMonthMinutes = 0;

    const tableBody: RowInput[] = Object.values(groupedRecords).map((day) => {
      const morningMinutes = calculateDiff(day.in, day.pause);
      const afternoonMinutes = calculateDiff(day.resume, day.out);
      const dailyMinutes = morningMinutes + afternoonMinutes;
      totalMonthMinutes += dailyMinutes;

      return [
        format(parseISO(day.date), "dd/MM/yyyy"),
        format(parseISO(day.date), "EEEE", { locale: ptBR }),
        day.in,
        day.pause,
        day.resume,
        day.out,
        dailyMinutes > 0 ? formatMinutes(dailyMinutes) : "-",
      ];
    });

    tableBody.push([
      {
        content: "TOTAL TRABALHADO NO MÊS",
        colSpan: 6,
        styles: {
          halign: "right",
          fontStyle: "bold",
          fillColor: [240, 240, 240],
        },
      },
      {
        content: formatMinutes(totalMonthMinutes),
        styles: {
          halign: "center",
          fontStyle: "bold",
          fillColor: [240, 240, 240],
        },
      },
    ]);

    autoTable(doc, {
      startY: 58, // Ajustado para dar espaço ao CPF
      head: [
        [
          "DATA",
          "DIA DA SEMANA",
          "ENTRADA",
          "INTERVALO",
          "RETORNO",
          "SAÍDA",
          "TOTAL DIA",
        ],
      ],
      body: tableBody,
      theme: "grid",
      headStyles: { fillColor: [40, 40, 40], halign: "center" },
      columnStyles: {
        0: { halign: "center", cellWidth: 30 },
        2: { halign: "center" },
        3: { halign: "center" },
        4: { halign: "center" },
        5: { halign: "center" },
        6: { halign: "center", fontStyle: "bold" },
      },
      styles: { fontSize: 9 },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 30;
    doc.line(98, finalY, 198, finalY);
    doc
      .setFont("helvetica", "bold")
      .text("ASSINATURA DO FUNCIONÁRIO", 148, finalY + 5, { align: "center" });
  });

  const fileName =
    employees.length === 1
      ? `Ponto_${employees[0].name.replace(/\s+/g, "_")}_${dateFilter}.pdf`
      : `Folha_Mensal_Geral_${dateFilter}.pdf`;

  doc.save(fileName);
};
