import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { formatCPF, cleanCPF, validateCPF } from '@/lib/cpf';
import { Search, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface CpfStepProps {
  onEmployeeFound: (employee: { id: string; name: string; cpf: string }) => void;
}

export function CpfStep({ onEmployeeFound }: CpfStepProps) {
  const [cpf, setCpf] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCpfChange = (value: string) => {
    setCpf(formatCPF(value));
    setError('');
  };

  const handleSubmit = async () => {
    const cleaned = cleanCPF(cpf);

    if (!validateCPF(cleaned)) {
      setError('CPF inválido. Verifique os números digitados.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: dbError } = await supabase
        .from('employees')
        .select('id, name, cpf')
        .eq('cpf', cleaned)
        .eq('active', true)
        .maybeSingle();

      if (dbError) throw dbError;

      if (!data) {
        setError('Funcionário não encontrado. Verifique o CPF ou entre em contato com o administrador.');
        return;
      }

      onEmployeeFound(data);
    } catch (err) {
      toast.error('Erro ao buscar funcionário. Tente novamente.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="glass-card max-w-md mx-auto">
      <CardContent className="p-6 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-display font-bold text-foreground">
            Identifique-se
          </h2>
          <p className="text-muted-foreground text-sm">
            Digite seu CPF para registrar o ponto
          </p>
        </div>

        <div className="space-y-3">
          <Input
            type="text"
            inputMode="numeric"
            placeholder="000.000.000-00"
            value={cpf}
            onChange={(e) => handleCpfChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            className="text-center text-2xl font-display tracking-wider h-14 bg-background"
            maxLength={14}
          />
          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={cleanCPF(cpf).length < 11 || loading}
          className="w-full h-12 text-base font-display gradient-primary border-0 text-primary-foreground"
          size="lg"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              Buscar
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
