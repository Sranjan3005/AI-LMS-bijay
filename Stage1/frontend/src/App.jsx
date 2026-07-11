import React, { useContext, useState } from 'react';
import { AuthContext, AuthProvider } from './contexts/AuthContext';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import SutraShell from './components/sutra/SutraShell';
import StudentHome from './pages/StudentHome';
import CBSECurriculum from './pages/CBSECurriculum';
import ContactInstructor from './pages/ContactInstructor';
import ProfilePage from './pages/ProfilePage';
import ExplainerPage from './pages/ExplainerPage';
import AssignmentsView from './pages/AssignmentsView';
import SchoolAdminPanel from './pages/SchoolAdminPanel';
import { EXPLAINERS } from './content/explainers';
import LabWorkspace from './pages/LabWorkspace';
import DataLabWorkspace from './pages/DataLabWorkspace';
import AgenticLanding from './pages/AgenticSandbox/AgenticLanding';
import EmergenceOfIntelligence from './pages/AIFoundations/EmergenceOfIntelligence';
import MathsForAI from './pages/AIFoundations/MathsForAI';
import DataAnalysis from './pages/AIFoundations/DataAnalysis';
import LinearRegressionLesson from './pages/AIFoundations/LinearRegressionLesson';
import ComputerVisionLesson from './pages/AIFoundations/ComputerVisionLesson';
import BreakingPoint from './pages/AIFoundations/BreakingPoint';
import SpotTheAI from './pages/AIFoundations/SpotTheAI';
import CVPlayground from './pages/CVPlayground';
import ChartDetective from './pages/DataSkills/ChartDetective';
import ChartPicker from './pages/DataSkills/ChartPicker';
import TermMatch from './pages/DataSkills/TermMatch';
import AIEthicsHub from './pages/AIEthicsArena/AIEthicsHub';
import Level1EmotionDetector from './pages/AIEthicsArena/Level1EmotionDetector';
import Level2ScholarshipAI from './pages/AIEthicsArena/Level2ScholarshipAI';
import Level3HallucinationHunter from './pages/AIEthicsArena/Level3HallucinationHunter';
import Level4DeepfakeDetective from './pages/AIEthicsArena/Level4DeepfakeDetective';
import Level5PrivacyEscapeRoom from './pages/AIEthicsArena/Level5PrivacyEscapeRoom';
import Level6VoiceClone from './pages/AIEthicsArena/Level6VoiceClone';
import { markEthicsComplete } from './utils/ethicsProgress';
import './index.css';

const AppContent = () => {
  const { user, loading } = useContext(AuthContext);
  const [currentView, setCurrentView] = useState('dashboard');
  const [initialLabCategory, setInitialLabCategory] = useState(null);
  const [explainerData, setExplainerData] = useState(null);
  const [assignFilter, setAssignFilter] = useState(null);
  const [returnView, setReturnView] = useState('dashboard'); // where a lesson's Back should go
  const [lastModule, setLastModule] = useState(null);        // module to re-open on return to home
  const [viewParams, setViewParams] = useState({});          // deep-link props for the current view

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

  if (user.role === 'school_admin') {
    return <SchoolAdminPanel />;
  }

  if (user.is_staff) {
    return <AdminDashboard />;
  }

  // Student Routing
  // Open a real module workspace from the Sutra learning flow.
  const openModule = (key) => {
    const labCats = { regression: 'REGRESSION', classification: 'CLASSIFICATION', neural: 'NEURAL_NETWORK', vision: 'COMPUTER_VISION' };
    setViewParams({});
    if (key === 'data') setCurrentView('data_lab');
    else if (key === 'agentic') setCurrentView('agentic');
    else if (key === 'ethics') setCurrentView('ethics_hub');
    else if (labCats[key]) { setInitialLabCategory(labCats[key]); setCurrentView('lab'); }
  };

  // Open a submodule (theory explainer / lesson / workspace / assignments).
  // Records the module so returning to home re-opens & scrolls to it, and makes
  // every activity's Back return to the Sutra home flow.
  const openSub = (target, _sub, m) => {
    if (!target) return;
    if (m) setLastModule(m.t);
    if (target.view) {
      setViewParams(target.params || {});
      setReturnView('dashboard');
      return setCurrentView(target.view);
    }
    if (target.open) return openModule(target.open);
    if (target.content) { setExplainerData(EXPLAINERS[target.content]); return setCurrentView('explainer'); }
    if (target.assignments) { setAssignFilter(target.assignments); return setCurrentView('assignments'); }
  };

  const backToFlow = () => setCurrentView(returnView);

  // Student-facing pages that share the Sutra shell (nav + background + footer).
  const shellViews = ['dashboard', 'cbse', 'contact', 'profile', 'explainer', 'assignments'];
  if (shellViews.includes(currentView)) {
    return (
      <SutraShell currentView={currentView} user={user}
        onNavigate={(v) => { if (v === 'assignments') setAssignFilter(null); setCurrentView(v); }}>
        {currentView === 'dashboard' && <StudentHome initialOpen={lastModule} onOpenSub={openSub} onNavigate={setCurrentView} />}
        {currentView === 'cbse' && <CBSECurriculum />}
        {currentView === 'contact' && <ContactInstructor />}
        {currentView === 'profile' && <ProfilePage />}
        {currentView === 'explainer' && <ExplainerPage data={explainerData} onOpenModule={openModule} onBack={() => setCurrentView('dashboard')} />}
        {currentView === 'assignments' && <AssignmentsView moduleFilter={assignFilter} onBack={() => setCurrentView('dashboard')} />}
      </SutraShell>
    );
  }

  if (currentView === 'lab') {
    return <LabWorkspace
             initialCategory={viewParams.initialCategory ?? initialLabCategory}
             initialScenario={viewParams.initialScenario}
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
    return <AgenticLanding
             initialView={viewParams.initialView}
             autoLaunchId={viewParams.autoLaunchId}
             onBackToDashboard={() => setCurrentView('dashboard')}
           />;
  }

  // ── Lesson & activity routes (Back → the Sutra flow) ──
  if (currentView === 'emergence_lesson') {
    return <EmergenceOfIntelligence onBackToDashboard={backToFlow} />;
  }

  if (currentView === 'breaking_point') {
    return <BreakingPoint onBack={backToFlow} />;
  }

  if (currentView === 'spot_the_ai') {
    return <SpotTheAI onBack={backToFlow} />;
  }

  if (currentView === 'maths_lesson') {
    return <MathsForAI onBackToDashboard={backToFlow} initialStep={viewParams.initialStep || 0} />;
  }

  if (currentView === 'data_analysis') {
    return <DataAnalysis onBackToDashboard={backToFlow} initialStep={viewParams.initialStep || 0} />;
  }

  if (currentView === 'chart_detective') {
    return <ChartDetective onBack={backToFlow} />;
  }

  if (currentView === 'chart_picker') {
    return <ChartPicker onBack={backToFlow} onOpenDataLab={() => setCurrentView('data_lab')} />;
  }

  if (currentView === 'term_match') {
    return <TermMatch onBack={backToFlow} />;
  }

  if (currentView === 'cv_playground') {
    return <CVPlayground onBack={backToFlow} />;
  }

  if (currentView === 'linear_regression_lesson') {
    return (
      <LinearRegressionLesson
        onBackToSupervised={backToFlow}
        onNavigateToPredictionEngine={(category) => {
          setInitialLabCategory(category);
          setViewParams({});
          setCurrentView('lab');
        }}
      />
    );
  }

  if (currentView === 'computer_vision_lesson') {
    return (
      <ComputerVisionLesson
        onBackToSupervised={backToFlow}
        onNavigateToPredictionEngine={(category) => {
          setInitialLabCategory(category);
          setViewParams({});
          setCurrentView('lab');
        }}
      />
    );
  }

  // ── AI Ethics Arena Routes ──
  // Levels launched from the hub return to the hub; levels launched straight
  // from the learning flow return to the Sutra home (returnView).
  if (currentView === 'ethics_hub') {
    const goLevel = (n) => () => { setReturnView('ethics_hub'); setCurrentView(`ethics_level_${n}`); };
    return <AIEthicsHub
             onBackToDashboard={() => setCurrentView('dashboard')}
             onNavigateToLevel1={goLevel(1)}
             onNavigateToLevel2={goLevel(2)}
             onNavigateToLevel3={goLevel(3)}
             onNavigateToLevel4={goLevel(4)}
             onNavigateToLevel5={goLevel(5)}
             onNavigateToLevel6={goLevel(6)}
           />;
  }

  if (currentView === 'ethics_level_1') {
    return <Level1EmotionDetector onBackToHub={backToFlow} onComplete={() => markEthicsComplete(1)} />;
  }

  if (currentView === 'ethics_level_2') {
    return <Level2ScholarshipAI onBackToHub={backToFlow} onComplete={() => markEthicsComplete(2)} />;
  }

  if (currentView === 'ethics_level_3') {
    return <Level3HallucinationHunter onBackToHub={backToFlow} onComplete={() => markEthicsComplete(3)} />;
  }

  if (currentView === 'ethics_level_4') {
    return <Level4DeepfakeDetective onBackToHub={backToFlow} onComplete={() => markEthicsComplete(4)} />;
  }

  if (currentView === 'ethics_level_5') {
    return <Level5PrivacyEscapeRoom onBackToHub={backToFlow} onComplete={() => markEthicsComplete(5)} />;
  }

  if (currentView === 'ethics_level_6') {
    return <Level6VoiceClone onBackToHub={backToFlow} onComplete={() => markEthicsComplete(6)} />;
  }

  // Unknown view — never leave the student on a blank screen.
  return (
    <SutraShell currentView="dashboard" user={user} onNavigate={setCurrentView}>
      <StudentHome initialOpen={lastModule} onOpenSub={openSub} onNavigate={setCurrentView} />
    </SutraShell>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
