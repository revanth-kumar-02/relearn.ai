import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area,
    BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';
import Icon from '../common/Icon';

interface AdminChartsProps {
    growthData: any[];
    analytics: any | null;
}

type ChartTab = 'growth' | 'activity' | 'retention' | 'features';

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="glass-card noise-overlay px-4 py-3 rounded-2xl border-white/40 shadow-2xl bg-white/90 dark:bg-stone-900/90 backdrop-blur-md border border-border-light dark:border-border-dark">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center gap-2 mt-1">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
                        <span className="text-xs font-bold text-slate-700 dark:text-stone-300">
                            {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(1) + (entry.name.includes('Rate') || entry.name.includes('Retention') ? '%' : '') : entry.value}
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const COLORS = ['#6366f1', '#a855f7', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#3b82f6'];

const AdminCharts: React.FC<AdminChartsProps> = ({ growthData, analytics }) => {
    const [activeTab, setActiveTab] = useState<ChartTab>('growth');

    // Safe fallback datasets derived from analytics or growthData
    const chartGrowthData = analytics?.dailyGrowth || growthData || [];
    const featureData = analytics?.featureUsage || [];
    const retentionData = analytics?.retentionTrends || [];

    // Map feature key names to readable labels
    const formatFeatureLabel = (label: string) => {
        return label.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    };

    const formattedFeatureData = featureData.map((f: any, index: number) => ({
        name: formatFeatureLabel(f.feature),
        value: f.count,
        fill: COLORS[index % COLORS.length]
    }));

    return (
        <div className="glass-card noise-overlay p-8 rounded-[2.5rem] shadow-xl border border-white/40 dark:border-stone-850">
            {/* Header with Sub-tabs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-500">Analytics Visualizations</h3>
                    <h2 className="text-xl font-black tracking-tight mt-1">Metrics & Trend Analysis</h2>
                </div>

                <div className="flex bg-slate-100 dark:bg-stone-900 rounded-2xl p-1 overflow-x-auto no-scrollbar max-w-full">
                    {(['growth', 'activity', 'retention', 'features'] as ChartTab[]).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                                activeTab === tab
                                    ? 'bg-indigo-650 text-white shadow-md shadow-indigo-600/10'
                                    : 'text-slate-500 hover:text-indigo-600'
                            }`}
                        >
                            {tab === 'growth' ? 'User Growth' :
                             tab === 'activity' ? 'Activity Pulse' :
                             tab === 'retention' ? 'Retention Curves' :
                             'Feature Distribution'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chart Render Area */}
            <div className="h-80 w-full relative">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.3 }}
                        className="w-full h-full"
                    >
                        {activeTab === 'growth' && (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartGrowthData}>
                                    <defs>
                                        <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorPlans" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                    <XAxis 
                                        dataKey="date" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} 
                                    />
                                    <YAxis 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} 
                                    />
                                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#6366f1', strokeWidth: 1 }} />
                                    <Legend 
                                        verticalAlign="bottom" 
                                        height={36} 
                                        iconType="circle"
                                        wrapperStyle={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="users" 
                                        name="Cumulative Users"
                                        stroke="#6366f1" 
                                        strokeWidth={4} 
                                        fillOpacity={1} 
                                        fill="url(#colorUsers)" 
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="plans" 
                                        name="Daily Plans Created"
                                        stroke="#a855f7" 
                                        strokeWidth={3} 
                                        fillOpacity={1}
                                        fill="url(#colorPlans)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}

                        {activeTab === 'activity' && (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartGrowthData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                    <XAxis 
                                        dataKey="date" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} 
                                    />
                                    <YAxis 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} 
                                    />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99, 102, 241, 0.04)' }} />
                                    <Legend 
                                        verticalAlign="bottom" 
                                        height={36} 
                                        iconType="circle"
                                        wrapperStyle={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}
                                    />
                                    <Bar 
                                        dataKey="active_users" 
                                        name="Daily Active Users (DAU)" 
                                        fill="#6366f1" 
                                        radius={[8, 8, 0, 0]}
                                    />
                                    <Bar 
                                        dataKey="plans" 
                                        name="Plans Generated" 
                                        fill="#a855f7" 
                                        radius={[8, 8, 0, 0]}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        )}

                        {activeTab === 'retention' && (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={retentionData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                    <XAxis 
                                        dataKey="date" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} 
                                    />
                                    <YAxis 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} 
                                        unit="%"
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend 
                                        verticalAlign="bottom" 
                                        height={36} 
                                        iconType="circle"
                                        wrapperStyle={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}
                                    />
                                    <Line 
                                        type="monotone" 
                                        dataKey="day1" 
                                        name="Day 1 Retention" 
                                        stroke="#6366f1" 
                                        strokeWidth={4} 
                                        activeDot={{ r: 6 }} 
                                    />
                                    <Line 
                                        type="monotone" 
                                        dataKey="day7" 
                                        name="Day 7 Retention" 
                                        stroke="#a855f7" 
                                        strokeWidth={3} 
                                        activeDot={{ r: 5 }} 
                                    />
                                    <Line 
                                        type="monotone" 
                                        dataKey="day30" 
                                        name="Day 30 Retention" 
                                        stroke="#10b981" 
                                        strokeWidth={2.5} 
                                        activeDot={{ r: 4 }} 
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        )}

                        {activeTab === 'features' && (
                            <div className="flex flex-col md:flex-row h-full items-center justify-center gap-4">
                                <div className="w-full md:w-1/2 h-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={formattedFeatureData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={85}
                                                paddingAngle={4}
                                                dataKey="value"
                                                nameKey="name"
                                            >
                                                {formattedFeatureData.map((entry: any, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<CustomTooltip />} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="w-full md:w-1/2 max-h-full overflow-y-auto no-scrollbar grid grid-cols-2 gap-2 pr-2">
                                    {formattedFeatureData.map((entry: any, idx: number) => (
                                        <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50/50 dark:bg-stone-900/30 rounded-xl border border-slate-100/50 dark:border-stone-850/50">
                                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.fill }} />
                                            <div className="min-w-0 flex-1">
                                                <div className="text-[10px] font-black uppercase tracking-tight truncate text-slate-700 dark:text-stone-300">
                                                    {entry.name}
                                                </div>
                                                <div className="text-[9px] font-bold text-slate-400 mt-0.5">
                                                    {entry.value} times
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default AdminCharts;
