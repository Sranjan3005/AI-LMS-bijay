import React, { useContext, useState, useEffect } from 'react';
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
import ParentReport from './pages/ParentReport';
import CaseFile from './components/story/CaseFile';
import StoryBeat from './components/story/StoryBeat';
import { ChitiProvider, useChiti } from './components/chiti/ChitiProvider';
import ChitiStage from './components/chiti/ChitiStage';
import { subTarget } from './content/flowTargets';
import { EXPLAINERS } from './content/explainers';
import LabWorkspace from './pages/LabWorkspace';
import DataLabWorkspace from './pages/DataLabWorkspace';
import AgenticLanding from './pages/AgenticSandbox/AgenticLanding';
import WhatIsAI from './pages/AIFoundations/WhatIsAI';
import MathsForAI from './pages/AIFoundations/MathsForAI';
import DataAnalysis from './pages/AIFoundations/DataAnalysis';
import LinearRegressionLesson from './pages/AIFoundations/LinearRegressionLesson';
import ComputerVisionLesson from './pages/AIFoundations/ComputerVisionLesson';
import BreakingPoint from './pages/AIFoundations/BreakingPoint';
import SpotTheAI from './pages/AIFoundations/SpotTheAI';
import CVPlayground from './pages/CVPlayground';
import ChartDetective from './pages/DataSkills/ChartDetective';
import ChartPicker from './pages/DataSkills/ChartPicker';
import TeachTheMachine from './pages/AIFoundations/TeachTheMachine';
import TermMatch from './pages/DataSkills/TermMatch';
import AIEthicsHub from './pages/AIEthicsArena/AIEthicsHub';
import Level1EmotionDetector from './pages/AIEthicsArena/Level1EmotionDetector';
import Level2ScholarshipAI from './pages/AIEthicsArena/Level2ScholarshipAI';
import Level3HallucinationHunter from './pages/AIEthicsArena/Level3HallucinationHunter';
import Level4DeepfakeDetective from './pages/AIEthicsArena/Level4DeepfakeDetective';
import Level5PrivacyEscapeRoom from './pages/AIEthicsArena/Level5PrivacyEscapeRoom';
import Level6VoiceClone from './pages/AIEthicsArena/Level6VoiceClone';
import { markEthicsComplete } from './utils/ethicsProgress';
import api from './api';
import './index.css';

// Views that already run something heavy (TensorFlow.js, webcam, big canvases).
// Chiti steps off-screen there so we never stack a WebGL context on top of ML work.
const HEAVY_VIEWS = new Set(['lab', 'data_lab', 'agentic', 'cv_playground', 'teach_machine', 'chart_detective']);

const AppContent = () => {
  const { user, loading } = useContext(AuthContext);
  const chiti = useChiti();
  const [currentView, setCurrentView] = useState('dashboard');
  const [explainerData, setExplainerData] = useState(null);
  const [assignFilter, setAssignFilter] = useState(null);
  const [assignFocused, setAssignFocused] = useState(false);  // opened from a module → show just that module's task
  const [returnView, setReturnView] = useState('dashboard'); // where a lesson's Back should go
  const [lastModule, setLastModule] = useState(null);        // module to re-open on return to home
  const [viewParams, setViewParams] = useState({});          // deep-link props for the current view
  const [classFilter, setClassFilter] = useState(null);      // { cls, modules } — CBSE "Open learning flow" filter
  const [mobileTab, setMobileTab] = useState('today');       // Today | Path — mobile dashboard mode
  const [caseFileModule, setCaseFileModule] = useState(null); // module whose case file is open
  const [storyCtx, setStoryCtx] = useState(null);            // { moduleTitle, subType, m } for the StoryBeat reveal
  const [activity, setActivity] = useState({});              // {module_key: [subtypes opened]} — for case file / story beat

  const refreshActivity = () => api.get('/assignments/activity/').then((r) => setActivity(r.data || {})).catch(() => {});
  useEffect(() => { if (user && !user.is_staff && user.role !== 'school_admin') refreshActivity(); }, [user]);

  // Opening a new full-page view should start at the top, not wherever the
  // previous (e.g. scrolled-down dashboard) view left the window.
  useEffect(() => { window.scrollTo(0, 0); }, [currentView]);

  // Send Chiti off-screen on compute-heavy views (see HEAVY_VIEWS).
  useEffect(() => {
    if (HEAVY_VIEWS.has(currentView)) chiti.dismiss();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView]);

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
    setReturnView('dashboard');   // opening a module's own workspace → Back goes home
    if (key === 'agentic') { setViewParams({}); setCurrentView('agentic'); }
    else if (key === 'ethics') { setViewParams({}); setCurrentView('ethics_hub'); }
    else if (labCats[key]) { setViewParams({ modelType: labCats[key] }); setCurrentView('lab'); }
  };

  // Open a module's case file (the in-story intro that lists its chapters).
  const openCaseFile = (m) => { refreshActivity(); setCaseFileModule(m); window.scrollTo(0, 0); setCurrentView('casefile'); };

  // Open one chapter as part of the story flow: its Back returns to a StoryBeat
  // reveal (via returnView) instead of dumping the student on the dashboard.
  const openChapter = (m, subType) => {
    const sub = m.subs.find((s) => s.ty === subType);
    if (!sub) return;
    // The StoryBeat "mission complete" reveal should fire ONCE — only when the
    // final core chapter (theory/demo/hands) is completed, since that's what
    // unlocks the module's assignment. Intermediate chapters, and revisits to an
    // already-complete module, go straight back to the dashboard, so Chiti stops
    // popping the achievement on every Back.
    const CORE = ['theory', 'demo', 'hands'];
    const opened = activity[m.open] || [];
    const alreadyComplete = CORE.every((c) => opened.includes(c));
    const completesModule = CORE.includes(subType) && !alreadyComplete &&
      CORE.every((c) => c === subType || opened.includes(c));
    if (completesModule) setStoryCtx({ moduleTitle: m.t, subType, m });
    openSub(subTarget(m, sub), sub, m, completesModule ? 'storybeat' : 'dashboard');
  };

  // Open a submodule (theory explainer / lesson / workspace / assignments).
  // Records the module so returning to home re-opens & scrolls to it, and makes
  // every activity's Back return to the Sutra home flow.
  const openSub = (target, _sub, m, returnTo = 'dashboard') => {
    if (!target) return;
    if (m) setLastModule(m.t);
    // Opening a theory/demo/hands activity counts as completing it. Opening all
    // three of a module auto-unlocks that module's task (server-side).
    if (m?.open && _sub && ['theory', 'demo', 'hands'].includes(_sub.ty)) {
      api.post('/assignments/activity-complete/', { module_key: m.open, sub_type: _sub.ty })
        .catch(() => {}).finally(refreshActivity);
    }
    if (target.view) {
      setViewParams(target.params || {});
      setReturnView(returnTo);
      return setCurrentView(target.view);
    }
    if (target.open) { setReturnView(returnTo); return openModule(target.open); }
    if (target.content) { setReturnView(returnTo); setExplainerData(EXPLAINERS[target.content]); return setCurrentView('explainer'); }
    if (target.assignments) { setAssignFilter(target.assignments); setAssignFocused(true); return setCurrentView('assignments'); }
  };

  // Back from an activity. In the story flow (returnView === 'storybeat') this
  // lands on the reveal screen; otherwise it returns to the learning flow home.
  const backToFlow = () => {
    if (returnView === 'storybeat') refreshActivity();
    setCurrentView(returnView);
  };

  // Student-facing pages that share the Sutra shell (nav + background + footer).
  const shellViews = ['dashboard', 'cbse', 'contact', 'profile', 'explainer', 'assignments', 'parent'];
  if (shellViews.includes(currentView)) {
    return (
      <SutraShell currentView={currentView} user={user}
        mobileTab={mobileTab} onMobileTab={setMobileTab}
        onNavigate={(v) => { if (v === 'assignments') { setAssignFilter(null); setAssignFocused(false); } if (v === 'dashboard') setClassFilter(null); setCurrentView(v); }}>
        {currentView === 'dashboard' && <StudentHome initialOpen={lastModule} onOpenSub={openSub}
                                          onOpenCaseFile={openCaseFile} onOpenChapter={openChapter}
                                          onNavigate={setCurrentView} mobileTab={mobileTab}
                                          classFilter={classFilter} onClearClassFilter={() => setClassFilter(null)} />}
        {currentView === 'parent' && <ParentReport />}
        {currentView === 'cbse' && <CBSECurriculum onOpenLearningFlow={(cls, modules) => {
          setClassFilter({ cls, modules }); setLastModule(null); window.scrollTo(0, 0); setCurrentView('dashboard');
        }} />}
        {currentView === 'contact' && <ContactInstructor />}
        {currentView === 'profile' && <ProfilePage />}
        {currentView === 'explainer' && <ExplainerPage data={explainerData} onOpenModule={openModule} onBack={backToFlow} />}
        {currentView === 'assignments' && <AssignmentsView moduleFilter={assignFilter} focused={assignFocused}
          onBack={() => setCurrentView('dashboard')}
          onOpenAgentStudio={(item) => {
            setViewParams({ assignment: {
              assignmentId: item.assignment.id,
              placementId: item.practice ? null : item.id,
              practice: !!item.practice,
              title: item.assignment.title,
              problem: item.assignment.description,
            } });
            setCurrentView('agentic');
          }} />}
      </SutraShell>
    );
  }

  if (currentView === 'lab') {
    return <LabWorkspace
             modelType={viewParams.modelType}
             initialScenarioId={viewParams.scenarioId}
             onBackToDashboard={backToFlow}
           />;
  }

  if (currentView === 'data_lab') {
    return <DataLabWorkspace
             modelType={viewParams.modelType}
             onBackToDashboard={backToFlow}
             onOpenDemonstration={(scenario) => {
               setViewParams({ modelType: scenario.model_type, scenarioId: scenario.id });
               setCurrentView('lab');
             }}
           />;
  }

  if (currentView === 'agentic') {
    return <AgenticLanding
             initialView={viewParams.assignment ? 'workspace' : viewParams.initialView}
             autoLaunchId={viewParams.autoLaunchId}
             assignment={viewParams.assignment}
             onBackToDashboard={() => setCurrentView(viewParams.assignment ? 'assignments' : 'dashboard')}
           />;
  }

  // ── Story layer: case file (module intro) + story beat (post-activity reveal) ──
  if (currentView === 'casefile' && caseFileModule) {
    return <CaseFile
             m={caseFileModule}
             activity={activity}
             onOpenChapter={(subType) => openChapter(caseFileModule, subType)}
             onBack={() => setCurrentView('dashboard')}
           />;
  }

  if (currentView === 'storybeat' && storyCtx) {
    return <StoryBeat
             moduleTitle={storyCtx.moduleTitle}
             subType={storyCtx.subType}
             m={storyCtx.m}
             activity={activity}
             onNextChapter={(subType) => openChapter(storyCtx.m, subType)}
             onOpenCaseFile={() => openCaseFile(storyCtx.m)}
             onBackToMissions={() => { setCurrentView('dashboard'); }}
           />;
  }

  // ── Lesson & activity routes (Back → the Sutra flow) ──
  if (currentView === 'what_is_ai') {
    return <WhatIsAI onBack={backToFlow} />;
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

  if (currentView === 'teach_machine') {
    return <TeachTheMachine onBack={backToFlow} />;
  }

  if (currentView === 'chart_picker') {
    return <ChartPicker onBack={backToFlow} onOpenDataLab={() => { setReturnView('dashboard'); setCurrentView('data_lab'); }} />;
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
          setReturnView('dashboard');
          setViewParams({ modelType: category });
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
          setReturnView('dashboard');
          setViewParams({ modelType: category });
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
      <ChitiProvider>
        <AppContent />
        {/* Mounted once at the root so Chiti persists across views and the 3D
            model is loaded a single time. */}
        <ChitiStage />
      </ChitiProvider>
    </AuthProvider>
  );
}

export default App;
