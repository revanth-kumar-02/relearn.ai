import React from 'react';
import { motion } from 'motion/react';
import Icon from '../common/Icon';

interface KPICardProps {
    label: string;
    value: number | string;
    icon: string;
    color: 'indigo' | 'purple' | 'amber' | 'emerald';
    onClick?: () => void;
    className?: string;
}

const KPICard: React.FC<KPICardProps> = ({ label, value, icon, color, onClick, className }) => {
    const colorMap = {
        indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-600', glow: 'glow-primary' },
        purple: { bg: 'bg-purple-500/10', text: 'text-purple-600', glow: 'glow-primary' },
        amber: { bg: 'bg-amber-500/10', text: 'text-amber-600', glow: 'glow-secondary' },
        emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', glow: 'glow-secondary' }
    };

    const style = colorMap[color];

    return (
        <motion.div
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className={`glass-card noise-overlay rounded-[2rem] p-6 flex flex-col gap-4 transition-all duration-300 relative overflow-hidden group ${onClick ? 'cursor-pointer' : ''} ${className || ''}`}
        >
            <div className="flex items-start justify-between">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all group-hover:scale-110 ${style.bg} ${style.text} ${style.glow}`}>
                    <Icon name={icon} className="text-2xl" />
                </div>
                
                {/* Subtle Trend Indicator (Static Mockup for Visual Depth) */}
                <div className="flex flex-col items-end gap-1">
                    <div className={`flex items-center gap-1 text-[10px] font-black uppercase ${color === 'emerald' ? 'text-emerald-500' : 'text-indigo-500'}`}>
                        <Icon name="trending_up" className="text-xs" />
                        <span>+12%</span>
                    </div>
                </div>
            </div>

            <div className="relative z-10">
                <div className="text-3xl font-black tracking-tighter tabular-nums">{value}</div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-500 dark:text-stone-400 mt-1 opacity-70">{label}</div>
            </div>

            {/* Background Accent Gradient */}
            <div className={`absolute -right-8 -bottom-8 w-24 h-24 rounded-full blur-[40px] opacity-20 transition-opacity group-hover:opacity-40 ${style.bg}`} />
        </motion.div>
    );
};

export default KPICard;
