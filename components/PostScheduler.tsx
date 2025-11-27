import React, { useState } from 'react';
import { Bot, Post, PostType, PostStatus, UserRole } from '../types';
import { Calendar as CalendarIcon, Image as ImageIcon, Video, Link, Sparkles, Clock, RefreshCw, Bot as BotIcon, X } from 'lucide-react';
import { generatePostCaption, analyzePostPerformance } from '../services/geminiService';

interface PostSchedulerProps {
  bots: Bot[];
  posts: Post[];
  userRole: UserRole;
  onSchedulePost: (post: Omit<Post, 'id'>) => void;
}

export const PostScheduler: React.FC<PostSchedulerProps> = ({ bots, posts, userRole, onSchedulePost }) => {
  const [selectedBotId, setSelectedBotId] = useState<string>(bots[0]?.id || '');
  const [content, setContent] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [postType, setPostType] = useState<PostType>(PostType.TEXT);
  const [repeat, setRepeat] = useState<'NONE' | 'HOURLY' | 'DAILY' | 'WEEKLY'>('NONE');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [mediaFile, setMediaFile] = useState<{name: string, data: string} | null>(null);

  // Helper to format date for display in GMT+8
  const formatDateGMT8 = (isoString: string) => {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Singapore', // Representative of GMT+8
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    }).format(date);
  };

  const handleAiGenerate = async () => {
    if (!content && !selectedBotId) return;
    setIsGenerating(true);
    const topic = content || "Daily update for our community";
    const newCaption = await generatePostCaption(topic);
    setContent(newCaption);
    setIsGenerating(false);
  };

  const handleAiAnalyze = async () => {
    if(!content) return;
    setIsGenerating(true);
    const analysis = await analyzePostPerformance(content);
    setAiAnalysis(analysis);
    setIsGenerating(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        // Reduced to 1MB to prevent LocalStorage Quota Exceeded errors since Base64 adds ~33% overhead
        if (file.size > 1 * 1024 * 1024) {
            alert("File too large. To ensure data persistence in this browser-based app, please use files under 1MB.");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setMediaFile({
                name: file.name,
                data: reader.result as string
            });
        };
        reader.readAsDataURL(file);
    }
  };

  const clearFile = (e: React.MouseEvent) => {
      e.stopPropagation();
      setMediaFile(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSchedulePost({
      botId: selectedBotId,
      content,
      type: postType,
      scheduledTime: new Date(scheduledTime).toISOString(),
      status: PostStatus.SCHEDULED,
      repeat,
      createdByUserId: 'current',
      mediaUrl: mediaFile?.data
    });
    // Reset form
    setContent('');
    setScheduledTime('');
    setAiAnalysis('');
    setMediaFile(null);
  };

  const canEdit = userRole === UserRole.ADMIN || userRole === UserRole.OWNER;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Creation Form */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Schedule New Post</h2>
          
          {canEdit ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Bot Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Select Bot</label>
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {bots.filter(b => b.status === 'ACTIVE').map((bot) => (
                    <button
                      key={bot.id}
                      type="button"
                      onClick={() => setSelectedBotId(bot.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all whitespace-nowrap ${
                        selectedBotId === bot.id
                          ? 'bg-telegram-50 border-telegram-500 text-telegram-700'
                          : 'border-slate-200 hover:border-telegram-300'
                      }`}
                    >
                      <BotIcon size={18} />
                      {bot.name}
                    </button>
                  ))}
                  {bots.filter(b => b.status === 'ACTIVE').length === 0 && (
                      <div className="text-sm text-slate-400 italic py-2">No active bots available. Enable a bot in Bot Manager.</div>
                  )}
                </div>
              </div>

              {/* Content Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Post Type</label>
                <div className="flex gap-2">
                  {[
                    { type: PostType.TEXT, icon: Link, label: 'Text / Link' },
                    { type: PostType.IMAGE, icon: ImageIcon, label: 'Image' },
                    { type: PostType.VIDEO, icon: Video, label: 'Video' },
                  ].map((t) => (
                    <button
                      key={t.type}
                      type="button"
                      onClick={() => setPostType(t.type)}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border ${
                        postType === t.type
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <t.icon size={18} />
                      <span className="text-sm font-medium">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Content Area */}
              <div>
                <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-slate-700">Content</label>
                    <div className="flex gap-2">
                         <button 
                            type="button"
                            onClick={handleAiAnalyze}
                            disabled={!content || isGenerating}
                            className="text-xs flex items-center gap-1 text-slate-500 hover:text-telegram-600 disabled:opacity-50"
                        >
                            <Sparkles size={12} /> Analyze
                        </button>
                        <button 
                            type="button"
                            onClick={handleAiGenerate}
                            disabled={isGenerating}
                            className="text-xs flex items-center gap-1 text-telegram-600 hover:text-telegram-700 font-medium disabled:opacity-50"
                        >
                            <Sparkles size={12} /> {content ? 'Refine with AI' : 'Generate with AI'}
                        </button>
                    </div>
                </div>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full h-32 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-telegram-500 focus:border-telegram-500 outline-none resize-none"
                  placeholder="What would you like to post to your group?"
                  required
                />
                 {aiAnalysis && (
                    <div className="mt-2 p-3 bg-indigo-50 text-indigo-800 text-xs rounded-lg border border-indigo-100">
                        <strong>AI Analysis:</strong> {aiAnalysis}
                    </div>
                )}
              </div>

              {/* Functional File Upload */}
              {postType !== PostType.TEXT && (
                <div className="relative border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:bg-slate-50 transition-colors cursor-pointer group">
                  <input 
                    type="file" 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    accept={postType === PostType.IMAGE ? "image/*" : "video/*"}
                    onChange={handleFileChange}
                  />
                  <div className="flex flex-col items-center">
                    {mediaFile ? (
                        <div className="flex items-center gap-2 text-telegram-600 font-medium z-20">
                            {postType === PostType.IMAGE && (
                                <img src={mediaFile.data} alt="Preview" className="h-10 w-10 object-cover rounded shadow-sm border" />
                            )}
                            <span className="truncate max-w-[200px]">{mediaFile.name}</span>
                            <button 
                                type="button" 
                                onClick={clearFile}
                                className="p-1 hover:bg-slate-200 rounded-full text-slate-500"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    ) : (
                        <>
                            <ImageIcon className="text-slate-400 mb-2 group-hover:text-telegram-500 transition-colors" size={32} />
                            <span className="text-sm text-slate-600">Click to upload {postType.toLowerCase()}</span>
                            <span className="text-xs text-slate-400 mt-1">Supports PNG, JPG, MP4 (Max 1MB)</span>
                        </>
                    )}
                  </div>
                </div>
              )}

              {/* Scheduling */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Schedule Time (GMT+8)</label>
                  <input
                    type="datetime-local"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-telegram-500 outline-none"
                  />
                  <p className="text-xs text-slate-500 mt-1">Server time is GMT+8</p>
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-2">Repeat</label>
                   <select 
                    value={repeat}
                    onChange={(e) => setRepeat(e.target.value as any)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-telegram-500 outline-none bg-white"
                   >
                       <option value="NONE">Does not repeat</option>
                       <option value="HOURLY">Hourly</option>
                       <option value="DAILY">Daily</option>
                       <option value="WEEKLY">Weekly</option>
                   </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={isGenerating || !selectedBotId || (postType !== PostType.TEXT && !mediaFile)}
                  className="flex items-center gap-2 bg-telegram-600 hover:bg-telegram-700 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-lg shadow-telegram-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Clock size={20} />
                  Schedule Post
                </button>
              </div>
            </form>
          ) : (
            <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-lg">
                <p>You do not have permission to create posts.</p>
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Posts List */}
      <div className="space-y-6">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <CalendarIcon size={20} className="text-telegram-600" />
            Upcoming Queue
        </h3>
        
        <div className="space-y-4">
            {posts
              .filter(p => p.status === PostStatus.SCHEDULED)
              .sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime())
              .map((post) => {
                const botName = bots.find(b => b.id === post.botId)?.name || 'Unknown Bot';
                return (
                    <div key={post.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${post.repeat !== 'NONE' ? 'bg-purple-500' : 'bg-telegram-500'}`} />
                        <div className="flex justify-between items-start mb-2 pl-2">
                            <span className="text-xs font-semibold text-telegram-600 bg-telegram-50 px-2 py-1 rounded-full">
                                {botName}
                            </span>
                            <span className="text-xs text-slate-400">
                                {post.type}
                            </span>
                        </div>
                        <p className="text-sm text-slate-800 mb-3 pl-2 line-clamp-2">
                            {post.content}
                        </p>
                        {post.mediaUrl && post.type === PostType.IMAGE && (
                             <div className="pl-2 mb-3">
                                 <img src={post.mediaUrl} alt="Post Attachment" className="h-20 w-auto rounded-lg object-cover border border-slate-100" />
                             </div>
                        )}
                        <div className="flex items-center gap-2 text-xs text-slate-500 pl-2">
                            <Clock size={12} />
                            <span>{formatDateGMT8(post.scheduledTime)}</span>
                            {post.repeat !== 'NONE' && (
                                <span className="flex items-center gap-1 text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded ml-auto">
                                    <RefreshCw size={10} /> {post.repeat.toLowerCase()}
                                </span>
                            )}
                        </div>
                    </div>
                );
            })}
            
            {posts.filter(p => p.status === PostStatus.SCHEDULED).length === 0 && (
                <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <p>No posts scheduled.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};