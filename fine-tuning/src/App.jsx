import { ChitiProvider } from './lib/chiti/ChitiProvider.jsx';
import { SpotlightProvider } from './lib/chiti/Spotlight.jsx';
import { LessonProvider } from './lib/chiti/LessonProvider.jsx';
import DataLibraryDock from './components/DataLibraryDock.jsx';
import { FlowProvider, useFlow } from './lib/flowState.jsx';
import { stepById } from './lib/guide/script.js';
import StepRail from './components/StepRail.jsx';
import ChitiDock from './components/ChitiDock.jsx';

import MeetGeneralist from './components/steps/MeetGeneralist.jsx';
import ItWorks from './components/steps/ItWorks.jsx';
import ItFails from './components/steps/ItFails.jsx';
import SpecialistSchool from './components/steps/SpecialistSchool.jsx';
import Expert from './components/steps/Expert.jsx';
import BoundaryTest from './components/steps/BoundaryTest.jsx';
import LabData from './components/steps/LabData.jsx';
import LabAugment from './components/steps/LabAugment.jsx';
import LabBrain from './components/steps/LabBrain.jsx';
import Multimodal from './components/steps/Multimodal.jsx';

const SCREENS = {
  meet: MeetGeneralist,
  works: ItWorks,
  fails: ItFails,
  school: SpecialistSchool,
  expert: Expert,
  boundary: BoundaryTest,
  lab_data: LabData,
  lab_augment: LabAugment,
  lab_brain: LabBrain,
  multimodal: Multimodal,
};

// Steps that use the horizontal bench need the full width.
const WIDE = new Set(['school', 'lab_data', 'lab_augment', 'lab_brain']);

function Stage() {
  const { step, setPrimaryId, addDataset } = useFlow();
  const Screen = SCREENS[step] || MeetGeneralist;
  const meta = stepById(step);

  return (
    <>
      <StepRail />
      <LessonProvider step={step}>
        <main className={`stage${WIDE.has(step) ? ' wide' : ''}`}>
          <div className="act-label">{meta?.act}</div>
          <h2 style={{ fontSize: '1.6rem', marginBottom: 18 }}>{meta?.title}</h2>
          <Screen />
        </main>
        <DataLibraryDock onUse={(ds) => { addDataset(ds); setPrimaryId(ds.dataset_id); }} />
        <ChitiDock />
      </LessonProvider>
    </>
  );
}

export default function App() {
  return (
    <ChitiProvider>
      <SpotlightProvider>
        <FlowProvider>
        <div className="app">
          <header className="topbar">
            <div>
              <div className="eyebrow">Machine-Learning Models · Module 05</div>
              <h1>Fine-Tuning — Specialist School</h1>
            </div>
          </header>
          <Stage />
        </div>
        </FlowProvider>
      </SpotlightProvider>
    </ChitiProvider>
  );
}
