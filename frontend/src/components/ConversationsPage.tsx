import React, { useState, useEffect, useRef } from 'react';
import CrmLayout from './CrmLayout';

interface Message {
  id: string;
  content: string;
  sender_type: 'user' | 'agent' | 'bot';
  sender_name: string;
  is_read: boolean;
  created_at: string;
}

interface Conversation {
  id: string;
  lead_id?: string;
  assigned_agent_id?: string;
  channel: string;
  status: string;
  contact_name: string;
  contact_phone?: string;
  contact_email?: string;
  last_message?: string;
  last_message_at?: string;
  unread_count: number;
  whatsapp_waid?: string;
  nova_paused: boolean;
  created_at: string;
  lead?: { name: string; status: string; project?: { name: string } };
  assigned_agent?: { name: string };
  messages?: Message[];
}

const platformIcon = (channel: string) => {
  switch (channel) {
    case 'whatsapp':  return { icon: 'chat', color: 'text-green-500' };
    case 'instagram': return { icon: 'photo_camera', color: 'text-pink-500' };
    case 'email':     return { icon: 'mail', color: 'text-blue-500' };
    case 'webchat':   return { icon: 'forum', color: 'text-orange-500' };
    default:          return { icon: 'chat', color: 'text-slate-400' };
  }
};

const timeAgo = (date?: string) => {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'Ahora';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
};

const avatar = (name?: string) => (name || '?').charAt(0).toUpperCase();

const ConversationsPage: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId]       = useState<string | null>(null);
  const [messages, setMessages]           = useState<Message[]>([]);
  const [messageInput, setMessageInput]   = useState('');
  const [loading, setLoading]             = useState(true);
  const [sending, setSending]             = useState(false);
  const [filter, setFilter]               = useState<'all' | 'unread'>('all');
  const [mobileView, setMobileView]       = useState<'list' | 'chat'>('list');
  const [showDetails, setShowDetails]     = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const token   = localStorage.getItem('access_token');
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedId) {
      fetchMessages(selectedId);
      markAsRead(selectedId);
    }
  }, [selectedId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/conversations', { headers });
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
        if (!selectedId && data.length > 0) setSelectedId(data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (convId: string) => {
    try {
      const res = await fetch(`/api/conversations/${convId}/messages`, { headers });
      if (res.ok) setMessages(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const markAsRead = async (convId: string) => {
    await fetch(`/api/conversations/${convId}/read`, { method: 'PATCH', headers });
    setConversations(prev => prev.map(c => c.id === convId ? { ...c, unread_count: 0 } : c));
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedId || sending) return;
    const content = messageInput.trim();
    setMessageInput('');
    setSending(true);
    try {
      const res = await fetch(`/api/conversations/${selectedId}/messages`, {
        method: 'POST', headers,
        body: JSON.stringify({
          content,
          sender_type: 'agent',
          sender_name: localStorage.getItem('user_name') || 'Agente',
        }),
      });
      if (res.ok) {
        const msg = await res.json();
        setMessages(prev => [...prev, msg]);
        setConversations(prev =>
          prev.map(c => c.id === selectedId
            ? { ...c, last_message: content, last_message_at: new Date().toISOString() }
            : c)
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const handleSelectConv = (id: string) => {
    setSelectedId(id);
    setMobileView('chat');
    setShowDetails(false);
  };

  const selected     = conversations.find(c => c.id === selectedId);
  const filtered     = filter === 'unread' ? conversations.filter(c => c.unread_count > 0) : conversations;
  const totalUnread  = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  return (
    <CrmLayout
      title="Bandeja de Entrada"
      subtitle={totalUnread > 0 ? `${totalUnread} sin leer` : 'Al día'}
      fullBleed
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={fetchConversations}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
            title="Actualizar"
          >
            <span className="material-symbols-outlined text-lg">refresh</span>
          </button>
          <button className="hidden sm:flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2 px-4 rounded-lg shadow-lg shadow-blue-600/20 transition-all">
            <span className="material-symbols-outlined text-[18px]">add_comment</span>
            <span>Nueva</span>
          </button>
        </div>
      }
    >
      {/* ─── Root flex container ─────────────────────────────────────── */}
      <div className="flex h-full overflow-hidden bg-white dark:bg-slate-900">

        {/* ══════════════ LEFT: Conversation List ══════════════ */}
        <aside className={[
          'flex flex-col bg-white dark:bg-slate-900',
          'border-r border-slate-200 dark:border-slate-800',
          'w-full md:w-[300px] lg:w-[340px] shrink-0',
          // mobile: show only when in list view
          mobileView === 'chat' ? 'hidden md:flex' : 'flex',
        ].join(' ')}>

          {/* List header */}
          <div className="px-3 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800 space-y-2">
            {/* Search */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-[18px] pointer-events-none">search</span>
              <input
                type="text"
                placeholder="Buscar..."
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 rounded-xl border-none outline-none text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
            {/* Tabs */}
            <div className="flex gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <button
                onClick={() => setFilter('all')}
                className={`flex-1 py-1 text-xs font-semibold rounded-md transition-all ${filter === 'all' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
              >
                Todos {conversations.length > 0 && `(${conversations.length})`}
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`flex-1 py-1 text-xs font-semibold rounded-md transition-all ${filter === 'unread' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
              >
                Sin leer {totalUnread > 0 && <span className="inline-flex items-center justify-center ml-1 h-4 min-w-4 px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold">{totalUnread}</span>}
              </button>
            </div>
          </div>

          {/* List items */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-blue-600"></div>
              </div>
            )}
            {!loading && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 text-sm gap-2">
                <span className="material-symbols-outlined text-4xl">chat_bubble_outline</span>
                <p>No hay conversaciones</p>
              </div>
            )}
            {filtered.map(conv => {
              const { icon, color } = platformIcon(conv.channel);
              const isSelected = selectedId === conv.id;
              return (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConv(conv.id)}
                  className={[
                    'w-full text-left px-3 py-3 border-b border-slate-100 dark:border-slate-800/60',
                    'transition-colors relative',
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/40'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40',
                  ].join(' ')}
                >
                  {/* Active indicator */}
                  {isSelected && (
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-600 rounded-r-full" />
                  )}

                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div className={`h-11 w-11 rounded-full flex items-center justify-center text-sm font-bold ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                        {avatar(conv.contact_name)}
                      </div>
                      {/* Channel dot */}
                      <span className={`absolute -bottom-0.5 -right-0.5 material-symbols-outlined text-[13px] bg-white dark:bg-slate-900 rounded-full p-0.5 ${color}`}>{icon}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-1 mb-0.5">
                        <span className={`text-sm truncate ${conv.unread_count > 0 ? 'font-bold text-slate-900 dark:text-white' : 'font-semibold text-slate-800 dark:text-slate-200'}`}>
                          {conv.contact_name || conv.contact_phone || 'Sin nombre'}
                        </span>
                        <span className="text-[11px] text-slate-400 shrink-0">
                          {timeAgo(conv.last_message_at || conv.created_at)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <p className={`text-xs truncate leading-snug ${conv.unread_count > 0 ? 'font-semibold text-slate-700 dark:text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
                          {conv.last_message || conv.lead?.project?.name || conv.contact_phone || '\u00A0'}
                        </p>
                        {conv.unread_count > 0 && (
                          <span className="shrink-0 h-5 min-w-5 px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                      {conv.nova_paused && (
                        <span className="inline-flex items-center gap-0.5 mt-1 text-[10px] font-semibold text-purple-600 dark:text-purple-400">
                          <span className="material-symbols-outlined text-[11px]">person</span>
                          Agente activo
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* ══════════════ CENTER + RIGHT ══════════════ */}
        <div className={[
          'flex flex-1 min-w-0 h-full',
          mobileView === 'list' ? 'hidden md:flex' : 'flex',
        ].join(' ')}>

          {/* ── Chat area ── */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#f0f2f5] dark:bg-slate-950">
            {!selected ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-slate-600">
                <div className="text-center select-none">
                  <span className="material-symbols-outlined text-7xl mb-3 block opacity-30">forum</span>
                  <p className="text-base font-medium opacity-60">Selecciona una conversación</p>
                </div>
              </div>
            ) : (
              <>
                {/* Chat Header */}
                <div className="h-[60px] bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 px-3 shrink-0">
                  {/* Back button — mobile only */}
                  <button
                    onClick={() => setMobileView('list')}
                    className="md:hidden p-2 -ml-1 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors"
                  >
                    <span className="material-symbols-outlined">arrow_back</span>
                  </button>

                  {/* Avatar */}
                  <div className="h-9 w-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {avatar(selected.contact_name)}
                  </div>

                  {/* Name + status */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm leading-tight truncate">
                      {selected.contact_name || selected.contact_phone}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <span className={`material-symbols-outlined text-[13px] ${platformIcon(selected.channel).color}`}>
                        {platformIcon(selected.channel).icon}
                      </span>
                      <span className="capitalize">{selected.channel}</span>
                      {selected.contact_phone && (
                        <>
                          <span className="text-slate-300 dark:text-slate-600">·</span>
                          <span className="truncate">{selected.contact_phone}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Nova toggle */}
                    <button
                      onClick={() => {
                        const ep = selected.nova_paused ? 'resume-nova' : 'pause-nova';
                        fetch(`/api/conversations/${selected.id}/${ep}`, { method: 'PATCH', headers })
                          .then(() => fetchConversations());
                      }}
                      className={`hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                        selected.nova_paused
                          ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[13px]">
                        {selected.nova_paused ? 'smart_toy' : 'person'}
                      </span>
                      <span className="hidden lg:inline">
                        {selected.nova_paused ? 'Devolver a Nova' : 'Tomar control'}
                      </span>
                    </button>

                    {/* Details toggle — tablet only (xl shows permanent panel) */}
                    <button
                      onClick={() => setShowDetails(v => !v)}
                      className={`xl:hidden p-2 rounded-lg transition-colors ${showDetails ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                      title="Detalles"
                    >
                      <span className="material-symbols-outlined text-lg">info</span>
                    </button>

                    {/* Close */}
                    <button
                      onClick={() => {
                        fetch(`/api/conversations/${selected.id}/close`, { method: 'PATCH', headers })
                          .then(() => fetchConversations());
                      }}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Cerrar conversación"
                    >
                      <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-4 space-y-2 sm:px-5 sm:py-5">
                  {messages.length === 0 && (
                    <div className="text-center py-10 text-slate-400 text-sm">
                      No hay mensajes aún.
                    </div>
                  )}
                  {messages.map(msg => {
                    const isOutgoing = msg.sender_type === 'agent' || msg.sender_type === 'bot';
                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-2 items-end max-w-[85%] sm:max-w-[75%] ${isOutgoing ? 'ml-auto flex-row-reverse' : ''}`}
                      >
                        {/* Mini avatar */}
                        <div className={`h-7 w-7 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold mb-0.5 ${
                          msg.sender_type === 'bot'
                            ? 'bg-purple-600 text-white'
                            : isOutgoing
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}>
                          {msg.sender_type === 'bot' ? '✦' : avatar(msg.sender_name)}
                        </div>

                        <div className={`flex flex-col gap-0.5 ${isOutgoing ? 'items-end' : 'items-start'}`}>
                          {msg.sender_type === 'bot' && (
                            <span className="text-[10px] font-semibold text-purple-500 px-1">Agente IA</span>
                          )}
                          <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed shadow-sm ${
                            msg.sender_type === 'agent'
                              ? 'bg-blue-600 text-white rounded-br-sm'
                              : msg.sender_type === 'bot'
                              ? 'bg-purple-600 text-white rounded-br-sm'
                              : 'bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-sm'
                          }`}>
                            {msg.content}
                          </div>
                          <span className="text-[10px] text-slate-400 flex items-center gap-0.5 px-1">
                            {new Date(msg.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                            {msg.sender_type === 'agent' && msg.is_read && (
                              <span className="material-symbols-outlined text-[12px] text-blue-400">done_all</span>
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* AI Suggestions */}
                <div className="px-3 pb-1 bg-white dark:bg-slate-900 sm:px-4">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800/50 rounded-xl p-2.5 border border-blue-100 dark:border-slate-700">
                    <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                      <span className="material-symbols-outlined text-[13px]">smart_toy</span>
                      Sugerencias
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
                      {[
                        'Gracias por contactarnos, con gusto le ayudo.',
                        'Le envío información del proyecto ahora.',
                        'Podemos agendar una visita esta semana.',
                      ].map((s, i) => (
                        <button
                          key={i}
                          onClick={() => setMessageInput(s)}
                          className="shrink-0 bg-white dark:bg-slate-700 hover:border-blue-400 text-slate-700 dark:text-slate-200 text-xs py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-600 transition-all text-left whitespace-nowrap"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Input */}
                <form onSubmit={sendMessage} className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 sm:p-4">
                  <div className="flex items-end gap-2">
                    <textarea
                      value={messageInput}
                      onChange={e => setMessageInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage(e);
                        }
                      }}
                      rows={1}
                      className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none max-h-32 leading-relaxed"
                      placeholder="Escribe un mensaje..."
                      disabled={sending}
                      style={{ height: 'auto' }}
                      onInput={e => {
                        const el = e.currentTarget;
                        el.style.height = 'auto';
                        el.style.height = Math.min(el.scrollHeight, 128) + 'px';
                      }}
                    />
                    <button
                      type="submit"
                      disabled={!messageInput.trim() || sending}
                      className="shrink-0 h-10 w-10 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-600/25 transition-all"
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {sending ? 'hourglass_empty' : 'send'}
                      </span>
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>

          {/* ── RIGHT: Details panel ── */}
          {/* Desktop: always visible | Tablet/Mobile: toggleable sheet */}
          <div className={[
            'bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 overflow-y-auto',
            // Desktop: permanent column
            'xl:flex xl:flex-col xl:w-[268px] xl:shrink-0',
            // Below xl: absolute overlay on the right when showDetails is true
            showDetails
              ? 'flex flex-col absolute right-0 top-0 bottom-0 w-[280px] z-30 shadow-2xl xl:shadow-none xl:relative'
              : 'hidden xl:flex xl:flex-col',
          ].join(' ')}>
            {selected ? (
              <div className="p-5">
                {/* Close overlay button (non-xl) */}
                <button
                  onClick={() => setShowDetails(false)}
                  className="xl:hidden absolute top-3 right-3 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>

                {/* Contact info */}
                <div className="text-center mb-5 pt-2">
                  <div className="h-14 w-14 rounded-full bg-blue-600 text-white text-xl font-bold flex items-center justify-center mx-auto mb-2">
                    {avatar(selected.contact_name)}
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base leading-tight">
                    {selected.contact_name || 'Sin nombre'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">{selected.contact_phone || selected.contact_email}</p>
                  <div className="flex justify-center gap-2 mt-3">
                    {selected.contact_phone && (
                      <a
                        href={`https://wa.me/${selected.contact_phone}`}
                        target="_blank" rel="noreferrer"
                        className="h-8 w-8 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">chat</span>
                      </a>
                    )}
                    {selected.contact_email && (
                      <a
                        href={`mailto:${selected.contact_email}`}
                        className="h-8 w-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">mail</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Nova toggle in details */}
                <button
                  onClick={() => {
                    const ep = selected.nova_paused ? 'resume-nova' : 'pause-nova';
                    fetch(`/api/conversations/${selected.id}/${ep}`, { method: 'PATCH', headers })
                      .then(() => fetchConversations());
                  }}
                  className={`sm:hidden w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold mb-4 transition-colors ${
                    selected.nova_paused
                      ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">
                    {selected.nova_paused ? 'smart_toy' : 'person'}
                  </span>
                  {selected.nova_paused ? 'Devolver a Nova' : 'Tomar control'}
                </button>

                {/* Channel info */}
                <div className="mb-5">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Info del canal</h4>
                  <div className="space-y-2">
                    {[
                      { label: 'Canal', value: <span className="capitalize">{selected.channel}</span> },
                      { label: 'Estado', value: <span className={selected.status === 'open' ? 'text-emerald-600' : 'text-slate-500'}>{selected.status === 'open' ? 'Abierta' : 'Cerrada'}</span> },
                      { label: 'Mensajes', value: messages.length },
                      { label: 'Inicio', value: new Date(selected.created_at).toLocaleDateString('es') },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">{label}</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Lead */}
                {selected.lead && (
                  <div className="mb-5">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Lead Asociado</h4>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 space-y-1.5 text-sm">
                      <p className="font-bold text-slate-900 dark:text-white">{selected.lead.name}</p>
                      {selected.lead.project && (
                        <p className="text-slate-500 text-xs">{selected.lead.project.name}</p>
                      )}
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                        {selected.lead.status}
                      </span>
                    </div>
                  </div>
                )}

                {/* Quick actions */}
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Acciones Rápidas</h4>
                  <div className="space-y-1">
                    {[
                      { icon: 'person_add',    label: 'Convertir en Lead', color: 'blue' },
                      { icon: 'edit_calendar', label: 'Agendar Visita',    color: 'emerald' },
                      { icon: 'note_add',      label: 'Agregar Nota',      color: 'orange' },
                    ].map(({ icon, label, color }) => (
                      <button
                        key={label}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left group"
                      >
                        <div className={`w-8 h-8 rounded-lg bg-${color}-50 dark:bg-${color}-900/20 text-${color}-600 flex items-center justify-center group-hover:bg-${color}-600 group-hover:text-white transition-colors`}>
                          <span className="material-symbols-outlined text-sm">{icon}</span>
                        </div>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                Selecciona una conversación
              </div>
            )}
          </div>

          {/* Overlay backdrop for details panel on non-xl */}
          {showDetails && (
            <div
              className="xl:hidden absolute inset-0 bg-black/20 z-20"
              onClick={() => setShowDetails(false)}
            />
          )}
        </div>
      </div>
    </CrmLayout>
  );
};

export default ConversationsPage;
