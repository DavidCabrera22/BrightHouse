import React, { useState } from 'react';
import CrmLayout from './CrmLayout';

// Mock Data
const conversations = [
  {
    id: 1,
    name: 'James Wilson',
    project: 'Skyline Tower',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBvq6dnXEo07po4xZVLeSTOkVcbQDNOJ8FSoZlKq9sARkeFjwLMNhrq_x4gsh93OJIxglexBJeCzT6yAy_mxNBmUAat7tYjqyoe5qvhB-Ax52WCO6r2Hrs0VQbWRK24IFESnyZbiwJuKEPUIIb70Se4N3qI_Mh9ZO4sWPRF42pTsjLCNA3BJRM7uA-GmV0F3h0CSrDd6TWPQW45toTL6ftVfWes2Rym1NxbgvIFRti3V00mu_Op5r76eD81VPAOvPZwr81tyypmQIA',
    platform: 'whatsapp',
    time: '2m ago',
    lastMessage: "I'm interested in the 3-bedroom unit facing the...",
    unread: true,
    tag: { label: 'Alta Intención', color: 'green' },
    status: 'online',
    messages: [
      { id: 1, text: "Hi, I was looking at the Skyline Tower project on your website. Is the 3-bedroom unit still available?", sender: 'user', time: '10:23 AM' },
      { id: 2, text: "Hello James! Yes, we have two 3-bedroom units currently available in Skyline Tower. One on the 15th floor and another on the 22nd with a panoramic view.", sender: 'agent', time: '10:25 AM', read: true },
      { id: 3, text: "That sounds great. I'm interested in the one with the panoramic view. What is the price range for that unit?", sender: 'user', time: '10:28 AM' },
      { id: 4, text: "Also, do you have floor plans?", sender: 'user', time: '10:28 AM' }
    ],
    details: {
      pipelineStage: 'Contactado',
      pipelineProgress: 40,
      aiProbability: '85% Alta',
      budget: '$450k - $500k',
      interests: ['Skyline Tower', '3 Habitaciones', 'Piso Alto', 'Parqueadero']
    }
  },
  {
    id: 2,
    name: 'Elena Rodriguez',
    project: 'Ocean Breeze',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBTHEokWid_cPEH67-s9-kG4_4ms0ZOE9W3yZX6XfhTT5rJBFMyJ2WrnyB8tnDr8nL1gzjJWAvhAodx9GdocWNzvKpfv02nNFwhELafK_Ry48JGDI4k5LMkmsyc6ioiLy7-u4dCcHGFvgZOAceRrUAEKHWgSv9k_DRjtqAJDQWZ9gKztrRBbGNeYu5r5Mrb73cruUEtbN0gTb7LDbWD0n40UrVo2ca8axwwGtGo1hdQlaMC5jgzvGI4kx_QmPNJh0-Z41weK-3iPog',
    platform: 'email',
    time: '1h ago',
    lastMessage: "Re: Contract details for unit 402",
    unread: false,
    tag: { label: 'Negociación', color: 'purple' },
    status: 'offline',
    messages: [],
    details: {
      pipelineStage: 'Negociación',
      pipelineProgress: 75,
      aiProbability: '60% Media',
      budget: '$300k - $350k',
      interests: ['Ocean Breeze', '2 Habitaciones']
    }
  },
  {
    id: 3,
    name: 'Michael Chang',
    project: 'Downtown Lofts',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD4_y7nCidMaQH4bqm04YVFFQVNP0xSxeOHQA2WA7uqeGWSED1BAcKCOtrzBxBWd6ETLzgB-vcu3E95JrKkbAAz7R4g4ZBHwoRii2rfAzNayu7YU43YtptoJ_frcvpS-Xl0l1ynX6-_mfgqeawVLtUAVpwTGHSPF9faVZ2YYN2SsPRFouL7wRHyKVSfPqrq0e4-SKf05GNdkiFsBpLJTPyIknVEuODhvAwpus6DB36lxZYnCiKccQ1UXtZeECMEEJyXoxBfovWC0c0',
    platform: 'webchat',
    time: '3h ago',
    lastMessage: "When can I schedule a visit?",
    unread: false,
    tag: null,
    status: 'offline',
    messages: [],
    details: {
      pipelineStage: 'Nuevo',
      pipelineProgress: 10,
      aiProbability: '40% Baja',
      budget: 'TBD',
      interests: ['Downtown Lofts']
    }
  },
  {
    id: 4,
    name: 'Sarah Jenkins',
    project: 'Green Valley',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAfY-LWG2qJgv1F_LBleZD7B6RofK6t68kr3nzyd9WLu0ln0m3YxVkG1tGbadq9NCUfrj_cYkLjFYOtpFAq3aHYAtz0mSkc5zLXlkXoXimIWGZvOY9mpstT-vXZdW5cRBbntR6ids4XBT1FJj9XX0P3SNl57pAJ6Q-4unOaFdDb44KwBIUBvFmSkAYVhkNso6Wx_PbI6MNowtM8cZOa86j24RrEW8GQFwnL36z6pSZ2XD8IOE5TViu6AVSOQdxdf54BZfnppU-l2xU',
    platform: 'whatsapp',
    time: '5h ago',
    lastMessage: "Is the price negotiable?",
    unread: false,
    tag: { label: 'Seguimiento', color: 'yellow' },
    status: 'online',
    messages: [],
    details: {
      pipelineStage: 'Interesado',
      pipelineProgress: 30,
      aiProbability: '50% Media',
      budget: '$200k - $250k',
      interests: ['Green Valley', 'Lote']
    }
  }
];

const ConversationsPage: React.FC = () => {
  const [selectedId, setSelectedId] = useState<number>(1);
  const [messageInput, setMessageInput] = useState('');

  const selectedConversation = conversations.find(c => c.id === selectedId) || conversations[0];

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'whatsapp': return { icon: 'chat', color: 'text-green-600' };
      case 'email': return { icon: 'mail', color: 'text-blue-600' };
      case 'webchat': return { icon: 'forum', color: 'text-orange-500' };
      default: return { icon: 'chat', color: 'text-slate-400' };
    }
  };

  const getTagStyle = (color: string) => {
    switch (color) {
      case 'green': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'purple': return 'bg-purple-50 text-purple-600 border-purple-100';
      case 'yellow': return 'bg-yellow-50 text-yellow-600 border-yellow-100';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <CrmLayout 
      title="Bandeja de Entrada Inteligente" 
      subtitle="En línea"
      actions={
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-3">
            <div className="relative">
              <input 
                className="appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-64" 
                placeholder="Buscar conversaciones..." 
                type="text"
              />
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none">search</span>
            </div>
            <button className="relative p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 border border-white"></span>
            </button>
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2 px-4 rounded-lg shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">add_comment</span>
            <span>Nuevo Chat</span>
          </button>
        </div>
      }
    >
      <div className="flex h-[calc(100vh-8rem)] -m-6 mt-0 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        
        {/* Left Panel: Conversation List */}
        <div className="w-80 lg:w-96 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shrink-0 h-full">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex gap-2 mb-4">
              <button className="flex-1 py-1.5 px-3 bg-blue-50 text-blue-600 text-sm font-semibold rounded-lg">Todos (12)</button>
              <button className="flex-1 py-1.5 px-3 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 text-sm font-medium rounded-lg transition-colors">No leídos (4)</button>
              <button className="flex-1 py-1.5 px-3 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 text-sm font-medium rounded-lg transition-colors">Prioridad</button>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Ordenado por: Última actividad</span>
              <span className="material-symbols-outlined text-sm cursor-pointer">sort</span>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {conversations.map(conv => (
              <div 
                key={conv.id}
                onClick={() => setSelectedId(conv.id)}
                className={`p-4 border-b border-slate-100 dark:border-slate-800 cursor-pointer transition-all border-l-4 ${
                  selectedId === conv.id 
                    ? 'bg-blue-50/50 dark:bg-blue-900/10 border-l-blue-600' 
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border-l-transparent'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`material-symbols-outlined text-[18px] ${getPlatformIcon(conv.platform).color}`}>
                      {getPlatformIcon(conv.platform).icon}
                    </span>
                    <span className="text-xs font-bold text-slate-500 uppercase">{conv.platform}</span>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">{conv.time}</span>
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="relative">
                    <div className="h-10 w-10 rounded-full bg-cover bg-center" style={{ backgroundImage: `url('${conv.avatar}')` }}></div>
                    {conv.status === 'online' && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">{conv.name}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{conv.project}</p>
                  </div>
                </div>
                <p className={`text-sm text-slate-600 dark:text-slate-300 line-clamp-1 ${conv.unread ? 'font-semibold' : ''}`}>
                  {conv.lastMessage}
                </p>
                {conv.tag && (
                  <div className="mt-2 flex gap-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${getTagStyle(conv.tag.color)}`}>
                      <span className="material-symbols-outlined text-[12px]">
                        {conv.tag.color === 'green' ? 'verified' : conv.tag.color === 'purple' ? 'gavel' : 'warning'}
                      </span> 
                      {conv.tag.label}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Center Panel: Chat Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 dark:bg-slate-900 relative">
          {/* Chat Header */}
          <div className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 shrink-0">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="h-10 w-10 rounded-full bg-cover bg-center" style={{ backgroundImage: `url('${selectedConversation.avatar}')` }}></div>
                {selectedConversation.status === 'online' && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
                )}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">{selectedConversation.name}</h3>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500 dark:text-slate-400">
                    {selectedConversation.status === 'online' ? 'Activo ahora' : 'Desconectado'}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                  <span className="text-blue-600 font-medium flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">auto_awesome</span> 
                    {selectedConversation.details.aiProbability}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                <span className="material-symbols-outlined">call</span>
              </button>
              <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                <span className="material-symbols-outlined">videocam</span>
              </button>
              <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                <span className="material-symbols-outlined">more_vert</span>
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="text-center">
              <span className="bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs px-3 py-1 rounded-full">Hoy, 10:23 AM</span>
            </div>
            
            {selectedConversation.messages.length > 0 ? selectedConversation.messages.map(msg => (
              <div key={msg.id} className={`flex gap-4 max-w-3xl ${msg.sender === 'agent' ? 'ml-auto flex-row-reverse' : ''}`}>
                <div className="h-8 w-8 rounded-full bg-cover bg-center shrink-0 mt-1" style={{ 
                  backgroundImage: `url('${msg.sender === 'agent' ? 'https://lh3.googleusercontent.com/aida-public/AB6AXuCDMl7NHgbZTmHrb3U_hjKVEW3STg5rbFQWqPvSB5qckMDU_imzoTJijMCE-K_5KfQrcK-ds87qhNTSTENMUnI4zul2Sr9G7QVamTkye6VfEK_Y9rcfRbGb2OScNJWm0mYDx9_fD9_Nj2dp1QqLyAeCW_LCkb6kGYwXZH8U_NHk-Yt2opaMhahjizscj5PpBqf8mcJVJfOUK3UstGzjCcDW3Sanm8Doy6kEGUQFFLKOq-_opEyjp50s3rUYuu-GVaRSOo-Ry7B_7eY' : selectedConversation.avatar}')` 
                }}></div>
                <div className={`flex flex-col gap-1 ${msg.sender === 'agent' ? 'items-end' : ''}`}>
                  <div className={`p-4 rounded-2xl shadow-sm text-sm leading-relaxed ${
                    msg.sender === 'agent' 
                      ? 'bg-blue-600 text-white rounded-tr-none shadow-blue-600/20' 
                      : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-none'
                  }`}>
                    <p>{msg.text}</p>
                  </div>
                  <span className={`text-xs text-slate-400 flex items-center gap-1 ${msg.sender === 'agent' ? 'mr-1' : 'ml-1'}`}>
                    {msg.time}
                    {msg.sender === 'agent' && msg.read && <span className="material-symbols-outlined text-[14px]">done_all</span>}
                  </span>
                </div>
              </div>
            )) : (
              <div className="text-center py-10 text-slate-400">
                <p>No hay mensajes en esta conversación.</p>
              </div>
            )}
          </div>

          {/* AI Suggestions & Input */}
          <div className="px-6 pb-2">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800/50 rounded-xl p-3 border border-blue-100 dark:border-slate-700 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider">
                  <span className="material-symbols-outlined text-sm">smart_toy</span> Asistente IA
                </div>
                <button className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">Ocultar</button>
              </div>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                <button className="flex-shrink-0 bg-white dark:bg-slate-700 hover:border-blue-500 text-slate-700 dark:text-slate-200 text-xs py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm transition-all text-left">
                  <span className="font-bold block mb-0.5">Sugerir Respuesta</span>
                  "La unidad en el piso 22 está listada en $450k..."
                </button>
                <button className="flex-shrink-0 bg-white dark:bg-slate-700 hover:border-blue-500 text-slate-700 dark:text-slate-200 text-xs py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm transition-all text-left">
                  <span className="font-bold block mb-0.5">Compartir Documento</span>
                  Planos Skyline Tower PDF
                </button>
                <button className="flex-shrink-0 bg-white dark:bg-slate-700 hover:border-blue-500 text-slate-700 dark:text-slate-200 text-xs py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm transition-all text-left">
                  <span className="font-bold block mb-0.5">Agendar Visita</span>
                  Proponer horarios para este viernes
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 pt-2 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
            <div className="relative">
              <textarea 
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 pr-12 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none h-24" 
                placeholder="Escribe tu mensaje..."
              ></textarea>
              <div className="absolute bottom-3 left-3 flex items-center gap-2">
                <button className="text-slate-400 hover:text-blue-600 transition-colors"><span className="material-symbols-outlined text-[20px]">attach_file</span></button>
                <button className="text-slate-400 hover:text-blue-600 transition-colors"><span className="material-symbols-outlined text-[20px]">mood</span></button>
                <button className="text-slate-400 hover:text-blue-600 transition-colors"><span className="material-symbols-outlined text-[20px]">mic</span></button>
              </div>
              <div className="absolute bottom-3 right-3">
                <button className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">send</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Details (Hidden on smaller screens) */}
        <div className="w-80 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shrink-0 h-full overflow-y-auto hidden xl:block">
          <div className="p-6">
            <div className="text-center mb-6">
              <div className="h-20 w-20 rounded-full bg-cover bg-center mx-auto mb-3 ring-4 ring-slate-50 dark:ring-slate-800" style={{ backgroundImage: `url('${selectedConversation.avatar}')` }}></div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{selectedConversation.name}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Arquitecto • New York, NY</p>
              <div className="flex justify-center gap-3 mt-4">
                <button className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                  <span className="material-symbols-outlined text-sm">mail</span>
                </button>
                <button className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                  <span className="material-symbols-outlined text-sm">call</span>
                </button>
                <button className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                  <span className="material-symbols-outlined text-sm">calendar_month</span>
                </button>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Estado Comercial</h4>
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">Etapa del Pipeline</span>
                    <span className="font-bold text-slate-900 dark:text-white">{selectedConversation.details.pipelineStage}</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-blue-600 h-full rounded-full" style={{ width: `${selectedConversation.details.pipelineProgress}%` }}></div>
                  </div>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-slate-500">Probabilidad IA</span>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/30">
                    {selectedConversation.details.aiProbability}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Presupuesto</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{selectedConversation.details.budget}</span>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Intereses</h4>
              <div className="flex flex-wrap gap-2">
                {selectedConversation.details.interests.map((interest, idx) => (
                  <span key={idx} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium rounded-md">
                    {interest}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Acciones Rápidas</h4>
              <div className="space-y-2">
                <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left group">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-sm">edit_calendar</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Agendar Visita</span>
                    <span className="text-xs text-slate-400">Añadir al calendario</span>
                  </div>
                </button>
                <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left group">
                  <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 flex items-center justify-center group-hover:bg-green-600 group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Mover Etapa</span>
                    <span className="text-xs text-slate-400">Actualizar a 'Calificado'</span>
                  </div>
                </button>
                <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left group">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-600 flex items-center justify-center group-hover:bg-orange-600 group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-sm">note_add</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Agregar Nota</span>
                    <span className="text-xs text-slate-400">Nota interna</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </CrmLayout>
  );
};

export default ConversationsPage;