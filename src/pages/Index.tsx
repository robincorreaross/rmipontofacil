import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Fingerprint, Clock, Users, QrCode, ArrowRight, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

const Index = () => {
  return (
    <div className="min-h-screen gradient-surface">
      {/* Hero */}
      <div className="container px-4 py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mx-auto text-center space-y-6"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center shadow-lg">
              <Fingerprint className="w-7 h-7 text-primary-foreground" />
            </div>
          </div>

          <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground leading-tight">
            PontoFácil
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Sistema simples e eficiente de registro de ponto para seu negócio. 
            Sem complicação, sem papel.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link to="/ponto">
              <Button size="lg" className="gradient-primary border-0 text-primary-foreground font-display h-12 px-8">
                <Clock className="w-4 h-4 mr-2" />
                Registrar Ponto
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button variant="outline" size="lg" className="font-display h-12 px-8">
                <Shield className="w-4 h-4 mr-2" />
                Área Administrativa
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto mt-16"
        >
          {[
            {
              icon: QrCode,
              title: 'QR Code',
              desc: 'Funcionário escaneia o código ao chegar na loja',
            },
            {
              icon: Clock,
              title: 'Ponto Automático',
              desc: 'O sistema identifica automaticamente o tipo de registro',
            },
            {
              icon: Users,
              title: 'Gestão Completa',
              desc: 'Relatórios, edição de pontos e controle de funcionários',
            },
          ].map(({ icon: Icon, title, desc }, i) => (
            <div key={title} className="glass-card rounded-xl p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 mx-auto flex items-center justify-center">
                <Icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-foreground">{title}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default Index;
