import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Copy, KeyRound, Search, Sparkles, Wand2 } from "lucide-react";
import { templates } from "./templates.js";
import "./style.css";

const defaultSettings = { baseUrl: "", apiKey: "", model: "" };

function buildPrompt(template, values, need) {
  const inputs = template.variables.map((item) => "- " + item.label + ": " + (values[item.key] || "Not provided")).join("\n");
  return template.prompt + "\n\n# User Inputs\n" + inputs + "\n\n# Extra Requirement\n" + (need || "None") + "\n\n# Output Rule\nReturn ready-to-use final content. Use the user's language when possible.";
}

function buildCompileRequest(template, values, need) {
  return [
    "You are a prompt architect. Build one high-quality executable prompt from the selected workflow template and user inputs.",
    "Only output the final prompt. Do not explain.",
    "",
    buildPrompt(template, values, need),
  ].join("\n");
}

function buildContentRequest(compiledPrompt) {
  return [
    "Execute the following prompt and output only the final usable content.",
    "Do not output the prompt itself. Do not explain your process.",
    "",
    compiledPrompt,
  ].join("\n");
}

async function callModel(settings, prompt) {
  const endpoint = settings.baseUrl.replace(/\/$/, "") + "/chat/completions";
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + settings.apiKey },
    body: JSON.stringify({ model: settings.model, messages: [{ role: "user", content: prompt }], temperature: 0.7 }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error("Model API returned " + res.status + ": " + text.slice(0, 240));
  const data = JSON.parse(text);
  return data.choices?.[0]?.message?.content || "";
}

function cleanMarkdown(text) {
  return text.replace(/\*\*(.*?)\*\*/g, "$1").replace(/__(.*?)__/g, "$1");
}

function App() {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(templates[0].id);
  const [values, setValues] = useState({});
  const [need, setNeed] = useState("");
  const [settings, setSettings] = useState(() => JSON.parse(localStorage.getItem("promptforge:settings") || JSON.stringify(defaultSettings)));
  const [output, setOutput] = useState("");
  const [compiledPrompt, setCompiledPrompt] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [showPrompt, setShowPrompt] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((t) => [t.name, t.industry, t.scenario, t.platform, ...(t.tags || [])].join(" ").toLowerCase().includes(q));
  }, [query]);
  const selected = templates.find((t) => t.id === selectedId) || templates[0];

  const updateSetting = (key, value) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    localStorage.setItem("promptforge:settings", JSON.stringify(next));
  };

  const generate = async () => {
    setRunning(true); setError(""); setOutput(""); setCompiledPrompt("");
    try {
      if (!settings.baseUrl || !settings.apiKey || !settings.model) throw new Error("Please configure Base URL, API Key and model first.");
      const first = await callModel(settings, buildCompileRequest(selected, values, need));
      setCompiledPrompt(first);
      const final = await callModel(settings, buildContentRequest(first));
      setOutput(cleanMarkdown(final));
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setRunning(false);
    }
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

  return <main className="shell">
    <aside className="sidebar">
      <div className="brand"><Sparkles /><div><h1>PromptForge</h1><p>AI workflow templates</p></div></div>
      <label className="search"><Search size={16}/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search templates" /></label>
      <div className="cards">{filtered.map((t) => <button key={t.id} onClick={()=>{setSelectedId(t.id); setValues({});}} className={selected.id === t.id ? "card active" : "card"}><span>{t.industry}</span><strong>{t.name}</strong><small>{t.scenario} ? {t.platform}</small></button>)}</div>
    </aside>
    <section className="workspace">
      <section className="settings panel"><h2><KeyRound size={18}/> Model API</h2><input placeholder="Base URL, e.g. https://api.openai.com/v1" value={settings.baseUrl} onChange={(e)=>updateSetting("baseUrl", e.target.value)} /><input placeholder="API Key" type="password" value={settings.apiKey} onChange={(e)=>updateSetting("apiKey", e.target.value)} /><input placeholder="Model, e.g. gpt-4.1-mini / deepseek-chat" value={settings.model} onChange={(e)=>updateSetting("model", e.target.value)} /></section>
      <section className="grid">
        <div className="panel composer"><p className="eyebrow">Template</p><h2>{selected.name}</h2><div className="meta"><span>{selected.industry}</span><span>{selected.scenario}</span><span>{selected.platform}</span></div>{selected.variables.map((v)=><label key={v.key}><span>{v.label}</span>{v.type === "textarea" ? <textarea value={values[v.key] || ""} onChange={(e)=>setValues({...values,[v.key]:e.target.value})}/> : <input value={values[v.key] || ""} onChange={(e)=>setValues({...values,[v.key]:e.target.value})}/>}</label>)}<label><span>Extra requirement / content for reverse prompt</span><textarea value={need} onChange={(e)=>setNeed(e.target.value)} placeholder="Add more requirements, or paste content here for reverse prompt." /></label><div className="actions"><button onClick={generate} disabled={running}><Wand2 size={17}/>{running ? "Generating" : "Generate final content"}</button><button className="ghost" onClick={reversePrompt} disabled={running}>Reverse prompt</button></div></div>
        <div className="panel result"><div className="result-head"><h2>Final Output</h2><button onClick={()=>navigator.clipboard.writeText(output || compiledPrompt)} disabled={!output && !compiledPrompt}><Copy size={16}/>Copy</button></div>{running ? <div className="loading"><span></span><p>Compiling prompt, then generating final content...</p></div> : error ? <pre className="error">{error}</pre> : output ? <pre>{output}</pre> : <div className="empty">Choose a template, fill in the fields, and generate ready-to-use content.</div>}<button className="link" onClick={()=>setShowPrompt(!showPrompt)} disabled={!compiledPrompt}>{showPrompt ? "Hide" : "Show"} underlying prompt</button>{showPrompt && compiledPrompt ? <pre className="prompt">{compiledPrompt}</pre> : null}</div>
      </section>
    </section>
  </main>;
}

createRoot(document.getElementById("root")).render(<App />);
