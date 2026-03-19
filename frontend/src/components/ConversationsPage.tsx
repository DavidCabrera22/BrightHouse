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
  created_at: string;
  lead?: { name: string; status: string; project?: { name: string } };
  assigned_agent?: { name: string };
  messages?: Message[];
}

const platformIcon = (channel: string) => {
  switch (channel) {
    case 'whatsapp': return { icon: 'chat', color: 'text-green-600' };
    case 'email': return { icon: 'mail', color: 'text-blue-600' };
    case 'webchat': return { icon: 'forum', color: 'text-orange-500' };
    default: return { icon: 'chat', color: 'text-slate-400' };
  }
};

const timeAgo = (date?: string) => {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `Hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs}h`;
  return `Hace ${Math.floor(hrs / 24)}d`;
};

const ConversationsPage: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const token = localStorage.getItem('access_token');
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    fetchConversations();
    // Poll for new messages every 15s
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
        if (!selectedId && data.length > 0) {
          setSelectedId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (convId: string) => {
    try {
      const res = await fetch(`/api/conversations/${convId}/messages`, { headers });
      if (res.ok) {
        setMessages(await res.json());
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  const markAsRead = async (convId: string) => {
    await fetch(`/api/conversations/${convId}/read`, { method: 'PATCH', headers });
    setConversations(prev =>
      prev.map(c => c.id === convId ? { ...c, unread_count: 0 } : c)
    );
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedId || sending) return;

    const content = messageInput.trim();
    setMessageInput('');
    setSending(true);

    try {
      const res = await fetch(`/api/conversations/${selectedId}/messages`, {
        method: 'POST',
        headers,
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
          prev.map(c => c.id === selectedId ? { ...c, last_message: content, last_message_at: new Date().toISOString() } : c)
        );
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  const selected = conversations.find(c => c.id === selectedId);
  const filtered = filter === 'unread'
    ? conversations.filter(c => c.unread_count > 0)
    : conversations;

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  return (
    <CrmLayout
      title="Bandeja de Entrada"
      subtitle={`${totalUnread > 0 ? `${totalUnread} sin leer` : 'Al día'}`}
      actions={
        <div className="flex items-center gap-3">
          <button
            onClick={fetchConversations}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
            title="Actualizar"
          >
            <span className="material-symbols-outlined text-lg">refresh</span>
          </button>
          <button className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2 px-4 rounded-lg shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">add_comment</span>
            <span>Nueva conversación</span>
          </button>
        </div>
      }
    >
      <div className="flex h-[calc(100vh-8rem)] -m-6 mt-0 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">

        {/* Left: Conversation List */}
        <div className="w-80 lg:w-96 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shrink-0 h-full">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setFilter('all')}
                className={`flex-1 py-1.5 px-3 text-sm font-semibold rounded-lg transition-colors ${filter === 'all' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-400'}`}
              >
                Todos ({conversations.length})
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`flex-1 py-1.5 px-3 text-sm font-semibold rounded-lg transition-colors ${filter === 'unread' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-400'}`}
              >
                Sin leer {totalUnread > 0 && `(${totalUnread})`}
              </button>
            </div>
            <div className="text-xs text-slate-400 flex items-center justify-between">
              <span>Ordenado por: Última actividad</span>
              <span className="material-symbols-outlined text-sm cursor-pointer">sort</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-10">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-blue-600"></div>
              </div>
            )}

            {!loading && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 text-sm">
                <span className="material-symbols-outlined text-4xl mb-2">chat_bubble_outline</span>
                <p>No hay conversaciones</p>
              </div>
            )}

            {filtered.map(conv => {
              const { icon, color } = platformIcon(conv.channel);
              const isSelected = selectedId === conv.id;
              return (
                <div
                  key={conv.id}
                  onClick={() => setSelectedId(conv.id)}
                  className={`p-4 border-b border-slate-100 dark:border-slate-800 cursor-pointer transition-all border-l-4 ${
                    isSelected
                      ? 'bg-blue-50/50 dark:bg-blue-900/10 border-l-blue-600'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border-l-transparent'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`material-symbols-outlined text-[18px] ${color}`}>{icon}</span>
                      <span className="text-xs font-bold text-slate-500 uppercase">{conv.channel}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">{timeAgo(conv.last_message_at || conv.created_at)}</span>
                      {conv.unread_count > 0 && (
                        <span className="h-5 w-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-600 dark:text-slate-300 shrink-0">
                      {(conv.contact_name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                        {conv.contact_name || conv.contact_phone || 'Sin nombre'}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {conv.lead?.project?.name || conv.contact_phone || ''}
                      </p>
                    </div>
                  </div>
                  {conv.last_message && (
                    <p className={`text-sm line-clamp-1 ${conv.unread_count > 0 ? 'font-semibold text-slate-800 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}`}>
                      {conv.last_message}
                    </p>
                  )}
                  {conv.lead?.status && (
                    <div className="mt-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/30">
                        {conv.lead.status}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Center: Chat Area */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              <div className="text-center">
                <span className="material-symbols-outlined text-6xl mb-3 block">forum</span>
                <p className="text-lg font-medium">Selecciona una conversación</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300">
                    {(selected.contact_name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">
                      {selected.contact_name || selected.contact_phone}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className={`material-symbols-outlined text-[14px] ${platformIcon(selected.channel).color}`}>
                        {platformIcon(selected.channel).icon}
                      </span>
                      <span className="capitalize">{selected.channel}</span>
                      {selected.contact_phone && (
                        <>
                          <span>·</span>
                          <span>{selected.contact_phone}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                    <span className="material-symbols-outlined">info</span>
                  </button>
                  <button
                    onClick={() => {
                      fetch(`/api/conversations/${selected.id}/close`, { method: 'PATCH', headers })
                        .then(() => fetchConversations());
                    }}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    title="Cerrar conversación"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50 dark:bg-slate-900">
                {messages.length === 0 && (
                  <div className="text-center py-10 text-slate-400 text-sm">
                    No hay mensajes aún. Sé el primero en responder.
                  </div>
                )}

                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 max-w-2xl ${msg.sender_type === 'agent' || msg.sender_type === 'bot' ? 'ml-auto flex-row-reverse' : ''}`}
                  >
                    <div className="h-8 w-8 rounded-full shrink-0 mt-1 flex items-center justify-center text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      {(msg.sender_name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className={`flex flex-col gap-1 ${msg.sender_type !== 'user' ? 'items-end' : ''}`}>
                      <div className={`px-4 py-3 rounded-2xl text-sm shadow-sm ${
                        msg.sender_type === 'agent'
                          ? 'bg-blue-600 text-white rounded-tr-none'
                          : msg.sender_type === 'bot'
                          ? 'bg-purple-600 text-white rounded-tr-none'
                          : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-none'
                      }`}>
                        {msg.sender_type === 'bot' && (
                          <div className="flex items-center gap-1 mb-1 text-purple-200 text-[10px] font-bold">
                            <span className="material-symbols-outlined text-[12px]">smart_toy</span>
                            Agente IA
                          </div>
                        )}
                        <p className="leading-relaxed">{msg.content}</p>
                      </div>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        {new Date(msg.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                        {msg.sender_type === 'agent' && msg.is_read && (
                          <span className="material-symbols-outlined text-[13px] text-blue-400">done_all</span>
                        )}
                      </span>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* AI Suggestions */}
              <div className="px-6 pb-2 bg-white dark:bg-slate-900">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800/50 rounded-xl p-3 border border-blue-100 dark:border-slate-700">
                  <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-2">
                    <span className="material-symbols-outlined text-sm">smart_toy</span>
                    Sugerencias IA
                  </div>
                  <div className="flex gap-2 overflow-x-auto">
                    {[
                      'Gracias por contactarnos, con gusto le ayudo.',
                      'Le envío información del proyecto ahora.',
                      'Podemos agendar una visita esta semana.',
                    ].map((suggestion, i) => (
                      <button
                        key={i}
                        onClick={() => setMessageInput(suggestion)}
                        className="flex-shrink-0 bg-white dark:bg-slate-700 hover:border-blue-500 text-slate-700 dark:text-slate-200 text-xs py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm transition-all text-left"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Input */}
              <form onSubmit={sendMessage} className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                <div className="relative">
                  <textarea
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage(e);
                      }
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 pr-16 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none h-20"
                    placeholder="Escribe tu mensaje... (Enter para enviar)"
                    disabled={sending}
                  />
                  <div className="absolute bottom-3 right-3">
                    <button
                      type="submit"
                      disabled={!messageInput.trim() || sending}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-lg shadow-lg transition-all"
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {sending ? 'hourglass_empty' : 'send'}
                      </span>
                    </button>
                  </div>
                </div>
              </form>
            </>
          )}
        </div>

        {/* Right: Lead Details Panel */}
        <div className="w-72 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shrink-0 h-full overflow-y-auto hidden xl:block">
          {selected ? (
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="h-16 w-16 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-2xl font-bold text-slate-600 dark:text-slate-300 mx-auto mb-3">
                  {(selected.contact_name || '?').charAt(0).toUpperCase()}
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {selected.contact_name || 'Sin nombre'}
                </h3>
                <p className="text-sm text-slate-500">{selected.contact_phone || selected.contact_email}</p>
                <div className="flex justify-center gap-2 mt-4">
                  {selected.contact_phone && (
                    <a
                      href={`https://wa.me/${selected.contact_phone}`}
                      target="_blank"
                      rel="noreferrer"
                      className="h-8 w-8 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600 hover:bg-green-100 transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">chat</span>
                    </a>
                  )}
                  {selected.contact_email && (
                    <a
                      href={`mailto:${selected.contact_email}`}
                      className="h-8 w-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 hover:bg-blue-100 transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">mail</span>
                    </a>
                  )}
                </div>
              </div>

              <div className="mb-6">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Info del canal</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Canal</span>
                    <span className="font-semibold text-slate-900 dark:text-white capitalize">{selected.channel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Estado</span>
                    <span className={`font-semibold capitalize ${selected.status === 'open' ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {selected.status === 'open' ? 'Abierta' : 'Cerrada'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Mensajes</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{messages.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Inicio</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {new Date(selected.created_at).toLocaleDateString('es')}
                    </span>
                  </div>
                </div>
              </div>

              {selected.lead && (
                <div className="mb-6">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Lead Asociado</h4>
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 space-y-2 text-sm">
                    <p className="font-bold text-slate-900 dark:text-white">{selected.lead.name}</p>
                    {selected.lead.project && (
                      <p className="text-slate-500">{selected.lead.project.name}</p>
                    )}
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                      {selected.lead.status}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Acciones Rápidas</h4>
                <div className="space-y-2">
                  <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left group">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <span className="material-symbols-outlined text-sm">person_add</span>
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Convertir en Lead</span>
                  </button>
                  <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left group">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <span className="material-symbols-outlined text-sm">edit_calendar</span>
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Agendar Visita</span>
                  </button>
                  <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left group">
                    <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-600 flex items-center justify-center group-hover:bg-orange-600 group-hover:text-white transition-colors">
                      <span className="material-symbols-outlined text-sm">note_add</span>
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Agregar Nota</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">
              Selecciona una conversación
            </div>
          )}
        </div>

      </div>
    </CrmLayout>
  );
};

export default ConversationsPage;
