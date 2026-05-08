import React from 'react';
import { 
    BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, 
    PieChart, Pie, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis 
} from 'recharts';

interface UserProgressChartsProps {
    weeklyData: {
        data: any[];
        dateRange: string;
    };
    taskStats: any[];
    totalTasks: number;
    masteryData?: { subject: string; mastery: number }[];
}

const UserProgressCharts: React.FC<UserProgressChartsProps> = ({ 
    weeklyData, taskStats, totalTasks, masteryData = [] 
}) => {
    return (
        <div className="space-y-6">
            {/* Activity Chart */}
            <div className="bg-surface-light dark:bg-surface-dark p-5 rounded-xl border border-border-light dark:border-border-dark shadow-sm" id="tutorial-progress-chart">
                <div className="mb-4 flex justify-between items-end">
                    <div>
                        <h3 className="font-bold text-text-primary-light dark:text-text-primary-dark">Activity</h3>
                        <p className="text-xs text-text-secondary-light">Minutes Studied</p>
                    </div>
                    <p className="text-xs font-semibold text-primary pr-2">{weeklyData.dateRange}</p>
                </div>
                <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={weeklyData.data}>
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                            <Tooltip
                                cursor={{ fill: 'transparent' }}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'var(--color-surface-light)' }}
                                labelStyle={{ color: '#64748b' }}
                            />
                            <Bar dataKey="minutes" radius={[4, 4, 4, 4]}>
                                {weeklyData.data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill="#13a4ec" fillOpacity={entry.minutes > 0 ? 1 : 0.3} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Subject Mastery Radar */}
            {masteryData.length > 0 && (
                <div className="bg-surface-light dark:bg-surface-dark p-5 rounded-xl border border-border-light dark:border-border-dark shadow-sm">
                    <h3 className="font-bold text-text-primary-light dark:text-text-primary-dark mb-4">Subject Mastery</h3>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={masteryData}>
                                <PolarGrid stroke="#94a3b8" strokeOpacity={0.2} />
                                <PolarAngleAxis 
                                    dataKey="subject" 
                                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} 
                                />
                                <PolarRadiusAxis 
                                    angle={30} 
                                    domain={[0, 100]} 
                                    tick={false} 
                                    axisLine={false} 
                                />
                                <Radar
                                    name="Mastery"
                                    dataKey="mastery"
                                    stroke="#6366f1"
                                    fill="#6366f1"
                                    fillOpacity={0.3}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'var(--color-surface-light)' }}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Task Breakdown */}
            <div className="bg-surface-light dark:bg-surface-dark p-5 rounded-xl border border-border-light dark:border-border-dark flex flex-col md:flex-row items-center gap-6 shadow-sm">
                <div className="flex-1">
                    <h3 className="font-bold text-text-primary-light dark:text-text-primary-dark mb-4">Task Breakdown</h3>
                    <div className="relative h-[160px] w-[160px] mx-auto">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={taskStats}
                                    innerRadius={50}
                                    outerRadius={70}
                                    paddingAngle={5}
                                    dataKey="value"
                                    startAngle={90}
                                    endAngle={-270}
                                    stroke="none"
                                >
                                    {taskStats.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">
                                {totalTasks}
                            </span>
                            <span className="text-xs text-text-secondary-light">Tasks</span>
                        </div>
                    </div>
                </div>
                <div className="space-y-3 w-full md:w-auto">
                    {taskStats.map((item, idx) => (
                        item.name !== 'No Data' && (
                            <div key={idx} className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                                <span className="text-sm text-text-secondary-light font-medium">{item.name} ({item.value})</span>
                            </div>
                        )
                    ))}
                </div>
            </div>
        </div>
    );
};

export default UserProgressCharts;
