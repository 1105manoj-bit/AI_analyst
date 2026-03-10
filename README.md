# AnalystAI — Natural Language Business Intelligence

> Upload any CSV. Ask questions in plain English. Get instant interactive dashboards.

---

## Setup (5 minutes)

### 1. Install dependencies
```bash
npm install
```

### 2. Add your Groq API Key
Open `src/App.js` and replace line 10:
```js
const GEMINI_API_KEY = "YOUR_GROQ_API_KEY_HERE";
```
Get your free key at: https://console.groq.com

### 3. Run the app
```bash
npm start
```

---

## Features
- CSV file upload with drag & drop
- Auto-generated smart questions from your data columns
- Natural language → correct chart type auto-selected
- 2 simultaneous charts for comparison questions
- Confidence badge + reasoning on every chart
- Honest fallback when AI can't answer instead of hallucinating

---

## Demo Queries
1. `Show me sales by region as a bar chart`
2. `Compare sales and profit by category`
3. `Show sales by segment as a pie chart`
4. `Show yearly sales trend as a line chart`
5. `Predict next quarter revenue` ← triggers honest fallback

---

## Tech Stack
- React 18
- Recharts (bar, line, pie, area charts)
- Groq API — LLaMA 3.3 70B
- Native FileReader API (no dependencies for CSV parsing)

---

## Architecture
```
User uploads CSV
      ↓
Parse CSV → extract columns + rows
      ↓
Send to LLM → get 3 suggested questions
      ↓
User types natural language question
      ↓
Send: columns + sample data + question → LLM
      ↓
LLM returns JSON chart config
      ↓
      ├── Valid JSON → Render charts in Recharts
      ├── cannotAnswer → Show honest fallback
      └── Invalid JSON → Show error message
```

