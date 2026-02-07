import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Users, Clock, CalendarCheck, TrendingUp } from 'lucide-react';

interface Stats {
  totalEmployees: number;
  activeToday: number;
  recordsToday: number;
  totalRecordsMonth: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalEmployees: 0,
    activeToday: 0,
    recordsToday: 0,
    totalRecordsMonth: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [employeesRes, todayRes, monthRes] = await Promise.all([
        supabase.from('employees').select('id', { count: 'exact' }).eq('active', true),
        supabase.from('time_records').select('employee_id', { count: 'exact' }).gte('recorded_at', startOfDay),
        supabase.from('time_records').select('id', { count: 'exact' }).gte('recorded_at', startOfMonth),
      ]);

      const uniqueToday = new Set(todayRes.data?.map(r => r.employee_id) || []);

      setStats({
        totalEmployees: employeesRes.count || 0,
        activeToday: uniqueToday.size,
        recordsToday: todayRes.count || 0,
        totalRecordsMonth: monthRes.count || 0,
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    { title: 'Funcionários Ativos', value: stats.totalEmployees, icon: Users, color: 'text-primary' },
    { title: 'Presentes Hoje', value: stats.activeToday, icon: CalendarCheck, color: 'text-success' },
    { title: 'Registros Hoje', value: stats.recordsToday, icon: Clock, color: 'text-info' },
    { title: 'Registros no Mês', value: stats.totalRecordsMonth, icon: TrendingUp, color: 'text-accent' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Visão geral do sistema de ponto</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map(({ title, value, icon: Icon, color }) => (
            <Card key={title} className="glass-card">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-normal text-muted-foreground flex items-center gap-1.5">
                  <Icon className={`w-3.5 h-3.5 ${color}`} />
                  {title}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-3xl font-display font-bold text-foreground">
                  {loading ? '—' : value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
