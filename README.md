# SecLogAI: AI-Powered Security Operations Center (SOC) Monitor

![SecLogAI Dashboard](https://picsum.photos/seed/seclogai/1200/600?blur=2)

SecLogAI is a professional-grade Security Operations Center (SOC) monitoring tool that leverages Gemini AI to provide real-time log analysis, threat detection, and incident response recommendations. It transforms raw security logs into actionable intelligence with a mission-control aesthetic.

## 🚀 Features

- **AI-Powered Threat Detection**: Real-time analysis of Windows/Linux logs, Syslogs, and web server logs using Gemini 3 Flash.
- **Advanced Rule Engine**: Detects brute-force attacks, privilege escalations, suspicious PowerShell commands, DNS tunneling, and unusual process executions.
- **Interactive SOC Analyst Chat**: A dedicated interface to query specific threats, analyze uploaded logs, or get remediation playbooks.
- **Dynamic Dashboards**: Visualizes event timelines, threat distributions, and critical metrics using Recharts.
- **Log Explorer**: High-performance log viewer with real-time IP filtering and severity highlighting.
- **Incident Reporting**: Export AI-generated analysis reports to structured JSON for documentation and sharing.
- **Single Event Analysis**: Quick-analyze individual log entries via a dedicated modal interface.

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS 4.0, Lucide Icons
- **Animations**: Motion (formerly Framer Motion)
- **AI**: Google Gemini API (@google/genai)
- **Charts**: Recharts
- **Date Handling**: date-fns

## 📦 Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/seclogai.git
   cd seclogai
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory and add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

## 🛡️ Security Detection Capabilities

SecLogAI is configured to identify threats mapped to MITRE ATT&CK® TTPs:

- **Credential Access**: Brute-force detection (>5 failed logins).
- **Privilege Escalation**: Monitoring Event IDs 4672/4673.
- **Execution**: Detecting suspicious PowerShell flags (`-EncodedCommand`, `IEX`, etc.).
- **Exfiltration**: Identifying DNS Tunneling through anomalous query patterns.
- **Persistence**: Monitoring unusual process spawning from system temp folders.

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

SecLogAI is an AI-assisted tool. While it provides high-accuracy detections, it should be used as a supplementary tool alongside traditional SIEM/EDR solutions. Always verify AI-generated recommendations before taking destructive actions in production environments.
