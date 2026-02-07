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
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { formatCPF, cleanCPF, validateCPF } from '@/lib/cpf';
import { Plus, Pencil, Trash2, Search, UserPlus, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Employee {
  id: string;
  name: string;
  cpf: string;
  position: string | null;
  active: boolean;
  created_at: string;
}

const Employees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formName, setFormName] = useState('');
  const [formCpf, setFormCpf] = useState('');
  const [formPosition, setFormPosition] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setEmployees(data || []);
    } catch (err) {
      toast.error('Erro ao carregar funcionários.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openDialog = (employee?: Employee) => {
    if (employee) {
      setEditingEmployee(employee);
      setFormName(employee.name);
      setFormCpf(formatCPF(employee.cpf));
      setFormPosition(employee.position || '');
    } else {
      setEditingEmployee(null);
      setFormName('');
      setFormCpf('');
      setFormPosition('');
    }
    setFormError('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const cleaned = cleanCPF(formCpf);
    if (!formName.trim()) {
      setFormError('Nome é obrigatório.');
      return;
    }
    if (!validateCPF(cleaned)) {
      setFormError('CPF inválido.');
      return;
    }

    setSaving(true);
    setFormError('');

    try {
      if (editingEmployee) {
        const { error } = await supabase
          .from('employees')
          .update({ name: formName.trim(), cpf: cleaned, position: formPosition.trim() || null })
          .eq('id', editingEmployee.id);
        if (error) throw error;
        toast.success('Funcionário atualizado!');
      } else {
        const { error } = await supabase
          .from('employees')
          .insert({ name: formName.trim(), cpf: cleaned, position: formPosition.trim() || null });
        if (error) {
          if (error.message.includes('duplicate')) {
            setFormError('Já existe um funcionário com este CPF.');
            return;
          }
          throw error;
        }
        toast.success('Funcionário cadastrado!');
      }

      setDialogOpen(false);
      fetchEmployees();
    } catch (err) {
      toast.error('Erro ao salvar funcionário.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (employee: Employee) => {
    try {
      const { error } = await supabase
        .from('employees')
        .update({ active: !employee.active })
        .eq('id', employee.id);
      if (error) throw error;
      toast.success(employee.active ? 'Funcionário desativado.' : 'Funcionário reativado.');
      fetchEmployees();
    } catch (err) {
      toast.error('Erro ao atualizar status.');
      console.error(err);
    }
  };

  const handleDelete = async (employee: Employee) => {
    if (!confirm(`Tem certeza que deseja excluir ${employee.name}? Esta ação não pode ser desfeita e todos os registros de ponto serão removidos.`)) return;

    try {
      const { error } = await supabase.from('employees').delete().eq('id', employee.id);
      if (error) throw error;
      toast.success('Funcionário excluído.');
      fetchEmployees();
    } catch (err) {
      toast.error('Erro ao excluir funcionário.');
      console.error(err);
    }
  };

  const filtered = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.cpf.includes(cleanCPF(search))
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Funcionários</h1>
            <p className="text-muted-foreground text-sm">{employees.length} funcionários cadastrados</p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => openDialog()} className="gradient-primary border-0 text-primary-foreground font-display">
                <UserPlus className="w-4 h-4 mr-2" />
                Novo Funcionário
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display">
                  {editingEmployee ? 'Editar Funcionário' : 'Novo Funcionário'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Nome completo</Label>
                  <Input
                    placeholder="Nome do funcionário"
                    value={formName}
                    onChange={(e) => { setFormName(e.target.value); setFormError(''); }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>CPF</Label>
                  <Input
                    placeholder="000.000.000-00"
                    value={formCpf}
                    onChange={(e) => { setFormCpf(formatCPF(e.target.value)); setFormError(''); }}
                    maxLength={14}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cargo (opcional)</Label>
                  <Input
                    placeholder="Ex: Vendedor"
                    value={formPosition}
                    onChange={(e) => setFormPosition(e.target.value)}
                  />
                </div>
                {formError && (
                  <div className="flex items-center gap-2 text-destructive text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleSave} disabled={saving} className="gradient-primary border-0 text-primary-foreground">
                    {saving ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou CPF..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card"
          />
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : filtered.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="py-12 text-center text-muted-foreground">
              {search ? 'Nenhum funcionário encontrado.' : 'Nenhum funcionário cadastrado. Clique em "Novo Funcionário" para começar.'}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filtered.map((employee) => (
              <Card key={employee.id} className="glass-card">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-display font-semibold text-foreground truncate">
                        {employee.name}
                      </span>
                      <Badge variant={employee.active ? 'default' : 'secondary'} className={employee.active ? 'bg-success/10 text-success border-0 text-xs' : 'text-xs'}>
                        {employee.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="tabular-nums">{formatCPF(employee.cpf)}</span>
                      {employee.position && <span>• {employee.position}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <Button variant="ghost" size="sm" onClick={() => openDialog(employee)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(employee)}
                      className="text-muted-foreground"
                    >
                      {employee.active ? 'Desativar' : 'Ativar'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(employee)} className="text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Employees;
