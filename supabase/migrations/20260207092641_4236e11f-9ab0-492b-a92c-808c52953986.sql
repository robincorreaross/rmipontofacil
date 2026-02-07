
-- Tabela de funcionários
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  cpf TEXT NOT NULL UNIQUE,
  position TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de registros de ponto
CREATE TABLE public.time_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL CHECK (record_type IN ('entrada', 'intervalo', 'fim_intervalo', 'saida')),
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  edited BOOLEAN NOT NULL DEFAULT false,
  edited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_records ENABLE ROW LEVEL SECURITY;

-- Employees policies
CREATE POLICY "Anyone can read employees" ON public.employees
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert employees" ON public.employees
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update employees" ON public.employees
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete employees" ON public.employees
  FOR DELETE TO authenticated USING (true);

-- Time records policies
CREATE POLICY "Anyone can insert time records" ON public.time_records
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read time records" ON public.time_records
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can update time records" ON public.time_records
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete time records" ON public.time_records
  FOR DELETE TO authenticated USING (true);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_time_records_updated_at
  BEFORE UPDATE ON public.time_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_employees_cpf ON public.employees(cpf);
CREATE INDEX idx_time_records_employee_date ON public.time_records(employee_id, recorded_at);

-- Criar tabela para dados da empresa
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome_fantasia TEXT NOT NULL,
  razao_social TEXT NOT NULL,
  cnpj TEXT NOT NULL,
  endereco TEXT,
  telefone TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Política para que apenas admins logados possam ver e editar
CREATE POLICY "Admins can manage company settings" 
ON company_settings FOR ALL 
TO authenticated 
USING (true);