import React, { useState } from 'react';
import Navbar from '../components/layout/Navbar';
import Sidebar from '../components/layout/Sidebar';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import { 
  ArrowDownTrayIcon, 
  FunnelIcon,
  ChartBarSquareIcon,
  ShieldCheckIcon,
  BugAntIcon
} from '@heroicons/react/24/outline';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const REPORTS_DATA = [
  { date: '20 Nov', execs: 45, success: 98 },
  { date: '21 Nov', execs: 52, success: 95 },
  { date: '22 Nov', execs: 38, success: 88 },
  { date: '23 Nov', execs: 65, success: 97 },
  { date: '24 Nov', execs: 48, success: 94 },
  { date: '25 Nov', execs: 70, success: 99 },
];

const ReportsPage: React.FC = () => {
  const [period, setPeriod] = useState('30d');

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface selection:bg-primary/20">
      <Navbar />
      <div className="flex pt-0">
        <Sidebar />
        <main className="flex-1 ml-64 p-6 md:p-10 max-w-7xl mx-auto w-full">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
            <div>
              <h1 className="text-3xl font-headline font-bold text-on-surface">Analyses & Rapports</h1>
              <p className="text-on-surface-variant">Performances globales de vos APIs sur la période sélectionnée.</p>
            </div>
            <div className="flex gap-3">
              <div className="flex bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-1">
                <PeriodBtn active={period === '7d'} onClick={() => setPeriod('7d')}>7j</PeriodBtn>
                <PeriodBtn active={period === '30d'} onClick={() => setPeriod('30d')}>30j</PeriodBtn>
                <PeriodBtn active={period === '90d'} onClick={() => setPeriod('90d')}>90j</PeriodBtn>
              </div>
              <Button variant="outline" icon={<ArrowDownTrayIcon className="w-5 h-5" />}>Exporter</Button>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
            <KPI icon={<ChartBarSquareIcon className="w-6 h-6" />} title="Total exécutions" value="2,450" change="+12%" />
            <KPI icon={<ShieldCheckIcon className="w-6 h-6" />} title="Taux de réussite" value="96.8%" change="+0.4%" isGood />
            <KPI icon={<BugAntIcon className="w-6 h-6" />} title="Bugs détectés" value="42" change="-5%" isGood />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
            <Card title="Volume de tests quotidiens">
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={REPORTS_DATA}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-outline-variant, #c7c4d8)" />
                    <XAxis dataKey="date" tick={{ fill: "var(--color-on-surface-variant, #464555)" }} />
                    <YAxis tick={{ fill: "var(--color-on-surface-variant, #464555)" }} />
                    <Tooltip contentStyle={{ backgroundColor: "var(--color-surface-container-lowest)", borderColor: "var(--color-outline-variant)" }} />
                    <Bar dataKey="execs" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card title="Stabilité des services (%)">
               <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={REPORTS_DATA}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-outline-variant, #c7c4d8)" />
                    <XAxis dataKey="date" tick={{ fill: "var(--color-on-surface-variant, #464555)" }} />
                    <YAxis domain={[80, 100]} tick={{ fill: "var(--color-on-surface-variant, #464555)" }} />
                    <Tooltip contentStyle={{ backgroundColor: "var(--color-surface-container-lowest)", borderColor: "var(--color-outline-variant)" }} />
                    <Line type="monotone" dataKey="success" stroke="#28a745" strokeWidth={3} dot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* History Table */}
          <Card className="p-0 overflow-hidden">
            <div className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-outline-variant/20">
              <h3 className="text-lg font-headline font-bold">Historique des exécutions</h3>
              <div className="flex gap-2">
                 <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
                    <FunnelIcon className="h-4 w-4" />
                  </span>
                  <select className="pl-10 pr-4 py-2 border border-outline-variant/30 rounded-lg text-sm bg-surface-container-lowest text-on-surface outline-none focus:ring-2 focus:ring-primary/20">
                    <option>Tous les services</option>
                    <option>User API</option>
                    <option>Payment Service</option>
                  </select>
                </div>
              </div>
            </div>
            <table className="w-full text-left">
              <thead className="bg-surface-container-low">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase">Service</th>
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase">Statut</th>
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase">Tests</th>
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase">Durée</th>
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase">Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase text-right">Rapport</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {[1, 2, 3, 4, 5].map(i => (
                  <tr key={i} className="hover:bg-surface-container-low transition">
                    <td className="px-6 py-4 font-semibold text-on-surface">User Management API</td>
                    <td className="px-6 py-4">
                      <Badge variant={i % 3 === 0 ? 'warning' : 'success'}>
                        {i % 3 === 0 ? 'Avertissement' : 'Réussi'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">48/50</td>
                    <td className="px-6 py-4 text-on-surface-variant">12.4s</td>
                    <td className="px-6 py-4 text-on-surface-variant text-sm">Aujourd'hui, 14:02</td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-primary text-sm font-bold hover:underline">Ouvrir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-4 bg-surface-container-low text-center border-t border-outline-variant/20">
              <button className="text-sm text-primary font-bold hover:underline">Charger plus...</button>
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
};

// Sous-composants (adaptés au thème)
const KPI: React.FC<{ icon: React.ReactNode, title: string, value: string, change: string, isGood?: boolean }> = ({ icon, title, value, change, isGood }) => (
  <Card className="flex flex-col gap-2 border-l-4 border-l-primary">
    <div className="flex justify-between items-start">
      <div className="text-on-surface-variant">{icon}</div>
      <span className={`text-xs font-bold px-2 py-1 rounded ${isGood ? 'bg-emerald-50 text-emerald-600' : 'bg-primary/10 text-primary'}`}>
        {change}
      </span>
    </div>
    <p className="text-2xl font-bold text-on-surface">{value}</p>
    <p className="text-xs text-on-surface-variant font-bold uppercase tracking-tight">{title}</p>
  </Card>
);

const PeriodBtn: React.FC<{ active: boolean, children: React.ReactNode, onClick: () => void }> = ({ active, children, onClick }) => (
  <button 
    onClick={onClick}
    className={`px-4 py-1.5 text-sm font-semibold rounded-md transition ${active ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
  >
    {children}
  </button>
);

export default ReportsPage;