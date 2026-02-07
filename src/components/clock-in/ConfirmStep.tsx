import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { getRecordTypeLabel, getRecordTypeColor } from '@/lib/cpf';
import { UserCheck, ArrowLeft, Clock, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface ConfirmStepProps {
  employee: { id: string; name: string; cpf: string };
  onConfirm: (result: { type: string; time: string; employeeName: string }) => void;
  onBack: () => void;
}

const RECORD_SEQUENCE = ['entrada', 'intervalo', 'fim_intervalo', 'saida'];

export function ConfirmStep({ employee, onConfirm, onBack }: ConfirmStepProps) {
  const [nextType, setNextType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    determineNextType();
  }, [employee.id]);

  const determineNextType = async () => {
    setLoading(true);
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

      const { data: todayRecords, error } = await supabase
        .from('time_records')
        .select('record_type, recorded_at')
        .eq('employee_id', employee.id)
        .gte('recorded_at', startOfDay)
        .lt('recorded_at', endOfDay)
        .order('recorded_at', { ascending: true });

      if (error) throw error;

      if (!todayRecords || todayRecords.length === 0) {
        setNextType('entrada');
      } else {
        const lastRecord = todayRecords[todayRecords.length - 1];
        const lastIndex = RECORD_SEQUENCE.indexOf(lastRecord.record_type);
        
        if (lastIndex < RECORD_SEQUENCE.length - 1) {
          setNextType(RECORD_SEQUENCE[lastIndex + 1]);
        } else {
          setNextType(null); // All records for today are complete
        }
      }
    } catch (err) {
      toast.error('Erro ao verificar registros. Tente novamente.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!nextType) return;
    
    setSubmitting(true);
    try {
      const now = new Date();
      const { error } = await supabase
        .from('time_records')
        .insert({
          employee_id: employee.id,
          record_type: nextType,
          recorded_at: now.toISOString(),
        });

      if (error) throw error;

      onConfirm({
        type: nextType,
        time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        employeeName: employee.name,
      });
    } catch (err) {
      toast.error('Erro ao registrar ponto. Tente novamente.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="glass-card max-w-md mx-auto">
      <CardContent className="p-6 space-y-6">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl gradient-primary mx-auto flex items-center justify-center">
            <UserCheck className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-2xl font-display font-bold text-foreground">
              {employee.name}
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              Confirme seu registro de ponto
            </p>
          </div>
        </div>

        {/* Current time */}
        <div className="text-center py-4 rounded-xl bg-muted">
          <div className="flex items-center justify-center gap-2 text-muted-foreground text-xs mb-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Horário atual</span>
          </div>
          <p className="text-3xl font-display font-bold text-foreground tabular-nums">
            {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
          <p className="text-muted-foreground text-xs mt-1">
            {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : nextType ? (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Tipo de registro:</p>
              <Badge className={`text-base px-4 py-1.5 ${getRecordTypeColor(nextType)}`}>
                {getRecordTypeLabel(nextType)}
              </Badge>
            </div>

            <Button
              onClick={handleConfirm}
              disabled={submitting}
              className="w-full h-14 text-lg font-display gradient-primary border-0 text-primary-foreground"
              size="lg"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Confirmar Registro'
              )}
            </Button>
          </div>
        ) : (
          <div className="text-center py-4 rounded-xl bg-muted">
            <p className="text-muted-foreground font-medium">
              Todos os registros do dia já foram realizados. ✅
            </p>
          </div>
        )}

        <Button
          variant="ghost"
          onClick={onBack}
          className="w-full text-muted-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
      </CardContent>
    </Card>
  );
}
