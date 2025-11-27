import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { PostScheduler } from './components/PostScheduler';
import { BotManager } from './components/BotManager';
import { DashboardStats } from './components/DashboardStats';
import { UserManagement } from './components/UserManagement';
import { User, UserRole, Bot, Post, PostStatus, PostType } from './types';
import { Menu, X, Shield, Lock, Eye, EyeOff, Info, Wifi } from 'lucide-react';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // App State
  const [currentView, setCurrentView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Real Data State (Initialized empty)
  const [bots, setBots] = useState<Bot[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastProcessTime, setLastProcessTime] = useState<Date | null>(null);

  // --- Initialization & Persistence ---

  useEffect(() => {
    // Load from LocalStorage
    const storedUserSession = localStorage.getItem('tsp_session');
    const storedBots = localStorage.getItem('tsp_bots');
    const storedPosts = localStorage.getItem('tsp_posts');
    const storedUsers = localStorage.getItem('tsp_users');

    if (storedUserSession) setUser(JSON.parse(storedUserSession));
    if (storedBots) setBots(JSON.parse(storedBots));
    if (storedPosts) setPosts(JSON.parse(storedPosts));
    if (storedUsers) {
        setUsers(JSON.parse(storedUsers));
    } else {
        // Initialize Default Admin if no users exist
        const defaultAdmin: User = { 
            id: 'admin-1', 
            name: 'System Admin', 
            email: 'gokungweiming@gmail.com', 
            role: UserRole.ADMIN,
            password: 'Google@1234' 
        };
        setUsers([defaultAdmin]);
    }

    setIsInitialized(true);
  }, []);

  // Save to LocalStorage on change
  useEffect(() => {
    if (!isInitialized) return;
    if (user) localStorage.setItem('tsp_session', JSON.stringify(user));
    else localStorage.removeItem('tsp_session');
  }, [user, isInitialized]);

  useEffect(() => {
    if (isInitialized) localStorage.setItem('tsp_bots', JSON.stringify(bots));
  }, [bots, isInitialized]);

  useEffect(() => {
    if (isInitialized) localStorage.setItem('tsp_posts', JSON.stringify(posts));
  }, [posts, isInitialized]);

  useEffect(() => {
    if (isInitialized) localStorage.setItem('tsp_users', JSON.stringify(users));
  }, [users, isInitialized]);


  // --- SCHEDULER LOGIC ---
  
  // Helper to convert Base64 DataURI to Blob for uploading to Telegram
  const dataURLtoBlob = (dataurl: string) => {
    try {
        const arr = dataurl.split(',');
        const mimeMatch = arr[0].match(/:(.*?);/);
        if (!mimeMatch) return null;
        
        const mime = mimeMatch[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    } catch (e) {
        console.error("Error converting data URL", e);
        return null;
    }
  };

  useEffect(() => {
    if (!isInitialized || bots.length === 0 || posts.length === 0) return;

    const checkAndSendPosts = async () => {
        setIsProcessing(true);
        const now = new Date();
        const updatedPosts = [...posts];
        let hasChanges = false;
        const updatedBots = [...bots];
        let hasBotChanges = false;

        for (let i = 0; i < updatedPosts.length; i++) {
            const post = updatedPosts[i];
            
            // Criteria: Scheduled status AND Time has passed/is now
            if (post.status === PostStatus.SCHEDULED && new Date(post.scheduledTime) <= now) {
                const bot = updatedBots.find(b => b.id === post.botId);
                
                if (bot && bot.status === 'ACTIVE') {
                    try {
                        let success = false;
                        const formData = new FormData();
                        formData.append('chat_id', bot.chatId);

                        // 1. Handle Text Posts
                        if (post.type === PostType.TEXT) {
                            const response = await fetch(`https://api.telegram.org/bot${bot.token}/sendMessage`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    chat_id: bot.chatId,
                                    text: post.content,
                                    parse_mode: 'HTML'
                                })
                            });
                            const data = await response.json();
                            success = data.ok;
                            if (!success) console.error("Telegram API Error:", data);
                        } 
                        // 2. Handle Image/Video Posts
                        else if ((post.type === PostType.IMAGE || post.type === PostType.VIDEO) && post.mediaUrl) {
                            const blob = dataURLtoBlob(post.mediaUrl);
                            if (blob) {
                                formData.append('caption', post.content || '');
                                formData.append('parse_mode', 'HTML');
                                
                                const method = post.type === PostType.IMAGE ? 'sendPhoto' : 'sendVideo';
                                const fileField = post.type === PostType.IMAGE ? 'photo' : 'video';
                                
                                // Fix: Provide a filename so Telegram recognizes the file type correctly
                                const ext = blob.type.split('/')[1] || 'bin';
                                const filename = `upload.${ext}`;
                                
                                formData.append(fileField, blob, filename);

                                const response = await fetch(`https://api.telegram.org/bot${bot.token}/${method}`, {
                                    method: 'POST',
                                    body: formData
                                });
                                const data = await response.json();
                                success = data.ok;
                                if (!success) console.error(`Telegram API Error (${method}):`, data);
                            } else {
                                console.error("Failed to process media file");
                            }
                        }

                        if (success) {
                            updatedPosts[i] = { ...post, status: PostStatus.SENT };
                            // Find bot index to update stats
                            const botIndex = updatedBots.findIndex(b => b.id === bot.id);
                            if (botIndex >= 0) {
                                updatedBots[botIndex] = {
                                    ...updatedBots[botIndex],
                                    messagesSentToday: (updatedBots[botIndex].messagesSentToday || 0) + 1
                                };
                                hasBotChanges = true;
                            }
                            
                            // Handle Repeating Posts
                            if (post.repeat !== 'NONE') {
                                const nextTime = new Date(post.scheduledTime);
                                if (post.repeat === 'HOURLY') nextTime.setHours(nextTime.getHours() + 1);
                                if (post.repeat === 'DAILY') nextTime.setDate(nextTime.getDate() + 1);
                                if (post.repeat === 'WEEKLY') nextTime.setDate(nextTime.getDate() + 7);

                                const newPost: Post = {
                                    ...post,
                                    id: crypto.randomUUID(),
                                    scheduledTime: nextTime.toISOString(),
                                    status: PostStatus.SCHEDULED
                                };
                                updatedPosts.push(newPost);
                            }
                        } else {
                            updatedPosts[i] = { ...post, status: PostStatus.FAILED };
                        }
                    } catch (error) {
                        console.error("Network or Logic Error:", error);
                        updatedPosts[i] = { ...post, status: PostStatus.FAILED };
                    }
                    hasChanges = true;
                } else {
                    // Bot inactive or deleted, mark failed
                    updatedPosts[i] = { ...post, status: PostStatus.FAILED };
                    hasChanges = true;
                }
            }
        }

        if (hasChanges) setPosts(updatedPosts);
        if (hasBotChanges) setBots(updatedBots);
        
        setLastProcessTime(new Date());
        setIsProcessing(false);
    };

    // Run every 30 seconds
    const intervalId = setInterval(checkAndSendPosts, 30000);
    return () => clearInterval(intervalId);

  }, [posts, bots, isInitialized]);


  // --- Handlers ---

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const foundUser = users.find(u => u.email === email && u.password === password);

    if (foundUser) {
      // Remove password from session state for security (even though it's local)
      const { password, ...sessionUser } = foundUser;
      setUser(sessionUser as User);
      setLoginError('');
    } else {
      setLoginError('Invalid email or password.');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setEmail('');
    setPassword('');
    setCurrentView('dashboard');
  };

  // Bot Handlers
  const handleToggleBot = (botId: string) => {
    if (user?.role === UserRole.CLIENT) return;
    setBots(prev => prev.map(b => 
      b.id === botId ? { ...b, status: b.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' } : b
    ));
  };

  const handleAddBot = (newBot: Omit<Bot, 'id' | 'messagesSentToday'>) => {
    const bot: Bot = {
      ...newBot,
      id: crypto.randomUUID(),
      messagesSentToday: 0
    };
    setBots([...bots, bot]);
  };

  const handleDeleteBot = (botId: string) => {
    if (confirm('Are you sure you want to delete this bot? Associated posts will remain.')) {
        setBots(prev => prev.filter(b => b.id !== botId));
    }
  };

  const handleAssignBot = (botId: string, userId: string) => {
      setBots(prev => prev.map(b => b.id === botId ? { ...b, assignedToUserId: userId } : b));
  };

  // Post Handlers
  const handleSchedulePost = (newPost: Omit<Post, 'id'>) => {
    const post: Post = {
      ...newPost,
      id: crypto.randomUUID(),
      createdByUserId: user?.id || ''
    };
    setPosts([...posts, post]);
  };

  // User Management Handlers
  const handleAddUser = (newUser: Omit<User, 'id'>) => {
      const user: User = {
          ...newUser,
          id: crypto.randomUUID()
      };
      setUsers([...users, user]);
  };

  const handleDeleteUser = (userId: string) => {
      if (confirm('Are you sure? This action cannot be undone.')) {
          setUsers(prev => prev.filter(u => u.id !== userId));
      }
  };


  // --- Logic for Views ---

  // Filter bots based on user role
  const getVisibleBots = () => {
      if (!user) return [];
      if (user.role === UserRole.ADMIN) return bots;
      // Owners/Clients see bots assigned to them OR bots they created (conceptually)
      return bots.filter(b => b.assignedToUserId === user.id);
  };

  // Filter posts based on user role
  const getVisiblePosts = () => {
      const visibleBots = getVisibleBots().map(b => b.id);
      return posts.filter(p => visibleBots.includes(p.botId));
  };


  // --- Render ---

  if (!isInitialized) return null;

  // Login Screen
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-telegram-600 p-8 text-center">
             <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 text-white">
                <Shield size={32} />
             </div>
             <h1 className="text-2xl font-bold text-white">TeleScheduler Pro</h1>
             <p className="text-telegram-100 mt-2">Secure Admin Portal</p>
          </div>
          
          <div className="p-8">
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-telegram-500 outline-none"
                  placeholder="Enter your email"
                  required
                />
              </div>
              <div className="relative">
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-telegram-500 outline-none"
                  placeholder="Enter your password"
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-9 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              {loginError && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
                  <Lock size={16} />
                  {loginError}
                </div>
              )}

              <button 
                type="submit"
                className="w-full bg-telegram-600 hover:bg-telegram-700 text-white font-semibold py-3 rounded-lg transition-colors shadow-lg shadow-telegram-900/20"
              >
                Log In
              </button>
            </form>
            <div className="mt-4 text-xs text-slate-400 text-center">
                System configured for GMT+8 Timezone
            </div>
          </div>
        </div>
      </div>
    );
  }

  const visibleBots = getVisibleBots();
  const visiblePosts = getVisiblePosts();

  // Main App
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar 
        currentUser={user} 
        currentView={currentView} 
        onChangeView={(view) => { setCurrentView(view); setIsSidebarOpen(false); }}
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden w-full relative">
        {/* Mobile Header */}
        <header className="bg-white border-b border-slate-200 p-4 flex items-center justify-between md:hidden z-10">
          <div className="font-bold text-slate-800">TeleScheduler</div>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-600">
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            
            {/* System Status Bar for Admin/Owner */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center text-sm text-slate-500">
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
                    <Wifi size={14} className={isProcessing ? "text-green-500 animate-pulse" : "text-slate-400"} />
                    <span>Scheduler Service: <span className="font-semibold text-slate-700">Active</span></span>
                </div>
                {lastProcessTime && (
                    <span className="text-xs">Last check: {lastProcessTime.toLocaleTimeString()}</span>
                )}
            </div>

            {/* Context Info for Client/Owner */}
            {user.role !== UserRole.ADMIN && visibleBots.length === 0 && currentView !== 'dashboard' && (
                <div className="mb-6 p-4 bg-blue-50 text-blue-800 rounded-lg flex items-center gap-2">
                    <Info size={20} />
                    <p>No bots are currently assigned to you. Please contact an administrator.</p>
                </div>
            )}

            {currentView === 'dashboard' && (
              <div className="space-y-6">
                <div className="flex justify-between items-end">
                   <div>
                      <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Dashboard</h1>
                      <p className="text-slate-500">Overview for {user.name}</p>
                   </div>
                   <div className="text-right hidden sm:block">
                     <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">System Time</p>
                     <p className="text-sm font-bold text-slate-800">GMT+8 (Asia/Singapore)</p>
                   </div>
                </div>
                <DashboardStats 
                  posts={visiblePosts}
                  bots={visibleBots}
                />
              </div>
            )}

            {currentView === 'bots' && (
              <BotManager 
                bots={visibleBots}
                users={users}
                userRole={user.role} 
                onToggleBot={handleToggleBot}
                onAddBot={handleAddBot}
                onDeleteBot={handleDeleteBot}
                onAssignBot={handleAssignBot}
              />
            )}

            {currentView === 'scheduler' && (
              <PostScheduler 
                bots={visibleBots} 
                posts={visiblePosts} 
                userRole={user.role} 
                onSchedulePost={handleSchedulePost}
              />
            )}

            {currentView === 'users' && user.role === UserRole.ADMIN && (
               <UserManagement 
                  users={users}
                  currentUser={user}
                  onAddUser={handleAddUser}
                  onDeleteUser={handleDeleteUser}
               />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;