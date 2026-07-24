import React, { createContext, useContext, useState, ReactNode } from 'react';
import { UserAdminData, GlobalStats } from '../services/api/adminService';
import { SystemStatus } from '../services/api/systemService';
import { StudyRoom } from '../types/index';

interface AdminContextType {
  stats: GlobalStats | null;
  setStats: (stats: GlobalStats) => void;
  users: UserAdminData[];
  setUsers: (users: UserAdminData[]) => void;
  plans: any[];
  setPlans: (plans: any[]) => void;
  rooms: StudyRoom[];
  setRooms: (rooms: StudyRoom[]) => void;
  feedback: any[];
  setFeedback: (feedback: any[]) => void;
  systemStatus: SystemStatus | null;
  setSystemStatus: (status: SystemStatus) => void;
  announcements: any[];
  setAnnouncements: (announcements: any[]) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [users, setUsers] = useState<UserAdminData[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  return (
    <AdminContext.Provider value={{
      stats, setStats,
      users, setUsers,
      plans, setPlans,
      rooms, setRooms,
      feedback, setFeedback,
      systemStatus, setSystemStatus,
      announcements, setAnnouncements,
      isLoading, setIsLoading
    }}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) throw new Error('useAdmin must be used within AdminProvider');
  return context;
};
