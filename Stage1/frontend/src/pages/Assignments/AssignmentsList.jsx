import React from 'react';
import { FileText, Clock, CheckCircle, ClipboardList } from 'lucide-react';
import SidebarLayout from '../../components/layout/SidebarLayout';

const AssignmentsList = ({ onNavigate }) => {
  const assignments = [
    { id: 1, title: 'Machine Learning Project', course: 'CS401', dueDate: 'Jun 05, 2025', status: 'Due Soon', statusColor: '#eab308' },
    { id: 2, title: 'Computer Vision Assignment', course: 'CS402', dueDate: 'Jun 12, 2025', status: 'Pending', statusColor: '#94a3b8' }
  ];

  return (
    <SidebarLayout activeMenu="assignments" onNavigate={onNavigate}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '5px' }}>Assignments</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '40px' }}>View and submit your course work</p>

      <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start' }}>
        
        {/* Main List Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {assignments.map(item => (
            <div key={item.id} style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '25px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
                <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'rgba(79, 70, 229, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8', flexShrink: 0 }}>
                  <FileText size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.4rem', marginBottom: '8px', color: '#fff' }}>{item.title}</h3>
                  <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '1rem' }}>{item.course}</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                  <Clock size={16} />
                  <span>Due: {item.dueDate}</span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '6px', backgroundColor: 'rgba(0,0,0,0.3)', color: item.statusColor, border: `1px solid ${item.statusColor}44` }}>
                  {item.status === 'Due Soon' ? <Clock size={14} /> : <div style={{width: 14, height: 14, borderRadius: '50%', border: `2px solid ${item.statusColor}`}}></div>}
                  <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>{item.status}</span>
                </div>

                <button 
                  onClick={() => onNavigate('assignment_detail', { id: item.id })}
                  className="btn-primary" 
                  style={{ padding: '8px 24px', fontSize: '1rem' }}
                >
                  Open
                </button>
              </div>

            </div>
          ))}
        </div>

        {/* Quick Summary Widget */}
        <div style={{ width: '320px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '25px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '25px', color: '#fff' }}>Quick Summary</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'rgba(79, 70, 229, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8' }}>
                  <ClipboardList size={18} />
                </div>
                <span style={{ color: 'var(--text-secondary)' }}>Total Assignments:</span>
              </div>
              <span style={{ fontSize: '1.2rem', fontWeight: '600' }}>2</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'rgba(34, 197, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80' }}>
                  <CheckCircle size={18} />
                </div>
                <span style={{ color: 'var(--text-secondary)' }}>Submitted:</span>
              </div>
              <span style={{ fontSize: '1.2rem', fontWeight: '600' }}>0</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'rgba(234, 179, 8, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#facc15' }}>
                  <Clock size={18} />
                </div>
                <span style={{ color: 'var(--text-secondary)' }}>Pending:</span>
              </div>
              <span style={{ fontSize: '1.2rem', fontWeight: '600' }}>2</span>
            </div>
          </div>
        </div>

      </div>
    </SidebarLayout>
  );
};

export default AssignmentsList;
