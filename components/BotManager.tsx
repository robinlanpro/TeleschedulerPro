import React, { useState } from 'react';
import { Bot, UserRole, User } from '../types';
import { Power, Plus, Bot as BotIcon, Key, MessageCircle, Trash2, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

interface BotManagerProps {
  bots: Bot[];
  users: User[];
  userRole: UserRole;
  onToggleBot: (botId: string) => void;
  onAddBot: (newBot: Omit<Bot, 'id' | 'messagesSentToday'>) => void;
  onDeleteBot: (botId: string) => void;
  onAssignBot?: (botId: string, userId: string) => void;
}

export const BotManager: React.FC<BotManagerProps> = ({ 
  bots, 
  users, 
  userRole, 
  onToggleBot, 
  onAddBot, 
  onDeleteBot,
  onAssignBot 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBotName, setNewBotName] = useState('');
  const [newBotUsername, setNewBotUsername] = useState('');
  const [newBotToken, setNewBotToken] = useState('');
  const [newBotChatId, setNewBotChatId] = useState('');
  const [assignToUser, setAssignToUser] = useState('');
  
  // Test Connection State
  const [testStatus, setTestStatus] = useState<{[key: string]: 'IDLE' | 'TESTING' | 'SUCCESS' | 'ERROR'}>({});
  const [testMessage, setTestMessage] = useState<{[key: string]: string}>({});

  const handleAddBot = (e: React.FormEvent) => {
    e.preventDefault();
    onAddBot({
      name: newBotName,
      username: newBotUsername.startsWith('@') ? newBotUsername : `@${newBotUsername}`,
      token: newBotToken,
      chatId: newBotChatId,
      status: 'ACTIVE',
      assignedToUserId: assignToUser || undefined
    });
    setNewBotName('');
    setNewBotUsername('');
    setNewBotToken('');
    setNewBotChatId('');
    setAssignToUser('');
    setIsModalOpen(false);
  };

  const testConnection = async (botId: string, token: string, chatId: string) => {
    setTestStatus(prev => ({ ...prev, [botId]: 'TESTING' }));
    setTestMessage(prev => ({ ...prev, [botId]: '' }));

    try {
        // 1. Check Bot Info
        const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
        const meData = await meRes.json();
        
        if (!meData.ok) {
            throw new Error(`Invalid Token: ${meData.description}`);
        }

        // 2. Try to Send Silent Message (Optional, but verifies Chat ID permissions)
        const sendRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: "🤖 TeleScheduler Connection Test: Success!",
                disable_notification: true
            })
        });
        const sendData = await sendRes.json();

        if (!sendData.ok) {
             throw new Error(`Chat Error: ${sendData.description}. Ensure bot is Admin.`);
        }

        setTestStatus(prev => ({ ...prev, [botId]: 'SUCCESS' }));
    } catch (err: any) {
        setTestStatus(prev => ({ ...prev, [botId]: 'ERROR' }));
        setTestMessage(prev => ({ ...prev, [botId]: err.message || "Connection failed" }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Bot Management</h2>
          <p className="text-slate-600">Configure your Telegram bots and target groups</p>
        </div>
        {(userRole === UserRole.ADMIN || userRole === UserRole.OWNER) && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-telegram-600 hover:bg-telegram-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm font-medium"
          >
            <Plus size={20} />
            <span>Connect Bot</span>
          </button>
        )}
      </div>

      {bots.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
          <BotIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900">No Bots Configured</h3>
          <p className="text-slate-600 max-w-sm mx-auto mt-2">
            Connect a Telegram bot by providing its API Token and the Chat ID of the group you want to post to.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bots.map((bot) => (
            <div key={bot.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-telegram-50 text-telegram-600 flex items-center justify-center">
                      <BotIcon size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{bot.name}</h3>
                      <p className="text-sm text-slate-500 font-medium">{bot.username}</p>
                    </div>
                  </div>
                  {userRole === UserRole.ADMIN && (
                     <button 
                       onClick={() => onDeleteBot(bot.id)}
                       className="text-slate-400 hover:text-red-500 transition-colors"
                       title="Delete Bot"
                     >
                       <Trash2 size={20} />
                     </button>
                  )}
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex flex-col gap-1 text-xs bg-slate-50 p-3 rounded border border-slate-100">
                    <div className="flex items-center gap-2 text-slate-700 font-medium">
                        <Key size={14} className="text-slate-400" />
                        <span>Token Snippet:</span>
                    </div>
                    <span className="font-mono text-slate-500 pl-6 break-all">...{bot.token.slice(-10)}</span>
                  </div>
                  
                  <div className="flex flex-col gap-1 text-xs bg-slate-50 p-3 rounded border border-slate-100">
                     <div className="flex items-center gap-2 text-slate-700 font-medium">
                        <MessageCircle size={14} className="text-slate-400" />
                        <span>Target Chat ID:</span>
                     </div>
                     <span className="font-mono text-slate-500 pl-6">{bot.chatId}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                   <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${bot.status === 'ACTIVE' ? 'bg-green-500' : 'bg-slate-300'}`} />
                        <span className={`text-sm font-semibold ${bot.status === 'ACTIVE' ? 'text-green-700' : 'text-slate-500'}`}>
                            {bot.status === 'ACTIVE' ? 'Operational' : 'Stopped'}
                        </span>
                   </div>
                   
                   {/* Test Connection Button */}
                   <button 
                     onClick={() => testConnection(bot.id, bot.token, bot.chatId)}
                     disabled={testStatus[bot.id] === 'TESTING'}
                     className="text-xs px-2 py-1 bg-white border border-slate-200 rounded hover:bg-slate-50 text-slate-600 font-medium flex items-center gap-1"
                   >
                     {testStatus[bot.id] === 'TESTING' ? (
                         <Loader2 size={12} className="animate-spin" />
                     ) : (
                         testStatus[bot.id] === 'SUCCESS' ? <CheckCircle size={12} className="text-green-500" /> : <Power size={12} />
                     )}
                     Test Link
                   </button>
                </div>
                
                {testStatus[bot.id] === 'ERROR' && (
                    <div className="mb-4 p-2 bg-red-50 text-red-600 text-xs rounded border border-red-100 flex gap-2 items-start">
                        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                        <span>{testMessage[bot.id]}</span>
                    </div>
                )}
                
                {testStatus[bot.id] === 'SUCCESS' && (
                    <div className="mb-4 p-2 bg-green-50 text-green-700 text-xs rounded border border-green-100 flex gap-2 items-center">
                        <CheckCircle size={14} />
                        <span>Bot connected & message sent!</span>
                    </div>
                )}

                <div className="border-t border-slate-100 pt-4">
                   {userRole === UserRole.ADMIN && (
                     <div className="mb-4">
                       <label className="text-xs font-bold text-slate-700 mb-1 block">Assigned User</label>
                       <select 
                         value={bot.assignedToUserId || ''}
                         onChange={(e) => onAssignBot && onAssignBot(bot.id, e.target.value)}
                         className="w-full text-sm p-2 border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:border-telegram-500"
                       >
                         <option value="">-- Unassigned --</option>
                         {users.map(u => (
                           <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                         ))}
                       </select>
                     </div>
                   )}

                   <div className="flex justify-between items-center">
                      {userRole === UserRole.ADMIN && (
                          <button 
                          onClick={() => onToggleBot(bot.id)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-colors w-full justify-center shadow-sm ${
                              bot.status === 'ACTIVE' 
                              ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200' 
                              : 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-200'
                          }`}
                          >
                          <Power size={16} />
                          {bot.status === 'ACTIVE' ? 'Stop Bot Scheduler' : 'Start Bot Scheduler'}
                          </button>
                      )}
                   </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto border border-slate-100">
            <h3 className="text-xl font-bold mb-1 text-slate-900">Connect New Bot</h3>
            <p className="text-sm text-slate-500 mb-6">Enter the details from BotFather</p>
            
            <form onSubmit={handleAddBot} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Bot Name</label>
                <input
                  type="text"
                  required
                  value={newBotName}
                  onChange={(e) => setNewBotName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-telegram-500 outline-none text-slate-900 placeholder-slate-400"
                  placeholder="e.g. Marketing Bot 1"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Bot Username</label>
                <input
                  type="text"
                  required
                  value={newBotUsername}
                  onChange={(e) => setNewBotUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-telegram-500 outline-none text-slate-900 placeholder-slate-400"
                  placeholder="@my_bot"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Bot API Token</label>
                <input
                  type="text"
                  required
                  value={newBotToken}
                  onChange={(e) => setNewBotToken(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-telegram-500 outline-none font-mono text-sm text-slate-700"
                  placeholder="123456:ABC-DEF1234..."
                />
                <p className="text-xs text-slate-500 mt-1">Found in @BotFather</p>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Target Chat ID</label>
                <input
                  type="text"
                  required
                  value={newBotChatId}
                  onChange={(e) => setNewBotChatId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-telegram-500 outline-none font-mono text-sm text-slate-700"
                  placeholder="-100123456789"
                />
                <p className="text-xs text-slate-500 mt-1">The ID of the group/channel (must start with -100 for supergroups)</p>
              </div>

              {userRole === UserRole.ADMIN && (
                 <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Assign to User (Optional)</label>
                    <select
                        value={assignToUser}
                        onChange={(e) => setAssignToUser(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-telegram-500 outline-none bg-white text-slate-700"
                    >
                        <option value="">-- Myself (Admin) --</option>
                        {users.map(u => (
                            <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                        ))}
                    </select>
                 </div>
              )}

              <div className="flex gap-3 pt-6 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-telegram-600 text-white font-bold rounded-lg hover:bg-telegram-700 transition-colors shadow-lg shadow-telegram-500/30"
                >
                  Connect Bot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};