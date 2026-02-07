import { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { getRecordTypeLabel, getRecordTypeColor, formatCPF } from '@/lib/cpf';
import { exportEmployeeMonthlyReport } from '@/lib/exportPdf';
import { useAuth } from '@/hooks/useAuth';
import { Pencil, Trash2, Filter, Plus, AlertCircle, FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TimeRecord {
  id: string;
  employee_id: string;
  record_type: string;
  recorded_at: string;
  notes: string | null;
  edited: boolean;
  employees: { name: string; cpf: string; position?: string } | null;
}

interface Employee {
  id: string;
  name: string;
  cpf: string;
  position?: string;
}

const Records = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<TimeRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [filterEmployee, setFilterEmployee] = useState<string>('all');
  const [editDialog, setEditDialog] = useState(false);
  const [addDialog, setAddDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState<TimeRecord | null>(null);
  const [formType, setFormType] = useState('entrada');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formEmployee, setFormEmployee] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchEmployees = useCallback(async () => {
    const { data } = await supabase
      .from('employees')
      .select('id, name, cpf, position')
      .eq('active', true)
      .order('name');
    setEmployees(data || []);
  }, []);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const dateRef = parseISO(filterDate);
      let startRange: string;
      let endRange: string;

      if (filterEmployee !== 'all') {
        startRange = format(startOfMonth(dateRef), "yyyy-MM-dd'T'00:00:00");
        endRange = format(endOfMonth(dateRef), "yyyy-MM-dd'T'23:59:59");
      } else {
        startRange = `${filterDate}T00:00:00`;
        endRange = `${filterDate}T23:59:59`;
      }

      const { data, error } = await supabase
        .from('time_records')
        .select('*, employees(name, cpf, position)')
        .gte('recorded_at', startRange)
        .lte('recorded_at', endRange)
        .order('recorded_at', { ascending: true });

      if (error) throw error;

      let filtered = data || [];
      if (filterEmployee !== 'all') {
        filtered = filtered.filter(r => r.employee_id === filterEmployee);
      }
      
      setRecords(filtered);
    } catch (err) {
      toast.error('Erro ao carregar registros.');
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

  const handleExport = async () => {
    const emp = employees.find(e => e.id === filterEmployee);
    if (emp && records.length > 0) {
      const employeeData = {
        name: emp.name,
        cpf: emp.cpf,
        position: emp.position
      };
      await exportEmployeeMonthlyReport(employeeData, records, filterDate);
    } else {
      toast.error('Selecione um funcionário com registros para exportar.');
    }
  };

  const openEditDialog = (record: TimeRecord) => {
    setEditingRecord(record);
    const dt = new Date(record.recorded_at);
    setFormType(record.record_type);
    setFormDate(format(dt, 'yyyy-MM-dd'));
    setFormTime(format(dt, 'HH:mm'));
    setFormNotes(record.notes || '');
    setFormError('');
    setEditDialog(true);
  };

  const openAddDialog = () => {
    setFormEmployee(filterEmployee !== 'all' ? filterEmployee : '');
    setFormType('entrada');
    setFormDate(filterDate);
    setFormTime(format(new Date(), 'HH:mm'));
    setFormNotes('');
    setFormError('');
    setAddDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!editingRecord) return;
    if (!formDate || !formTime) {
      setFormError('Data e horário são obrigatórios.');
      return;
    }

    setSaving(true);
    try {
      const recordedAt = new Date(`${formDate}T${formTime}:00`).toISOString();
      const { error } = await supabase
        .from('time_records')
        .update({
          record_type: formType,
          recorded_at: recordedAt,
          notes: formNotes.trim() || null,
          edited: true,
          edited_by: user?.id || null,
        })
        .eq('id', editingRecord.id);

      if (error) throw error;
      toast.success('Registro atualizado!');
      setEditDialog(false);
      fetchRecords();
    } catch (err) {
      toast.error('Erro ao atualizar registro.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddRecord = async () => {
    if (!formEmployee) {
      setFormError('Selecione um funcionário.');
      return;
    }
    if (!formDate || !formTime) {
      setFormError('Data e horário são obrigatórios.');
      return;
    }

    setSaving(true);
    try {
      const recordedAt = new Date(`${formDate}T${formTime}:00`).toISOString();
      const { error } = await supabase
        .from('time_records')
        .insert({
          employee_id: formEmployee,
          record_type: formType,
          recorded_at: recordedAt,
          notes: formNotes.trim() || null,
          edited: true,
          edited_by: user?.id || null,
        });

      if (error) throw error;
      toast.success('Registro adicionado!');
      setAddDialog(false);
      fetchRecords();
    } catch (err) {
      toast.error('Erro ao adicionar registro.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record: TimeRecord) => {
    if (!confirm('Tem certeza que deseja excluir este registro?')) return;
    try {
      const { error } = await supabase.from('time_records').delete().eq('id', record.id);
      if (error) throw error;
      toast.success('Registro excluído.');
      fetchRecords();
    } catch (err) {
      toast.error('Erro ao excluir registro.');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Registros de Ponto</h1>
            <p className="text-muted-foreground text-sm">
              {filterEmployee !== 'all' ? 'Registros Mensais' : 'Registros Diários'}: {records.length} encontrados
            </p>
          </div>
          <div className="flex gap-2">
            {filterEmployee !== 'all' && records.length > 0 && (
              <Button variant="outline" onClick={handleExport} className="border-primary text-primary">
                <FileDown className="w-4 h-4 mr-2" /> Exportar Folha
              </Button>
            )}
            <Button onClick={openAddDialog} className="gradient-primary text-white">
              <Plus className="w-4 h-4 mr-2" /> Adicionar Registro
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-auto" />
          <Select value={filterEmployee} onValueChange={setFilterEmployee}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Funcionário" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os funcionários</SelectItem>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="text-center py-12">Carregando...</div>
        ) : (
          <div className="grid gap-2">
            {records.map((record) => (
              <Card key={record.id} className="glass-card">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{record.employees?.name}</span>
                      <Badge className={getRecordTypeColor(record.record_type)}>{getRecordTypeLabel(record.record_type)}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(record.recorded_at), 'HH:mm:ss')} {record.notes && `• ${record.notes}`}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(record)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(record)} className="text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* DIÁLOGO ADICIONAR */}
        <Dialog open={addDialog} onOpenChange={setAddDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Adicionar Registro</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <Label>Funcionário</Label>
              <Select value={formEmployee} onValueChange={setFormEmployee}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Label>Tipo</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="intervalo">Intervalo</SelectItem>
                  <SelectItem value="fim_intervalo">Fim Intervalo</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                </SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Data</Label><Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} /></div>
                <div><Label>Hora</Label><Input type="time" value={formTime} onChange={e => setFormTime(e.target.value)} /></div>
              </div>
              <Label>Observação</Label>
              <Input value={formNotes} onChange={e => setFormNotes(e.target.value)} />
              {formError && <p className="text-destructive text-sm">{formError}</p>}
              <Button onClick={handleAddRecord} disabled={saving} className="w-full">{saving ? 'Salvando...' : 'Salvar'}</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* DIÁLOGO EDITAR */}
        <Dialog open={editDialog} onOpenChange={setEditDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Editar Registro</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <Label>Tipo</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="intervalo">Intervalo</SelectItem>
                  <SelectItem value="fim_intervalo">Fim Intervalo</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                </SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Data</Label><Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} /></div>
                <div><Label>Hora</Label><Input type="time" value={formTime} onChange={e => setFormTime(e.target.value)} /></div>
              </div>
              <Label>Observação</Label>
              <Input value={formNotes} onChange={e => setFormNotes(e.target.value)} />
              {formError && <p className="text-destructive text-sm">{formError}</p>}
              <Button onClick={handleSaveEdit} disabled={saving} className="w-full">{saving ? 'Salvando...' : 'Atualizar'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default Records;