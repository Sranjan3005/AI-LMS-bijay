import React, { useState } from 'react';
import { Home, BookOpen, ClipboardList, BarChart2, User, ChevronDown, Menu } from 'lucide-react';
import { motion } from 'framer-motion';

const SidebarLayout = ({ children, activeMenu, onNavigate }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, route: 'dashboard' },
    { id: 'courses', label: 'Courses', icon: BookOpen, route: 'dashboard' }, // Mock route for now
    { id: 'assignments', label: 'Assignments', icon: ClipboardList, route: 'assignments_list' },
    { id: 'grades', label: 'Grades', icon: BarChart2, route: 'dashboard' } // Mock route
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#0a0f1e', color: '#fff', overflow: 'hidden' }}>
      
      {/* Sidebar */}
      <motion.div 
        initial={{ width: 240 }}
        animate={{ width: isSidebarOpen ? 240 : 80 }}
        style={{ 
          backgroundColor: '#0f172a', 
          borderRight: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.3s ease'
        }}
      >
        <div style={{ height: '70px', display: 'flex', alignItems: 'center', padding: isSidebarOpen ? '0 20px' : '0', justifyContent: isSidebarOpen ? 'flex-start' : 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Menu size={24} />
          </button>
        </div>

        <div style={{ padding: '20px 10px', flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {menuItems.map(item => {
            const isActive = activeMenu === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.route)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px',
                  padding: '12px',
                  backgroundColor: isActive ? 'rgba(79, 70, 229, 0.15)' : 'transparent',
                  color: isActive ? '#818cf8' : '#94a3b8',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  width: '100%',
                  justifyContent: isSidebarOpen ? 'flex-start' : 'center',
                  transition: 'background-color 0.2s',
                  position: 'relative'
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <Icon size={20} />
                {isSidebarOpen && <span style={{ fontSize: '1rem', fontWeight: isActive ? '600' : '400' }}>{item.label}</span>}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Topbar */}
        <div style={{ height: '70px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 30px', backgroundColor: '#0f172a' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '5px 10px', borderRadius: '20px', backgroundColor: 'rgba(255,255,255,0.05)' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={18} color="#fff" />
            </div>
            <ChevronDown size={16} color="#94a3b8" />
          </div>
        </div>

        {/* Page Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '40px', backgroundColor: '#0a0f1e' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            {children}
          </div>
        </div>
      </div>

    </div>
  );
};

export default SidebarLayout;
