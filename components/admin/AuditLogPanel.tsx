import React from 'react';
import Icon from '../common/Icon';

interface AuditLogPanelProps {
    auditLogs: any[];
}

const AuditLogPanel: React.FC<AuditLogPanelProps> = ({ auditLogs }) => {
    return (
        <div className="bg-white dark:bg-surface-dark rounded-[2.5rem] border border-border-light dark:border-border-dark shadow-xl shadow-black/[0.02] overflow-hidden">
            <div className="p-8 border-b border-border-light dark:border-border-dark">
                <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                    <Icon name="history_edu" className="text-indigo-600" />
                    Security Audit Trail
                </h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-gray-50/50 dark:bg-stone-900/50">
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Timestamp</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Admin</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Action</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Details</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-light dark:divide-border-dark">
                        {auditLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-gray-50/30 dark:hover:bg-stone-900/30 transition-colors">
                                <td className="px-8 py-5 text-xs font-bold text-slate-500 whitespace-nowrap">
                                    {new Date(log.created_at).toLocaleString()}
                                </td>
                                <td className="px-8 py-5">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black">{log.admin_email}</span>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">ID: {log.admin_id.slice(0, 8)}</span>
                                    </div>
                                </td>
                                <td className="px-8 py-5">
                                    <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${
                                        log.action.includes('delete') ? 'bg-red-100 text-red-600' : 
                                        log.action.includes('verify') ? 'bg-green-100 text-green-600' : 
                                        'bg-indigo-100 text-indigo-600'
                                    }`}>
                                        {log.action.replace(/\./g, ' ')}
                                    </span>
                                </td>
                                <td className="px-8 py-5">
                                    <div className="text-[10px] font-bold text-slate-600 dark:text-slate-300 max-w-xs truncate">
                                        {log.description}
                                        {log.metadata && <span className="block text-[8px] text-slate-400 mt-1">{JSON.stringify(log.metadata)}</span>}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {auditLogs.length === 0 && (
                    <div className="py-20 text-center">
                        <Icon name="search_off" className="text-4xl text-slate-200 mb-4 mx-auto" />
                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No audit logs found</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AuditLogPanel;
