import React from 'react';
import { motion } from 'framer-motion';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area,
    BarChart, Bar, Cell
} from 'recharts';
import Icon from '../common/Icon';

interface AdminChartsProps {
    growthData: any[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="glass-card noise-overlay px-4 py-3 rounded-2xl border-white/40 shadow-2xl">
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-500 mb-2">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-xs font-bold">{entry.name}: {entry.value}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const AdminCharts: React.FC<AdminChartsProps> = ({ growthData }) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-card noise-overlay p-8 rounded-[2.5rem] shadow-xl"
            >
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center glow-primary">
                            <Icon name="show_chart" className="text-indigo-500" />
                        </div>
                        Platform Growth
                    </h3>
                    <div className="flex gap-4">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-indigo-500" />
                            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-tight">Users</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-purple-500" />
                            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-tight">Plans</span>
                        </div>
                    </div>
                </div>
                <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={growthData}>
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
                                hide 
                            />
                            <YAxis hide />
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#6366f1', strokeWidth: 1 }} />
                            <Area 
                                type="monotone" 
                                dataKey="users" 
                                name="Users"
                                stroke="#6366f1" 
                                strokeWidth={4} 
                                fillOpacity={1} 
                                fill="url(#colorUsers)" 
                                animationDuration={2000}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="plans" 
                                name="Plans"
                                stroke="#a855f7" 
                                strokeWidth={3} 
                                fillOpacity={1}
                                fill="url(#colorPlans)"
                                animationDuration={2500}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </motion.div>

            <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-card noise-overlay p-8 rounded-[2.5rem] shadow-xl"
            >
                <h3 className="text-sm font-black uppercase tracking-widest mb-8 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center glow-secondary">
                        <Icon name="bar_chart" className="text-amber-500" />
                    </div>
                    Activity Pulse
                </h3>
                <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={growthData.slice(-7)}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                            <YAxis hide />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                            <Bar 
                                dataKey="plans" 
                                name="Daily Plans"
                                radius={[12, 12, 4, 4]} 
                                animationDuration={2000}
                            >
                                {growthData.slice(-7).map((entry, index) => (
                                    <Cell 
                                        key={`cell-${index}`} 
                                        fill={index === 6 ? '#f59e0b' : '#fbbf24'} 
                                        fillOpacity={0.6 + (index * 0.05)}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </motion.div>
        </div>
    );
};

export default AdminCharts;
