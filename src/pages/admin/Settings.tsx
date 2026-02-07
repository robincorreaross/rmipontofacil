import { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Building2, Save, Loader2 } from 'lucide-react';

interface CompanySettings {
  id: string;
  nome_fantasia: string;
  razao_social: string;
  cnpj: string;
  endereco: string;
  telefone: string;
}

// Tipo customizado para evitar o uso de 'any' e satisfazer o ESLint
type DynamicSupabase = {
  from: (table: string) => {
    select: (columns: string) => {
      single: () => Promise<{ data: CompanySettings | null; error: { code: string; message: string } | null }>;
    };
    upsert: (payload: Partial<CompanySettings>) => Promise<{ error: { code: string; message: string } | null }>;
  };
};

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyData, setCompanyData] = useState<CompanySettings>({
    id: '',
    nome_fantasia: '',
    razao_social: '',
    cnpj: '',
    endereco: '',
    telefone: ''
  });

  // Cast seguro do cliente Supabase
  const dynamicDb = supabase as unknown as DynamicSupabase;

  // 1. Envolvendo a função em useCallback para resolver o erro de dependência
  const fetchCompanyData = useCallback(async () => {
    try {
      const { data, error } = await dynamicDb
        .from('company_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) setCompanyData(data);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  }, [dynamicDb]); // Dependência estável

  useEffect(() => {
    fetchCompanyData();
  }, [fetchCompanyData]); // Agora fetchCompanyData é uma dependência válida e estável

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Partial<CompanySettings> = {
        nome_fantasia: companyData.nome_fantasia,
        razao_social: companyData.razao_social,
        cnpj: companyData.cnpj,
        endereco: companyData.endereco,
        telefone: companyData.telefone,
        ...(companyData.id ? { id: companyData.id } : {})
      };

      const { error } = await dynamicDb
        .from('company_settings')
        .upsert(payload);

      if (error) throw error;
      toast.success('Dados da empresa atualizados!');
      fetchCompanyData();
    } catch (err) {
      toast.error('Erro ao salvar dados.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Carregando...</div>;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground text-sm">Dados da empresa para relatórios e folha de ponto</p>
        </div>

        <Card className="glass-card max-w-2xl border-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground font-display">
              <Building2 className="w-5 h-5 text-primary" />
              Dados da Empresa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome_fantasia">Nome Fantasia</Label>
                  <Input 
                    id="nome_fantasia"
                    value={companyData.nome_fantasia} 
                    onChange={e => setCompanyData({...companyData, nome_fantasia: e.target.value})} 
                    placeholder="Ex: RMI Soluções Digitais"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="razao_social">Razão Social</Label>
                  <Input 
                    id="razao_social"
                    value={companyData.razao_social} 
                    onChange={e => setCompanyData({...companyData, razao_social: e.target.value})} 
                    placeholder="Nome oficial da empresa"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input 
                    id="cnpj"
                    value={companyData.cnpj} 
                    onChange={e => setCompanyData({...companyData, cnpj: e.target.value})} 
                    placeholder="00.000.000/0001-00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endereco">Endereço Completo</Label>
                  <Input 
                    id="endereco"
                    value={companyData.endereco} 
                    onChange={e => setCompanyData({...companyData, endereco: e.target.value})} 
                    placeholder="Rua, Número, Bairro, Cidade - UF"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input 
                    id="telefone"
                    value={companyData.telefone} 
                    onChange={e => setCompanyData({...companyData, telefone: e.target.value})} 
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
              <Button type="submit" disabled={saving} className="w-full gradient-primary text-primary-foreground font-display">
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Configurações
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default Settings;