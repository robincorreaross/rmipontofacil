import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CpfStep } from '@/components/clock-in/CpfStep';
import { ConfirmStep } from '@/components/clock-in/ConfirmStep';
import { ResultStep } from '@/components/clock-in/ResultStep';
import { Clock, Fingerprint } from 'lucide-react';

type Step = 'cpf' | 'confirm' | 'result';

interface EmployeeData {
  id: string;
  name: string;
  cpf: string;
}

interface RecordResult {
  type: string;
  time: string;
  employeeName: string;
}

const ClockIn = () => {
  const [step, setStep] = useState<Step>('cpf');
  const [employee, setEmployee] = useState<EmployeeData | null>(null);
  const [result, setResult] = useState<RecordResult | null>(null);

  const handleEmployeeFound = (emp: EmployeeData) => {
    setEmployee(emp);
    setStep('confirm');
  };

  const handleRecordComplete = (res: RecordResult) => {
    setResult(res);
    setStep('result');
  };

  const handleReset = () => {
    setStep('cpf');
    setEmployee(null);
    setResult(null);
  };

  return (
    <div className="min-h-screen gradient-surface flex flex-col">
      {/* Header */}
      <header className="px-4 py-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
            <Fingerprint className="w-5 h-5 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-display font-bold text-foreground">PontoFácil</h1>
        </div>
        <div className="flex items-center justify-center gap-1.5 text-muted-foreground text-sm">
          <Clock className="w-3.5 h-3.5" />
          <span>Registro de Ponto</span>
        </div>
      </header>

      {/* Steps indicator */}
      <div className="flex justify-center gap-2 px-4 mb-6">
        {['cpf', 'confirm', 'result'].map((s, i) => (
          <div
            key={s}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              step === s ? 'w-10 bg-primary' : i < ['cpf', 'confirm', 'result'].indexOf(step) ? 'w-6 bg-primary/40' : 'w-6 bg-border'
            }`}
          />
        ))}
      </div>

      {/* Content */}
      <main className="flex-1 px-4 pb-8">
        <AnimatePresence mode="wait">
          {step === 'cpf' && (
            <motion.div
              key="cpf"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <CpfStep onEmployeeFound={handleEmployeeFound} />
            </motion.div>
          )}
          {step === 'confirm' && employee && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <ConfirmStep
                employee={employee}
                onConfirm={handleRecordComplete}
                onBack={() => setStep('cpf')}
              />
            </motion.div>
          )}
          {step === 'result' && result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              <ResultStep result={result} onNewRecord={handleReset} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default ClockIn;
