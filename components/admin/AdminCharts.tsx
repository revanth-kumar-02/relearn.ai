import React from 'react';
import { motion } from 'framer-motion';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area,
    BarChart, Bar
} from 'recharts';
import Icon from '../common/Icon';

interface AdminChartsProps {
    growthData: any[];
}

const AdminCharts: React.FC<AdminChartsProps> = ({ growthData }) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-surface-dark rounded-[2.5rem] p-8 border border-border-light dark:border-border-dark shadow-xl shadow-black/[0.02]">
                <h3 className="text-sm font-black uppercase tracking-widest mb-8 flex items-center gap-2">
                    <Icon name="show_chart" className="text-indigo-600" />
                    Platform Growth
                </h3>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={growthData}>
                            <defs>
                                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="date" hide />
                            <YAxis hide />
                            <Tooltip
                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                            />
                            <Area type="monotone" dataKey="users" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
                            <Area type="monotone" dataKey="plans" stroke="#9333ea" strokeWidth={3} fillOpacity={0} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white dark:bg-surface-dark rounded-[2.5rem] p-8 border border-border-light dark:border-border-dark shadow-xl shadow-black/[0.02]">
                <h3 className="text-sm font-black uppercase tracking-widest mb-8 flex items-center gap-2">
                    <Icon name="bar_chart" className="text-amber-600" />
                    Activity Distribution
                </h3>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={growthData.slice(-5)}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="date" hide />
                            <YAxis hide />
                            <Tooltip
                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                            />
                            <Bar dataKey="plans" fill="#f59e0b" radius={[10, 10, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default AdminCharts;
