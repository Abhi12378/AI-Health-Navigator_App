import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { 
  Users, MessageSquare, Activity, Stethoscope, AlertTriangle, 
  TrendingUp, Calendar, Download, RefreshCw
} from 'lucide-react';
import { motion } from 'framer-motion';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    guestUsers: 0,
    registeredUsers: 0,
    totalChats: 0,
    selfCare: 65,
    doctorConsult: 25,
    emergency: 10
  });

  useEffect(() => {
    // Load stats from localStorage (simulating backend)
    const guestClicks = parseInt(localStorage.getItem('admin_guest_clicks') || '0');
    const loginClicks = parseInt(localStorage.getItem('admin_login_clicks') || '0');
    
    // Simulate realistic data based on clicks
    const total = guestClicks + loginClicks;
    const chats = total * 15 + Math.floor(Math.random() * 50); // Avg 15 chats per user
    
    setStats({
      totalUsers: total,
      guestUsers: guestClicks,
      registeredUsers: loginClicks,
      totalChats: chats,
      selfCare: 65,
      doctorConsult: 25,
      emergency: 10
    });
  }, []);

  // Mock Data for Charts
  const dailyUsageData = [
    { name: 'Mon', users: 400, chats: 2400 },
    { name: 'Tue', users: 300, chats: 1398 },
    { name: 'Wed', users: 200, chats: 9800 },
    { name: 'Thu', users: 278, chats: 3908 },
    { name: 'Fri', users: 189, chats: 4800 },
    { name: 'Sat', users: 239, chats: 3800 },
    { name: 'Sun', users: 349, chats: 4300 },
  ];

  const urgencyData = [
    { name: 'Low (Self-care)', value: 65, color: '#10B981' },
    { name: 'Moderate (Consult)', value: 25, color: '#F59E0B' },
    { name: 'High (Emergency)', value: 10, color: '#EF4444' },
  ];

  // Heatmap placeholder data (just visual representation)
  const heatmapData = Array.from({ length: 7 }, (_, i) => 
    Array.from({ length: 12 }, (_, j) => Math.floor(Math.random() * 100))
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-500 mt-1">Real-time overview of platform performance</p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors">
              <Calendar className="w-4 h-4" />
              Last 7 Days
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-md transition-colors">
              <Download className="w-4 h-4" />
              Export Report
            </button>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Total Users" 
            value={stats.totalUsers.toLocaleString()} 
            subtext={`${stats.guestUsers} Guest • ${stats.registeredUsers} Registered`}
            icon={Users} 
            bgClass="bg-blue-500"
            textClass="text-blue-600"
            trend="+12%"
          />
          <StatCard 
            title="Total Chats" 
            value={stats.totalChats.toLocaleString()} 
            subtext="Avg 15 per user"
            icon={MessageSquare} 
            bgClass="bg-indigo-500"
            textClass="text-indigo-600"
            trend="+8%"
          />
          <StatCard 
            title="Self-Care Resolution" 
            value={`${stats.selfCare}%`} 
            subtext="Resolved without doctor"
            icon={Activity} 
            bgClass="bg-emerald-500"
            textClass="text-emerald-600"
            trend="+5%"
          />
          <StatCard 
            title="Emergency Cases" 
            value={`${stats.emergency}%`} 
            subtext="Critical alerts sent"
            icon={AlertTriangle} 
            bgClass="bg-rose-500"
            textClass="text-rose-600"
            trend="-2%"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Line Chart: Daily Usage */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg text-gray-800">User Activity Trends</h3>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-indigo-500"></div> Chats</span>
                <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-blue-400"></div> Users</span>
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyUsageData}>
                  <defs>
                    <linearGradient id="colorChats" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 600 }}
                  />
                  <Area type="monotone" dataKey="chats" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorChats)" />
                  <Area type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart: Urgency Distribution */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-lg text-gray-800 mb-6">Case Severity</h3>
            <div className="h-[300px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={urgencyData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {urgencyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
              {/* Center Text */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
                <div className="text-center">
                  <span className="block text-3xl font-bold text-gray-900">{stats.totalChats}</span>
                  <span className="text-xs text-gray-500 uppercase font-medium">Total Cases</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Heatmap Placeholder */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-gray-800">Peak Activity Hours</h3>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="w-3 h-3 bg-indigo-100 rounded-sm"></span> Low
              <span className="w-3 h-3 bg-indigo-300 rounded-sm"></span> Med
              <span className="w-3 h-3 bg-indigo-600 rounded-sm"></span> High
            </div>
          </div>
          <div className="grid grid-cols-12 gap-1 h-32">
            {heatmapData.map((row, i) => (
              row.map((val, j) => (
                <motion.div 
                  key={`${i}-${j}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: (i * j) * 0.005 }}
                  className={`rounded-sm ${
                    val < 30 ? 'bg-indigo-50' : val < 70 ? 'bg-indigo-200' : 'bg-indigo-600'
                  }`}
                  title={`Activity Level: ${val}%`}
                />
              ))
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-400 font-medium uppercase tracking-wide">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>23:59</span>
          </div>
        </div>

      </div>
    </div>
  );
};

// Reusable Stat Card Component
const StatCard = ({ title, value, subtext, icon: Icon, bgClass, textClass, trend }: any) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group"
  >
    <div className={`absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity`}>
      <Icon className="w-24 h-24 text-gray-900" />
    </div>
    <div className="relative z-10">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl ${bgClass} bg-opacity-10 ${textClass}`}>
          <Icon className={`w-6 h-6 ${textClass}`} />
        </div>
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${trend.startsWith('+') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {trend}
        </span>
      </div>
      <h3 className="text-3xl font-bold text-gray-900 mb-1">{value}</h3>
      <p className="text-sm text-gray-500 font-medium">{title}</p>
      <p className="text-xs text-gray-400 mt-2">{subtext}</p>
    </div>
  </motion.div>
);

export default AdminDashboard;
