import React, { useContext, useState } from 'react';
import { AuthContext, AuthProvider } from './contexts/AuthContext';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import SutraShell from './components/sutra/SutraShell';
import StudentHome from './pages/StudentHome';
import CBSECurriculum from './pages/CBSECurriculum';
import ContactInstructor from './pages/ContactInstructor';
import ProfilePage from './pages/ProfilePage';
import LabWorkspace from './pages/LabWorkspace';
import DataLabWorkspace from './pages/DataLabWorkspace';
import AgenticLanding from './pages/AgenticSandbox/AgenticLanding';
import AIFoundationsDashboard from './pages/AIFoundations/AIFoundationsDashboard';
import EmergenceOfIntelligence from './pages/AIFoundations/EmergenceOfIntelligence';
import SmartPuppy from './pages/AIFoundations/SmartPuppy';
import MathsForAI from './pages/AIFoundations/MathsForAI';
import DataAnalysis from './pages/AIFoundations/DataAnalysis';
import SupervisedLearning from './pages/AIFoundations/SupervisedLearning';
import LinearRegressionLesson from './pages/AIFoundations/LinearRegressionLesson';
import ComputerVisionLesson from './pages/AIFoundations/ComputerVisionLesson';
import AIEthicsHub from './pages/AIEthicsArena/AIEthicsHub';
import Level1EmotionDetector from './pages/AIEthicsArena/Level1EmotionDetector';
import Level2ScholarshipAI from './pages/AIEthicsArena/Level2ScholarshipAI';
import Level3HallucinationHunter from './pages/AIEthicsArena/Level3HallucinationHunter';
import Level4DeepfakeDetective from './pages/AIEthicsArena/Level4DeepfakeDetective';
import Level5PrivacyEscapeRoom from './pages/AIEthicsArena/Level5PrivacyEscapeRoom';
import Level6VoiceClone from './pages/AIEthicsArena/Level6VoiceClone';
import AssignmentsList from './pages/Assignments/AssignmentsList';
import AssignmentDetail from './pages/Assignments/AssignmentDetail';
import './index.css';

const AppContent = () => {
  const { user, loading } = useContext(AuthContext);
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' | 'lab'
  const [initialLabCategory, setInitialLabCategory] = useState(null);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'white' }}>
        <h2>Loading...</h2>
      </div>
    );
  }

  // Pure SPA routing based on auth state and role
  if (!user) {
    return <Login />;
  }

  if (user.is_staff) {
    return <AdminDashboard />;
  }

  // Student Routing
  // Open a real module workspace from the Sutra learning flow.
  const openModule = (key) => {
    const labCats = { regression: 'REGRESSION', classification: 'CLASSIFICATION', neural: 'NEURAL_NETWORK', vision: 'COMPUTER_VISION' };
    if (key === 'foundations') setCurrentView('foundations');
    else if (key === 'data') setCurrentView('data_lab');
    else if (key === 'agentic') setCurrentView('agentic');
    else if (key === 'ethics') setCurrentView('ethics_hub');
    else if (key === 'assignments') setCurrentView('assignments_list');
    else if (labCats[key]) { setInitialLabCategory(labCats[key]); setCurrentView('lab'); }
  };

  // Student-facing pages that share the Sutra shell (nav + background + footer).
  const shellViews = ['dashboard', 'cbse', 'contact', 'profile'];
  if (shellViews.includes(currentView)) {
    return (
      <SutraShell currentView={currentView} onNavigate={setCurrentView} user={user}>
        {currentView === 'dashboard' && <StudentHome onOpenModule={openModule} onNavigate={setCurrentView} />}
        {currentView === 'cbse' && <CBSECurriculum />}
        {currentView === 'contact' && <ContactInstructor />}
        {currentView === 'profile' && <ProfilePage />}
      </SutraShell>
    );
  }

  if (currentView === 'lab') {
    return <LabWorkspace 
             initialCategory={initialLabCategory}
             onBackToDashboard={() => setCurrentView('dashboard')} 
           />;
  }

  if (currentView === 'data_lab') {
    return <DataLabWorkspace 
             initialCategory={initialLabCategory}
             onBackToDashboard={() => setCurrentView('dashboard')} 
           />;
  }

  if (currentView === 'agentic') {
    return <AgenticLanding onBackToDashboard={() => setCurrentView('dashboard')} />;
  }

  if (currentView === 'foundations') {
    return <AIFoundationsDashboard 
             onBackToDashboard={() => setCurrentView('dashboard')} 
             onNavigateToLesson1={() => setCurrentView('emergence_lesson')}
             onNavigateToSmartPuppy={() => setCurrentView('smart_puppy')}
             onNavigateToMaths={() => setCurrentView('maths_lesson')}
             onNavigateToDataAnalysis={() => setCurrentView('data_analysis')}
             onNavigateToSupervised={() => setCurrentView('supervised_lesson')}
             onNavigateToUnsupervised={() => setCurrentView('unsupervised_lesson')}
             onNavigateToRL={() => setCurrentView('rl_lesson')}
             onNavigateToNeuralNetworks={() => setCurrentView('neural_networks_lesson')}
           />;
  }

  if (currentView === 'emergence_lesson') {
    return <EmergenceOfIntelligence onBackToDashboard={() => setCurrentView('foundations')} />;
  }

  if (currentView === 'smart_puppy') {
    return <SmartPuppy onBackToDashboard={() => setCurrentView('foundations')} />;
  }

  if (currentView === 'maths_lesson') {
    return <MathsForAI onBackToDashboard={() => setCurrentView('foundations')} />;
  }

  if (currentView === 'data_analysis') {
    return <DataAnalysis onBackToDashboard={() => setCurrentView('foundations')} />;
  }

  if (currentView === 'supervised_lesson') {
    return <SupervisedLearning 
             onBackToDashboard={() => setCurrentView('foundations')} 
             onNavigateToLinearRegression={() => setCurrentView('linear_regression_lesson')}
             onNavigateToComputerVision={() => setCurrentView('computer_vision_lesson')}
           />;
  }

  if (currentView === 'linear_regression_lesson') {
    return (
      <LinearRegressionLesson 
        onBackToSupervised={() => setCurrentView('supervised_lesson')} 
        onNavigateToPredictionEngine={(category) => {
          setInitialLabCategory(category);
          setCurrentView('lab');
        }}
      />
    );
  }

  if (currentView === 'computer_vision_lesson') {
    return (
      <ComputerVisionLesson 
        onBackToSupervised={() => setCurrentView('supervised_lesson')} 
        onNavigateToPredictionEngine={(category) => {
          setInitialLabCategory(category);
          setCurrentView('lab');
        }}
      />
    );
  }

  // ── AI Ethics Arena Routes ──
  if (currentView === 'ethics_hub') {
    return <AIEthicsHub
             onBackToDashboard={() => setCurrentView('dashboard')}
             onNavigateToLevel1={() => setCurrentView('ethics_level_1')}
             onNavigateToLevel2={() => setCurrentView('ethics_level_2')}
             onNavigateToLevel3={() => setCurrentView('ethics_level_3')}
             onNavigateToLevel4={() => setCurrentView('ethics_level_4')}
             onNavigateToLevel5={() => setCurrentView('ethics_level_5')}
             onNavigateToLevel6={() => setCurrentView('ethics_level_6')}
           />;
  }

  if (currentView === 'ethics_level_1') {
    return <Level1EmotionDetector onBackToHub={() => setCurrentView('ethics_hub')} />;
  }

  if (currentView === 'ethics_level_2') {
    return <Level2ScholarshipAI onBackToHub={() => setCurrentView('ethics_hub')} />;
  }

  if (currentView === 'ethics_level_3') {
    return <Level3HallucinationHunter onBackToHub={() => setCurrentView('ethics_hub')} />;
  }

  if (currentView === 'ethics_level_4') {
    return <Level4DeepfakeDetective onBackToHub={() => setCurrentView('ethics_hub')} />;
  }

  if (currentView === 'ethics_level_5') {
    return <Level5PrivacyEscapeRoom onBackToHub={() => setCurrentView('ethics_hub')} />;
  }

  if (currentView === 'ethics_level_6') {
    return <Level6VoiceClone onBackToHub={() => setCurrentView('ethics_hub')} />;
  }

  // ── Assignments Routes ──
  if (currentView === 'assignments_list') {
    return <AssignmentsList onNavigate={(route) => setCurrentView(route)} />;
  }

  if (currentView === 'assignment_detail') {
    return <AssignmentDetail onNavigate={(route) => setCurrentView(route)} />;
  }
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
