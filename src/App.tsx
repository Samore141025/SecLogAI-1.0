/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  Terminal, 
  AlertTriangle, 
  Activity, 
  FileText, 
  Search, 
  Upload, 
  Play, 
  BarChart3, 
  Lock,
  MessageSquare,
  ChevronRight,
  RefreshCw,
  Database,
  Info
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  AreaChart,
  Area
} from 'recharts';
import Markdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';
import { analyzeLogsWithGemini, generateDemoLogs, LogEntry } from './services/geminiService';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisOutput, setAnalysisOutput] = useState<string>('');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([
    { role: 'assistant', content: "Welcome to SecLogAI SOC Monitor. Upload logs (JSON/CSV/text), describe an event, or say 'demo' for simulation." }
  ]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat' | 'logs'>('dashboard');
  const [ipFilter, setIpFilter] = useState('');
  const [showSingleLogModal, setShowSingleLogModal] = useState(false);
  const [singleLogInput, setSingleLogInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /**
   * Exports the current AI analysis report to a downloadable JSON file.
   */
  const handleExportJson = () => {
    if (!analysisOutput) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
      timestamp: new Date().toISOString(),
      analysis: analysisOutput,
      logs_analyzed: logs.length,
      stats: stats
    }, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `seclogai_report_${format(new Date(), 'yyyyMMdd_HHmm')}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  /**
   * Triggers the analysis of a single log entry via the modal interface.
   */
  const handleSingleLogAnalysis = async () => {
    if (!singleLogInput.trim()) return;
    setShowSingleLogModal(false);
    setActiveTab('chat');
    setMessages(prev => [...prev, { role: 'user', content: `Analyze this single event: ${singleLogInput}` }]);
    setIsAnalyzing(true);
    try {
      const result = await analyzeLogsWithGemini(`SINGLE EVENT ANALYSIS REQUEST:\n${singleLogInput}`);
      setMessages(prev => [...prev, { role: 'assistant', content: result }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "⚠️ Error analyzing single event." }]);
    } finally {
      setIsAnalyzing(false);
      setSingleLogInput('');
    }
  };

  const handleDemo = () => {
    const demoLogs = generateDemoLogs(150);
    setLogs(demoLogs);
    setMessages(prev => [...prev, { role: 'user', content: 'Run demo simulation' }]);
    processLogs(JSON.stringify(demoLogs, null, 2));
  };

  /**
   * Core processing function that sends log data to the Gemini API
   * and handles the response/UI state.
   */
  const processLogs = async (logText: string) => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeLogsWithGemini(logText);
      setAnalysisOutput(result);
      setMessages(prev => [...prev, { role: 'assistant', content: result }]);
      setActiveTab('dashboard');
    } catch (error: any) {
      console.error(error);
      const errorMsg = error?.message?.includes('token count') 
        ? "⚠️ The log file is too large for full analysis. I've attempted to truncate it, but it still exceeds limits. Please try uploading a smaller segment."
        : "⚠️ Error analyzing logs. Please check your API key and input format.";
      setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        // Simple attempt to parse JSON
        if (text.trim().startsWith('[') || text.trim().startsWith('{')) {
          const parsed = JSON.parse(text);
          setLogs(Array.isArray(parsed) ? parsed : [parsed]);
        } else {
          // Fallback to raw text parsing (simplified)
          const lines = text.split('\n').filter(l => l.trim());
          const parsedLogs = lines.map(line => ({
            timestamp: new Date().toISOString(),
            ip: 'Unknown',
            action: 'RAW_LOG',
            message: line
          }));
          setLogs(parsedLogs);
        }
        processLogs(text);
      } catch (err) {
        processLogs(text); // Send as raw text to Gemini anyway
      }
    };
    reader.readAsText(file);
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);

    if (userMsg.toLowerCase().includes('demo')) {
      handleDemo();
      return;
    }

    setIsAnalyzing(true);
    try {
      const context = logs.length > 0 ? `Current Logs Context: ${JSON.stringify(logs.slice(0, 50))}\n\n` : '';
      const result = await analyzeLogsWithGemini(context + userMsg);
      setMessages(prev => [...prev, { role: 'assistant', content: result }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "⚠️ Error processing request." }]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Stats for dashboard
  const stats = {
    total: logs.length,
    failed: logs.filter(l => l.action?.includes('FAILED') || l.status_code === 403 || l.event_id === 4625).length,
    uniqueIps: new Set(logs.map(l => l.ip)).size,
    critical: logs.filter(l => l.severity === 'Critical' || l.severity === 'High').length
  };

  const chartData = logs.reduce((acc: any[], log) => {
    const time = format(new Date(log.timestamp), 'HH:mm');
    const existing = acc.find(d => d.time === time);
    if (existing) {
      existing.count += 1;
      if (log.action?.includes('FAILED')) existing.failed += 1;
    } else {
      acc.push({ time, count: 1, failed: log.action?.includes('FAILED') ? 1 : 0 });
    }
    return acc;
  }, []).sort((a, b) => a.time.localeCompare(b.time)).slice(-20);

  const threatData = [
    { name: 'Brute Force', value: stats.failed > 10 ? 40 : 10, color: '#ef4444' },
    { name: 'Privilege Escalation', value: 15, color: '#f97316' },
    { name: 'Suspicious IP', value: 25, color: '#eab308' },
    { name: 'Normal', value: 20, color: '#22c55e' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-zinc-300 font-sans selection:bg-emerald-500/30">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-[#111113] border-r border-white/5 z-50 hidden lg:flex flex-col">
        <div className="p-6 flex items-center gap-3 border-b border-white/5">
          <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
            <Shield className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <h1 className="font-bold text-white tracking-tight">SecLogAI</h1>
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">SOC Monitor v1.0</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
              activeTab === 'dashboard' ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "hover:bg-white/5 text-zinc-400"
            )}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="font-medium">Dashboard</span>
          </button>
          <button 
            onClick={() => setActiveTab('chat')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
              activeTab === 'chat' ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "hover:bg-white/5 text-zinc-400"
            )}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="font-medium">Threat Analysis</span>
          </button>
          <button 
            onClick={() => setActiveTab('logs')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
              activeTab === 'logs' ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "hover:bg-white/5 text-zinc-400"
            )}
          >
            <Database className="w-5 h-5" />
            <span className="font-medium">Log Explorer</span>
          </button>
        </nav>

        <div className="p-4 border-t border-white/5">
          <div className="bg-zinc-900/50 rounded-xl p-4 border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-zinc-500 uppercase">System Status</span>
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              AI Core: Operational<br />
              Threat Engine: Active
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen flex flex-col">
        {/* Header */}
        <header className="h-16 border-b border-white/5 bg-[#0a0a0b]/80 backdrop-blur-md sticky top-0 z-40 px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="lg:hidden w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center border border-emerald-500/20">
              <Shield className="w-5 h-5 text-emerald-500" />
            </div>
            <h2 className="text-sm font-semibold text-white capitalize">{activeTab}</h2>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={async () => {
                try {
                  const response = await fetch('/sample_security_logs.json');
                  const text = await response.text();
                  setLogs(JSON.parse(text));
                  processLogs(text);
                } catch (err) {
                  setMessages(prev => [...prev, { role: 'assistant', content: "⚠️ Could not load sample file. Please ensure /sample_security_logs.json exists." }]);
                }
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Load Sample
            </button>
            <button 
              onClick={() => setShowSingleLogModal(true)}
              className="bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 border border-white/10"
            >
              <Search className="w-4 h-4" />
              Analyze Event
            </button>
            <label className="cursor-pointer bg-emerald-500 hover:bg-emerald-600 text-black px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Upload Logs
              <input type="file" className="hidden" onChange={handleFileUpload} accept=".json,.csv,.txt" />
            </label>
            <button 
              onClick={handleDemo}
              className="bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 border border-white/10"
            >
              <Play className="w-4 h-4" />
              Demo Simulation
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 p-6">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Events', value: stats.total, icon: Activity, color: 'text-blue-400' },
                    { label: 'Failed Logins', value: stats.failed, icon: AlertTriangle, color: 'text-orange-400' },
                    { label: 'Unique IPs', value: stats.uniqueIps, icon: Terminal, color: 'text-emerald-400' },
                    { label: 'Critical Alerts', value: stats.critical, icon: Shield, color: 'text-red-400' },
                  ].map((stat, i) => (
                    <div key={i} className="bg-[#111113] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-colors group">
                      <div className="flex items-center justify-between mb-3">
                        <div className={cn("p-2 rounded-lg bg-white/5", stat.color)}>
                          <stat.icon className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Live</span>
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-1">{stat.value.toLocaleString()}</h3>
                      <p className="text-xs text-zinc-500 font-medium">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 bg-[#111113] border border-white/5 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-bold text-white flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-500" />
                        Event Timeline
                      </h3>
                      <div className="flex gap-2">
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 uppercase">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" /> Total
                        </span>
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 uppercase">
                          <div className="w-2 h-2 rounded-full bg-orange-500" /> Failed
                        </span>
                      </div>
                    </div>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                          <XAxis 
                            dataKey="time" 
                            stroke="#52525b" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false}
                          />
                          <YAxis 
                            stroke="#52525b" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false}
                          />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #ffffff10', borderRadius: '12px', fontSize: '12px' }}
                            itemStyle={{ color: '#fff' }}
                          />
                          <Area type="monotone" dataKey="count" stroke="#10b981" fillOpacity={1} fill="url(#colorCount)" strokeWidth={2} />
                          <Area type="monotone" dataKey="failed" stroke="#f97316" fillOpacity={1} fill="url(#colorFailed)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-[#111113] border border-white/5 rounded-2xl p-6">
                    <h3 className="font-bold text-white mb-6 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-emerald-500" />
                      Threat Distribution
                    </h3>
                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={threatData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {threatData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #ffffff10', borderRadius: '12px', fontSize: '12px' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2 mt-4">
                      {threatData.map((threat, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: threat.color }} />
                            <span className="text-zinc-400">{threat.name}</span>
                          </div>
                          <span className="font-bold text-white">{threat.value}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Analysis Output */}
                {analysisOutput && (
                  <div className="bg-[#111113] border border-white/5 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-bold text-white flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-emerald-500" />
                        AI Analysis Report
                      </h3>
                      <button 
                        onClick={handleExportJson}
                        className="text-xs text-emerald-500 font-bold hover:underline flex items-center gap-1"
                      >
                        Export JSON <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="prose prose-invert prose-emerald max-w-none text-zinc-400 text-sm leading-relaxed">
                      <Markdown>{analysisOutput}</Markdown>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'chat' && (
              <motion.div 
                key="chat"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="h-[calc(100vh-10rem)] flex flex-col bg-[#111113] border border-white/5 rounded-2xl overflow-hidden"
              >
                <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                      <Shield className="w-4 h-4 text-black" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">SecLogAI Analyst</h3>
                      <p className="text-[10px] text-emerald-500 font-bold uppercase">Online • Ready for Analysis</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setMessages([{ role: 'assistant', content: "Chat cleared. How can I help with your logs?" }])}
                    className="p-2 hover:bg-white/5 rounded-lg transition-colors text-zinc-500"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {messages.map((msg, i) => (
                    <div key={i} className={cn(
                      "flex gap-4 max-w-[85%]",
                      msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                    )}>
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center border",
                        msg.role === 'user' ? "bg-zinc-800 border-white/10" : "bg-emerald-500/10 border-emerald-500/20"
                      )}>
                        {msg.role === 'user' ? <Terminal className="w-4 h-4 text-zinc-400" /> : <Shield className="w-4 h-4 text-emerald-500" />}
                      </div>
                      <div className={cn(
                        "p-4 rounded-2xl text-sm leading-relaxed",
                        msg.role === 'user' ? "bg-emerald-500 text-black font-medium" : "bg-white/5 text-zinc-300 border border-white/5",
                        msg.content.includes('🚨') && msg.role === 'assistant' ? "border-red-500/30 bg-red-500/5" : "",
                        msg.content.includes('⚠️') && msg.role === 'assistant' ? "border-orange-500/30 bg-orange-500/5" : ""
                      )}>
                        <div className="prose prose-invert prose-sm max-w-none">
                          <Markdown>{msg.content}</Markdown>
                        </div>
                      </div>
                    </div>
                  ))}
                  {isAnalyzing && (
                    <div className="flex gap-4 max-w-[85%] animate-pulse">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <RefreshCw className="w-4 h-4 text-emerald-500 animate-spin" />
                      </div>
                      <div className="p-4 rounded-2xl bg-white/5 text-zinc-500 text-sm italic">
                        SecLogAI is analyzing logs...
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleChatSubmit} className="p-4 border-t border-white/5 bg-white/5">
                  <div className="relative">
                    <input 
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask about threats, run demo, or analyze specific logs..."
                      className="w-full bg-[#0a0a0b] border border-white/10 rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
                    />
                    <button 
                      type="submit"
                      disabled={isAnalyzing}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-emerald-500 hover:bg-emerald-600 text-black rounded-lg transition-colors disabled:opacity-50"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {activeTab === 'logs' && (
              <motion.div 
                key="logs"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-[#111113] border border-white/5 rounded-2xl overflow-hidden"
              >
                <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-500" />
                    Raw Log Stream
                  </h3>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500" />
                      <input 
                        type="text" 
                        placeholder="Filter by IP..." 
                        value={ipFilter}
                        onChange={(e) => setIpFilter(e.target.value)}
                        className="bg-[#0a0a0b] border border-white/10 rounded-lg py-1.5 pl-8 pr-10 text-[10px] focus:outline-none focus:border-emerald-500/50"
                      />
                      {ipFilter && (
                        <button 
                          onClick={() => setIpFilter('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded text-zinc-500"
                        >
                          <RefreshCw className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white/5 text-zinc-500 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-3">Timestamp</th>
                        <th className="px-6 py-3">IP Address</th>
                        <th className="px-6 py-3">User</th>
                        <th className="px-6 py-3">Action</th>
                        <th className="px-6 py-3">Severity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {logs.filter(l => l.ip.includes(ipFilter)).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-zinc-600">
                            No logs found matching filter.
                          </td>
                        </tr>
                      ) : (
                        logs.filter(l => l.ip.includes(ipFilter)).map((log, i) => (
                          <tr key={i} className="hover:bg-white/5 transition-colors group">
                            <td className="px-6 py-4 font-mono text-zinc-500">{format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss')}</td>
                            <td className="px-6 py-4 font-mono text-emerald-500/80">{log.ip}</td>
                            <td className="px-6 py-4 text-zinc-300">{log.user || 'N/A'}</td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                log.action?.includes('FAILED') ? "bg-orange-500/10 text-orange-500" : "bg-emerald-500/10 text-emerald-500"
                              )}>
                                {log.action}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                log.severity === 'High' || log.severity === 'Critical' ? "bg-red-500/10 text-red-500" : "bg-zinc-500/10 text-zinc-500"
                              )}>
                                {log.severity || 'Info'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <footer className="p-6 border-t border-white/5 text-center">
          <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-widest">
            SecLogAI Security Operations Center • Powered by Gemini AI • Confidential
          </p>
        </footer>
      </main>

      {/* Single Log Modal */}
      <AnimatePresence>
        {showSingleLogModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#111113] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Search className="w-4 h-4 text-emerald-500" />
                  Analyze Single Event
                </h3>
                <button onClick={() => setShowSingleLogModal(false)} className="text-zinc-500 hover:text-white">
                  <RefreshCw className="w-4 h-4 rotate-45" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-xs text-zinc-400">Paste a single log entry (JSON or raw text) for immediate AI analysis.</p>
                <textarea 
                  value={singleLogInput}
                  onChange={(e) => setSingleLogInput(e.target.value)}
                  placeholder='{"timestamp": "2024-01-01T12:00:00Z", "event_id": 4625, "ip": "192.168.1.100"}'
                  className="w-full h-32 bg-[#0a0a0b] border border-white/10 rounded-xl p-4 text-xs font-mono focus:outline-none focus:border-emerald-500/50"
                />
                <div className="flex justify-end gap-3">
                  <button 
                    onClick={() => setShowSingleLogModal(false)}
                    className="px-4 py-2 rounded-lg text-xs font-bold text-zinc-400 hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSingleLogAnalysis}
                    className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-500 text-black hover:bg-emerald-600 transition-colors"
                  >
                    Analyze Event
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
