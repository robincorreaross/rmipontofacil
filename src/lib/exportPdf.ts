import jsPDF from "jspdf";
import autoTable, { RowInput } from "jspdf-autotable";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { formatCPF } from "./cpf";

interface Employee {
  id?: string;
  name: string;
  cpf: string;
  position?: string;
  shift_type?: "tradicional" | "direto" | "reduzido" | null;
}

interface TimeRecord {
  recorded_at: string;
  record_type: string;
  employee_id?: string;
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

// --- FUNÇÕES DE ARITMÉTICA DE MINUTOS ---

const timeToMinutes = (time: string): number => {
  if (!time || time === "-" || time === "N/A") return 0;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const minutesToTime = (totalMinutes: number): string => {
  if (totalMinutes < 0) return "00:00";
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const formatMinutesString = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

export const exportEmployeeMonthlyReport = async (
  employees: Employee[],
  allRecords: TimeRecord[],
  dateFilter: string,
) => {
  // 1. Buscar configurações da empresa
  const { data: company } = await (supabase as any)
    .from("company_settings")
    .select("*")
    .single();

  // 2. Buscar Justificativas para o mês selecionado
  const selectedDate = parseISO(dateFilter);
  const startRange = format(startOfMonth(selectedDate), "yyyy-MM-dd");
  const endRange = format(endOfMonth(selectedDate), "yyyy-MM-dd");

  const { data: justifications } = await (supabase as any)
    .from("justifications")
    .select("*")
    .gte("date", startRange)
    .lte("date", endRange);

  const doc = new jsPDF("l", "mm", "a4") as jsPDFWithAutoTable;
  const monthLabel = format(selectedDate, "MMMM / yyyy", { locale: ptBR });

  employees.forEach((employee, index) => {
    if (index > 0) doc.addPage();

    // Filtra registros deste funcionário
    const employeeRecords = allRecords.filter(
      (r) => r.employee_id === employee.id,
    );

    // Filtra justificativas deste funcionário
    const employeeJustifications = (justifications || []).filter(
      (j: any) => j.employee_id === employee.id,
    );

    const groupedRecords: Record<string, DayGroup> = {};

    // A. Preenche com os dias que têm batidas
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

    // B. Preenche com os dias que têm justificativa (se não houver batida naquele dia)
    employeeJustifications.forEach((just: any) => {
      if (!groupedRecords[just.date]) {
        groupedRecords[just.date] = {
          date: just.date,
          in: "-",
          pause: "-",
          resume: "-",
          out: "-",
        };
      }
    });

    let totalMonthMinutes = 0;

    // Ordena os dias cronologicamente para o PDF
    const sortedDays = Object.values(groupedRecords).sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    const tableBody: RowInput[] = sortedDays.map((day) => {
      // Verifica se há justificativa para este dia
      const justification = employeeJustifications.find(
        (j: any) => j.date === day.date,
      );

      // --- BLOCO NOVO: Exibição da Justificativa ---
      // Se tem justificativa e o campo de Entrada está vazio (Falta integral)
      if (justification && day.in === "-") {
        const status = justification.is_excused ? "ABONADA" : "NÃO ABONADA";
        // Verde (RGB) se abonada, Vermelho se não
        // Adicionamos a tipagem explícita : [number, number, number]
        const textColor: [number, number, number] = justification.is_excused
          ? [22, 163, 74] // Verde
          : [220, 38, 38]; // Vermelho

        return [
          format(parseISO(day.date), "dd/MM/yyyy"),
          format(parseISO(day.date), "EEEE", { locale: ptBR }),
          {
            content: `FALTA ${status}: ${justification.reason.toUpperCase()}`,
            colSpan: 4,
            styles: {
              halign: "center",
              fontStyle: "bold",
              textColor: textColor,
            },
          },
          "-",
        ];
      }
      // ---------------------------------------------

      // 1. DADOS ORIGINAIS EM MINUTOS
      const tIn = timeToMinutes(day.in);
      const tPause = timeToMinutes(day.pause);
      const tResume = timeToMinutes(day.resume);
      const tOut = timeToMinutes(day.out);

      // 2. VARIÁVEIS DE EXIBIÇÃO
      let dispIn = day.in;
      let dispPause = day.pause;
      let dispResume = day.resume;
      let dispOut = day.out;

      if (employee.shift_type === "reduzido" && tPause > 0 && tResume > 0) {
        const intervaloReal = tResume - tPause;

        if (intervaloReal < 60) {
          // Diferença que ela trabalhou em vez de descansar (ex: 40 min)
          const gap = 60 - intervaloReal;

          // REGRA: Retorno no PDF é SEMPRE Pausa + 60 min (Fica 12:00 no seu exemplo)
          dispResume = minutesToTime(tPause + 60);

          // REGRA: A Saída no PDF é a Saída REAL + o intervalo que ela tirou + o GAP
          // Mantendo sua lógica original exata:
          dispOut = minutesToTime(tOut + intervaloReal + gap);
        }
      } else if (employee.shift_type === "direto") {
        dispPause = "N/A";
        dispResume = "N/A";
      }

      // 3. CÁLCULO DO TOTAL DIA BASEADO NOS NOVOS HORÁRIOS EXIBIDOS
      const minIn = timeToMinutes(dispIn);
      const minPause = timeToMinutes(dispPause);
      const minResume = timeToMinutes(dispResume);
      const minOut = timeToMinutes(dispOut);

      const morning = minPause > 0 ? minPause - minIn : minOut - minIn;
      const afternoon = minPause > 0 ? minOut - minResume : 0;
      const dailyMinutes = Math.max(0, morning + afternoon);

      totalMonthMinutes += dailyMinutes;

      return [
        format(parseISO(day.date), "dd/MM/yyyy"),
        format(parseISO(day.date), "EEEE", { locale: ptBR }),
        dispIn,
        dispPause,
        dispResume,
        dispOut,
        dailyMinutes > 0 ? formatMinutesString(dailyMinutes) : "-",
      ];
    });

    // --- LINHA DE TOTALIZAÇÃO ---
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
        content: formatMinutesString(totalMonthMinutes),
        styles: {
          halign: "center",
          fontStyle: "bold",
          fillColor: [240, 240, 240],
        },
      },
    ]);

    // --- RENDERIZAÇÃO DO PDF ---
    doc.setFontSize(18).setFont("helvetica", "bold");
    doc.text(company?.nome_fantasia?.toUpperCase() || "PONTO FÁCIL", 148, 12, {
      align: "center",
    });

    doc.setFontSize(9).setFont("helvetica", "normal");
    doc.text(
      `${company?.razao_social || ""} - CNPJ: ${company?.cnpj || ""}`,
      148,
      17,
      { align: "center" },
    );
    if (company?.endereco)
      doc.text(company.endereco, 148, 21, { align: "center" });
    if (company?.telefone)
      doc.text(`Telefone: ${company.telefone}`, 148, 25, { align: "center" });

    doc
      .setFontSize(12)
      .setFont("helvetica", "bold")
      .text("FOLHA DE FREQUÊNCIA INDIVIDUAL", 148, 33, { align: "center" });
    doc.setDrawColor(200).line(14, 36, 283, 36);

    doc.setFontSize(10).text("FUNCIONÁRIO:", 14, 42);
    doc
      .setFont("helvetica", "normal")
      .text(employee.name.toUpperCase(), 45, 42);
    doc.setFont("helvetica", "bold").text("CARGO:", 14, 48);
    doc
      .setFont("helvetica", "normal")
      .text(employee.position?.toUpperCase() || "NÃO INFORMADO", 45, 48);
    doc.setFont("helvetica", "bold").text("CPF:", 14, 54);
    doc.setFont("helvetica", "normal").text(formatCPF(employee.cpf), 45, 54);
    doc.setFont("helvetica", "bold").text("MÊS REFERÊNCIA:", 205, 42);
    doc.text(monthLabel.toUpperCase(), 242, 42);

    autoTable(doc, {
      startY: 58,
      head: [
        [
          "DATA",
          "DIA DA SEMANA",
          "ENTRADA",
          "INTERVALO",
          "FIM INTERVALO",
          "SAÍDA",
          "TOTAL DIA",
        ],
      ],
      body: tableBody,
      theme: "grid",
      headStyles: { fillColor: [40, 40, 40], halign: "center" },
      columnStyles: {
        0: { halign: "center", cellWidth: 30 },
        6: { halign: "center", fontStyle: "bold" },
      },
      styles: { fontSize: 9 },
    });

    const finalY = doc.lastAutoTable.finalY + 25;
    doc.line(98, finalY, 198, finalY);
    doc
      .setFont("helvetica", "bold")
      .text("ASSINATURA DO FUNCIONÁRIO", 148, finalY + 5, { align: "center" });
  });

  doc.save(`Folha_Ponto_${dateFilter}.pdf`);
};
