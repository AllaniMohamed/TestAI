import React, { useState } from 'react';
import Navbar from '../components/layout/Navbar';
import Sidebar from '../components/layout/Sidebar';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { 
  ArrowDownTrayIcon, 
  ChartBarSquareIcon,
  ShieldCheckIcon,
  BugAntIcon
} from '@heroicons/react/24/outline';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Label } from 'recharts';
import { executionService } from '../services/api';
import type { ProjectExecutionStats } from '../services/api';
import { useEffect } from 'react';
import ReportPreview from '../components/modals/ReportPreview';

interface ReportData {
  date: string;
  execs: number;
  success: number;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const formatter = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  return formatter.format(date);
}

const formatReportData = (data: Record<string, unknown>) => {
  return Object.entries(data)
    // 1. Sort by date (earliest → latest)
    .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
    
    // 2. Then map/format
    .map(([date, stats]) => ({
      date: new Date(date).toLocaleDateString('en-GB', { 
        day: 'numeric', 
        month: 'short',
        year: '2-digit' 
      }),
      execs: (stats as Record<string, number>).total,
      success: (stats as Record<string, number>).success
    }));
};

const ReportsPage: React.FC = () => {
  // const [period, setPeriod] = useState('30d');
  const [globalStats, setGlobalStats] = useState<Record<string, number>>({});
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [executionStats, setExecutionStats] = useState<ProjectExecutionStats[]>([]);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  useEffect(() => {
    const fetchGlobalStats = async () => {
      try {
        const userStr = sessionStorage.getItem("user");
        const userId = userStr ? JSON.parse(userStr).id : null;
        const response = await executionService.getUserProjectsGlobalStats(userId);
        setGlobalStats(response.data);
        const rateResponse = await executionService.getUserProjectsGlobalTestsRate(userId);
        setReportData(formatReportData(rateResponse.data));
        const execStatsResponse = await executionService.getProjectExecutionStats(userId);
        setExecutionStats(execStatsResponse.data);
      } catch (error) {
        console.error("Erreur lors de la récupération des statistiques globales:", error);
      }
    };

    fetchGlobalStats();
  }, []);

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface selection:bg-primary/20">
      <Navbar />
      <div className="flex pt-0">
        <Sidebar />
        <main className="flex-1 ml-64 p-6 md:p-10 max-w-7xl mx-auto w-full">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
            <div>
              <h1 className="text-3xl font-headline font-bold text-on-surface">Analysis & Reports</h1>
              <p className="text-on-surface-variant">Global performance of your APIs over the selected period.</p>
            </div>
            <div className="flex gap-3">
              {/* <div className="flex bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-1">
                <PeriodBtn active={period === '7d'} onClick={() => setPeriod('7d')}>7j</PeriodBtn>
                <PeriodBtn active={period === '30d'} onClick={() => setPeriod('30d')}>30j</PeriodBtn>
                <PeriodBtn active={period === '90d'} onClick={() => setPeriod('90d')}>90j</PeriodBtn>
              </div> */}
              <Button variant="outline" icon={<ArrowDownTrayIcon className="w-5 h-5" />}>Export</Button>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
            <KPI icon={<ChartBarSquareIcon className="w-6 h-6" />} title="Total executions" value={globalStats.ALL?.toString() || '0'} />
            <KPI icon={<ShieldCheckIcon className="w-6 h-6" />} title="Success rate" value={globalStats.SUCCESS?.toFixed(1) + '%' || '0%'} />
            <KPI icon={<BugAntIcon className="w-6 h-6" />} title="Bugs detected" value={globalStats.BUGS?.toString() || '0'} />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
            <Card title="Daily execution volume">
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportData} margin={{top: 10, right: 10, left: 10, bottom: 10}}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-outline-variant, #c7c4d8)" />
                    <XAxis dataKey="date" tick={{ fill: "var(--color-on-surface-variant, #464555)", fontSize: 11 }}>
                      <Label value="Latest 7 days" offset={-5} position="bottom" fill="var(--color-on-surface-variant, #464555)" />
                    </XAxis>
                    <YAxis tick={{ fill: "var(--color-on-surface-variant, #464555)" }} >
                      <Label value="Number of Executions" angle={-90} position="insideLeft" style={{ textAnchor: "middle" }} fill="var(--color-on-surface-variant, #464555)" />
                    </YAxis>
                    <Tooltip contentStyle={{ backgroundColor: "var(--color-surface-container-lowest)", borderColor: "var(--color-outline-variant)" }} itemStyle={{color: "rgba(0,0,0,0.6)"}} />
                    <Bar dataKey="execs" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card title="Service stability (%)">
               <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={reportData} margin={{top: 10, right: 10, left: 10, bottom: 10}}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-outline-variant, #c7c4d8)" />
                    <XAxis dataKey="date" tick={{ fill: "var(--color-on-surface-variant, #464555)", fontSize: 11 }} >
                      <Label value="Latest 7 days" offset={-5} position="bottom" fill="var(--color-on-surface-variant, #464555)" />
                    </XAxis>
                    <YAxis domain={[80, 100]} tick={{ fill: "var(--color-on-surface-variant, #464555)" }} >
                      <Label value="Success Rate (%)" angle={-90} position="insideLeft" style={{ textAnchor: "middle" }} fill="var(--color-on-surface-variant, #464555)" />
                    </YAxis>
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
              <h3 className="text-lg font-headline font-bold">Execution history</h3>
            </div>
            <table className="w-full text-left">
              <thead className="bg-surface-container-low">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase">Service</th>
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase">Passed Tests</th>
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase">Duration</th>
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase">Last execution date</th>
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase text-right">Report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {executionStats.map(i => (
                  <tr key={i.id} className="hover:bg-surface-container-low transition">
                    <td className="px-6 py-4 font-semibold text-on-surface capitalize">{i.projectName}</td>
                    <td className="px-6 py-4">{i.passedTests}</td>
                    <td className="px-6 py-4 text-on-surface-variant">{i.duration}</td>
                    <td className="px-6 py-4 text-on-surface-variant text-sm">{formatDate(i.date)}</td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-primary text-sm font-bold hover:underline" onClick={() => setSelectedReport(i.id)}>Open</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </main>
      </div>
      {/* Report Preview Modal */}
      {selectedReport && (
        <ReportPreview
          name={executionStats.find(i => i.id === selectedReport)?.projectName || 'Project'}
          id={selectedReport}
          close={() => setSelectedReport(null)}
        />
      )}
    </div>
  );
};

// Sub-components (theme adapted)
const KPI: React.FC<{ icon: React.ReactNode, title: string, value: string }> = ({ icon, title, value }) => (
  <Card className="flex flex-col gap-2 border-l-4 border-l-primary">
    <div className="flex justify-between items-start">
      <div className="text-on-surface-variant">{icon}</div>
    </div>
    <p className="text-2xl font-bold text-on-surface">{value}</p>
    <p className="text-xs text-on-surface-variant font-bold uppercase tracking-tight">{title}</p>
  </Card>
);

export default ReportsPage;