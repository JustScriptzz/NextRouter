'use client';

import { useEffect, useMemo, useState } from 'react';

type Model = { id: string; name?: string };
type Tab = 'Chat' | 'Models';

const shortName = (id: string) => {
  let raw = id.split('/').pop() || id;
  raw = raw.replace(/\.(gguf|safetensors?)$/i, '').replace(/[-_]/g, ' ').replace(/\b(instruct|chat|it|gguf|safetensors|awq|gptq|fp16|q[0-9]+_?[a-z0-9]*)\b.*$/i, '').trim();
  const words = raw.split(/\s+/).filter(Boolean);
  return (words.slice(0, 4).join(' ') || id).slice(0, 30);
};

export default function Home() {
  const [tab, setTab] = useState<Tab>('Chat');
  const [models, setModels] = useState<Model[]>([]);
  const [model, setModel] = useState('');
  const [prompt, setPrompt] = useState('');
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const load = async () => { try { const r = await fetch('/api/models', { cache: 'no-store' }); const d = await r.json(); const next = d.models || []; setModels(next); setModel((current) => current || next[0]?.id || ''); } catch {} };
    load(); const t = setInterval(load, 60000); return () => clearInterval(t);
  }, []);

  const selected = useMemo(() => models.find((m) => m.id === model), [models, model]);

  async function send() {
    if (!prompt.trim() || !model || loading) return;
    setLoading(true); setReply('');
    try { const r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }] }) }); const d = await r.json(); setReply(d.content || d.error || 'No response.'); }
    catch { setReply('Something went wrong.'); }
    finally { setLoading(false); }
  }

  return <div className="app-shell">
    <aside className={mobileOpen ? 'sidebar open' : 'sidebar'}>
      <div><div className="brand-row"><div className="brand-mark">N</div><span>NextRouter</span></div><nav className="side-nav">{(['Chat','Models'] as Tab[]).map((item)=><button key={item} className={tab===item?'nav-item active':'nav-item'} onClick={()=>{setTab(item);setMobileOpen(false)}}><span>{item==='Chat'?'◈':'◇'}</span>{item}</button>)}</nav></div>
      <div className="side-note">A focused workspace for exploring and using AI models.</div>
    </aside>
    <div className="main-wrap">
      <header className="topbar"><button className="mobile-menu" aria-label="Open menu" onClick={()=>setMobileOpen(v=>!v)}>☰</button><div className="crumb"><span>Workspace</span><span className="crumb-dot">/</span><strong>{tab}</strong></div><div className="system-state"><i/> Systems operational</div></header>
      <main className="main-content">{tab==='Chat' ? <section className="chat-page">
        <div className="hero-copy"><div className="eyebrow">AI WORKSPACE</div><h1>Think faster.<br/><span>Build anything.</span></h1><p>One clean place to explore models and turn ideas into answers.</p></div>
        <div className="chat-panel"><div className="panel-head"><div><div className="panel-label">Conversation</div><div className="panel-title">New chat</div></div><div className="model-control"><span>Model</span><select value={model} onChange={e=>setModel(e.target.value)}>{models.length?models.slice(0,80).map(m=><option key={m.id} value={m.id}>{shortName(m.id)}</option>):<option>Loading models...</option>}</select></div></div>
          <div className="chat-space">{reply?<div className="response-card"><div className="response-kicker">RESPONSE</div><p>{reply}</p></div>:<div className="empty-state"><div className="empty-icon">✦</div><h2>Start a conversation</h2><p>Pick a model, write a message, and let NextRouter handle the rest.</p></div>}</div>
          <div className="composer-wrap"><textarea value={prompt} onChange={e=>setPrompt(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}} placeholder="Message NextRouter..." rows={1}/><div className="composer-actions"><span>{selected?shortName(selected.id):'Choose a model'}</span><button className="send-btn" onClick={send} disabled={loading||!prompt.trim()||!model}>{loading?'...':'Send ↗'}</button></div></div>
        </div>
      </section> : <section className="models-page"><div className="section-head"><div><div className="eyebrow">LIVE CATALOG</div><h1>Models.</h1><p>Fresh model availability, updated automatically.</p></div><div className="live-pill"><i/> Live</div></div><div className="model-grid">{models.map(m=><button key={m.id} className="model-card" onClick={()=>{setModel(m.id);setTab('Chat')}}><div className="model-top"><span className="model-orb">N</span><span className="ready">Ready</span></div><div className="model-name" title={m.id}>{shortName(m.id)}</div><div className="model-id" title={m.id}>{m.id}</div><div className="use-model">Use model <span>↗</span></div></button>)}</div></section>}</main>
      <nav className="mobile-tabs">{(['Chat','Models'] as Tab[]).map(item=><button key={item} className={tab===item?'mobile-tab active':'mobile-tab'} onClick={()=>setTab(item)}><span>{item==='Chat'?'◈':'◇'}</span>{item}</button>)}</nav>
    </div>
  </div>;
}
