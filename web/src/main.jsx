import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { BookOpen, Check, Clipboard, Copy, History, KeyRound, Search, Send, Sparkles, Star, Wand2 } from "lucide-react";
import { templates } from "./templates.js";
import "./style.css";

const defaultSettings = { baseUrl: "", apiKey: "", model: "" };
const colors = ["#49cdb5", "#f0649a", "#5cc9df", "#d7a443", "#8a73db", "#5ac885", "#6aa5de", "#4fb6d8"];

function buildPrompt(template, values, need) {
  const inputs = template.variables.map((item) => "- " + item.label + ": " + (values[item.key] || "Not provided")).join("\n");
  return template.prompt + "\n\n# User Inputs\n" + inputs + "\n\n# Extra Requirement\n" + (need || "None") + "\n\n# Output Rule\nReturn ready-to-use final content. Use the user's language when possible.";
}

function buildCompileRequest(template, values, need) {
  return ["You are a prompt architect. Build one high-quality executable prompt from the selected workflow template and user inputs.", "Only output the final prompt. Do not explain.", "", buildPrompt(template, values, need)].join("\n");
}

function buildContentRequest(compiledPrompt) {
  return ["Execute the following prompt and output only the final usable content.", "Do not output the prompt itself. Do not explain your process.", "", compiledPrompt].join("\n");
}

async function callModel(settings, prompt) {
  const endpoint = settings.baseUrl.replace(/\/$/, "") + "/chat/completions";
  const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + settings.apiKey }, body: JSON.stringify({ model: settings.model, messages: [{ role: "user", content: prompt }], temperature: 0.7 }) });
  const text = await res.text();
  if (!res.ok) throw new Error("Model API returned " + res.status + ": " + text.slice(0, 240));
  const data = JSON.parse(text);
  return data.choices?.[0]?.message?.content || "";
}

function cleanMarkdown(text) {
  return text.replace(/\*\*(.*?)\*\*/g, "$1").replace(/__(.*?)__/g, "$1");
}

function renderOutput(text) {
  return cleanMarkdown(text).split(/\n+/).map((line, index) => {
    const value = line.trim();
    if (!value) return null;
    if (/^[-*]\s+/.test(value) || /^\d+[.?]\s*/.test(value)) return <p key={index} className="result-list-item">{value.replace(/^[-*]\s+/, "")}</p>;
    return <p key={index}>{value}</p>;
  });
}

function App() {
  const [query, setQuery] = useState("");
  const [activeIndustry, setActiveIndustry] = useState("All");
  const [selectedId, setSelectedId] = useState(templates[0].id);
  const [values, setValues] = useState({});
  const [need, setNeed] = useState("");
  const [settings, setSettings] = useState(() => JSON.parse(localStorage.getItem("promptforge:settings") || JSON.stringify(defaultSettings)));
  const [output, setOutput] = useState("");
  const [compiledPrompt, setCompiledPrompt] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [showPrompt, setShowPrompt] = useState(false);
  const [copied, setCopied] = useState(false);

  const industries = useMemo(() => ["All", ...Array.from(new Set(templates.map((t) => t.industry)))], []);
  const counts = useMemo(() => templates.reduce((map, item) => ({ ...map, [item.industry]: (map[item.industry] || 0) + 1 }), {}), []);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return templates.filter((t) => {
      const industryMatch = activeIndustry === "All" || t.industry === activeIndustry;
      const queryMatch = !q || [t.name, t.industry, t.scenario, t.platform, ...(t.tags || [])].join(" ").toLowerCase().includes(q);
      return industryMatch && queryMatch;
    });
  }, [query, activeIndustry]);
  const selected = templates.find((t) => t.id === selectedId) || filtered[0] || templates[0];

  const updateSetting = (key, value) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    localStorage.setItem("promptforge:settings", JSON.stringify(next));
  };

  const copyOutput = async () => {
    await navigator.clipboard.writeText(output || compiledPrompt || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const generate = async () => {
    setRunning(true); setError(""); setOutput(""); setCompiledPrompt("");
    try {
      if (!settings.baseUrl || !settings.apiKey || !settings.model) throw new Error("Please configure Base URL, API Key and model first.");
      const first = await callModel(settings, buildCompileRequest(selected, values, need));
      setCompiledPrompt(first);
      const final = await callModel(settings, buildContentRequest(first));
      setOutput(cleanMarkdown(final));
    } catch (err) { setError(err.message || String(err)); } finally { setRunning(false); }
  };

  const reversePrompt = async () => {
    setRunning(true); setError(""); setOutput("");
    try {
      if (!settings.baseUrl || !settings.apiKey || !settings.model) throw new Error("Please configure Base URL, API Key and model first.");
      const prompt = "Reverse-engineer a reusable prompt from this content. Output: reusable prompt, variables, style notes, and optimization suggestions.\n\nContent:\n" + need;
      const result = await callModel(settings, prompt);
      setOutput(cleanMarkdown(result));
    } catch (err) { setError(err.message || String(err)); } finally { setRunning(false); }
  };

  return <main className="app-shell">
    <aside className="sidebar glass-panel">
      <div className="brand"><div className="brand-mark"><Sparkles size={22}/></div><div><h1>PromptForge</h1><p>Open workflow demo</p></div></div>
      <nav className="industry-nav">{industries.map((industry, index) => <button key={industry} className={activeIndustry === industry ? "nav-item active" : "nav-item"} onClick={() => setActiveIndustry(industry)}><i className="color-dot" style={{ background: colors[index % colors.length] }} /> <span>{industry}</span><strong>{industry === "All" ? templates.length : counts[industry]}</strong></button>)}</nav>
      <div className="side-card"><BookOpen size={18}/><div><strong>120 free templates</strong><span>Chinese-first, globally usable</span></div></div>
    </aside>

    <section className="workspace">
      <header className="topbar glass-panel">
        <div><p className="section-label">AI workflow template engine</p><h2>Generate final content, not just prompts.</h2></div>
        <div className="toolbar"><label className="search-box"><Search size={16}/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search templates" /></label><button className="model-entry-button"><KeyRound size={17}/><span>{settings.model ? settings.model : "Model API"}</span></button></div>
      </header>

      <section className="model-settings glass-panel">
        <label><span>Base URL</span><input placeholder="https://api.openai.com/v1" value={settings.baseUrl} onChange={(e)=>updateSetting("baseUrl", e.target.value)} /></label>
        <label><span>API Key</span><input placeholder="Stored locally" type="password" value={settings.apiKey} onChange={(e)=>updateSetting("apiKey", e.target.value)} /></label>
        <label><span>Model</span><input placeholder="gpt-4.1-mini / deepseek-chat" value={settings.model} onChange={(e)=>updateSetting("model", e.target.value)} /></label>
      </section>

      <div className="content-grid">
        <section className="template-list glass-panel"><div className="panel-title template-list-title"><span><BookOpen size={18}/>{filtered.length} templates</span><small>Scroll to browse</small></div><div className="template-cards">{filtered.map((t) => <button key={t.id} onClick={()=>{setSelectedId(t.id); setValues({});}} className={selected.id === t.id ? "template-card selected" : "template-card"}><div className="card-head"><span>{t.industry}</span></div><strong>{t.name}</strong><p>{t.scenario} ? {t.platform}</p></button>)}</div></section>
        <section className="composer glass-panel"><div className="selected-head"><div><p className="section-label">Template config</p><h3>{selected.name}</h3></div><button className="favorite"><Star size={18}/></button></div><div className="meta-row"><span>{selected.scenario}</span><span>{selected.platform}</span><span>{selected.version}</span></div><div className="form-grid">{selected.variables.map((v)=><label key={v.key} className="field"><span>{v.label}</span>{v.type === "textarea" ? <textarea value={values[v.key] || ""} onChange={(e)=>setValues({...values,[v.key]:e.target.value})} rows={3}/> : <input value={values[v.key] || ""} onChange={(e)=>setValues({...values,[v.key]:e.target.value})}/>}</label>)}</div><div className="composer-actions"><button className="composer-generate" onClick={generate} disabled={running}>{running ? "Generating" : "Generate content"}</button><button className="prompt-copy-link" onClick={()=>setShowPrompt(!showPrompt)}><Copy size={15}/><span>{showPrompt ? "Hide prompt" : "Underlying prompt"}</span></button><button className="prompt-copy-link" onClick={reversePrompt} disabled={running}><Wand2 size={15}/><span>Reverse prompt</span></button></div></section>
        <section className="preview glass-panel"><div className="preview-head"><div className="panel-title"><Clipboard size={18}/><span>Final Output</span></div><div className="preview-actions"><button className="primary-action" onClick={copyOutput} disabled={!output && !compiledPrompt}>{copied ? <Check size={17}/> : <Copy size={17}/>}<span>{copied ? "Copied" : "Copy"}</span></button><button className="secondary-action"><History size={17}/><span>History</span></button></div></div><div className="model-result">{running ? <div className="generation-loading"><strong>Generating final content</strong><div className="generation-progress"><span /></div><p>Compiling the underlying prompt, then generating the final result.</p></div> : error ? <p className="error-text">{error}</p> : output ? <div className="formatted-output">{renderOutput(output)}</div> : <div className="result-empty"><Clipboard size={22}/><strong>Final content will appear here</strong><span>Fill in the template fields and generate ready-to-use content.</span></div>}{showPrompt && compiledPrompt ? <pre className="prompt-block">{compiledPrompt}</pre> : null}</div><label className="need-box"><textarea value={need} onChange={(e)=>setNeed(e.target.value)} placeholder="Extra requirement, or paste content here for reverse prompt" rows={3}/><button className="send-action" onClick={generate} disabled={running}><Send size={18}/><span>Send</span></button></label></section>
      </div>
    </section>
  </main>;
}

createRoot(document.getElementById("root")).render(<App />);
