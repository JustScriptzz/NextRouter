'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode, RefObject } from 'react';

type View = 'overview' | 'playground' | 'models' | 'keys' | 'usage' | 'docs';

type ApiModel = {
  id: string;
  owned_by?: string;
  object?: string;
};

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type LocalKey = {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsed: string;
};

const fallbackModels: ApiModel[] = [
  { id: 'next-router/default', owned_by: 'NextRouter' },
  { id: 'next-router/fast', owned_by: 'NextRouter' },
  { id: 'next-router/reasoning', owned_by: 'NextRouter' },
];

const navigation: Array<{ id: View; label: string; icon: IconName }> = [
  { id: 'overview', label: 'Overview', icon: 'grid' },
  { id: 'playground', label: 'Playground', icon: 'sparkles' },
  { id: 'models', label: 'Models', icon: 'layers' },
  { id: 'keys', label: 'API keys', icon: 'key' },
  { id: 'usage', label: 'Usage', icon: 'chart' },
  { id: 'docs', label: 'Documentation', icon: 'book' },
];

const promptExamples = [
  'Summarize the business value of using a routing layer for AI models.',
  'Write a TypeScript function that validates a chat completion response.',
  'Explain streaming Server-Sent Events to a junior developer in three bullets.',
];

function normalizeModels(payload: unknown): ApiModel[] {
  const candidates = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)
      ? (payload as { data: unknown[] }).data
      : [];

  return candidates.filter(
    (model): model is ApiModel =>
      Boolean(model) && typeof model === 'object' && typeof (model as ApiModel).id === 'string',
  );
}

function displayModelName(id: string) {
  return id
    .split('/')
    .pop()
    ?.replaceAll('-', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase()) ?? id;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(
    new Date(value),
  );
}

function createLocalKey(name: string): { entry: LocalKey; secret: string } {
  const entropy = crypto.getRandomValues(new Uint8Array(18));
  const value = Array.from(entropy, (byte) => byte.toString(16).padStart(2, '0')).join('');
  const secret = `nr_live_${value}`;
  return {
    secret,
    entry: {
      id: crypto.randomUUID(),
      name,
      prefix: `${secret.slice(0, 12)}••••`,
      createdAt: new Date().toISOString(),
      lastUsed: 'Never',
    },
  };
}

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  const paths: Record<IconName, ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    sparkles: <><path d="m12 3-1.7 5.3L5 10l5.3 1.7L12 17l1.7-5.3L19 10l-5.3-1.7L12 3Z" /><path d="m19 16-.7 2.3L16 19l2.3.7L19 22l.7-2.3L22 19l-2.3-.7L19 16Z" /></>,
    layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5" /><path d="m3 16 9 5 9-5" /></>,
    key: <><circle cx="7.5" cy="15.5" r="3.5" /><path d="m10 13 8-8 3 3-2 2 1.5 1.5-2.5 2.5-1.5-1.5-2.5 2.5" /></>,
    chart: <><path d="M4 19V5" /><path d="M4 19h16" /><path d="m7 15 4-4 3 2 5-6" /></>,
    book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /></>,
    search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    arrowUp: <><path d="m5 11 7-7 7 7" /><path d="M12 4v16" /></>,
    arrowRight: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    chevron: <path d="m8 10 4 4 4-4" />,
    copy: <><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>,
    check: <path d="m5 12 4.5 4.5L19 7" />,
    refresh: <><path d="M20 11a8.1 8.1 0 0 0-14.8-4L3 10" /><path d="M3 4v6h6" /><path d="M4 13a8.1 8.1 0 0 0 14.8 4L21 14" /><path d="M21 20v-6h-6" /></>,
    external: <><path d="M14 3h7v7" /><path d="m21 3-9 9" /><path d="M19 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    terminal: <><path d="m5 7 4 5-4 5M12 18h7" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    activity: <><path d="M3 12h4l2.2-6 4.2 12 2.2-6H21" /></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m8.5 12 2.2 2.2 4.8-5" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
    more: <><circle cx="5" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="19" cy="12" r="1" fill="currentColor" /></>,
    warning: <><path d="M10.3 3.5 2.7 18a2 2 0 0 0 1.8 3h15a2 2 0 0 0 1.8-3L13.7 3.5a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></>,
  };

  return <svg {...common}>{paths[name]}</svg>;
}

type IconName =
  | 'grid' | 'sparkles' | 'layers' | 'key' | 'chart' | 'book' | 'search' | 'plus' | 'arrowUp'
  | 'arrowRight' | 'chevron' | 'copy' | 'check' | 'refresh' | 'external' | 'menu' | 'close'
  | 'terminal' | 'clock' | 'activity' | 'shield' | 'info' | 'more' | 'warning';

function MetricCard({ label, value, trend, icon, detail }: { label: string; value: string; trend: string; icon: IconName; detail: string }) {
  return (
    <article className="metric-card">
      <div className="metric-card__top"><span className="metric-card__icon"><Icon name={icon} /></span><button className="icon-button" aria-label={`More about ${label}`}><Icon name="more" /></button></div>
      <p>{label}</p><strong>{value}</strong>
      <div className="metric-card__footer"><span className="trend">{trend}</span><span>{detail}</span></div>
    </article>
  );
}

function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }
  return <button className="copy-button" type="button" onClick={copy}>{copied ? <Icon name="check" size={15} /> : <Icon name="copy" size={15} />}{copied ? 'Copied' : label}</button>;
}

export default function Page() {
  const [activeView, setActiveView] = useState<View>('overview');
  const [menuOpen, setMenuOpen] = useState(false);
  const [models, setModels] = useState<ApiModel[]>(fallbackModels);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelsError, setModelsError] = useState('');
  const [modelQuery, setModelQuery] = useState('');
  const [selectedModel, setSelectedModel] = useState(fallbackModels[0].id);
  const [prompt, setPrompt] = useState(promptExamples[0]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [apiKey, setApiKey] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [sending, setSending] = useState(false);
  const [playgroundError, setPlaygroundError] = useState('');
  const [keys, setKeys] = useState<LocalKey[]>([]);
  const [lastGeneratedKey, setLastGeneratedKey] = useState('');
  const [keyName, setKeyName] = useState('Development key');
  const searchRef = useRef<HTMLInputElement>(null);

  const filteredModels = useMemo(() => models.filter((model) => model.id.toLowerCase().includes(modelQuery.toLowerCase())), [models, modelQuery]);

  useEffect(() => {
    const savedKeys = window.localStorage.getItem('nextrouter-dashboard-keys');
    if (savedKeys) {
      try { setKeys(JSON.parse(savedKeys)); } catch { window.localStorage.removeItem('nextrouter-dashboard-keys'); }
    }
  }, []);

  useEffect(() => {
    if (keys.length) window.localStorage.setItem('nextrouter-dashboard-keys', JSON.stringify(keys));
  }, [keys]);

  async function loadModels() {
    setModelsLoading(true);
    setModelsError('');
    try {
      const response = await fetch('/v1/models');
      if (!response.ok) throw new Error(`Models request failed (${response.status})`);
      const remoteModels = normalizeModels(await response.json());
      if (!remoteModels.length) throw new Error('No models were returned by the API.');
      setModels(remoteModels);
      setSelectedModel((current) => remoteModels.some((model) => model.id === current) ? current : remoteModels[0].id);
    } catch (error) {
      setModelsError(error instanceof Error ? error.message : 'Could not load models.');
    } finally { setModelsLoading(false); }
  }

  useEffect(() => { void loadModels(); }, []);

  function openView(view: View) {
    setActiveView(view);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function copyEndpoint() { void navigator.clipboard.writeText(`${window.location.origin}/v1/chat/completions`); }

  async function sendPrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = prompt.trim();
    if (!content || sending) return;
    const nextMessages = [...messages, { role: 'user' as const, content }];
    setMessages(nextMessages);
    setPrompt('');
    setSending(true);
    setPlaygroundError('');
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (apiKey.trim()) headers.Authorization = `Bearer ${apiKey.trim()}`;
      const response = await fetch('/v1/chat/completions', {
        method: 'POST', headers,
        body: JSON.stringify({ model: selectedModel, messages: nextMessages, temperature, max_tokens: maxTokens }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error?.message || `Request failed (${response.status})`);
      const assistantContent = body?.choices?.[0]?.message?.content;
      if (typeof assistantContent !== 'string' || !assistantContent.trim()) throw new Error('The API returned no assistant message.');
      setMessages((current) => [...current, { role: 'assistant', content: assistantContent }]);
    } catch (error) {
      setPlaygroundError(error instanceof Error ? error.message : 'The request could not be completed.');
      setPrompt(content);
      setMessages((current) => current.slice(0, -1));
    } finally { setSending(false); }
  }

  function generateKey() {
    const { entry, secret } = createLocalKey(keyName.trim() || 'Development key');
    setKeys((current) => [entry, ...current]);
    setLastGeneratedKey(secret);
  }

  function revokeKey(id: string) { setKeys((current) => current.filter((key) => key.id !== id)); }

  const endpointExample = `curl ${typeof window === 'undefined' ? 'https://your-domain.com' : window.location.origin}/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $NEXTROUTER_API_KEY" \\
  -d '{
    "model": "${selectedModel}",
    "messages": [{ "role": "user", "content": "Hello!" }]
  }'`;

  return (
    <main className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'sidebar--open' : ''}`} aria-label="Main navigation">
        <div className="brand"><span className="brand__mark"><span /><span /><span /></span><span>NextRouter</span><small>beta</small></div>
        <div className="workspace-switcher"><span className="workspace-avatar">N</span><span><b>Northstar Labs</b><small>Pro workspace</small></span><Icon name="chevron" size={16} /></div>
        <nav className="sidebar__nav">
          <p>Workspace</p>
          {navigation.slice(0, 5).map((item) => <button key={item.id} className={activeView === item.id ? 'nav-item nav-item--active' : 'nav-item'} onClick={() => openView(item.id)}><Icon name={item.icon} /><span>{item.label}</span></button>)}
          <p className="nav-section-label">Resources</p>
          <button className={activeView === 'docs' ? 'nav-item nav-item--active' : 'nav-item'} onClick={() => openView('docs')}><Icon name="book" /><span>Documentation</span><Icon name="external" size={14} /></button>
        </nav>
        <div className="sidebar__footer"><div className="usage-mini"><div><span>Monthly usage</span><b>42.8%</b></div><div className="progress-track"><i style={{ width: '42.8%' }} /></div><small>428K of 1M requests</small></div><button className="profile"><span className="profile__avatar">LC</span><span><b>Luca Ciulli</b><small>Workspace owner</small></span><Icon name="more" size={16} /></button></div>
      </aside>

      {menuOpen && <button className="nav-backdrop" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}
      <section className="content-area">
        <header className="topbar"><button className="mobile-menu" aria-label="Open menu" onClick={() => setMenuOpen(true)}><Icon name="menu" /></button><div className="breadcrumb"><span>Northstar Labs</span><Icon name="chevron" size={14} /><b>{navigation.find((item) => item.id === activeView)?.label}</b></div><div className="topbar__actions"><button className="command-search" onClick={() => searchRef.current?.focus()}><Icon name="search" size={16} /><span>Search</span><kbd>⌘ K</kbd></button><button className="help-button" aria-label="Help"><span>?</span></button><button className="notification" aria-label="Notifications"><span /></button></div></header>
        <div className="page-content">
          {activeView === 'overview' && <Overview onNavigate={openView} onCopyEndpoint={copyEndpoint} />}
          {activeView === 'playground' && <Playground models={models} selectedModel={selectedModel} setSelectedModel={setSelectedModel} prompt={prompt} setPrompt={setPrompt} messages={messages} apiKey={apiKey} setApiKey={setApiKey} temperature={temperature} setTemperature={setTemperature} maxTokens={maxTokens} setMaxTokens={setMaxTokens} sending={sending} error={playgroundError} onSubmit={sendPrompt} onReset={() => { setMessages([]); setPrompt(''); setPlaygroundError(''); }} />}
          {activeView === 'models' && <Models models={filteredModels} query={modelQuery} setQuery={setModelQuery} selectedModel={selectedModel} onSelect={setSelectedModel} loading={modelsLoading} error={modelsError} onRefresh={loadModels} searchRef={searchRef} />}
          {activeView === 'keys' && <Keys keys={keys} keyName={keyName} setKeyName={setKeyName} lastGeneratedKey={lastGeneratedKey} onCreate={generateKey} onRevoke={revokeKey} />}
          {activeView === 'usage' && <Usage />}
          {activeView === 'docs' && <Docs endpointExample={endpointExample} selectedModel={selectedModel} />}
        </div>
      </section>
    </main>
  );
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: ReactNode }) {
  return <div className="page-heading"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

function Overview({ onNavigate, onCopyEndpoint }: { onNavigate: (view: View) => void; onCopyEndpoint: () => void }) {
  return <>
    <PageHeading eyebrow="Good morning, Luca" title="Your AI infrastructure, at a glance." description="Monitor requests, manage access, and ship reliable AI experiences from one place." action={<button className="button button--primary" onClick={() => onNavigate('playground')}><Icon name="sparkles" size={17} />Open Playground</button>} />
    <section className="metrics-grid"><MetricCard label="Requests" value="428.6K" trend="+18.2%" detail="vs. last month" icon="activity" /><MetricCard label="Average latency" value="428 ms" trend="−64 ms" detail="vs. last month" icon="clock" /><MetricCard label="Success rate" value="99.96%" trend="+0.04%" detail="last 30 days" icon="shield" /><MetricCard label="Total spend" value="$184.20" trend="+12.8%" detail="vs. last month" icon="chart" /></section>
    <section className="overview-grid"><article className="panel usage-panel"><div className="panel__header"><div><p className="eyebrow">Usage</p><h2>Request volume</h2></div><button className="select-button">Last 30 days <Icon name="chevron" size={15} /></button></div><div className="chart-summary"><div><strong>428,609</strong><span><i>↗</i> 18.2% from previous period</span></div><div className="legend"><span><i className="legend__dot" />Requests</span></div></div><div className="line-chart" aria-label="Request volume chart"><svg viewBox="0 0 760 205" preserveAspectRatio="none"><defs><linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#6566f1" stopOpacity=".25" /><stop offset="100%" stopColor="#6566f1" stopOpacity="0" /></linearGradient></defs><path className="chart-grid" d="M0 20H760M0 72H760M0 124H760M0 176H760" /><path className="chart-area" d="M0 160 C25 152 34 146 56 148 S92 116 116 125 S143 131 162 110 S194 119 216 95 S250 90 271 105 S302 67 324 83 S351 94 376 67 S412 80 433 57 S466 68 489 45 S525 73 544 52 S582 38 602 52 S630 47 650 33 S687 51 710 29 S743 37 760 17 V205 H0Z" /><path className="chart-line" d="M0 160 C25 152 34 146 56 148 S92 116 116 125 S143 131 162 110 S194 119 216 95 S250 90 271 105 S302 67 324 83 S351 94 376 67 S412 80 433 57 S466 68 489 45 S525 73 544 52 S582 38 602 52 S630 47 650 33 S687 51 710 29 S743 37 760 17" /></svg><div className="chart-labels"><span>Jul 20</span><span>Jul 27</span><span>Aug 03</span><span>Aug 10</span><span>Aug 17</span></div></div></article>
      <article className="panel model-health"><div className="panel__header"><div><p className="eyebrow">Platform status</p><h2>Model health</h2></div><button className="text-button" onClick={() => onNavigate('models')}>View models <Icon name="arrowRight" size={15} /></button></div><div className="health-list"><HealthRow title="Default routing" subtitle="Automatic model selection" latency="342 ms" /><HealthRow title="Fast routing" subtitle="Low-latency workloads" latency="184 ms" /><HealthRow title="Reasoning routing" subtitle="Complex tasks" latency="612 ms" /></div></article></section>
    <section className="overview-grid overview-grid--bottom"><article className="panel activity-panel"><div className="panel__header"><div><p className="eyebrow">Workspace</p><h2>Recent activity</h2></div><button className="text-button" onClick={() => onNavigate('usage')}>View all <Icon name="arrowRight" size={15} /></button></div><div className="timeline"><TimelineItem icon="key" title="New API key created" description="Production · Created by Luca" time="12 min ago" /><TimelineItem icon="layers" title="Routing policy updated" description="Default routing now prioritizes low latency" time="2 hours ago" /><TimelineItem icon="activity" title="Usage threshold reached" description="Workspace crossed 40% of monthly quota" time="Yesterday" /></div></article><article className="quickstart"><span className="quickstart__orb"><Icon name="terminal" size={24} /></span><p className="eyebrow">Quick start</p><h2>Make your first request</h2><p>Use the OpenAI-compatible API to route your next completion.</p><code>/v1/chat/completions</code><div><button className="button button--light" onClick={onCopyEndpoint}><Icon name="copy" size={15} />Copy endpoint</button><button className="button button--ghost-light" onClick={() => onNavigate('docs')}>Read docs <Icon name="arrowRight" size={15} /></button></div></article></section>
  </>;
}

function HealthRow({ title, subtitle, latency }: { title: string; subtitle: string; latency: string }) { return <div className="health-row"><span className="status-dot" /><div><b>{title}</b><small>{subtitle}</small></div><span>{latency}</span></div>; }
function TimelineItem({ icon, title, description, time }: { icon: IconName; title: string; description: string; time: string }) { return <div className="timeline-item"><span className="timeline-item__icon"><Icon name={icon} size={16} /></span><div><b>{title}</b><p>{description}</p></div><time>{time}</time></div>; }

function Playground(props: { models: ApiModel[]; selectedModel: string; setSelectedModel: (value: string) => void; prompt: string; setPrompt: (value: string) => void; messages: ChatMessage[]; apiKey: string; setApiKey: (value: string) => void; temperature: number; setTemperature: (value: number) => void; maxTokens: number; setMaxTokens: (value: number) => void; sending: boolean; error: string; onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>; onReset: () => void }) {
  return <><PageHeading eyebrow="Interactive console" title="Playground" description="Prototype with the same OpenAI-compatible API your application uses." action={<button className="button button--secondary" onClick={props.onReset}><Icon name="refresh" size={16} />New conversation</button>} /><div className="playground-layout"><section className="playground-card"><div className="playground-toolbar"><label>Model<select value={props.selectedModel} onChange={(event) => props.setSelectedModel(event.target.value)}>{props.models.map((model) => <option key={model.id} value={model.id}>{model.id}</option>)}</select></label><span className="endpoint-pill"><span />POST /v1/chat/completions</span></div><div className="conversation" aria-live="polite">{props.messages.length === 0 ? <div className="empty-conversation"><span className="empty-conversation__mark"><Icon name="sparkles" size={25} /></span><h2>Start a conversation</h2><p>Choose a prompt below or write your own to test routing, latency, and response quality.</p><div>{promptExamples.map((example) => <button key={example} onClick={() => props.setPrompt(example)}>{example}<Icon name="arrowRight" size={14} /></button>)}</div></div> : props.messages.map((message, index) => <article key={`${message.role}-${index}`} className={`message message--${message.role}`}><span className="message__avatar">{message.role === 'user' ? 'LC' : <Icon name="sparkles" size={16} />}</span><div><b>{message.role === 'user' ? 'You' : 'NextRouter'}</b><p>{message.content}</p></div></article>)}{props.sending && <article className="message message--assistant"><span className="message__avatar"><Icon name="sparkles" size={16} /></span><div><b>NextRouter</b><span className="typing"><i /><i /><i /></span></div></article>}</div>{props.error && <div className="request-error"><Icon name="warning" size={17} /><span><b>Request failed.</b> {props.error}</span></div>}<form className="prompt-composer" onSubmit={(event) => void props.onSubmit(event)}><textarea value={props.prompt} onChange={(event) => props.setPrompt(event.target.value)} placeholder="Message the model…" rows={3} /><div><span>↵ to send</span><button className="send-button" type="submit" disabled={props.sending || !props.prompt.trim()} aria-label="Send message"><Icon name="arrowUp" size={17} /></button></div></form><p className="playground-note"><Icon name="info" size={14} />Requests are sent directly to <code>/v1/chat/completions</code>. No dashboard-only proxy is required.</p></section><aside className="settings-card"><div className="settings-card__head"><div><p className="eyebrow">Request settings</p><h2>Configuration</h2></div><span className="live-dot">Live</span></div><label className="field-label">API key<input type="password" value={props.apiKey} onChange={(event) => props.setApiKey(event.target.value)} placeholder="Optional for public environments" autoComplete="off" /></label><p className="field-help">Sent only in this request as a Bearer token.</p><label className="field-label">Temperature <span>{props.temperature.toFixed(1)}</span><input type="range" min="0" max="2" step="0.1" value={props.temperature} onChange={(event) => props.setTemperature(Number(event.target.value))} /></label><div className="range-labels"><span>Precise</span><span>Creative</span></div><label className="field-label">Max tokens <input type="number" min="1" max="32000" value={props.maxTokens} onChange={(event) => props.setMaxTokens(Math.max(1, Number(event.target.value)))} /></label><div className="settings-tip"><Icon name="info" size={16} /><p>Model availability comes from <code>/v1/models</code>, so this list always reflects your deployment.</p></div></aside></div></>;
}

function Models({ models, query, setQuery, selectedModel, onSelect, loading, error, onRefresh, searchRef }: { models: ApiModel[]; query: string; setQuery: (value: string) => void; selectedModel: string; onSelect: (value: string) => void; loading: boolean; error: string; onRefresh: () => Promise<void>; searchRef: RefObject<HTMLInputElement | null> }) {
  return <><PageHeading eyebrow="Model registry" title="Models" description="Browse the model catalog exposed by your NextRouter deployment." action={<button className="button button--secondary" onClick={() => void onRefresh()} disabled={loading}><Icon name="refresh" size={16} />{loading ? 'Refreshing…' : 'Refresh models'}</button>} /><section className="models-toolbar"><label className="models-search"><Icon name="search" size={17} /><input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search models" /></label><span>{loading ? 'Loading catalog…' : `${models.length} models available`}</span></section>{error && <div className="notice notice--warning"><Icon name="warning" size={17} /><span><b>Using the local fallback catalog.</b> {error}</span></div>}<section className="model-grid">{models.map((model, index) => <article key={model.id} className={`model-card ${selectedModel === model.id ? 'model-card--selected' : ''}`}><div className="model-card__icon"><Icon name={index % 3 === 0 ? 'sparkles' : index % 3 === 1 ? 'activity' : 'layers'} size={21} /></div><span className="model-badge">{model.object === 'model' ? 'Available' : 'Routed'}</span><h2>{displayModelName(model.id)}</h2><p className="model-id">{model.id}</p><div className="model-card__meta"><span><i className="status-dot" />Operational</span><span>{model.owned_by || 'NextRouter'}</span></div><button className="button button--secondary button--full" onClick={() => onSelect(model.id)}>{selectedModel === model.id ? <><Icon name="check" size={16} />Selected</> : <>Use in Playground <Icon name="arrowRight" size={16} /></>}</button></article>)}{!loading && models.length === 0 && <div className="empty-state"><Icon name="layers" size={24} /><h2>No matching models</h2><p>Try a different search term or refresh the registry.</p></div>}</section></>;
}

function Keys({ keys, keyName, setKeyName, lastGeneratedKey, onCreate, onRevoke }: { keys: LocalKey[]; keyName: string; setKeyName: (value: string) => void; lastGeneratedKey: string; onCreate: () => void; onRevoke: (id: string) => void }) {
  return <><PageHeading eyebrow="Access control" title="API keys" description="Create and track development keys from your workspace dashboard." action={<button className="button button--primary" onClick={onCreate}><Icon name="plus" size={17} />Create API key</button>} /><section className="keys-layout"><article className="panel keys-panel"><div className="keys-panel__intro"><div><p className="eyebrow">Workspace keys</p><h2>Keys in this browser</h2><p>Use an existing secure key service for production credentials. This dashboard demo stores newly created development keys locally on this device only.</p></div><span className="local-badge"><Icon name="shield" size={14} />Local preview</span></div><div className="key-create-row"><label className="field-label">Key name<input value={keyName} onChange={(event) => setKeyName(event.target.value)} placeholder="e.g. Staging" /></label><button className="button button--primary" onClick={onCreate}><Icon name="plus" size={16} />Create key</button></div>{lastGeneratedKey && <div className="generated-key"><span><Icon name="warning" size={17} /></span><div><b>Copy this key now</b><p>For safety it will not be shown again after you leave this page.</p><code>{lastGeneratedKey}</code></div><CopyButton value={lastGeneratedKey} /></div>}<div className="key-table" role="table"><div className="key-table__head" role="row"><span>Key name</span><span>Key</span><span>Created</span><span>Last used</span><span /></div>{keys.length ? keys.map((key) => <div className="key-table__row" role="row" key={key.id}><span><b>{key.name}</b><small>Development</small></span><code>{key.prefix}</code><span>{formatDate(key.createdAt)}</span><span>{key.lastUsed}</span><button className="text-danger" onClick={() => onRevoke(key.id)}>Revoke</button></div>) : <div className="key-table__empty"><Icon name="key" size={22} /><p>No local development keys yet.</p></div>}</div></article><aside className="access-aside"><span className="access-aside__icon"><Icon name="shield" size={22} /></span><h2>Protect your keys</h2><p>Never expose production credentials in client-side code or commit them to source control.</p><button className="button button--secondary button--full">Security guide <Icon name="external" size={15} /></button></aside></section></>;
}

function Usage() { const bars = [46, 62, 58, 72, 64, 82, 92, 70, 77, 62, 85, 96]; return <><PageHeading eyebrow="Billing & limits" title="Usage" description="A clear view of your workspace consumption and monthly limits." action={<button className="button button--secondary"><Icon name="external" size={16} />View billing</button>} /><section className="usage-summary"><article><span>Current period</span><strong>Aug 1 – Aug 31, 2026</strong><small>13 days remaining</small></article><article><span>Requests used</span><strong>428,609 <em>/ 1,000,000</em></strong><div className="progress-track progress-track--large"><i style={{ width: '42.8%' }} /></div><small>42.8% of included requests</small></article><article><span>Projected monthly spend</span><strong>$286.14</strong><small>Based on the last 14 days</small></article></section><section className="usage-detail-grid"><article className="panel"><div className="panel__header"><div><p className="eyebrow">Daily requests</p><h2>Usage over time</h2></div><span className="metric-change">↗ 18.2%</span></div><div className="bar-chart">{bars.map((height, index) => <div key={index}><i style={{ height: `${height}%` }} /><span>{index % 2 === 0 ? index + 6 : ''}</span></div>)}</div></article><article className="panel spend-breakdown"><div className="panel__header"><div><p className="eyebrow">Breakdown</p><h2>Spend by routing mode</h2></div></div><BreakdownRow name="Default routing" amount="$113.84" percent="62%" /><BreakdownRow name="Reasoning routing" amount="$51.74" percent="28%" /><BreakdownRow name="Fast routing" amount="$18.62" percent="10%" /></article></section><section className="limit-callout"><span><Icon name="info" size={19} /></span><div><b>You are on track within your monthly limit.</b><p>We’ll notify workspace owners at 80% and 100% of their included request allowance.</p></div><button className="text-button">Manage alerts <Icon name="arrowRight" size={15} /></button></section></> }
function BreakdownRow({ name, amount, percent }: { name: string; amount: string; percent: string }) { return <div className="breakdown-row"><div><span><i />{name}</span><b>{amount}</b></div><div className="progress-track"><i style={{ width: percent }} /></div></div>; }

function Docs({ endpointExample, selectedModel }: { endpointExample: string; selectedModel: string }) { const jsExample = `const response = await fetch('/v1/chat/completions', {\n  method: 'POST',\n  headers: {\n    'Content-Type': 'application/json',\n    'Authorization': 'Bearer ' + process.env.NEXTROUTER_API_KEY,\n  },\n  body: JSON.stringify({\n    model: '${selectedModel}',\n    messages: [{ role: 'user', content: 'Hello!' }],\n  }),\n});\n\nconst completion = await response.json();`; return <><PageHeading eyebrow="Developer documentation" title="Build with NextRouter" description="Everything you need to make reliable, OpenAI-compatible completion requests." action={<a className="button button--primary" href="#quickstart">Start building <Icon name="arrowRight" size={16} /></a>} /><div className="docs-layout"><aside className="docs-nav"><p>Getting started</p><a href="#quickstart" className="docs-nav--active">Quick start</a><a href="#authentication">Authentication</a><p>API reference</p><a href="#chat-completions">Chat completions</a><a href="#list-models">List models</a><p>Guides</p><a href="#routing">Routing strategies</a><a href="#errors">Error handling</a></aside><article className="docs-content"><section id="quickstart"><span className="docs-kicker">GETTING STARTED</span><h2>Quick start</h2><p>NextRouter exposes an OpenAI-compatible interface. Point your application at the public API endpoint and use the models currently available in your deployment.</p><div className="docs-step"><span>1</span><div><h3>Choose a model</h3><p>Retrieve the catalog with <code>GET /v1/models</code>, or select a model in the dashboard.</p></div></div><div className="docs-step" id="authentication"><span>2</span><div><h3>Authenticate your request</h3><p>When your deployment requires it, pass your existing server-side credential in the Bearer header. Keep credentials out of browser bundles.</p></div></div><div className="docs-step" id="chat-completions"><span>3</span><div><h3>Create a chat completion</h3><p>Send a request to the public completions endpoint.</p></div></div><CodeBlock language="cURL" code={endpointExample} /><CodeBlock language="TypeScript" code={jsExample} /></section><section id="list-models"><span className="docs-kicker">API REFERENCE</span><h2>List models</h2><p>Use the model registry to discover the exact IDs available to your deployment.</p><div className="endpoint-reference"><span className="http-method">GET</span><code>/v1/models</code><CopyButton value="/v1/models" label="Copy path" /></div><section className="docs-note" id="routing"><Icon name="sparkles" size={18} /><div><b>Routing is built in</b><p>Use a routing-aware model ID when you want NextRouter to optimize placement for latency, quality, or cost.</p></div></section><section className="docs-note docs-note--neutral" id="errors"><Icon name="info" size={18} /><div><b>Handle API errors explicitly</b><p>Check the response status and surface <code>error.message</code> to developers rather than assuming every response is a completion.</p></div></section></section></article></div></> }
function CodeBlock({ language, code }: { language: string; code: string }) { return <div className="code-block"><div><span>{language}</span><CopyButton value={code} /></div><pre><code>{code}</code></pre></div>; }
