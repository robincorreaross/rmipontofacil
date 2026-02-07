import { useEffect, useState } from 'react';
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
import { useAuth } from '@/hooks/useAuth';
import { Pencil, Trash2, Filter, Plus, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TimeRecord {
  id: string;
  employee_id: string;
  record_type: string;
  recorded_at: string;
  notes: string | null;
  edited: boolean;
  employees: { name: string; cpf: string } | null;
}

interface Employee {
  id: string;
  name: string;
  cpf: string;
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

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [filterDate, filterEmployee]);

  const fetchEmployees = async () => {
    const { data } = await supabase.from('employees').select('id, name, cpf').eq('active', true).order('name');
    setEmployees(data || []);
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const startOfDay = `${filterDate}T00:00:00`;
      const endOfDay = `${filterDate}T23:59:59`;

      let query = supabase
        .from('time_records')
        .select('*, employees(name, cpf)')
        .gte('recorded_at', startOfDay)
        .lte('recorded_at', endOfDay)
        .order('recorded_at', { ascending: true });

      if (filterEmployee !== 'all') {
        query = query.eq('employee_id', filterEmployee);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRecords(data || []);
    } catch (err) {
      toast.error('Erro ao carregar registros.');
      console.error(err);
    } finally {
      setLoading(false);
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
    setFormEmployee('');
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
      console.error(err);
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
      console.error(err);
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
      console.error(err);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Registros de Ponto</h1>
            <p className="text-muted-foreground text-sm">{records.length} registros encontrados</p>
          </div>
          <Button onClick={openAddDialog} className="gradient-primary border-0 text-primary-foreground font-display">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Registro
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-auto bg-card"
            />
          </div>
          <Select value={filterEmployee} onValueChange={setFilterEmployee}>
            <SelectTrigger className="w-[200px] bg-card">
              <SelectValue placeholder="Todos os funcionários" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os funcionários</SelectItem>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Records */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : records.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhum registro encontrado para esta data.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-2">
            {records.map((record) => (
              <Card key={record.id} className="glass-card">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="font-display font-semibold text-foreground">
                        {record.employees?.name || 'Desconhecido'}
                      </span>
                      <Badge className={`text-xs ${getRecordTypeColor(record.record_type)}`}>
                        {getRecordTypeLabel(record.record_type)}
                      </Badge>
                      {record.edited && (
                        <Badge variant="outline" className="text-xs">editado</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span className="tabular-nums font-medium">
                        {format(new Date(record.recorded_at), 'HH:mm:ss', { locale: ptBR })}
                      </span>
                      {record.employees?.cpf && (
                        <span className="ml-2">• CPF: {formatCPF(record.employees.cpf)}</span>
                      )}
                      {record.notes && (
                        <span className="ml-2">• {record.notes}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(record)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(record)} className="text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={editDialog} onOpenChange={setEditDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">Editar Registro</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Tipo de registro</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada</SelectItem>
                    <SelectItem value="intervalo">Intervalo</SelectItem>
                    <SelectItem value="fim_intervalo">Fim do Intervalo</SelectItem>
                    <SelectItem value="saida">Saída</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Horário</Label>
                  <Input type="time" value={formTime} onChange={(e) => setFormTime(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Observação (opcional)</Label>
                <Input
                  placeholder="Motivo da edição"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                />
              </div>
              {formError && (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{formError}</span>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditDialog(false)}>Cancelar</Button>
                <Button onClick={handleSaveEdit} disabled={saving} className="gradient-primary border-0 text-primary-foreground">
                  {saving ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Dialog */}
        <Dialog open={addDialog} onOpenChange={setAddDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">Adicionar Registro</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Funcionário</Label>
                <Select value={formEmployee} onValueChange={setFormEmployee}>
                  <SelectTrigger><SelectValue placeholder="Selecione um funcionário" /></SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo de registro</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada</SelectItem>
                    <SelectItem value="intervalo">Intervalo</SelectItem>
                    <SelectItem value="fim_intervalo">Fim do Intervalo</SelectItem>
                    <SelectItem value="saida">Saída</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Horário</Label>
                  <Input type="time" value={formTime} onChange={(e) => setFormTime(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Observação (opcional)</Label>
                <Input
                  placeholder="Motivo do registro manual"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                />
              </div>
              {formError && (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{formError}</span>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setAddDialog(false)}>Cancelar</Button>
                <Button onClick={handleAddRecord} disabled={saving} className="gradient-primary border-0 text-primary-foreground">
                  {saving ? 'Salvando...' : 'Adicionar'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default Records;
