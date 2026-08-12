'use client';
import { useEffect, useMemo, useState } from 'react';
type Model={id:string;name?:string};
type Tab='Chat'|'Models';
function manufacturerName(id:string,supplied?:string){
 const raw=(supplied||id).trim();
 const s=(raw.split('/').pop()||raw)
  .replace(/\b(?:gguf|awq|gptq|fp16|fp8|safe|latest|free|preview|instruct|instructions|chat|it)\b/gi,' ')
  .replace(/[-_]+/g,' ')
  .replace(/\bqwen3\s*30b\s*a3b\b/i,'Qwen3 30B A3B')
  .replace(/\bqwen3\s*32b\b/i,'Qwen3 32B')
  .replace(/\bqwen3\s*14b\b/i,'Qwen3 14B')
  .replace(/\bqwen3\s*8b\b/i,'Qwen3 8B')
  .replace(/\bqwen3\b/i,'Qwen3')
  .replace(/\bllama\s*3\.3\s*70b\b/i,'Llama 3.3 70B')
  .replace(/\bllama\s*3\.1\s*405b\b/i,'Llama 3.1 405B')
  .replace(/\bllama\s*3\.1\s*70b\b/i,'Llama 3.1 70B')
  .replace(/\bllama\s*3\.1\s*8b\b/i,'Llama 3.1 8B')
  .replace(/\bllama\s*3\.1\b/i,'Llama 3.1')
  .replace(/\bllama\s*3\.3\b/i,'Llama 3.3')
  .replace(/\bmistral\s*small\s*3\.1\s*24b\b/i,'Mistral Small 3.1 24B')
  .replace(/\bmistral\s*small\s*3\b/i,'Mistral Small 3')
  .replace(/\bmixtral\s*8x22b\b/i,'Mixtral 8x22B')
  .replace(/\bmixtral\s*8x7b\b/i,'Mixtral 8x7B')
  .replace(/\bdeepseek\s*r1\s*distill\s*qwen\s*32b\b/i,'DeepSeek R1 Distill Qwen 32B')
  .replace(/\bdeepseek\s*r1\b/i,'DeepSeek R1')
  .replace(/\bdeepseek\s*v3\b/i,'DeepSeek V3')
  .replace(/\bdeepseek\s*v2\b/i,'DeepSeek V2')
  .replace(/\bgemma\s*3\s*27b\b/i,'Gemma 3 27B')
  .replace(/\bgemma\s*3\s*12b\b/i,'Gemma 3 12B')
  .replace(/\bgemma\s*3\s*4b\b/i,'Gemma 3 4B')
  .replace(/\bgemma\s*2\s*27b\b/i,'Gemma 2 27B')
  .replace(/\bgemma\s*2\s*9b\b/i,'Gemma 2 9B')
  .replace(/\bgemma\s*2\s*2b\b/i,'Gemma 2 2B')
  .replace(/\bgemma\b/i,'Gemma')
  .replace(/\bphi\s*4\b/i,'Phi-4')
  .replace(/\bcommand\s*r\+\b/i,'Command R+')
  .replace(/\bcommand\s*r\b/i,'Command R')
  .replace(/\bhermes\s*3\b/i,'Hermes 3')
  .replace(/\bglm\s*4\b/i,'GLM-4')
  .replace(/\bsolar\b/i,'Solar')
  .replace(/\byi\s*1\.5\b/i,'Yi 1.5');
 const rules:[RegExp,string][]=[];
 for(const [re,name] of rules) if(re.test(s)) return name;
 return s.replace(/\b(\d+)b\b/gi,'$1B').replace(/\b(\d+)m\b/gi,'$1M').replace(/\s+/g,' ').trim()||'AI Model';
}
export default function Home(){const[tab,setTab]=useState<Tab>('Chat');const[models,setModels]=useState<Model[]>([]);const[model,setModel]=useState('');const[prompt,setPrompt]=useState('');const[reply,setReply]=useState('');const[loading,setLoading]=useState(false);const[menu,setMenu]=useState(false);const load=async()=>{try{const r=await fetch('/api/models',{cache:'no-store'});const d=await r.json();const next=(d.models||[]) as Model[];setModels(next);setModel(x=>x||next[0]?.id||'')}catch{}};useEffect(()=>{load();const t=setInterval(load,60000);return()=>clearInterval(t)},[]);const selected=useMemo(()=>models.find(m=>m.id===model),[models,model]);async function send(){if(!prompt.trim()||!model||loading)return;setLoading(true);setReply('');try{const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model,messages:[{role:'user',content:prompt}]})});const d=await r.json();setReply(d.content||d.error||'No response.')}catch{setReply('Something went wrong.')}finally{setLoading(false)}}const nav=(x:Tab)=>{setTab(x);setMenu(false)};return <div className="app"><aside className={`sidebar ${menu?'open':''}`}><div className="brand"><span className="brand-mark">N</span><span>NextRouter</span></div><div className="side-section"><span className="side-label">WORKSPACE</span><button className={tab==='Chat'?'nav active':'nav'} onClick={()=>nav('Chat')}>◈ Chat</button><button className={tab==='Models'?'nav active':'nav'} onClick={()=>nav('Models')}>◫ Models</button></div><div className="side-bottom"><div className="live"><i/>Systems online</div><span>AI workspace</span></div></aside>{menu&&<div className="scrim" onClick={()=>setMenu(false)}/>}<div className="main"><header><button className="menu" onClick={()=>setMenu(!menu)}>☰</button><div className="crumb">NextRouter <span>/</span> <b>{tab}</b></div><div className="online"><i/> Online</div></header><main>{tab==='Chat'?<section className="chat-page"><div className="intro"><div className="eyebrow">PRIVATE AI WORKSPACE</div><h1>Think better.<br/><em>Build faster.</em></h1><p>Explore powerful models in one clean workspace. Pick a model and start creating.</p></div><div className="chat-card"><div className="chat-top"><div><small>CONVERSATION</small><strong>New chat</strong></div><label>MODEL<select value={model} onChange={e=>setModel(e.target.value)}>{models.length?models.slice(0,100).map(m=><option key={m.id} value={m.id}>{manufacturerName(m.id,m.name)}</option>):<option>Loading models...</option>}</select></label></div><div className="chat-body">{reply?<div className="response"><span>RESPONSE</span><p>{reply}</p></div>:<div className="empty"><div className="empty-mark">N</div><h2>Start a conversation</h2><p>Choose a model below, write a message, and let NextRouter handle the rest.</p></div>}</div><div className="composer"><textarea value={prompt} onChange={e=>setPrompt(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}} placeholder="Message NextRouter..." rows={1}/><div className="composer-bottom"><span>{selected?manufacturerName(selected.id,selected.name):'Select a model'}</span><button onClick={send} disabled={!prompt.trim()||!model||loading}>{loading?'...':'Send ↗'}</button></div></div></div></section>:<section className="models-page"><div className="models-head"><div><div className="eyebrow">LIVE CATALOG</div><h1>Models.</h1><p>Fresh model availability, refreshed automatically.</p></div><div className="live-pill"><i/>{models.length} available</div></div><div className="model-grid">{models.map(m=><button className="model-card" key={m.id} onClick={()=>{setModel(m.id);setTab('Chat')}}><div className="model-top"><span className="model-logo">N</span><span className="ready">Ready</span></div><h3>{manufacturerName(m.id,m.name)}</h3><small>Available model</small><div className="use">Use model <span>→</span></div></button>)}</div>{!models.length&&<div className="loading-models">Loading the live catalog...</div>}</section>}</main></div><nav className="mobile-tabs"><button className={tab==='Chat'?'active':''} onClick={()=>setTab('Chat')}>◈<span>Chat</span></button><button className={tab==='Models'?'active':''} onClick={()=>setTab('Models')}>◫<span>Models</span></button></nav></div>;
}