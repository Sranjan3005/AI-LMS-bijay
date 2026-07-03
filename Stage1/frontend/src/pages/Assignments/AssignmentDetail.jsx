import React from 'react';
import { Upload, FileText, ArrowLeft } from 'lucide-react';
import SidebarLayout from '../../components/layout/SidebarLayout';

const AssignmentDetail = ({ onNavigate, assignmentId }) => {
  return (
    <SidebarLayout activeMenu="assignments" onNavigate={onNavigate}>
      
      {/* Back button and Header */}
      <div style={{ marginBottom: '40px' }}>
        <button 
          onClick={() => onNavigate('assignments_list')}
          style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', padding: 0 }}
        >
          <ArrowLeft size={18} /> Back to Assignments
        </button>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>Machine Learning Project</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>CS401</p>
      </div>

      <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start' }}>
        
        {/* Main Details & Upload Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '30px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '25px', color: '#fff' }}>Assignment Details</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '30px' }}>
              <div style={{ display: 'flex', gap: '15px' }}>
                <span style={{ color: 'var(--text-secondary)', width: '80px' }}>Due Date:</span>
                <span>Jun 05, 2025</span>
              </div>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)', width: '80px' }}>Status:</span>
                <span style={{ color: '#eab308' }}>Due Soon</span>
              </div>
            </div>

            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Upload your report in PDF or DOCX format.</p>

            {/* Drag & Drop Zone */}
            <div style={{ 
              border: '2px dashed rgba(255,255,255,0.1)', 
              borderRadius: '12px', 
              padding: '40px', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: '15px',
              backgroundColor: 'rgba(255,255,255,0.01)',
              marginBottom: '20px'
            }}>
              <Upload size={32} color="#94a3b8" />
              <p style={{ color: 'var(--text-secondary)' }}>Drag & drop file here</p>
              <button className="btn-secondary" style={{ padding: '8px 24px' }}>Browse File</button>
            </div>

            {/* Attached File */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'rgba(79, 70, 229, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8' }}>
                <FileText size={20} />
              </div>
              <div>
                <div style={{ color: '#fff', fontWeight: '500', marginBottom: '4px' }}>ml_project_report.pdf</div>
                <div style={{ color: '#4ade80', fontSize: '0.85rem' }}>Ready to submit</div>
              </div>
            </div>

          </div>

        </div>

        {/* Right Sidebar - Submission Info */}
        <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '30px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '25px', color: '#fff' }}>Submission Info</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Course:</span>
                <span>CS401</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Type:</span>
                <span>Project</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Marks:</span>
                <span>100</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', marginTop: '10px' }}>
            <button className="btn-secondary" style={{ padding: '12px 24px', flex: 1 }}>Save Draft</button>
            <button className="btn-primary" style={{ padding: '12px 24px', flex: 1.5 }}>Submit Assignment</button>
          </div>

        </div>

      </div>
    </SidebarLayout>
  );
};

export default AssignmentDetail;
