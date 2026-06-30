import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { BookOpen, Check, Clipboard, Copy, History, KeyRound, Search, Send, Sparkles, Star, Wand2 } from "lucide-react";
import { templates } from "./templates.js";
import "./style.css";

const defaultSettings = { baseUrl: "", apiKey: "", model: "" };
const colors = ["#49cdb5", "#f0649a", "#5cc9df", "#d7a443", "#8a73db", "#5ac885", "#6aa5de", "#4fb6d8"];

function buildPrompt(template, values, need) {
  const inputs = template.variables.map((item) => "- " + item.label + ": " + (values[item.key] || "请填写")).join("\n");
  return template.prompt + "\n\n# 用户输入\n" + inputs + "\n\n# 补充要求\n" + (need || "无") + "\n\n# 输出要求\n直接输出用户可用的最终内容，优先使用用户输入的语言。";
}

function buildCompileRequest(template, values, need) {
  return ["你是一名提示词整理师。请根据所选模板和用户输入，整理出一条高质量、可执行的底层提示词。", "只输出最终提示词，不要解释过程。", "", buildPrompt(template, values, need)].join("\n");
}

function buildContentRequest(compiledPrompt) {
  return ["请严格执行下面的提示词，并只输出用户可直接使用的最终内容。", "不要输出提示词本身，也不要解释生成过程。", "", compiledPrompt].join("\n");
}

async function callModel(settings, prompt) {
  const endpoint = settings.baseUrl.replace(/\/$/, "") + "/chat/completions";
  const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + settings.apiKey }, body: JSON.stringify({ model: settings.model, messages: [{ role: "user", content: prompt }], temperature: 0.7 }) });
  const text = await res.text();
  if (!res.ok) throw new Error("模型接口返回 " + res.status + ": " + text.slice(0, 240));
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
  const [activeIndustry, setActiveIndustry] = useState("全部");
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

  const industries = useMemo(() => ["全部", ...Array.from(new Set(templates.map((t) => t.industry)))], []);
  const counts = useMemo(() => templates.reduce((map, item) => ({ ...map, [item.industry]: (map[item.industry] || 0) + 1 }), {}), []);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return templates.filter((t) => {
      const industryMatch = activeIndustry === "全部" || t.industry === activeIndustry;
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
      if (!settings.baseUrl || !settings.apiKey || !settings.model) throw new Error("请先配置 Base URL、API Key 和模型名。");
      const first = await callModel(settings, buildCompileRequest(selected, values, need));
      setCompiledPrompt(first);
      const final = await callModel(settings, buildContentRequest(first));
      setOutput(cleanMarkdown(final));
    } catch (err) { setError(err.message || String(err)); } finally { setRunning(false); }
  };

  const reversePrompt = async () => {
    setRunning(true); setError(""); setOutput("");
    try {
      if (!settings.baseUrl || !settings.apiKey || !settings.model) throw new Error("请先配置 Base URL、API Key 和模型名。");
      const prompt = "请根据下面的成品内容反推出一条可复用提示词，并输出：可复用提示词、变量字段、风格分析、优化建议。\n\n内容：\n" + need;
      const result = await callModel(settings, prompt);
      setOutput(cleanMarkdown(result));
    } catch (err) { setError(err.message || String(err)); } finally { setRunning(false); }
  };

  return <main className="app-shell">
    <aside className="sidebar glass-panel">
      <div className="brand"><div className="brand-mark"><Sparkles size={22}/></div><div><h1>PromptForge</h1><p>开源工作流演示</p></div></div>
      <nav className="industry-nav">{industries.map((industry, index) => <button key={industry} className={activeIndustry === industry ? "nav-item active" : "nav-item"} onClick={() => setActiveIndustry(industry)}><i className="color-dot" style={{ background: colors[index % colors.length] }} /> <span>{industry}</span><strong>{industry === "全部" ? templates.length : counts[industry]}</strong></button>)}</nav>
      <div className="side-card"><BookOpen size={18}/><div><strong>120 条免费模板</strong><span>中文优先，跨语言可用</span></div></div>
    </aside>

    <section className="workspace">
      <header className="topbar glass-panel">
        <div><p className="section-label">AI 工作流模板引擎</p><h2>直接生成最终内容，不只是提示词。</h2></div>
        <div className="toolbar"><label className="search-box"><Search size={16}/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="搜索模板" /></label><button className="model-entry-button"><KeyRound size={17}/><span>{settings.model ? settings.model : "模型接口"}</span></button></div>
      </header>

      <section className="model-settings glass-panel">
        <label><span>接口地址</span><input placeholder="https://api.openai.com/v1" value={settings.baseUrl} onChange={(e)=>updateSetting("baseUrl", e.target.value)} /></label>
        <label><span>API Key</span><input placeholder="仅保存在本地" type="password" value={settings.apiKey} onChange={(e)=>updateSetting("apiKey", e.target.value)} /></label>
        <label><span>模型名称</span><input placeholder="例如 gpt-4.1-mini / deepseek-chat" value={settings.model} onChange={(e)=>updateSetting("model", e.target.value)} /></label>
      </section>

      <div className="content-grid">
        <section className="template-list glass-panel"><div className="panel-title template-list-title"><span><BookOpen size={18}/>{filtered.length} 个模板</span><small>滚动查看全部</small></div><div className="template-cards">{filtered.map((t) => <button key={t.id} onClick={()=>{setSelectedId(t.id); setValues({});}} className={selected.id === t.id ? "template-card selected" : "template-card"}><div className="card-head"><span>{t.industry}</span></div><strong>{t.name}</strong><p>{t.scenario} · {t.platform}</p></button>)}</div></section>
        <section className="composer glass-panel"><div className="selected-head"><div><p className="section-label">模板配置</p><h3>{selected.name}</h3></div><button className="favorite"><Star size={18}/></button></div><div className="meta-row"><span>{selected.scenario}</span><span>{selected.platform}</span><span>{selected.version}</span></div><div className="form-grid">{selected.variables.map((v)=><label key={v.key} className="field"><span>{v.label}</span>{v.type === "textarea" ? <textarea value={values[v.key] || ""} onChange={(e)=>setValues({...values,[v.key]:e.target.value})} rows={3}/> : <input value={values[v.key] || ""} onChange={(e)=>setValues({...values,[v.key]:e.target.value})}/>}</label>)}</div><div className="composer-actions"><button className="composer-generate" onClick={generate} disabled={running}>{running ? "生成中" : "生成内容"}</button><button className="prompt-copy-link" onClick={()=>setShowPrompt(!showPrompt)}><Copy size={15}/><span>{showPrompt ? "隐藏底层提示词" : "底层提示词"}</span></button><button className="prompt-copy-link" onClick={reversePrompt} disabled={running}><Wand2 size={15}/><span>反推提示词</span></button></div></section>
        <section className="preview glass-panel"><div className="preview-head"><div className="panel-title"><Clipboard size={18}/><span>生成结果</span></div><div className="preview-actions"><button className="primary-action" onClick={copyOutput} disabled={!output && !compiledPrompt}>{copied ? <Check size={17}/> : <Copy size={17}/>}<span>{copied ? "已复制" : "复制"}</span></button><button className="secondary-action"><History size={17}/><span>历史</span></button></div></div><div className="model-result">{running ? <div className="generation-loading"><strong>正在生成最终内容</strong><div className="generation-progress"><span /></div><p>正在先整理底层提示词，再生成最终内容。</p></div> : error ? <p className="error-text">{error}</p> : output ? <div className="formatted-output">{renderOutput(output)}</div> : <div className="result-empty"><Clipboard size={22}/><strong>最终内容会显示在这里</strong><span>填写模板参数后，生成可直接使用的成品内容。</span></div>}{showPrompt && compiledPrompt ? <pre className="prompt-block">{compiledPrompt}</pre> : null}</div><label className="need-box"><textarea value={need} onChange={(e)=>setNeed(e.target.value)} placeholder="补充要求，或粘贴内容用于反推提示词" rows={3}/><button className="send-action" onClick={generate} disabled={running}><Send size={18}/><span>发送</span></button></label></section>
      </div>
    </section>
  </main>;
}

createRoot(document.getElementById("root")).render(<App />);
