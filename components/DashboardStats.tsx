import React, { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { Bot, Post, PostStatus } from '../types';
import { TrendingUp, MessageSquare, AlertCircle, CheckCircle, Filter } from 'lucide-react';

interface DashboardStatsProps {
  posts: Post[];
  bots: Bot[];
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ posts, bots }) => {
  const [selectedBotId, setSelectedBotId] = useState<string>('all');

  // Filter posts based on selection
  const filteredPosts = useMemo(() => {
    return selectedBotId === 'all' 
      ? posts 
      : posts.filter(p => p.botId === selectedBotId);
  }, [posts, selectedBotId]);

  // Calculate Aggregates
  const totalSent = filteredPosts.filter(p => p.status === PostStatus.SENT).length;
  const totalScheduled = filteredPosts.filter(p => p.status === PostStatus.SCHEDULED).length;
  const totalFailed = filteredPosts.filter(p => p.status === PostStatus.FAILED).length;

  // Generate Chart Data (Last 7 Days)
  const chartData = useMemo(() => {
    const data = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dayStr = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dateStr = d.toISOString().split('T')[0];

      const sentCount = filteredPosts.filter(p => 
        p.status === PostStatus.SENT && 
        p.scheduledTime.startsWith(dateStr)
      ).length;

      const failedCount = filteredPosts.filter(p => 
        p.status === PostStatus.FAILED && 
        p.scheduledTime.startsWith(dateStr)
      ).length;

       const scheduledCount = filteredPosts.filter(p => 
        p.status === PostStatus.SCHEDULED && 
        p.scheduledTime.startsWith(dateStr)
      ).length;

      data.push({
        name: dayStr,
        sent: sentCount,
        failed: failedCount,
        scheduled: scheduledCount
      });
    }
    return data;
  }, [filteredPosts]);

  return (
    <div className="space-y-6">
      {/* Bot Filter */}
      <div className="flex justify-end">
        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-300 shadow-sm hover:border-telegram-500 transition-colors">
           <Filter size={16} className="text-slate-600" />
           <select 
             value={selectedBotId}
             onChange={(e) => setSelectedBotId(e.target.value)}
             className="text-sm text-slate-800 font-bold bg-transparent outline-none border-none cursor-pointer min-w-[150px]"
           >
             <option value="all">All Bots</option>
             {bots.map(b => (
               <option key={b.id} value={b.id}>{b.name}</option>
             ))}
           </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center border border-green-100">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-600">Messages Sent</p>
            <h3 className="text-2xl font-extrabold text-slate-900">{totalSent}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <MessageSquare size={24} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-600">Scheduled</p>
            <h3 className="text-2xl font-extrabold text-slate-900">{totalScheduled}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center border border-red-100">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-600">Failed</p>
            <h3 className="text-2xl font-extrabold text-slate-900">{totalFailed}</h3>
          </div>
        </div>
      </div>

      {/* Charts */}
      {filteredPosts.length > 0 || bots.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <TrendingUp size={20} className="text-telegram-600" />
              Activity (Last 7 Days)
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 12, fontWeight: 500}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 12, fontWeight: 500}} allowDecimals={false} />
                  <Tooltip 
                    cursor={{fill: '#f1f5f9'}}
                    contentStyle={{borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                  />
                  <Bar dataKey="sent" fill="#0284c7" radius={[4, 4, 0, 0]} name="Sent" />
                  <Bar dataKey="failed" fill="#ef4444" radius={[4, 4, 0, 0]} name="Failed" />
                  <Bar dataKey="scheduled" fill="#94a3b8" radius={[4, 4, 0, 0]} name="Scheduled" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Scheduled Volume</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                   <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 12, fontWeight: 500}} dy={10} />
                   <YAxis axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 12, fontWeight: 500}} allowDecimals={false} />
                   <Tooltip 
                    contentStyle={{borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                  />
                   <Line type="monotone" dataKey="scheduled" stroke="#8b5cf6" strokeWidth={3} dot={{r: 4, fill: '#8b5cf6', strokeWidth: 0}} name="Scheduled" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-xl border border-slate-200">
           <p className="text-slate-500 font-medium">No data available. Schedule some posts to see analytics.</p>
        </div>
      )}
    </div>
  );
};