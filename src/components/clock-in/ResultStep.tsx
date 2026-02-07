import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getRecordTypeLabel, getRecordTypeColor } from '@/lib/cpf';
import { CheckCircle2, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

interface ResultStepProps {
  result: { type: string; time: string; employeeName: string };
  onNewRecord: () => void;
}

export function ResultStep({ result, onNewRecord }: ResultStepProps) {
  return (
    <Card className="glass-card max-w-md mx-auto">
      <CardContent className="p-6 space-y-6">
        <div className="text-center space-y-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
          >
            <div className="w-20 h-20 rounded-full bg-success/10 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-success" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-2xl font-display font-bold text-foreground">
              Ponto Registrado!
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              Registro realizado com sucesso
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-3 py-4 px-4 rounded-xl bg-muted"
        >
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Funcionário</span>
            <span className="font-medium text-foreground">{result.employeeName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Tipo</span>
            <Badge className={getRecordTypeColor(result.type)}>
              {getRecordTypeLabel(result.type)}
            </Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Horário</span>
            <span className="font-display font-bold text-foreground tabular-nums">{result.time}</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <Button
            onClick={onNewRecord}
            className="w-full h-12 text-base font-display gradient-primary border-0 text-primary-foreground"
            size="lg"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Novo Registro
          </Button>
        </motion.div>
      </CardContent>
    </Card>
  );
}
