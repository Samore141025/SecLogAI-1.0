import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface LogEntry {
  timestamp: string;
  event_id?: string | number;
  user?: string;
  ip: string;
  action: string;
  status_code?: number;
  user_agent?: string;
  severity?: string;
  message?: string;
}

export interface SecurityAlert {
  timestamp: string;
  threat_type: string;
  ip: string;
  user: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  evidence: string;
  recommendation: string;
  mitre_ttp?: string;
}

export interface AnalysisResult {
  summary: {
    total_events: number;
    unique_ips: number;
    unique_users: number;
    failed_logins: number;
  };
  alerts: SecurityAlert[];
  risk_score: number;
  recommendations: string[];
  timeline: { time: string; count: number }[];
}

/**
 * Analyzes a batch of logs using Gemini AI.
 * Implements truncation logic to stay within token limits.
 * 
 * @param logs - The raw log string (JSON, CSV, or text)
 * @returns A markdown-formatted analysis report
 */
export const analyzeLogsWithGemini = async (logs: string): Promise<string> => {
  const model = "gemini-3-flash-preview";
  
  // Truncate logs if they are too large to prevent token limit errors
  // 1M tokens is roughly 4M characters. We'll cap at 500k characters to be safe and fast.
  const MAX_CHARS = 500000;
  let processedLogs = logs;
  let truncationNote = "";
  
  if (logs.length > MAX_CHARS) {
    processedLogs = logs.substring(0, MAX_CHARS);
    truncationNote = "\n\n[NOTE: Logs were truncated for analysis due to size constraints. Showing first 500k characters.]";
  }

  const systemInstruction = `You are SecLogAI, a professional SOC analyst. 
Analyze the provided logs for security threats.
Follow these rules:
1. Identify Brute-force attacks (>5 failed logins from same IP/user).
2. Identify Privilege Escalation (Event ID 4672/4673).
3. Identify Suspicious PowerShell commands (e.g., -EncodedCommand, IEX, DownloadString, Bypass).
4. Identify DNS Tunneling indicators (unusually long subdomains, high volume of TXT/NULL records).
5. Identify Unusual Process Executions (e.g., cmd.exe spawned by web server, unexpected system binaries in temp folders).
6. Identify Anomalous IPs and Malware indicators.
7. Map threats to MITRE ATT&CK TTPs.
8. Provide a risk score (0-100).
9. Provide actionable recommendations.
10. Use emojis (🚨 Critical, ⚠️ High, 🟠 Medium, ℹ️ Low) and Markdown tables for visualization.
11. Be concise and professional.`;

  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: `Analyze these logs:\n${processedLogs}${truncationNote}` }] }],
    config: {
      systemInstruction,
    },
  });

  return response.text || "No analysis generated.";
};

/**
 * Generates a set of mock security logs for demonstration purposes.
 * Includes simulated brute-force attacks and normal traffic.
 * 
 * @param count - Number of log entries to generate
 * @returns Array of LogEntry objects
 */
export const generateDemoLogs = (count: number = 100): LogEntry[] => {
  const ips = ['192.168.1.10', '10.0.0.5', '203.0.113.5', '45.33.22.11', '172.16.0.44'];
  const users = ['admin', 'root', 'jdoe', 'guest', 'service_account'];
  const actions = ['LOGIN_SUCCESS', 'LOGIN_FAILED', 'FILE_ACCESS', 'SUDO_EXEC', 'PROCESS_START'];
  
  const logs: LogEntry[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const timestamp = new Date(now.getTime() - Math.random() * 3600000).toISOString();
    const isAttack = Math.random() < 0.05;
    
    if (isAttack) {
      // Brute force simulation
      const attackerIp = ips[2];
      const targetUser = users[0];
      for(let j=0; j<8; j++) {
        logs.push({
          timestamp: new Date(new Date(timestamp).getTime() + j * 1000).toISOString(),
          ip: attackerIp,
          user: targetUser,
          action: 'LOGIN_FAILED',
          event_id: 4625,
          severity: 'High'
        });
      }
      i += 7;
    } else {
      logs.push({
        timestamp,
        ip: ips[Math.floor(Math.random() * ips.length)],
        user: users[Math.floor(Math.random() * users.length)],
        action: actions[Math.floor(Math.random() * actions.length)],
        event_id: Math.random() > 0.5 ? 4624 : 4625,
        status_code: Math.random() > 0.8 ? 403 : 200,
        severity: 'Info'
      });
    }
  }
  return logs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
};
