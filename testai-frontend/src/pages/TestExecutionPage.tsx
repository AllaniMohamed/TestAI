import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Sidebar from '../components/layout/Sidebar';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge'; // ⭐ Import missing Badge

import { 
  PlayIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  ChevronLeftIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ServerStackIcon
} from '@heroicons/react/24/outline';
import { executionService, endpointService, projectService } from '../services/api';
import type { ProjectExecutionResponse, Endpoint } from '../services/api';

const TestExecutionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [projectName, setProjectName] = useState<string>('');
  const [projectUrl, setProjectUrl] = useState<string>('');
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [executionResult, setExecutionResult] = useState<ProjectExecutionResponse | null>(null);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (id) {
      loadProjectData();
    }
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, [id]);

  const loadProjectData = async () => {
    try {
      setLoading(true);
      const projectRes = await projectService.getProjectById(id!);
      setProjectName(projectRes.data.name);
      setProjectUrl(projectRes.data.projectUrl);
      const endpointsRes = await endpointService.getEndpointsByProjectId(id!);
      setEndpoints(endpointsRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const addLog = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    let formattedMsg = `[${timestamp}] ${msg}`;
    if (type === 'success') formattedMsg = `✅ ${formattedMsg}`;
    else if (type === 'error') formattedMsg = `❌ ${formattedMsg}`;
    setLogs(prev => [...prev, formattedMsg]);
  };

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  const getCurrentUserId = (): string | null => {
    const userStr = sessionStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        return user.id;
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  const startPolling = (execId: string) => {
    pollingIntervalRef.current = setInterval(async () => {
      try {
        // Récupérer les logs
        const logsRes = await executionService.getExecutionLogs(execId);
        setLogs(logsRes.data);
        
        // Récupérer le statut pour savoir si l'exécution est terminée
        const statusRes = await executionService.getExecutionStatus(execId);
        const result = statusRes.data;
        if (result.status === 'COMPLETED' || result.status === 'FAILED') {
          clearInterval(pollingIntervalRef.current!);
          pollingIntervalRef.current = null;
          setIsRunning(false);
          setExecutionResult(result);
          setProgress(100);
          addLog(`✅ Execution completed in ${result.totalDurationMs} ms.`, 'success');
          addLog(`📊 Results : ${result.testsPassed} passed, ${result.testsFailed} failed, ${result.testsError} errors.`);
          addLog(`📈 Success rate : ${result.successRate.toFixed(1)}%`);
          if (result.failedEndpoints && result.failedEndpoints.length > 0) {
            addLog(`⚠️ Endpoints with failures :`, 'error');
            result.failedEndpoints.forEach(ep => {
              addLog(`   - ${ep.method} ${ep.path} : ${ep.failed} failure(s) out of ${ep.totalTests}`, 'error');
            });
          } else {
            addLog(`🎉 No failures ! All tests passed.`, 'success');
          }
        } else {
          // Progression approximative (basée sur le nombre de logs)
          const logCount = logsRes.data.length;
          setProgress(Math.min(90, Math.floor(logCount / 3))); // à ajuster
        }
      } catch (err) {
        console.error('Polling error', err);
      }
    }, 1500);
  };

  const runTests = async () => {
    const userId = getCurrentUserId();
    if (!userId) {
      addLog('User not identified. Please log in again.', 'error');
      return;
    }

    setIsRunning(true);
    setLogs([]);
    setExecutionResult(null);
    setProgress(0);

    try {
      const startRes = await executionService.startExecution({
        projectId: id!,
        executedBy: userId,
        executionContext: 'manual'
      });
      const execId = startRes.data.executionId;
      setExecutionId(execId);
      addLog(`🚀 Execution started (ID: ${execId})`);
      addLog(`📋 ${endpoints.length} endpoints detected.`);
      addLog(`🌐 Base URL : ${projectUrl}`);
      
      startPolling(execId);
    } catch (error: any) {
      addLog(`❌ Error : ${error.message || 'Unable to contact the execution service.'}`, 'error');
      setIsRunning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface">
        <Navbar />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 ml-64 p-8 flex items-center justify-center">
            <ArrowPathIcon className="w-12 h-12 text-primary animate-spin" />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface selection:bg-primary/20">
      <Navbar />
      <div className="flex pt-0">
        <Sidebar />
        <main className="flex-1 ml-64 p-6 md:p-12 max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-4 mb-8">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-surface-container-high rounded-lg">
              <ChevronLeftIcon className="w-5 h-5 text-on-surface-variant" />
            </button>
            <div>
              <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-widest mb-1">
                <ServerStackIcon className="w-4 h-4" />
                <span>Test Execution</span>
              </div>
              <h1 className="text-3xl font-headline font-bold text-on-surface tracking-tight">{projectName}</h1>
            </div>
          </div>

          <div className="w-full bg-surface-container-high rounded-full h-2 mb-8">
            <div className="bg-primary h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 space-y-6">
              <Card title="Project Details">
                <div className="space-y-3">
                  <div><p className="text-xs font-bold text-on-surface-variant uppercase">Name</p><p className="text-on-surface font-medium">{projectName}</p></div>
                  <div><p className="text-xs font-bold text-on-surface-variant uppercase">Base URL</p><p className="text-on-surface font-mono text-sm break-all">{projectUrl}</p></div>
                  <div><p className="text-xs font-bold text-on-surface-variant uppercase">Endpoints</p>
                    <div className="max-h-64 overflow-y-auto space-y-1 mt-2">
                      {endpoints.map(ep => (
                        <div key={ep.id} className="flex items-center gap-2 p-2 bg-surface-container-low rounded-lg">
                          <Badge variant="method" method={ep.method as any}>{ep.method}</Badge>
                          <span className="text-sm font-mono text-on-surface truncate">{ep.path}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
              <Button className="w-full" onClick={runTests} loading={isRunning} disabled={isRunning || endpoints.length === 0} icon={<PlayIcon className="w-5 h-5" />}>
                {isRunning ? 'Execution in progress...' : 'Run all tests'}
              </Button>
            </div>

            <div className="lg:col-span-8 space-y-6">
              <Card title="Execution console" className="overflow-hidden">
                <div ref={terminalRef} className="bg-inverse-surface rounded-xl p-5 font-mono text-sm h-[450px] overflow-y-auto shadow-inner">
                  {logs.length === 0 ? <p className="text-on-primary-container/60 italic">Waiting for launch...</p> : logs.map((log, i) => {
                    let colorClass = 'text-on-primary-container';
                    if (log.includes('✅')) colorClass = 'text-emerald-400';
                    else if (log.includes('❌') || log.includes('⚠️')) colorClass = 'text-red-400';
                    else if (log.includes('🚀') || log.includes('📋') || log.includes('🌐')) colorClass = 'text-primary-fixed-dim';
                    return <div key={i} className={`${colorClass} mb-1 whitespace-pre-wrap break-words`}>{log}</div>;
                  })}
                  {isRunning && <div className="animate-pulse text-primary mt-2">_</div>}
                </div>
              </Card>

              {executionResult && !isRunning && progress === 100 && (
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/20 flex items-center gap-3">
                    <div className="p-2 bg-surface-container-high rounded-lg"><ServerStackIcon className="w-6 h-6 text-on-surface-variant" /></div>
                    <div><p className="text-xs font-bold text-on-surface-variant uppercase">Total</p><p className="text-2xl font-bold text-on-surface">{executionResult.totalTests}</p></div>
                  </div>
                  <div className="bg-surface-container-lowest p-4 rounded-xl border border-emerald-500/20 flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 rounded-lg"><CheckCircleIcon className="w-6 h-6 text-emerald-600" /></div>
                    <div><p className="text-xs font-bold text-on-surface-variant uppercase">Passed</p><p className="text-2xl font-bold text-emerald-600">{executionResult.testsPassed}</p></div>
                  </div>
                  <div className="bg-surface-container-lowest p-4 rounded-xl border border-red-500/20 flex items-center gap-3">
                    <div className="p-2 bg-red-50 rounded-lg"><XCircleIcon className="w-6 h-6 text-red-600" /></div>
                    <div><p className="text-xs font-bold text-on-surface-variant uppercase">Failed</p><p className="text-2xl font-bold text-red-600">{executionResult.testsFailed}</p></div>
                  </div>
                  <div className="bg-surface-container-lowest p-4 rounded-xl border border-yellow-500/20 flex items-center gap-3">
                    <div className="p-2 bg-yellow-50 rounded-lg"><ExclamationTriangleIcon className="w-6 h-6 text-yellow-600" /></div>
                    <div><p className="text-xs font-bold text-on-surface-variant uppercase">Errors</p><p className="text-2xl font-bold text-yellow-600">{executionResult.testsError}</p></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default TestExecutionPage;