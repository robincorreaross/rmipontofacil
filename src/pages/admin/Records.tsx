import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { getRecordTypeLabel, getRecordTypeColor } from "@/lib/cpf";
import { exportEmployeeMonthlyReport } from "@/lib/exportPdf";
import { useAuth } from "@/hooks/useAuth";
import {
  Pencil,
  Trash2,
  Plus,
  FileDown,
  AlertCircle,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import {
  format,
  parseISO,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { JustificationModal } from "@/components/admin/JustificationModal";

interface TimeRecord {
  id: string;
  employee_id: string;
  record_type: string;
  recorded_at: string;
  notes: string | null;
  edited: boolean;
  employees: { name: string; cpf: string; position?: string } | null;
  isJustification?: boolean;
  reason?: string;
  is_excused?: boolean;
  document_url?: string | null;
}

interface Employee {
  id: string;
  name: string;
  cpf: string;
  position?: string;
  shift_type?: "tradicional" | "direto" | "reduzido" | null;
}

const Records = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<TimeRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Data inicial: hoje
  const [filterDate, setFilterDate] = useState(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [filterEmployee, setFilterEmployee] = useState<string>("all");

  const [editDialog, setEditDialog] = useState(false);
  const [addDialog, setAddDialog] = useState(false);
  const [exportDialog, setExportDialog] = useState(false);
  const [justificationDialogOpen, setJustificationDialogOpen] = useState(false);
  const [exportTarget, setExportTarget] = useState<"selected" | "all">(
    "selected",
  );

  const [editingRecord, setEditingRecord] = useState<TimeRecord | null>(null);
  const [editingJustification, setEditingJustification] = useState<any>(null);

  const [formType, setFormType] = useState("entrada");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formEmployee, setFormEmployee] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchEmployees = useCallback(async () => {
    const { data } = await supabase
      .from("employees")
      .select("*")
      .eq("active", true)
      .order("name");
    setEmployees(data || []);
  }, []);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      // CORREÇÃO CRÍTICA DE DATA E FUSO HORÁRIO
      // Parse da data selecionada no input (string YYYY-MM-DD) para Objeto Date Local
      const localDateObj = parseISO(filterDate);

      // Definimos o início e fim do dia no horário local, e convertemos para UTC ISO String
      // Isso garante que pegamos das 00:00:00 até 23:59:59 do dia selecionado
      const queryStart = startOfDay(localDateObj).toISOString();
      const queryEnd = endOfDay(localDateObj).toISOString();

      // REMOVIDA A LÓGICA DE "startOfMonth" QUE TRAZIA O MÊS INTEIRO INDEVIDAMENTE
      // Agora o filtro sempre respeitará o dia selecionado no calendário,
      // independente se tem funcionário selecionado ou não.

      // 1. Buscar Registros de Ponto
      const { data: recordsData, error: recordsError } = await supabase
        .from("time_records")
        .select("*, employees(name, cpf, position)")
        .gte("recorded_at", queryStart)
        .lte("recorded_at", queryEnd)
        .order("recorded_at", { ascending: true });

      if (recordsError) throw recordsError;

      // 2. Buscar Justificativas
      // Para justificativas (que usam campo date), comparamos a string YYYY-MM-DD
      const { data: justificationsData } = await (supabase as any)
        .from("justifications")
        .select("*, employees(name)")
        .eq("date", filterDate); // Busca exata pela data selecionada

      // Mapear justificativas
      const markedJustifications = (justificationsData || []).map((j: any) => ({
        ...j,
        isJustification: true,
        record_type: "justificativa",
        // Truque para ordenar no meio do dia visualmente se não tiver hora
        recorded_at: `${j.date}T12:00:00`,
      }));

      // 3. Unir e Filtrar por funcionário
      let combined = [...(recordsData || []), ...markedJustifications];

      if (filterEmployee !== "all") {
        combined = combined.filter((r) => r.employee_id === filterEmployee);
      }

      // Ordenar cronologicamente
      combined.sort(
        (a, b) =>
          new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime(),
      );

      setRecords(combined);
    } catch (err) {
      toast.error("Erro ao carregar registros.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filterDate, filterEmployee]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Função para abrir o modal de JUSTIFICATIVA em modo EDIÇÃO
  const handleEditJustification = (justification: any) => {
    setEditingJustification(justification);
    setJustificationDialogOpen(true);
  };

  // Função para abrir o modal de JUSTIFICATIVA em modo ADIÇÃO (limpo)
  const handleOpenJustificationModal = () => {
    setEditingJustification(null);
    setJustificationDialogOpen(true);
  };

  const handleGeneralDelete = async (item: TimeRecord) => {
    const isJustification = item.isJustification;
    if (
      !confirm(
        `Tem certeza que deseja excluir esta ${isJustification ? "justificativa" : "batida"}?`,
      )
    )
      return;

    try {
      const table = isJustification ? "justifications" : "time_records";
      const { error } = await (supabase as any)
        .from(table)
        .delete()
        .eq("id", item.id);

      if (error) throw error;
      toast.success(
        `${isJustification ? "Justificativa" : "Registro"} excluído.`,
      );
      fetchRecords();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao excluir. Verifique suas permissões.");
    }
  };

  const handleExportFlow = async () => {
    setSaving(true);
    try {
      let employeesToExport: Employee[] = [];
      let recordsToExport: TimeRecord[] = [];

      // Para exportação, mantemos a lógica mensal, pois a folha é mensal
      const dateRef = parseISO(filterDate);
      const startRange = format(startOfMonth(dateRef), "yyyy-MM-dd'T'00:00:00");
      const endRange = format(endOfMonth(dateRef), "yyyy-MM-dd'T'23:59:59");

      if (exportTarget === "selected") {
        const emp = employees.find((e) => e.id === filterEmployee);
        if (!emp) {
          toast.error("Selecione um funcionário na lista primeiro.");
          setSaving(false);
          return;
        }
        employeesToExport = [emp];

        // Busca registros do mês inteiro para o PDF
        const { data } = await supabase
          .from("time_records")
          .select("*, employees(name, cpf, position)")
          .eq("employee_id", filterEmployee)
          .gte("recorded_at", startRange)
          .lte("recorded_at", endRange);

        recordsToExport = data || [];
      } else {
        employeesToExport = employees;
        const { data } = await supabase
          .from("time_records")
          .select("*, employees(name, cpf, position)")
          .gte("recorded_at", startRange)
          .lte("recorded_at", endRange);
        recordsToExport = data || [];
      }

      await exportEmployeeMonthlyReport(
        employeesToExport,
        recordsToExport,
        filterDate,
      );
      setExportDialog(false);
      toast.success("PDF gerado com sucesso!");
    } catch (error) {
      toast.error("Erro ao gerar PDF.");
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (record: TimeRecord) => {
    setEditingRecord(record);
    const dt = new Date(record.recorded_at);
    setFormType(record.record_type);
    setFormDate(format(dt, "yyyy-MM-dd"));
    setFormTime(format(dt, "HH:mm"));
    setFormNotes(record.notes || "");
    setFormError("");
    setEditDialog(true);
  };

  const openAddDialog = () => {
    setFormEmployee(filterEmployee !== "all" ? filterEmployee : "");
    setFormType("entrada");
    setFormDate(filterDate);
    setFormTime(format(new Date(), "HH:mm"));
    setFormNotes("");
    setFormError("");
    setAddDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!editingRecord) return;
    if (!formDate || !formTime) {
      setFormError("Data e horário são obrigatórios.");
      return;
    }

    setSaving(true);
    try {
      const recordedAt = new Date(`${formDate}T${formTime}:00`).toISOString();
      const { error } = await supabase
        .from("time_records")
        .update({
          record_type: formType,
          recorded_at: recordedAt,
          notes: formNotes.trim() || null,
          edited: true,
          edited_by: user?.id || null,
        })
        .eq("id", editingRecord.id);

      if (error) throw error;
      toast.success("Registro atualizado!");
      setEditDialog(false);
      fetchRecords();
    } catch (err) {
      toast.error("Erro ao atualizar registro.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddRecord = async () => {
    if (!formEmployee) {
      setFormError("Selecione um funcionário.");
      return;
    }
    if (!formDate || !formTime) {
      setFormError("Data e horário são obrigatórios.");
      return;
    }

    setSaving(true);
    try {
      const recordedAt = new Date(`${formDate}T${formTime}:00`).toISOString();
      const { error } = await supabase.from("time_records").insert({
        employee_id: formEmployee,
        record_type: formType,
        recorded_at: recordedAt,
        notes: formNotes.trim() || null,
        edited: true,
        edited_by: user?.id || null,
      });

      if (error) throw error;
      toast.success("Registro adicionado!");
      setAddDialog(false);
      fetchRecords();
    } catch (err) {
      toast.error("Erro ao adicionar registro.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              Registros de Ponto
            </h1>
            <p className="text-muted-foreground text-sm">
              Visualizando registros do dia:{" "}
              {format(parseISO(filterDate), "dd/MM/yyyy")}
              {records.length > 0 && ` (${records.length} encontrados)`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={handleOpenJustificationModal}
              className="border-orange-500 text-orange-600 hover:bg-orange-50"
            >
              <AlertCircle className="w-4 h-4 mr-2" /> Justificar Falta
            </Button>

            <Button
              variant="outline"
              onClick={() => setExportDialog(true)}
              className="border-primary text-primary"
            >
              <FileDown className="w-4 h-4 mr-2" /> Exportar Folha
            </Button>
            <Button
              onClick={openAddDialog}
              className="gradient-primary text-white"
            >
              <Plus className="w-4 h-4 mr-2" /> Adicionar Registro
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="w-auto"
          />
          <Select value={filterEmployee} onValueChange={setFilterEmployee}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Funcionário" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os funcionários</SelectItem>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading && !saving ? (
          <div className="text-center py-12">Carregando...</div>
        ) : (
          <div className="grid gap-2">
            {records.length === 0 && (
              <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
                Nenhum registro encontrado para esta data.
              </div>
            )}
            {records.map((record) => (
              <Card
                key={record.id}
                className={`glass-card ${record.isJustification ? "border-l-4 border-l-orange-500" : ""}`}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex gap-3 items-start">
                    {record.isJustification && (
                      <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">
                          {record.employees?.name}
                        </span>
                        {record.isJustification ? (
                          <Badge
                            variant="outline"
                            className="bg-orange-50 text-orange-700 border-orange-200"
                          >
                            JUSTIFICATIVA / ABONO
                          </Badge>
                        ) : (
                          <Badge
                            className={getRecordTypeColor(record.record_type)}
                          >
                            {getRecordTypeLabel(record.record_type)}
                          </Badge>
                        )}
                      </div>

                      <div className="text-sm text-muted-foreground mt-1">
                        {record.isJustification ? (
                          <div className="flex flex-col gap-1">
                            <span className="text-foreground font-medium">
                              {record.reason}
                            </span>
                            <div className="flex items-center gap-2">
                              {record.is_excused && (
                                <span className="flex items-center text-green-600 text-xs font-bold">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />{" "}
                                  ABONADO
                                </span>
                              )}
                              {record.document_url && (
                                <a
                                  href={record.document_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center text-blue-600 hover:underline text-xs"
                                >
                                  <FileText className="w-3 h-3 mr-1" /> Ver
                                  Anexo
                                </a>
                              )}
                            </div>
                          </div>
                        ) : (
                          <>
                            {format(new Date(record.recorded_at), "HH:mm:ss")}
                            {record.notes && ` • ${record.notes}`}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        record.isJustification
                          ? handleEditJustification(record)
                          : openEditDialog(record)
                      }
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleGeneralDelete(record)}
                      className="text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <JustificationModal
          open={justificationDialogOpen}
          onOpenChange={(isOpen) => {
            setJustificationDialogOpen(isOpen);
            if (!isOpen) setEditingJustification(null); // Limpa os dados ao fechar
          }}
          employees={employees}
          onSuccess={() => fetchRecords()}
          initialData={editingJustification}
        />

        {/* ... DIALOGOS RESTANTES ... */}
        <Dialog open={exportDialog} onOpenChange={setExportDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Exportar Relatórios</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <Label>Mês de Referência</Label>
              <div className="p-3 bg-muted rounded-md font-mono text-center uppercase">
                {format(parseISO(filterDate), "MMMM / yyyy", { locale: ptBR })}
              </div>
              <Select
                value={exportTarget}
                onValueChange={(v: any) => setExportTarget(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="selected">
                    Apenas o funcionário do filtro
                  </SelectItem>
                  <SelectItem value="all">
                    Todos os funcionários ativos
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handleExportFlow}
                disabled={saving}
                className="w-full"
              >
                {saving ? "Gerando PDF..." : "Gerar PDF"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={addDialog} onOpenChange={setAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Registro</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <Label>Funcionário</Label>
              <Select value={formEmployee} onValueChange={setFormEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Label>Tipo</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="intervalo">Intervalo</SelectItem>
                  <SelectItem value="fim_intervalo">Fim Intervalo</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                </SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Data</Label>
                  <Input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Hora</Label>
                  <Input
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                  />
                </div>
              </div>
              <Label>Observação</Label>
              <Input
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
              />
              {formError && (
                <p className="text-destructive text-sm">{formError}</p>
              )}
              <Button
                onClick={handleAddRecord}
                disabled={saving}
                className="w-full"
              >
                Salvar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={editDialog} onOpenChange={setEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Registro</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <Label>Tipo</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="intervalo">Intervalo</SelectItem>
                  <SelectItem value="fim_intervalo">Fim Intervalo</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                </SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Data</Label>
                  <Input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Hora</Label>
                  <Input
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                  />
                </div>
              </div>
              <Label>Observação</Label>
              <Input
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
              />
              <Button
                onClick={handleSaveEdit}
                disabled={saving}
                className="w-full"
              >
                Atualizar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default Records;
