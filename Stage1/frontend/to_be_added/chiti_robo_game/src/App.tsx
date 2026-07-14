/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Bot,
  Zap,
  RotateCcw,
  Sliders,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  Award,
  BookOpen,
  Sparkles,
  ChevronRight,
  Plus,
  Trash2,
  Volume2,
  VolumeX,
  Compass,
  Lightbulb,
  GraduationCap,
  RefreshCw,
  TrendingUp
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// ==========================================
// TYPE DEFINITIONS & CONSTANTS
// ==========================================

interface Position {
  x: number;
  y: number;
}

interface MazeLayout {
  id: string;
  name: string;
  description: string;
  walls: Position[];
  puddles: Position[];
  goal: Position;
}

interface Rule {
  id: string;
  condition: string;
  action: string;
  enabled: boolean;
}

// Q-learning configuration
const GRID_SIZE = 8;
const ACTIONS = [
  { dy: -1, dx: 0, name: "UP", emoji: "⬆️" },
  { dy: 0, dx: 1, name: "RIGHT", emoji: "➡️" },
  { dy: 1, dx: 0, name: "DOWN", emoji: "⬇️" },
  { dy: -1, dx: 0, name: "LEFT", emoji: "⬅️" } // Action 3 is Left: dy = 0, dx = -1. Let's fix index 3 below!
];

// Correcting Left Action
const REAL_ACTIONS = [
  { dy: -1, dx: 0, name: "UP", emoji: "⬆️" },
  { dy: 0, dx: 1, name: "RIGHT", emoji: "➡️" },
  { dy: 1, dx: 0, name: "DOWN", emoji: "⬇️" },
  { dy: 0, dx: -1, name: "LEFT", emoji: "⬅️" }
];

const REWARDS = {
  GOAL: 100,
  WALL: -15,
  PUDDLE: -10,
  STEP: -1
};

// Layout definitions
const LAYOUT_A: MazeLayout = {
  id: "layout_a",
  name: "Simple World (Layout A)",
  description: "A straightforward path with sparse obstacles. Perfect for Chitti to follow simple manual rules.",
  walls: [
    { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 },
    { x: 5, y: 4 }, { x: 5, y: 5 }, { x: 5, y: 6 },
    { x: 1, y: 5 }, { x: 4, y: 2 }
  ],
  puddles: [
    { x: 3, y: 3 },
    { x: 5, y: 2 }
  ],
  goal: { x: 7, y: 7 }
};

const LAYOUT_B: MazeLayout = {
  id: "layout_b",
  name: "Changed World (Layout B)",
  description: "A massive central barrier blocks the rightward path completely. Fixed rules get stuck in an infinite loop!",
  walls: [
    // Center wall barrier
    { x: 3, y: 0 }, { x: 3, y: 1 }, { x: 3, y: 2 }, { x: 3, y: 3 }, { x: 3, y: 4 },
    // Lower blocking blocks
    { x: 5, y: 5 }, { x: 5, y: 6 }, { x: 5, y: 7 },
    { x: 1, y: 6 }, { x: 2, y: 6 }
  ],
  puddles: [
    { x: 1, y: 2 },
    { x: 6, y: 2 }
  ],
  goal: { x: 7, y: 7 }
};

// CBSE Class 6-8 Interactive Quiz questions
interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const CBSE_QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    question: "Why did Chitti's hand-written 'if-then' rules fail in the 'Changed World'?",
    options: [
      "Because Chitti's battery ran out",
      "Because fixed rules cannot handle new, unseen obstacles that the programmer didn't expect",
      "Because Chitti didn't like the new grid colors",
      "Because Chitti is a rule-following human"
    ],
    correctIndex: 1,
    explanation: "Excellent! Fixed rules are rigid. When the environment changes (like adding a new central wall), rules written for the old environment break. Reinforcement Learning solves this by letting Chitti explore and learn on his own!"
  },
  {
    id: 2,
    question: "In Reinforcement Learning, what is a 'Reward' (or penalty) used for?",
    options: [
      "To pay Chitti a salary in Rupees",
      "To show students a nice background screen",
      "To guide Chitti about which actions are good (positive reward) or bad (negative reward) so he learns",
      "To increase the speed of the browser game"
    ],
    correctIndex: 2,
    explanation: "Correct! Just like you get a gold star ⭐ for good homework, Chitti gets +100 points for reaching the charging station and negative points for bumping walls or falling into mud. He uses these feedback signals to update his Q-table!"
  },
  {
    id: 3,
    question: "What is the 'Q-Table' in Chitti's reinforcement learning brain?",
    options: [
      "A classroom desk where Chitti sits",
      "A database of all the rules programmed by hand",
      "A map of coordinates showing the names of walls",
      "A memory grid storing score values (Q-values) for each action in every cell, guiding Chitti's next move"
    ],
    correctIndex: 3,
    explanation: "Perfect! The Q-table is literally Chitti's 'brain map'. For all 64 squares (states) and 4 movements (actions), it stores a number. The highest number represents the smartest choice learned from experience."
  }
];

export default function App() {
  // ==========================================
  // STATE DECLARATIONS
  // ==========================================
  const [activeTab, setActiveTab] = useState<"rules" | "rl">("rules");
  const [page, setPage] = useState<number>(0); // 0 = Intro & Theory, 1 = The Lab, 2 = Quiz
  const [activeLayout, setActiveLayout] = useState<MazeLayout>(LAYOUT_A);
  
  // Simplicity Mode Toggle for Class 6-8 vs Advanced Lab
  const [isSimpleMode, setIsSimpleMode] = useState<boolean>(true);

  // Completed Missions Tracker for Gamification
  const [mission1Complete, setMission1Complete] = useState<boolean>(false);
  const [mission2Complete, setMission2Complete] = useState<boolean>(false);
  const [mission3Complete, setMission3Complete] = useState<boolean>(false);

  // Game simulation state
  const [robotPos, setRobotPos] = useState<Position>({ x: 0, y: 0 });
  const [robotMood, setRobotMood] = useState<"normal" | "bump" | "puddle" | "goal">("normal");
  const [score, setScore] = useState<number>(100);
  const [stepsCount, setStepsCount] = useState<number>(0);
  const [cumulativeReward, setCumulativeReward] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playSpeed, setPlaySpeed] = useState<number>(150); // Speed in ms per tick
  const [trail, setTrail] = useState<Position[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [lastActionName, setLastActionName] = useState<string>("");

  // Mode 1: Hand-written rules state
  const [userRules, setUserRules] = useState<Rule[]>([
    { id: "1", condition: "right_clear", action: "MOVE_RIGHT", enabled: true },
    { id: "2", condition: "down_clear", action: "MOVE_DOWN", enabled: true },
    { id: "3", condition: "wall_right", action: "MOVE_DOWN", enabled: true },
    { id: "4", condition: "always", action: "MOVE_RIGHT", enabled: true }
  ]);
  const [rulesNeededCounter, setRulesNeededCounter] = useState<number>(4);
  const [infiniteLoopAlert, setInfiniteLoopAlert] = useState<boolean>(false);
  const stateVisitFrequency = useRef<Record<string, number>>({});

  // Mode 2: Reinforcement Learning state
  // Q-Table holds 64 states x 4 actions. Let's store as nested array.
  const [qTable, setQTable] = useState<number[][]>(() => 
    Array.from({ length: 64 }, () => Array(4).fill(0))
  );
  const [epsilon, setEpsilon] = useState<number>(0.8); // curiosity rate
  const [alpha] = useState<number>(0.5); // learning rate
  const [gamma] = useState<number>(0.9); // discount factor
  const [rlEpisodesCount, setRlEpisodesCount] = useState<number>(0);
  const [rlSuccesses, setRlSuccesses] = useState<number>(0);
  const [showQValues, setShowQValues] = useState<boolean>(true);
  const [isTrainingFast, setIsTrainingFast] = useState<boolean>(false);
  
  // Quiz states
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);
  
  // Feedback effects
  const [impactOverlay, setImpactOverlay] = useState<{ x: number; y: number; text: string; color: string } | null>(null);

  // Canvas ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Report our real content height to the embedding page so the iframe can grow
  // to fit — no cramped internal scrollbar, no wasted space.
  useEffect(() => {
    const post = () => {
      window.parent?.postMessage(
        { type: "chiti-height", height: document.documentElement.scrollHeight },
        "*"
      );
    };
    post();
    const ro = new ResizeObserver(post);
    ro.observe(document.body);
    const t1 = setTimeout(post, 300);
    const t2 = setTimeout(post, 1200);
    window.addEventListener("resize", post);
    return () => {
      ro.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("resize", post);
    };
  }, []);

  // ==========================================
  // ENVIRONMENT RESOLVERS
  // ==========================================
  const isWall = useCallback((x: number, y: number, layout: MazeLayout) => {
    return layout.walls.some(w => w.x === x && w.y === y);
  }, []);

  const isPuddle = useCallback((x: number, y: number, layout: MazeLayout) => {
    return layout.puddles.some(p => p.x === x && p.y === y);
  }, []);

  const resetSimulation = useCallback(() => {
    setRobotPos({ x: 0, y: 0 });
    setRobotMood("normal");
    setScore(100);
    setStepsCount(0);
    setCumulativeReward(0);
    setIsPlaying(false);
    setTrail([]);
    setInfiniteLoopAlert(false);
    stateVisitFrequency.current = {};
    setLastActionName("");
  }, []);

  // Handle Changing the World
  const changeWorld = () => {
    const nextLayout = activeLayout.id === "layout_a" ? LAYOUT_B : LAYOUT_A;
    setActiveLayout(nextLayout);
    resetSimulation();
    
    // In Rule mode, increase the "Rules needed" count to teach the failure of hardcoding
    if (activeTab === "rules" && nextLayout.id === "layout_b") {
      setRulesNeededCounter(12);
    } else if (activeTab === "rules" && nextLayout.id === "layout_a") {
      setRulesNeededCounter(4);
    }
  };

  // ==========================================
  // RULE-BASED ROBOT EXECUTION
  // ==========================================
  const checkCondition = useCallback((condition: string, x: number, y: number, layout: MazeLayout) => {
    switch (condition) {
      case "always":
        return true;
      case "right_clear": {
        const nextX = x + 1;
        return nextX < GRID_SIZE && !isWall(nextX, y, layout);
      }
      case "down_clear": {
        const nextY = y + 1;
        return nextY < GRID_SIZE && !isWall(x, nextY, layout);
      }
      case "wall_right": {
        const nextX = x + 1;
        return nextX >= GRID_SIZE || isWall(nextX, y, layout);
      }
      case "wall_down": {
        const nextY = y + 1;
        return nextY >= GRID_SIZE || isWall(x, nextY, layout);
      }
      case "in_puddle":
        return isPuddle(x, y, layout);
      default:
        return false;
    }
  }, [isWall, isPuddle]);

  const executeRuleStep = useCallback(() => {
    // Evaluate rules from top to bottom
    let selectedAction = "";
    
    for (const rule of userRules) {
      if (rule.enabled && checkCondition(rule.condition, robotPos.x, robotPos.y, activeLayout)) {
        selectedAction = rule.action;
        break;
      }
    }

    if (!selectedAction) {
      selectedAction = "MOVE_RIGHT"; // Fallback default
    }

    // Map action string to coordinates
    let dx = 0;
    let dy = 0;
    switch (selectedAction) {
      case "MOVE_UP": dy = -1; break;
      case "MOVE_RIGHT": dx = 1; break;
      case "MOVE_DOWN": dy = 1; break;
      case "MOVE_LEFT": dx = -1; break;
    }

    setLastActionName(selectedAction.replace("MOVE_", ""));

    // Next position
    let nextX = robotPos.x + dx;
    let nextY = robotPos.y + dy;
    let hitObstacle = false;
    let steppedPuddle = false;
    let reachedGoal = false;
    let r = REWARDS.STEP;

    // Check bounds or wall
    if (nextX < 0 || nextX >= GRID_SIZE || nextY < 0 || nextY >= GRID_SIZE || isWall(nextX, nextY, activeLayout)) {
      nextX = robotPos.x;
      nextY = robotPos.y;
      hitObstacle = true;
      r = REWARDS.WALL;
    } else if (nextX === activeLayout.goal.x && nextY === activeLayout.goal.y) {
      reachedGoal = true;
      r = REWARDS.GOAL;
    } else if (isPuddle(nextX, nextY, activeLayout)) {
      steppedPuddle = true;
      r = REWARDS.PUDDLE;
    }

    // State visit tracking for Infinite Loop Detection
    const stateKey = `${nextX},${nextY}`;
    stateVisitFrequency.current[stateKey] = (stateVisitFrequency.current[stateKey] || 0) + 1;
    if (stateVisitFrequency.current[stateKey] > 10) {
      setInfiniteLoopAlert(true);
      if (activeLayout.id === "layout_b" && rulesNeededCounter < 23) {
        setRulesNeededCounter(prev => Math.min(prev + 1, 23));
      }
    }

    // Apply updates
    setRobotPos({ x: nextX, y: nextY });
    setTrail(prev => [...prev, { x: nextX, y: nextY }]);
    setStepsCount(prev => prev + 1);
    setScore(prev => prev + r);
    setCumulativeReward(prev => prev + r);

    // Dynamic Visual Feedback Overlays
    if (hitObstacle) {
      setRobotMood("bump");
      setImpactOverlay({ x: robotPos.x, y: robotPos.y, text: "BUMP! 💥 -15", color: "text-red-500 font-bold" });
      setTimeout(() => setRobotMood("normal"), 400);
    } else if (steppedPuddle) {
      setRobotMood("puddle");
      setImpactOverlay({ x: nextX, y: nextY, text: "SPLASH! 💧 -10", color: "text-blue-400 font-medium" });
      setTimeout(() => setRobotMood("normal"), 400);
    } else if (reachedGoal) {
      setRobotMood("goal");
      setImpactOverlay({ x: nextX, y: nextY, text: "CHARGING COMPLETE! 🔋⭐ +100", color: "text-green-500 font-bold scale-110" });
      setIsPlaying(false);
    } else {
      setImpactOverlay({ x: nextX, y: nextY, text: "-1 Step", color: "text-slate-400 text-xs" });
    }
  }, [robotPos, userRules, activeLayout, isWall, isPuddle, checkCondition, rulesNeededCounter]);

  // ==========================================
  // REINFORCEMENT LEARNING LOGIC
  // ==========================================
  const executeRlStep = useCallback(() => {
    const s = robotPos.y * GRID_SIZE + robotPos.x;
    
    // Epsilon-greedy action selection
    let actionIndex = 0;
    if (Math.random() < epsilon) {
      // Explore (Random decision)
      actionIndex = Math.floor(Math.random() * 4);
    } else {
      // Exploit (Smart decision based on current Q-table values)
      const stateQs = qTable[s];
      let maxQ = -Infinity;
      let bestActions: number[] = [];
      for (let a = 0; a < 4; a++) {
        if (stateQs[a] > maxQ) {
          maxQ = stateQs[a];
          bestActions = [a];
        } else if (stateQs[a] === maxQ) {
          bestActions.push(a);
        }
      }
      actionIndex = bestActions[Math.floor(Math.random() * bestActions.length)];
    }

    const action = REAL_ACTIONS[actionIndex];
    setLastActionName(action.name);

    // Compute next state coordinates
    let nextX = robotPos.x + action.dx;
    let nextY = robotPos.y + action.dy;
    let hitObstacle = false;
    let steppedPuddle = false;
    let reachedGoal = false;
    let r = REWARDS.STEP;

    if (nextX < 0 || nextX >= GRID_SIZE || nextY < 0 || nextY >= GRID_SIZE || isWall(nextX, nextY, activeLayout)) {
      nextX = robotPos.x;
      nextY = robotPos.y;
      hitObstacle = true;
      r = REWARDS.WALL;
    } else if (nextX === activeLayout.goal.x && nextY === activeLayout.goal.y) {
      reachedGoal = true;
      r = REWARDS.GOAL;
    } else if (isPuddle(nextX, nextY, activeLayout)) {
      steppedPuddle = true;
      r = REWARDS.PUDDLE;
    }

    const nextS = nextY * GRID_SIZE + nextX;

    // Q-Learning Formula update:
    // Q[s][a] = Q[s][a] + alpha * (reward + gamma * max_a'(Q[next_s][a']) - Q[s][a])
    const maxNextQ = reachedGoal ? 0 : Math.max(...qTable[nextS]);
    const updatedQ = qTable[s][actionIndex] + alpha * (r + gamma * maxNextQ - qTable[s][actionIndex]);

    // Perform Q-Table State Mutation
    const updatedQTable = qTable.map((row, stateIdx) => {
      if (stateIdx === s) {
        return row.map((val, actIdx) => (actIdx === actionIndex ? updatedQ : val));
      }
      return row;
    });
    setQTable(updatedQTable);

    // Apply movement updates
    setRobotPos({ x: nextX, y: nextY });
    setTrail(prev => [...prev, { x: nextX, y: nextY }]);
    setStepsCount(prev => prev + 1);
    setScore(prev => prev + r);
    setCumulativeReward(prev => prev + r);

    // Dynamic visuals
    if (hitObstacle) {
      setRobotMood("bump");
      setImpactOverlay({ x: robotPos.x, y: robotPos.y, text: "BUMP! 💥 -15", color: "text-red-500 font-bold" });
      setTimeout(() => setRobotMood("normal"), 400);
    } else if (steppedPuddle) {
      setRobotMood("puddle");
      setImpactOverlay({ x: nextX, y: nextY, text: "SPLASH! 💧 -10", color: "text-blue-400 font-medium" });
      setTimeout(() => setRobotMood("normal"), 400);
    } else if (reachedGoal) {
      setRobotMood("goal");
      setImpactOverlay({ x: nextX, y: nextY, text: "CHARGING SUCCESSFUL! 🔋⭐ +100", color: "text-green-500 font-extrabold scale-110 animate-bounce" });
      setRlEpisodesCount(prev => prev + 1);
      setRlSuccesses(prev => prev + 1);
      setIsPlaying(false);
      // Fast decay curiosity as Chitti is finding paths
      setEpsilon(prev => Math.max(0.05, prev * 0.95));
    } else {
      setImpactOverlay({ x: nextX, y: nextY, text: "-1 Step", color: "text-slate-400 text-xs" });
    }
  }, [robotPos, qTable, activeLayout, isWall, isPuddle, epsilon, alpha, gamma]);

  // Fast Train 100 Episodes Background Simulation
  const trainFast = () => {
    setIsTrainingFast(true);
    setTimeout(() => {
      let tempQTable = qTable.map(row => [...row]);
      let tempEpsilon = epsilon;
      let newEpisodes = 0;
      let newSuccesses = 0;

      for (let ep = 0; ep < 100; ep++) {
        let x = 0;
        let y = 0;
        let steps = 0;
        let episodeFinished = false;

        while (!episodeFinished && steps < 120) {
          const s = y * GRID_SIZE + x;
          
          // Epsilon greedy
          let aIndex = 0;
          if (Math.random() < tempEpsilon) {
            aIndex = Math.floor(Math.random() * 4);
          } else {
            const stateQs = tempQTable[s];
            let maxQ = -Infinity;
            let bestActs: number[] = [];
            for (let a = 0; a < 4; a++) {
              if (stateQs[a] > maxQ) {
                maxQ = stateQs[a];
                bestActs = [a];
              } else if (stateQs[a] === maxQ) {
                bestActs.push(a);
              }
            }
            aIndex = bestActs[Math.floor(Math.random() * bestActs.length)];
          }

          const action = REAL_ACTIONS[aIndex];
          let nextX = x + action.dx;
          let nextY = y + action.dy;
          let hitObstacle = false;
          let r = REWARDS.STEP;

          if (nextX < 0 || nextX >= GRID_SIZE || nextY < 0 || nextY >= GRID_SIZE || isWall(nextX, nextY, activeLayout)) {
            nextX = x;
            nextY = y;
            hitObstacle = true;
            r = REWARDS.WALL;
          } else if (nextX === activeLayout.goal.x && nextY === activeLayout.goal.y) {
            r = REWARDS.GOAL;
            episodeFinished = true;
            newSuccesses++;
          } else if (isPuddle(nextX, nextY, activeLayout)) {
            r = REWARDS.PUDDLE;
          }

          const nextS = nextY * GRID_SIZE + nextX;
          const maxNextQ = episodeFinished ? 0 : Math.max(...tempQTable[nextS]);
          
          tempQTable[s][aIndex] = tempQTable[s][aIndex] + alpha * (r + gamma * maxNextQ - tempQTable[s][aIndex]);

          x = nextX;
          y = nextY;
          steps++;
        }
        
        newEpisodes++;
        // Decay Curiosity
        tempEpsilon = Math.max(0.05, tempEpsilon * 0.96);
      }

      setQTable(tempQTable);
      setEpsilon(tempEpsilon);
      setRlEpisodesCount(prev => prev + newEpisodes);
      setRlSuccesses(prev => prev + newSuccesses);
      setIsTrainingFast(false);
      resetSimulation();

      // Set happy goal mood to represent mastery
      setRobotMood("goal");
      setTimeout(() => setRobotMood("normal"), 1500);
    }, 150);
  };

  // Reset RL Brain (Q-Table)
  const resetRlBrain = () => {
    setQTable(Array.from({ length: 64 }, () => Array(4).fill(0)));
    setEpsilon(0.8);
    setRlEpisodesCount(0);
    setRlSuccesses(0);
    resetSimulation();
  };

  // Gamified Missions Auto-Tracker
  useEffect(() => {
    if (activeTab === "rules" && activeLayout.id === "layout_a" && robotPos.x === activeLayout.goal.x && robotPos.y === activeLayout.goal.y) {
      setMission1Complete(true);
    }
    if (activeTab === "rules" && activeLayout.id === "layout_b" && infiniteLoopAlert) {
      setMission2Complete(true);
    }
    if (activeTab === "rl" && rlEpisodesCount > 0) {
      setMission3Complete(true);
    }
  }, [activeTab, activeLayout, robotPos, infiniteLoopAlert, rlEpisodesCount]);

  const getTeacherMessage = () => {
    if (activeTab === "rules") {
      if (activeLayout.id === "layout_a") {
        if (robotPos.x === activeLayout.goal.x && robotPos.y === activeLayout.goal.y) {
          return "✨ Brilliant! Your manual rules guided Chitti perfectly! Now let's try 'Map 2: Changed World' and press Auto-Run to see what happens.";
        }
        return "👋 Hi! I'm Professor Byte! Let's teach Chitti with simple IF-THEN rules. Press 'Auto-Run' (or 'Manual Step') to watch him walk towards the green battery!";
      } else { // layout_b
        if (infiniteLoopAlert) {
          return "🚨 Oh no! Chitti is stuck in an infinite loop because of the new giant central wall! Fixed rules can't adapt. Switch to Mode 2 'ML Brain' to train Chitti!";
        }
        return "Can your fixed rules guide Chitti around the big wall on Map 2? Try pressing Play/Auto-Run and see what happens when Chitti hits a block!";
      }
    } else { // activeTab === "rl"
      if (rlEpisodesCount === 0) {
        return "🧠 Welcome to the Machine Learning Brain! Chitti starts with absolutely no knowledge. Click 'Train 100 Episodes Instantly' to watch Chitti learn by trial & error!";
      } else if (rlEpisodesCount > 0 && rlEpisodesCount < 50) {
        return "💡 Look! Chitti is beginning to learn! The glowing arrows show Chitti's brain map. Train him some more so he learns the perfect path!";
      } else {
        return "🏆 Fantastic! Chitti is now super smart! His Q-Table memory knows how to dodge every single obstacle and puddle. Try changing maps—his brain adapts automatically!";
      }
    }
  };

  // ==========================================
  // GAME LOOP CONTROLLERS
  // ==========================================
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    
    if (isPlaying) {
      intervalId = setInterval(() => {
        if (activeTab === "rules") {
          // Rule check termination
          if (robotPos.x === activeLayout.goal.x && robotPos.y === activeLayout.goal.y) {
            setIsPlaying(false);
            return;
          }
          executeRuleStep();
        } else {
          // RL evaluation termination
          if (robotPos.x === activeLayout.goal.x && robotPos.y === activeLayout.goal.y) {
            setIsPlaying(false);
            return;
          }
          executeRlStep();
        }
      }, playSpeed);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isPlaying, playSpeed, activeTab, robotPos, activeLayout, executeRuleStep, executeRlStep]);

  // ==========================================
  // CANVAS RENDERING CORE ENGINE
  // ==========================================
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cellWidth = width / GRID_SIZE;
    const cellHeight = height / GRID_SIZE;

    // 1. Clear background (High-Tech Matrix Slate Grid)
    ctx.fillStyle = "#1e293b"; // Slate 800
    ctx.fillRect(0, 0, width, height);

    // 2. Draw Grid Lines with metallic sub-borders
    ctx.strokeStyle = "#334155"; // Slate 700
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellWidth, 0);
      ctx.lineTo(i * cellWidth, height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * cellHeight);
      ctx.lineTo(width, i * cellHeight);
      ctx.stroke();
    }

    // 3. Draw Visited Trail Dots (Chitti's breadcrumbs path)
    trail.forEach((pos, idx) => {
      const xCenter = pos.x * cellWidth + cellWidth / 2;
      const yCenter = pos.y * cellHeight + cellHeight / 2;
      ctx.fillStyle = activeTab === "rules" ? "rgba(168, 85, 247, 0.4)" : "rgba(16, 185, 129, 0.4)";
      ctx.beginPath();
      ctx.arc(xCenter, yCenter, 4 + Math.min(idx * 0.1, 4), 0, 2 * Math.PI);
      ctx.fill();
    });

    // 4. Draw Obstacles (🧱 Bricks), Muddy Puddles (💧), and Start
    // Start Base Home
    ctx.fillStyle = "rgba(59, 130, 246, 0.15)";
    ctx.fillRect(0, 0, cellWidth, cellHeight);
    ctx.font = "11px sans-serif";
    ctx.fillStyle = "#93c5fd";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("HOME 🏠", cellWidth / 2, cellHeight / 2 + 15);

    // Draw obstacles (Walls)
    activeLayout.walls.forEach(w => {
      // Brick brick-red theme
      ctx.fillStyle = "#991b1b"; // Dark red
      ctx.fillRect(w.x * cellWidth + 2, w.y * cellHeight + 2, cellWidth - 4, cellHeight - 4);
      
      // Draw grid lines on wall to make it look like bricks
      ctx.strokeStyle = "#450a0a";
      ctx.lineWidth = 2;
      ctx.strokeRect(w.x * cellWidth + 4, w.y * cellHeight + 4, cellWidth - 8, cellHeight - 8);

      ctx.fillStyle = "#f87171";
      ctx.font = "14px Arial";
      ctx.fillText("🧱", w.x * cellWidth + cellWidth / 2, w.y * cellHeight + cellHeight / 2);
    });

    // Draw Puddles (Splashing mud)
    activeLayout.puddles.forEach(p => {
      ctx.fillStyle = "rgba(30, 144, 255, 0.2)";
      ctx.beginPath();
      ctx.arc(p.x * cellWidth + cellWidth / 2, p.y * cellHeight + cellHeight / 2, cellWidth / 2.3, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillStyle = "#60a5fa";
      ctx.font = "16px Arial";
      ctx.fillText("💧", p.x * cellWidth + cellWidth / 2, p.y * cellHeight + cellHeight / 2 - 2);
      
      ctx.font = "9px sans-serif";
      ctx.fillStyle = "#93c5fd";
      ctx.fillText("Mud", p.x * cellWidth + cellWidth / 2, p.y * cellHeight + cellHeight / 2 + 12);
    });

    // 5. Draw Goal Charging Station (🔋)
    const goal = activeLayout.goal;
    const isGoalReached = robotPos.x === goal.x && robotPos.y === goal.y;

    // Glowing active goal container
    ctx.shadowBlur = isGoalReached ? 15 : 4;
    ctx.shadowColor = "#10b981";
    ctx.fillStyle = isGoalReached ? "rgba(16, 185, 129, 0.3)" : "rgba(16, 185, 129, 0.1)";
    ctx.fillRect(goal.x * cellWidth + 2, goal.y * cellHeight + 2, cellWidth - 4, cellHeight - 4);
    ctx.shadowBlur = 0; // Clear shadow

    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 2;
    ctx.strokeRect(goal.x * cellWidth + 3, goal.y * cellHeight + 3, cellWidth - 6, cellHeight - 6);

    ctx.fillStyle = "#34d399";
    ctx.font = "20px Arial";
    ctx.fillText("🔋", goal.x * cellWidth + cellWidth / 2, goal.y * cellHeight + cellHeight / 2 - 4);
    
    ctx.font = "9px sans-serif";
    ctx.fillStyle = "#10b981";
    ctx.font = "bold 9px sans-serif";
    ctx.fillText("CHARGER", goal.x * cellWidth + cellWidth / 2, goal.y * cellHeight + cellHeight / 2 + 15);

    // 6. Draw Q-Values Smart Knowledge overlay (Mode 2)
    if (activeTab === "rl" && showQValues) {
      for (let s = 0; s < 64; s++) {
        const xCell = s % GRID_SIZE;
        const yCell = Math.floor(s / GRID_SIZE);
        
        // Don't draw overlays on walls or goal
        if (isWall(xCell, yCell, activeLayout) || (xCell === goal.x && yCell === goal.y)) {
          continue;
        }

        const stateQs = qTable[s];
        
        // Find best action value
        let maxVal = -Infinity;
        let bestActIdx = -1;
        stateQs.forEach((val, idx) => {
          if (val > maxVal) {
            maxVal = val;
            bestActIdx = idx;
          }
        });

        // Only draw arrow if the best value is learned (positive or negative)
        if (Math.abs(maxVal) > 0.01) {
          const cX = xCell * cellWidth + cellWidth / 2;
          const cY = yCell * cellHeight + cellHeight / 2;
          
          // Size and opacity of arrow depends on magnitude of Q-value
          const intensity = Math.min(Math.abs(maxVal) / 80, 1.0);
          const color = maxVal > 0 
            ? `rgba(16, 185, 129, ${0.15 + intensity * 0.7})`  // Beautiful green
            : `rgba(239, 68, 68, ${0.15 + intensity * 0.7})`;   // Warning red
          
          const action = REAL_ACTIONS[bestActIdx];
          
          // Draw a small directional arrow indicator in the cell
          ctx.beginPath();
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = color;
          
          const arrowLength = 12;
          const toX = cX + action.dx * arrowLength;
          const toY = cY + action.dy * arrowLength;
          
          ctx.moveTo(cX - action.dx * 4, cY - action.dy * 4);
          ctx.lineTo(toX, toY);
          ctx.stroke();
          
          // Arrowhead
          const headAngle = Math.PI / 6;
          const angle = Math.atan2(action.dy, action.dx);
          ctx.beginPath();
          ctx.fillStyle = color;
          ctx.moveTo(toX, toY);
          ctx.lineTo(toX - 5 * Math.cos(angle - headAngle), toY - 5 * Math.sin(angle - headAngle));
          ctx.lineTo(toX - 5 * Math.cos(angle + headAngle), toY - 5 * Math.sin(angle + headAngle));
          ctx.fill();
        }
      }
    }

    // 7. Draw Chitti the Robot (🤖)
    if (!isGoalReached) {
      const rx = robotPos.x * cellWidth + cellWidth / 2;
      const ry = robotPos.y * cellHeight + cellHeight / 2;

      // Draw cute robot container
      ctx.fillStyle = "rgba(147, 197, 253, 0.25)";
      ctx.beginPath();
      ctx.arc(rx, ry, cellWidth / 2.3, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = "#60a5fa";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Draw active mood emoticon
      let robotChar = "🤖";
      if (robotMood === "bump") robotChar = "😵";
      else if (robotMood === "puddle") robotChar = "🥶";
      else if (robotMood === "goal") robotChar = "🤩";

      ctx.fillStyle = "#ffffff";
      ctx.font = "24px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(robotChar, rx, ry);

      // Draw name label below Chitti
      ctx.font = "bold 8px sans-serif";
      ctx.fillStyle = "#60a5fa";
      ctx.fillText("CHITTI", rx, ry - cellHeight / 2.8);
    }

    // 8. Draw dynamic text overlay (for hits, scores, bumps)
    if (impactOverlay) {
      const tx = impactOverlay.x * cellWidth + cellWidth / 2;
      const ty = impactOverlay.y * cellHeight + cellHeight / 2 - 18;
      ctx.fillStyle = impactOverlay.color.includes("red") 
        ? "#ef4444" 
        : impactOverlay.color.includes("blue") 
          ? "#3b82f6" 
          : impactOverlay.color.includes("green") 
            ? "#10b981" 
            : "#cbd5e1";
      ctx.font = "bold 11px sans-serif";
      ctx.fillText(impactOverlay.text, tx, ty);
    }
  }, [robotPos, trail, activeLayout, activeTab, qTable, showQValues, robotMood, impactOverlay, isWall, isPuddle]);

  // Handle manual steps
  const triggerStep = () => {
    if (activeTab === "rules") {
      executeRuleStep();
    } else {
      executeRlStep();
    }
  };

  // ==========================================
  // RULES MANAGEMENT HANDLERS
  // ==========================================
  const changeRuleCondition = (id: string, condition: string) => {
    setUserRules(prev => prev.map(rule => rule.id === id ? { ...rule, condition } : rule));
    resetSimulation();
  };

  const changeRuleAction = (id: string, action: string) => {
    setUserRules(prev => prev.map(rule => rule.id === id ? { ...rule, action } : rule));
    resetSimulation();
  };

  const deleteRule = (id: string) => {
    setUserRules(prev => prev.filter(rule => rule.id !== id));
    resetSimulation();
    setRulesNeededCounter(prev => Math.max(1, prev - 1));
  };

  const addRule = () => {
    const newId = (Math.max(...userRules.map(r => parseInt(r.id) || 0)) + 1).toString();
    setUserRules(prev => [
      ...prev,
      { id: newId, condition: "always", action: "MOVE_DOWN", enabled: true }
    ]);
    resetSimulation();
    setRulesNeededCounter(prev => prev + 1);
  };

  // ==========================================
  // INTERACTIVE CBSE QUIZ SUBMIT
  // ==========================================
  const handleAnswerSelect = (qId: number, optionIdx: number) => {
    setSelectedAnswers(prev => ({ ...prev, [qId]: optionIdx }));
  };

  const submitQuiz = () => {
    let scoreCount = 0;
    CBSE_QUIZ_QUESTIONS.forEach(q => {
      if (selectedAnswers[q.id] === q.correctIndex) {
        scoreCount++;
      }
    });
    setQuizScore(scoreCount);
    setQuizSubmitted(true);
  };

  const resetQuiz = () => {
    setSelectedAnswers({});
    setQuizScore(null);
    setQuizSubmitted(false);
  };

  return (
    <div className="min-h-[600px] bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* HEADER SECTION */}
      <header className="h-16 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-6 shrink-0 sticky top-0 z-50 shadow-md">
        <div className="max-w-[1600px] w-full mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-500 rounded flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
              🤖
            </div>
            <h1 className="text-lg md:text-xl font-display font-bold tracking-tight text-white flex items-center gap-2">
              Robot Intelligence Lab
              <span className="hidden sm:inline text-slate-400 font-normal text-xs bg-slate-900/85 px-2.5 py-1 rounded-full border border-slate-700/65">
                CBSE Grade 6-8 AI Explorer
              </span>
            </h1>
          </div>
          <div className="bg-indigo-950/80 px-4 py-1.5 rounded-full border border-indigo-500/30 flex items-center gap-2 shrink-0">
            <p className="text-indigo-200 text-xs md:text-sm italic font-medium leading-none">
              "Intelligence is <span className="font-bold text-indigo-400 font-display">EARNED</span> from experience."
            </p>
          </div>
        </div>
      </header>

      {/* LEVEL CHOOSE BAR */}
      <div className="bg-slate-900 border-b border-slate-700 py-3 px-6 shrink-0 shadow-sm">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider font-display shrink-0">
              Choose Sandbox Level:
            </span>
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-700 w-full sm:w-auto">
              <button
                onClick={() => { setIsSimpleMode(true); resetSimulation(); }}
                className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                  isSimpleMode
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                🎒 Class 6-8 Playful Mode
              </button>
              <button
                onClick={() => { setIsSimpleMode(false); resetSimulation(); }}
                className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                  !isSimpleMode
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                🔬 Lab Mode (Advanced)
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-start gap-3 text-xs bg-slate-950/80 px-4 py-2 rounded-xl border border-slate-700 w-full md:w-auto shadow-inner">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 text-sm">⭐</span>
              <span className="text-slate-300 font-medium">
                {isSimpleMode ? "Lab Missions Completed:" : "Milestone Badges:"}
              </span>
            </div>
            <span className="font-mono font-black text-white bg-indigo-950/80 px-2.5 py-0.5 rounded border border-indigo-500/20 text-xs shadow-lg shadow-indigo-500/5">
              {([mission1Complete, mission2Complete, mission3Complete].filter(Boolean).length)} / 3
            </span>
          </div>
        </div>
      </div>

      {/* STEP NAV — Intro → Lab → Quiz (navigable like other submodules) */}
      <div className="bg-slate-900/60 border-b border-slate-700 py-3 px-6 shrink-0">
        <div className="max-w-[1600px] mx-auto flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
          {["① Intro & Theory", "② The Lab", "③ Quiz"].map((label, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={`px-3 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all ${
                page === i
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* PAGE 0 — INTRO & THEORY */}
      {page === 0 && (
        <main className="flex-1 max-w-[1000px] w-full mx-auto p-4 md:p-6 flex flex-col gap-6">
          <div className="bg-gradient-to-br from-indigo-950 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 md:p-8 text-center shadow-xl">
            <div className="text-5xl mb-3">🤖</div>
            <h2 className="text-2xl md:text-3xl font-display font-bold text-white mb-3">Meet Chitti — a robot who learns.</h2>
            <p className="text-sm md:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
              You're about to discover the single biggest idea in AI: the difference between a robot that <strong className="text-indigo-300">follows rules</strong> you write, and one that <strong className="text-emerald-300">learns from experience</strong>. Chitti has to reach his charging station 🔋 across a tricky 8×8 world of walls 🧱 and puddles 💧.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2"><Sliders className="w-5 h-5 text-indigo-400" /><h3 className="font-display font-bold text-indigo-300">Mode 1 · Fixed Rules 📝</h3></div>
              <p className="text-xs text-slate-400 leading-relaxed">You hand Chitti a checklist of <em>if-then</em> rules. They work perfectly on the simple map… until the world changes and the rules pile up and break. Writing a rule for every possible situation is impossible.</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2"><Zap className="w-5 h-5 text-emerald-400" /><h3 className="font-display font-bold text-emerald-300">Mode 2 · Learning Brain 🧠</h3></div>
              <p className="text-xs text-slate-400 leading-relaxed">Now Chitti gets no rules — only rewards ⭐ for good moves and penalties ✗ for bad ones. Through trial and error he builds a "brain map" and figures out the maze <em>by himself</em>. That's Reinforcement Learning.</p>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-xs font-bold uppercase text-slate-300 tracking-wider mb-3 flex items-center gap-2">🎯 What you'll do in the Lab</h3>
            <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs text-slate-300">
              <li className="flex items-center gap-2 bg-slate-900 rounded-lg p-3 border border-slate-700">🏆 Guide Chitti with rules on Map 1</li>
              <li className="flex items-center gap-2 bg-slate-900 rounded-lg p-3 border border-slate-700">🌋 Watch the rules break on Map 2</li>
              <li className="flex items-center gap-2 bg-slate-900 rounded-lg p-3 border border-slate-700">🧠 Train his brain to solve it himself</li>
            </ul>
          </div>
        </main>
      )}

      {/* PAGE 1 — THE LAB */}
      {page === 1 && (
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: THE ARENA (5 columns equivalent) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* PROFESSOR BYTE GUIDE SPEECH CARD (Only in Simple Mode) */}
          {isSimpleMode && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-indigo-950 to-indigo-900 border border-indigo-500/30 rounded-xl p-4 shadow-lg flex items-start gap-3"
            >
              <div className="text-3xl shrink-0 select-none animate-bounce">
                💡
              </div>
              <div className="flex-1">
                <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest font-mono block">
                  Professor Byte Says:
                </span>
                <p className="text-xs text-slate-200 mt-1 leading-relaxed font-medium">
                  {getTeacherMessage()}
                </p>
              </div>
            </motion.div>
          )}

          <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-md font-display font-semibold text-slate-200 flex items-center gap-2">
                <Compass className="w-4 h-4 text-indigo-400" />
                ENVIRONMENT ARENA (8x8 Grid)
              </h2>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-mono text-indigo-300 uppercase tracking-wider bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                  Live Preview
                </span>
              </div>
            </div>

            {/* The canvas renderer wrapper */}
            <div className="relative mx-auto bg-slate-950 rounded-xl overflow-hidden border border-slate-700 shadow-inner flex justify-center items-center">
              <canvas
                id="mazeCanvas"
                ref={canvasRef}
                width={360}
                height={360}
                className="block max-w-full aspect-square"
              />
              
              {/* Dynamic Overlay Splash Alert for infinite loop loops */}
              <AnimatePresence>
                {infiniteLoopAlert && activeTab === "rules" && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="absolute inset-0 bg-red-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-10"
                  >
                    <AlertTriangle className="w-12 h-12 text-red-500 mb-3 animate-bounce" />
                    <h3 className="text-lg font-display font-bold text-red-400">🚨 Rule Failure Loop!</h3>
                    <p className="text-xs text-slate-300 max-w-xs mt-1.5">
                      Chitti is repeating the same steps infinitely! Hand-written rules cannot handle the new block.
                    </p>
                    <button 
                      onClick={() => setInfiniteLoopAlert(false)}
                      className="mt-4 px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold shadow-md transition-colors"
                    >
                      Dismiss & Write More Rules
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Simulation controls panel */}
            <div className="bg-slate-900 rounded-xl p-3 border border-slate-700 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Chitti's Location</span>
                <span className="font-mono font-bold text-white text-sm">
                  Col {robotPos.x + 1} , Row {robotPos.y + 1}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Simulation Steps</span>
                <span className="font-mono font-bold text-white text-sm">{stepsCount}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Score (Starts at 100)</span>
                <span className="font-mono font-bold text-indigo-400 text-sm">{score} pts</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Net Reward</span>
                <span className={`font-mono font-bold text-sm ${cumulativeReward >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {cumulativeReward}
                </span>
              </div>
            </div>

          </div>

        </div>

        {/* RIGHT COLUMN: CONTROLS + THE BRAIN DESIGN INTERACTIVE (7 columns equivalent) */}
        <div className="lg:col-span-7 flex flex-col gap-6">

          {/* CONTROLS SIDEBAR — moved here from below the matrix */}
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 shadow-lg flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase text-slate-300 tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" /> Controls
            </h3>

            {/* Core Action buttons row */}
            <div className="flex gap-2">
              <button
                onClick={resetSimulation}
                className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center justify-center gap-1.5 transition-all"
                title="Restart Chitti to starting position"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                Reset Chitti
              </button>

              <button
                onClick={triggerStep}
                disabled={robotPos.x === activeLayout.goal.x && robotPos.y === activeLayout.goal.y}
                className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center justify-center gap-1.5 transition-all"
              >
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                Manual Step
              </button>

              <button
                onClick={() => setIsPlaying(!isPlaying)}
                disabled={robotPos.x === activeLayout.goal.x && robotPos.y === activeLayout.goal.y}
                className={`flex-1 py-2 px-4 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  isPlaying
                    ? "bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-500/15 animate-pulse"
                    : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/15"
                }`}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {isPlaying ? "Pause" : "Auto-Run"}
              </button>
            </div>

            {/* Animation Speed Slider */}
            <div className="flex items-center justify-between gap-4 bg-slate-900 p-2.5 rounded-lg border border-slate-700 text-xs">
              <span className="text-slate-400 shrink-0 font-bold tracking-wider uppercase text-[10px]">Tick Speed:</span>
              <input
                type="range"
                min={50}
                max={600}
                step={50}
                value={playSpeed}
                onChange={(e) => setPlaySpeed(Number(e.target.value))}
                className="w-full accent-indigo-500 h-1 rounded-lg cursor-pointer bg-slate-700"
              />
              <span className="text-slate-300 font-mono shrink-0">{playSpeed}ms</span>
            </div>

            {/* Map selection controller (Change the World) */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Choose Environment Map:</label>
              <div className="flex gap-2">
                <button
                  onClick={() => { setActiveLayout(LAYOUT_A); resetSimulation(); }}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 ${
                    activeLayout.id === "layout_a"
                      ? "bg-indigo-600/15 border-indigo-500 text-indigo-300 font-bold shadow-md shadow-indigo-600/5"
                      : "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  🗺️ Map 1: Simple World
                </button>
                <button
                  onClick={() => { setActiveLayout(LAYOUT_B); resetSimulation(); }}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 ${
                    activeLayout.id === "layout_b"
                      ? "bg-indigo-600/15 border-indigo-500 text-indigo-300 font-bold shadow-md shadow-indigo-600/5"
                      : "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  🌋 Map 2: Changed World
                </button>
              </div>
              <p className="text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-700 mt-1 leading-relaxed">
                <strong>Map Status:</strong> {activeLayout.description}
              </p>
            </div>
          </div>

          {/* TABS SELECTOR */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-1 flex shrink-0 shadow-lg">
            <button
              onClick={() => { setActiveTab("rules"); resetSimulation(); }}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold tracking-tight transition-all flex items-center justify-center gap-2 ${
                activeTab === "rules" 
                  ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/15" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              {isSimpleMode ? "Mode 1: Fixed Rules 📝" : "MODE 1: Hand-Write Rules (Rigid AI)"}
            </button>
            <button
              onClick={() => { setActiveTab("rl"); resetSimulation(); }}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold tracking-tight transition-all flex items-center justify-center gap-2 ${
                activeTab === "rl" 
                  ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/15" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              {isSimpleMode ? "Mode 2: Self-Learning Brain 🧠" : "MODE 2: Let Chitti Learn (ML Brain)"}
            </button>
          </div>

          {/* ACTIVE TAB SANDBOX CONTROL */}
          <div className="flex-1 bg-slate-800 rounded-xl border border-slate-700 p-5 shadow-xl min-h-[460px] flex flex-col gap-4">
            
            {/* TAB 1: HAND-WRITTEN RULES CONTROL PANEL */}
            {activeTab === "rules" && (
              <div className="flex flex-col gap-4 flex-1">
                <div className="border-b border-slate-700 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-5 w-5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-black rounded-lg flex items-center justify-center">1</span>
                    <h3 className="text-md font-display font-bold text-indigo-400">
                      {isSimpleMode ? "📝 Teach Chitti with Simple IF-THEN Rules" : "Program Chitti using Fixed Rules"}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {isSimpleMode 
                      ? "Create a checklist of rules. Chitti will read them from top to bottom to make his move!" 
                      : "Design a sequence of logical conditional blocks. Chitti will check them from top to bottom."}
                  </p>
                </div>

                {/* Rules List Container */}
                <div className="flex flex-col gap-2 bg-slate-900 p-3 rounded-xl border border-slate-700 max-h-[280px] overflow-y-auto">
                  {userRules.map((rule, idx) => (
                    <div 
                      key={rule.id}
                      className="bg-slate-800 p-2.5 rounded-xl border border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 relative group"
                    >
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <span className="font-mono text-[10px] text-indigo-400 font-bold select-none shrink-0 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                          IF
                        </span>
                        
                        <select
                          value={rule.condition}
                          onChange={(e) => changeRuleCondition(rule.id, e.target.value)}
                          className="bg-slate-900 border border-slate-700 rounded-lg py-1 px-2 text-xs text-slate-200 outline-none focus:border-indigo-500 shrink-0 w-full sm:w-[190px]"
                        >
                          <option value="always">Always (Default fallback)</option>
                          <option value="right_clear">Path to Right ➡️ is CLEAR</option>
                          <option value="down_clear">Path Below ⬇️ is CLEAR</option>
                          <option value="wall_right">Wall/Obstacle is on Right 🧱</option>
                          <option value="wall_down">Wall/Obstacle is Below 🧱</option>
                          <option value="in_puddle">Chitti is in a Muddy Puddle 💧</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] text-slate-500 font-bold uppercase">THEN</span>
                          <select
                            value={rule.action}
                            onChange={(e) => changeRuleAction(rule.id, e.target.value)}
                            className="bg-slate-900 border border-slate-700 rounded-lg py-1 px-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                          >
                            <option value="MOVE_RIGHT">Go Right ➡️</option>
                            <option value="MOVE_DOWN">Go Down ⬇️</option>
                            <option value="MOVE_LEFT">Go Left ⬅️</option>
                            <option value="MOVE_UP">Go Up ⬆️</option>
                          </select>
                        </div>

                        {/* Delete rule option */}
                        {userRules.length > 1 && (
                          <button
                            onClick={() => deleteRule(rule.id)}
                            className="p-1.5 hover:bg-rose-500/10 rounded-lg text-slate-400 hover:text-rose-400 transition-colors shrink-0"
                            title="Remove Rule block"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Add rule slot option */}
                  <button
                    onClick={addRule}
                    disabled={userRules.length >= 6}
                    className="py-2 px-3 border border-dashed border-slate-700 hover:border-slate-500 rounded-xl text-xs text-slate-400 hover:text-slate-300 flex items-center justify-center gap-1.5 transition-all disabled:opacity-40"
                  >
                    <Plus className="w-4 h-4" />
                    Add Condition Rule Block (Max 6)
                  </button>
                </div>

                {/* Lesson Insight Box */}
                <div className="bg-slate-900 rounded-xl p-4 border border-slate-700 mt-auto">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-display font-bold text-indigo-300 uppercase tracking-wider">
                        The Educational Discovery:
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed mt-1 font-sans">
                        Notice how the default rules lead Chitti to the goal in <strong>Map 1 (Simple World)</strong> perfectly. 
                        But click <strong>"Map 2 (Changed World)"</strong> and press Auto-Run. Chitti will get trapped because the hardcoded rules did not expect the giant central wall!
                      </p>
                      
                      {/* Interactive rule counter ticker */}
                      <div className="mt-3 flex items-center gap-2.5 bg-slate-950 p-2.5 rounded-lg border border-slate-700">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Rules needed to prevent loop:</span>
                        <div className="flex items-center gap-1 font-mono font-black text-sm">
                          <span className="text-indigo-400">4</span>
                          <span className="text-slate-500">➔</span>
                          <span className={`transition-all ${activeLayout.id === "layout_b" ? "text-amber-400 scale-110" : "text-slate-400"}`}>12</span>
                          <span className="text-slate-500">➔</span>
                          <span className="text-slate-600">23</span>
                          <span className="text-slate-500">➔</span>
                          <span className="text-red-500 animate-pulse text-lg">∞</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: REINFORCEMENT LEARNING LAB PANEL */}
            {activeTab === "rl" && (
              <div className="flex flex-col gap-4 flex-1">
                <div className="border-b border-slate-700 pb-3 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="h-5 w-5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-black rounded-lg flex items-center justify-center">2</span>
                      <h3 className="text-md font-display font-bold text-indigo-400">
                        {isSimpleMode ? "🧠 Teach Chitti via Trial & Error (ML)" : "Train Chitti via Trial & Error"}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {isSimpleMode 
                        ? "Chitti creates a 'Mental Map' inside his brain to remember which steps were rewarding." 
                        : "Chitti maintains a Q-Table map to remember which steps were rewarding."}
                    </p>
                  </div>

                  {/* Show values overlay switcher */}
                  <label className="flex items-center gap-2 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-700 cursor-pointer text-[11px] hover:bg-slate-900 transition-colors self-start shrink-0">
                    <input 
                      type="checkbox"
                      checked={showQValues}
                      onChange={(e) => setShowQValues(e.target.checked)}
                      className="accent-indigo-500"
                    />
                    <span>{isSimpleMode ? "👀 Show Thought Arrows" : "Show Brain Arrows"}</span>
                  </label>
                </div>

                {/* Training Simulator Commands */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-700 flex flex-col gap-1.5 justify-center">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-bold">
                      {isSimpleMode ? "🎲 Curiosity (Adventure)" : "Curiosity (Epsilon)"}
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-amber-400 text-md">
                        {Math.round(epsilon * 100)}%
                      </span>
                      <span className="text-[10px] text-slate-400 italic">
                        {epsilon > 0.5 ? "🎲 Exploring" : "🧠 Smart Move"}
                      </span>
                    </div>
                    <input 
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.05"
                      value={epsilon}
                      onChange={(e) => setEpsilon(Number(e.target.value))}
                      className="w-full accent-indigo-500 h-1 rounded bg-slate-800 mt-1"
                    />
                  </div>

                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-700 flex flex-col justify-center">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-bold">
                      {isSimpleMode ? "⚡ Practice Runs Completed" : "Lessons Completed"}
                    </span>
                    <span className="font-mono font-black text-2xl text-emerald-400 mt-1">
                      {rlEpisodesCount} <span className="text-xs text-slate-500 font-normal">runs</span>
                    </span>
                  </div>
                </div>

                {/* Primary RL training launcher action buttons */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={resetRlBrain}
                    className="flex-1 py-2.5 px-3 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                    {isSimpleMode ? "🧼 Erase Chitti's Memory" : "Wipe Brain (Q-Table)"}
                  </button>

                  <button
                    onClick={trainFast}
                    disabled={isTrainingFast}
                    className="flex-[1.5] py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/10 disabled:opacity-50"
                  >
                    <TrendingUp className="w-4 h-4 text-indigo-200" />
                    {isTrainingFast ? "Simulating Fast..." : isSimpleMode ? "⚡ Learn 100 Times Instantly!" : "Train 100 Episodes Instantly!"}
                  </button>
                </div>

                {/* RL Q-table interactive visualization card */}
                <div className="bg-slate-900 rounded-xl p-4 border border-slate-700 mt-auto leading-relaxed">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-display font-bold text-indigo-300 uppercase tracking-wider">
                        The AI Lab Breakthrough:
                      </h4>
                      <p className="text-xs text-slate-300 mt-1">
                        Press <strong>"Train 100 Episodes Instantly!"</strong> 1 or 2 times, then press <strong>Auto-Run</strong> on Map 2. 
                        Watch Chitti immediately find the perfect path bypass without hitting a single brick!
                      </p>
                      <p className="text-xs text-indigo-300 font-bold mt-2 font-sans">
                        💡 Notice the glowing directional arrows appearing on the grid! That is the physical brain map stored in the Q-Table.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* GAMIFIED MISSION CHECKLIST — now next to the controls it tracks */}
          {isSimpleMode && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-800 rounded-xl p-4 border border-slate-700 shadow-md flex flex-col gap-3"
            >
              <div className="flex items-center gap-1.5 border-b border-slate-700 pb-2">
                <span className="text-md">🎯</span>
                <h3 className="text-xs font-bold uppercase text-slate-300 tracking-wider">
                  Chitti's Training Missions
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                {/* Mission 1 */}
                <div className="flex items-center gap-2.5">
                  <div className={`h-4.5 w-4.5 rounded flex items-center justify-center border transition-all shrink-0 ${
                    mission1Complete
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                      : "border-slate-600 bg-slate-900/50"
                  }`}>
                    {mission1Complete ? "✓" : ""}
                  </div>
                  <span className={`transition-all ${mission1Complete ? "text-slate-500 line-through" : "text-slate-300 font-medium"}`}>
                    🏆 Rules guide Chitti on Map 1
                  </span>
                </div>

                {/* Mission 2 */}
                <div className="flex items-center gap-2.5">
                  <div className={`h-4.5 w-4.5 rounded flex items-center justify-center border transition-all shrink-0 ${
                    mission2Complete
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                      : "border-slate-600 bg-slate-900/50"
                  }`}>
                    {mission2Complete ? "✓" : ""}
                  </div>
                  <span className={`transition-all ${mission2Complete ? "text-slate-500 line-through" : "text-slate-300 font-medium"}`}>
                    🌋 Trigger a loop on Map 2
                  </span>
                </div>

                {/* Mission 3 */}
                <div className="flex items-center gap-2.5">
                  <div className={`h-4.5 w-4.5 rounded flex items-center justify-center border transition-all shrink-0 ${
                    mission3Complete
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                      : "border-slate-600 bg-slate-900/50"
                  }`}>
                    {mission3Complete ? "✓" : ""}
                  </div>
                  <span className={`transition-all ${mission3Complete ? "text-slate-500 line-through" : "text-slate-300 font-medium"}`}>
                    🧠 ML Brain finds the path
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* CBSE LAB VOCABULARY — full-width reference band under the sandbox */}
        <div className="col-span-1 lg:col-span-12 bg-slate-800 rounded-xl p-5 border border-slate-700 shadow-xl flex flex-col gap-3.5">
          <h3 className="text-xs font-display font-semibold uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            {isSimpleMode ? "🎒 Middle School AI Glossary" : "CBSE COMPUTER SCIENCE GLOSSARY"}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs leading-relaxed">
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-700">
              <span className="text-indigo-300 font-semibold block mb-0.5 font-display">
                {isSimpleMode ? "🤖 Chitti (The Learner)" : "🤖 Agent (Learner)"}
              </span>
              <p className="text-[11px] text-slate-400">
                {isSimpleMode
                  ? "The robot or AI that is trying to solve the puzzle. Here, Chitti is the learner!"
                  : "The active system that makes decisions. Here, Chitti is the agent!"}
              </p>
            </div>
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-700">
              <span className="text-amber-400 font-semibold block mb-0.5 font-display">
                {isSimpleMode ? "🗺️ Play Grid (The Environment)" : "🗺️ Environment"}
              </span>
              <p className="text-[11px] text-slate-400">
                {isSimpleMode
                  ? "The world Chitti lives in—our 8x8 grid filled with brick walls and mud puddles."
                  : "The surrounding world. Here, the 8x8 Grid Arena with obstacles is the environment."}
              </p>
            </div>
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-700">
              <span className="text-indigo-300 font-semibold block mb-0.5 font-display">
                {isSimpleMode ? "📍 Position (The State)" : "📍 State (Condition)"}
              </span>
              <p className="text-[11px] text-slate-400">
                {isSimpleMode
                  ? "Where Chitti is standing right now on the grid (like Column 1, Row 1)."
                  : "The agent's current situation. Chitti's current grid position is his state."}
              </p>
            </div>
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-700">
              <span className="text-emerald-400 font-semibold block mb-0.5 font-display">
                {isSimpleMode ? "🎁 Star vs Splash (Feedback)" : "🎁 Reward / Penalty"}
              </span>
              <p className="text-[11px] text-slate-400">
                {isSimpleMode
                  ? "+100 Gold Stars for reaching the green battery, and minus points for hitting walls or splashing mud!"
                  : "Numerical feedback (+100 for goals, negative values for muddy splashes or wall bumps) teaching the agent."}
              </p>
            </div>
          </div>
        </div>
      </main>
      )}

      {/* PAGE 2 — TAKEAWAY + QUIZ */}
      {page === 2 && (<>
      {/* FINAL PEDAGOGICAL TAKEAWAY BANNER */}
      <section className="bg-gradient-to-r from-slate-900 via-indigo-950/80 to-slate-900 border-y border-slate-700 py-8 px-6 text-center relative overflow-hidden shrink-0">
        <div className="max-w-4xl mx-auto relative z-10 flex flex-col items-center">
          <div className="p-2 bg-indigo-500/10 rounded-full border border-indigo-500/20 mb-3 text-indigo-400">
            <Award className="w-8 h-8 animate-pulse" />
          </div>
          
          <h2 className="text-xl md:text-2xl font-display font-bold tracking-tight text-white max-w-3xl leading-snug">
            "Rules are written by hand and break easily.<br className="hidden md:inline" /> Intelligence is <span className="text-indigo-400 font-display font-bold">EARNED from experience</span>."
          </h2>
          
          <p className="text-xs text-slate-400 max-w-2xl mt-3 leading-relaxed">
            This is the fundamental reason why modern AI like self-driving cars, drone navigations, and robotics do not use rigid 'if-then' programming. Instead, they use Machine Learning models that trial-and-error millions of times inside secure simulators to build smart intelligence.
          </p>
        </div>
      </section>

      {/* CBSE INTERACTIVE QUIZ CORNER */}
      <section className="max-w-4xl w-full mx-auto p-4 md:p-6 mb-12">
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 shadow-xl flex flex-col gap-6">
          <div className="flex items-center gap-2.5 border-b border-slate-700 pb-3">
            <GraduationCap className="w-6 h-6 text-indigo-400" />
            <div>
              <h3 className="text-md font-display font-semibold text-slate-200">CBSE Assessment Corner</h3>
              <p className="text-xs text-slate-400">Test your learning outcomes and earn a virtual AI badge!</p>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            {CBSE_QUIZ_QUESTIONS.map((q) => (
              <div key={q.id} className="bg-slate-900 p-4 rounded-lg border border-slate-700/80 flex flex-col gap-3">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider font-mono">Question {q.id}</span>
                <p className="text-xs font-bold text-slate-200">{q.question}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
                  {q.options.map((opt, optIdx) => {
                    const isSelected = selectedAnswers[q.id] === optIdx;
                    const isCorrect = q.correctIndex === optIdx;
                    const showFeedback = quizSubmitted;

                    let btnClass = "bg-slate-950 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white";
                    if (isSelected) {
                      btnClass = "bg-indigo-500/10 border-indigo-500 text-indigo-300 font-bold";
                    }
                    if (showFeedback) {
                      if (isCorrect) {
                        btnClass = "bg-emerald-500/15 border-emerald-500 text-emerald-300 font-bold";
                      } else if (isSelected) {
                        btnClass = "bg-rose-500/15 border-rose-500 text-rose-300 font-bold";
                      }
                    }

                    return (
                      <button
                        key={optIdx}
                        onClick={() => !quizSubmitted && handleAnswerSelect(q.id, optIdx)}
                        disabled={quizSubmitted}
                        className={`text-left p-3 rounded-lg border text-xs transition-all flex items-start gap-2.5 ${btnClass}`}
                      >
                        <span className="h-4 w-4 rounded-full border border-current flex items-center justify-center shrink-0 text-[10px] font-bold">
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>

                {quizSubmitted && selectedAnswers[q.id] !== undefined && (
                  <div className={`mt-2 p-3 rounded-lg text-xs leading-relaxed border ${
                    selectedAnswers[q.id] === q.correctIndex 
                      ? "bg-emerald-500/10 border-emerald-500/20 text-slate-300" 
                      : "bg-amber-500/10 border-amber-500/20 text-slate-300"
                  }`}>
                    <p className="font-bold flex items-center gap-1.5 text-[11px] mb-0.5">
                      {selectedAnswers[q.id] === q.correctIndex ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      )}
                      {selectedAnswers[q.id] === q.correctIndex ? "Correct Answer!" : "Insight:"}
                    </p>
                    <p className="text-[11px] text-slate-400">{q.explanation}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-slate-700 pt-5">
            {!quizSubmitted ? (
              <button
                onClick={submitQuiz}
                disabled={Object.keys(selectedAnswers).length < CBSE_QUIZ_QUESTIONS.length}
                className="w-full sm:w-auto py-2.5 px-6 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/10"
              >
                Submit Answers
              </button>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Award className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Your Results</span>
                    <span className="text-sm font-extrabold text-white">
                      Score: {quizScore} / {CBSE_QUIZ_QUESTIONS.length} Correct
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={resetQuiz}
                    className="flex-1 sm:flex-none py-2 px-4 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-lg border border-slate-700 transition-colors"
                  >
                    Retake Quiz
                  </button>
                  {quizScore === CBSE_QUIZ_QUESTIONS.length && (
                    <span className="py-2 px-4 bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-xs font-semibold rounded-lg flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      CBSE AI Badge Unlocked!
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
      </>)}

      {/* PREV / NEXT NAV */}
      <div className="max-w-[1600px] w-full mx-auto px-6 py-6 flex justify-between items-center gap-4 shrink-0">
        <button
          onClick={() => setPage(p => Math.max(0, p - 1))}
          disabled={page === 0}
          className="py-2.5 px-5 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
        >
          ← Back
        </button>
        {page < 2 ? (
          <button
            onClick={() => setPage(p => Math.min(2, p + 1))}
            className="py-2.5 px-6 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-bold text-white flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-colors"
          >
            {page === 0 ? "Start the Lab 🤖" : "Take the Quiz 🎓"} →
          </button>
        ) : (
          <button
            onClick={() => setPage(0)}
            className="py-2.5 px-6 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-slate-300 hover:bg-slate-700 flex items-center gap-2 transition-colors"
          >
            ↻ Back to start
          </button>
        )}
      </div>

      {/* FOOTER */}
      <footer className="mt-auto border-t border-slate-700 bg-slate-800 py-6 px-6 text-slate-400 text-xs shrink-0">
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row justify-between items-center gap-3 text-center sm:text-left">
          <div>
            <p className="font-bold text-slate-300">CBSE AI Subject Code 417 - Interactive Activity</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Designed to align with standard middle school ML curricula across Indian board standards.</p>
          </div>
          <p className="text-[11px]">
            &copy; 2026 AI Studio Build. Self-contained pedagogical game.
          </p>
        </div>
      </footer>
    </div>
  );
}
