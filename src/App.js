import { useState, useRef, useCallback } from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import "./App.css";
const GEMINI_API_KEY = "YOUR_GROQ_API_KEY_HERE";// <-- REPLACE THIS

const COLORS = ["#00FFB2", "#FF6B6B", "#4ECDC4", "#FFE66D", "#A29BFE", "#FD79A8", "#74B9FF", "#55EFC4"];

async function askGemini(prompt) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GEMINI_API_KEY}`
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }]
    })
  });
  const data = await res.json();
  console.log("GROQ RESPONSE:", JSON.stringify(data));
  return data.choices?.[0]?.message?.content || "";
}

function parseJSON(text) {
  try {
    // Strip markdown fences
    let clean = text.replace(/```json|```/g, "").trim();
    // Extract first JSON array or object
    const arrMatch = clean.match(/\[[\s\S]*\]/);
    const objMatch = clean.match(/\{[\s\S]*\}/);
    if (arrMatch) return JSON.parse(arrMatch[0]);
    if (objMatch) return JSON.parse(objMatch[0]);
    return null;
  } catch {
    return null;
  }
}

function ConfidenceBadge({ confidence, reasoning }) {
  const pct = Math.round(confidence * 100);
  const color = pct >= 80 ? "#00FFB2" : pct >= 60 ? "#FFE66D" : "#FF6B6B";
  return (
    <div className="confidence-badge" style={{ borderColor: color }}>
      <span className="conf-pct" style={{ color }}>{pct}% confident</span>
      <span className="conf-reason">{reasoning}</span>
    </div>
  );
}
function ChartRenderer({ chartData }) {
  const { chartType, data, xKey, yKeys, title, confidence, reasoning } = chartData;

  const renderChart = () => {
    if (chartType === "pie") {
      const pieData = data.map(d => ({
        name: String(d[xKey] || "Unknown"),
        value: Math.abs(parseFloat(d[yKeys[0]]) || 0)
      })).filter(d => d.value > 0);
      return (
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={true}>
              {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ background: "#0d0d1a", border: "1px solid #00FFB2", borderRadius: 8, fontFamily: "DM Mono" }} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      );
    }
    if (chartType === "line") return (
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
          <XAxis dataKey={xKey} tick={{ fill: "#888", fontFamily: "DM Mono" }} />
          <YAxis tick={{ fill: "#888", fontFamily: "DM Mono" }} />
          <Tooltip contentStyle={{ background: "#0d0d1a", border: "1px solid #00FFB2", borderRadius: 8, fontFamily: "DM Mono" }} />
          <Legend />
          {yKeys.map((k, i) => <Line key={k} type="monotone" dataKey={k} stroke={COLORS[i]} strokeWidth={2} dot={{ fill: COLORS[i], r: 4 }} />)}
        </LineChart>
      </ResponsiveContainer>
    );
    if (chartType === "area") return (
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
          <XAxis dataKey={xKey} tick={{ fill: "#888", fontFamily: "DM Mono" }} />
          <YAxis tick={{ fill: "#888", fontFamily: "DM Mono" }} />
          <Tooltip contentStyle={{ background: "#0d0d1a", border: "1px solid #00FFB2", borderRadius: 8, fontFamily: "DM Mono" }} />
          <Legend />
          {yKeys.map((k, i) => <Area key={k} type="monotone" dataKey={k} stroke={COLORS[i]} fill={COLORS[i] + "33"} strokeWidth={2} />)}
        </AreaChart>
      </ResponsiveContainer>
    );
    return (
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
          <XAxis dataKey={xKey} tick={{ fill: "#888", fontFamily: "DM Mono" }} />
          <YAxis tick={{ fill: "#888", fontFamily: "DM Mono" }} />
          <Tooltip contentStyle={{ background: "#0d0d1a", border: "1px solid #00FFB2", borderRadius: 8, fontFamily: "DM Mono" }} />
          <Legend />
          {yKeys.map((k, i) => <Bar key={k} dataKey={k} fill={COLORS[i]} radius={[4, 4, 0, 0]} />)}
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="chart-card">
      <h3 className="chart-title">{title}</h3>
      <ConfidenceBadge confidence={confidence} reasoning={reasoning} />
      {renderChart()}
    </div>
  );
}

function ColumnPreview({ columns, rowCount }) {
  return (
    <div className="column-preview">
      <div className="preview-header">
        <span className="preview-label">DATASET LOADED</span>
        <span className="preview-meta">{rowCount} rows · {columns.length} columns</span>
      </div>
      <div className="columns-list">
        {columns.map(col => (
          <span key={col} className="col-chip">{col}</span>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [csvData, setCsvData] = useState(null);
  const [columns, setColumns] = useState([]);
  const [fileName, setFileName] = useState("");
  const [query, setQuery] = useState("");
  const [charts, setCharts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [fallback, setFallback] = useState("");
  const fileRef = useRef();
const parseCSV = (text) => {
  // Remove BOM if present
  const cleaned = text.replace(/^\uFEFF/, "");
  const lines = cleaned.split(/\r?\n/).filter(l => l.trim());
  // Auto-detect delimiter
  const delim = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(delim).map(h => h.replace(/"/g, "").trim());
  const rows = lines.slice(1).map(line => {
    const vals = line.split(delim).map(v => v.replace(/"/g, "").trim());
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ""; });
    return obj;
  });
  return { headers, rows: rows.filter(r => Object.values(r).some(v => v)) };
};
const processFile = useCallback((file) => {
  if (!file || !file.name.endsWith(".csv")) {
    setError("Only CSV files please.");
    return;
  }
  setFileName(file.name);
  setError("");
  const reader = new FileReader();
  reader.onload = async (e) => {
    const { headers, rows } = parseCSV(e.target.result);
    setCsvData(rows);
    setColumns(headers);
    setCharts([]);
    setSuggestions([]);
    setFallback("");
    const prompt = `Given CSV columns: ${headers.join(", ")}, return ONLY a JSON array of exactly 3 questions, each under 8 words. Simple questions only. Example: ["Show sales by region", "Compare profit by category", "Sales by segment pie chart"]. No markdown.`;
  try {
      const raw = await askGemini(prompt);
      const parsed = parseJSON(raw);
      if (Array.isArray(parsed)) setSuggestions(parsed);
    } catch {}
  };
  reader.readAsText(file);
}, []);
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    processFile(e.dataTransfer.files[0]);
  }, [processFile]);

const handleQuery = async () => {
  if (!csvData || !query.trim()) return;

  setLoading(true);
  setCharts([]);
  setFallback("");
  setError("");

  const sample = csvData.slice(0, 15);
const yearAgg = {};
csvData.forEach(row => {
  const year = row["Order Date"] ? row["Order Date"].split("-")[2] || row["Order Date"].split("/")[2] : "Unknown";
  if (!yearAgg[year]) yearAgg[year] = { year, Sales: 0, Profit: 0 };
  yearAgg[year].Sales += parseFloat(row["Sales"]) || 0;
  yearAgg[year].Profit += parseFloat(row["Profit"]) || 0;
});
const yearSummary = Object.values(yearAgg).sort((a,b) => a.year - b.year);
  const prompt = `You are a Senior BI Analyst. 
  
CSV COLUMNS: ${columns.join(", ")}
SAMPLE DATA: ${JSON.stringify(sample)}

USER QUESTION: "${query}"

### MANDATORY PLOTTING RULES:
1. THE GROUPED VIEW (MULTI-DIMENSIONAL): 
   - If the user compares two categories (e.g., "Segment" AND "Region"), you MUST create ONE chart, not two.
   - xKey = Primary Category (e.g., "Region").
   - yKeys = ALL unique values of the second category as individual keys (e.g., ["Consumer", "Corporate", "Home Office"]).
   - Data must be pivoted: [{"Region": "South", "Consumer": 25, "Corporate": 20, "Home Office": 15}, ...]
   
2. SINGLE DIMENSION: Only use one yKey if they ask for one metric by one category.

3. DATA VALUES: 
   - Return REAL estimated totals/averages based on the ${csvData.length} rows. 
   - NEVER return tiny decimals like 0.014 unless the question is specifically about "rate of 1". 
   - For profit/sales, use whole numbers.

4. CHART TYPE SELECTION:
   - "bar" for category comparisons (Grouped Bar is preferred).
   - "line" for dates/trends.
   - "pie" ONLY for single-metric distributions.

### OUTPUT SCHEMA:
Return ONLY a JSON array of objects. 
[{"chartType": "bar", "title": "...", "xKey": "...", "yKeys": ["Key1", "Key2"], "data": [{"xKey": "Value", "Key1": 100, "Key2": 150}], "confidence": 0.9, "reasoning": "..."}]

NO MARKDOWN. NO CONTEXT. NO EXPLAINING WHY YOU PIVOTED.`;

  try {
    const raw = await askGemini(prompt);
    const parsed = parseJSON(raw);

    if (!parsed) {
      setError("Failed to parse AI response. Please try a simpler question.");
    } else if (parsed.cannotAnswer || (parsed[0] && parsed[0].cannotAnswer)) {
      setFallback(parsed.reason || parsed[0].reason || "I can't calculate that with the current data.");
    } else if (Array.isArray(parsed)) {
      setCharts(parsed);
    }
  } catch (e) {
    setError("Analysis Error: " + e.message);
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="app">
      <div className="bg-grid" />
      <header className="header">
        <div className="logo">
          <span className="logo-icon">◈</span>
          <span className="logo-text">AnalystAI</span>
        </div>
        <span className="logo-tagline">Natural Language → Business Intelligence</span>
      </header>

      <main className="main">
        {/* Upload Zone */}
        {!csvData ? (
          <div
            className={`upload-zone ${dragOver ? "drag-over" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current.click()}
          >
            <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={e => processFile(e.target.files[0])} />
            <div className="upload-icon">⬆</div>
            <p className="upload-title">Drop your CSV here</p>
            <p className="upload-sub">or click to browse · CSV files only</p>
          </div>
        ) : (
          <div className="workspace">
            {/* File Info + Reset */}
            <div className="file-bar">
              <div className="file-info">
                <span className="file-dot" />
                <span className="file-name">{fileName}</span>
              </div>
              <button className="reset-btn" onClick={() => { setCsvData(null); setColumns([]); setCharts([]); setSuggestions([]); setFileName(""); setFallback(""); }}>
                ✕ Change file
              </button>
            </div>

            <ColumnPreview columns={columns} rowCount={csvData.length} />

            {/* Suggested Questions */}
            {suggestions.length > 0 && (
              <div className="suggestions">
                <p className="suggestions-label">SUGGESTED QUESTIONS</p>
                <div className="suggestions-list">
                  {suggestions.map((s, i) => (
                    <button key={i} className="suggestion-chip" onClick={() => setQuery(s)}>{s}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Query Input */}
            <div className="query-box">
              <textarea
                className="query-input"
                placeholder="Ask anything about your data... e.g. 'Show me monthly revenue trends' or 'Compare sales by region'"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleQuery(); } }}
                rows={2}
              />
              <button className="query-btn" onClick={handleQuery} disabled={loading}>
                {loading ? <span className="loading-dots"><span />.<span />.<span />.</span> : "Analyze →"}
              </button>
            </div>

            {error && <div className="error-box">⚠ {error}</div>}

            {/* Fallback honest answer */}
            {fallback && (
              <div className="fallback-box">
                <span className="fallback-icon">🤖</span>
                <div>
                  <p className="fallback-title">I can't answer this with your data</p>
                  <p className="fallback-reason">{fallback}</p>
                </div>
              </div>
            )}

            {/* Loading state */}
            {loading && (
              <div className="loading-state">
                <div className="loading-bar"><div className="loading-fill" /></div>
                <p>Analyzing your data with Gemini AI...</p>
              </div>
            )}

            {/* Charts */}
            {charts.length > 0 && (
              <div className={`charts-grid charts-${charts.length}`}>
                {charts.map((c, i) => <ChartRenderer key={i} chartData={c} />)}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
