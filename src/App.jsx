import React, { useEffect, useRef, useState, useMemo } from "react";
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import confetti from "canvas-confetti"
import { BALLOONS } from "./balloons";
import "./App.css";


const STORAGE_KEY = "COLLECTED_BALLOONS_WEB_V1";
const THEME_KEY = "THEME_WEB_V1";
const TUTORIAL_DONE_KEY = "TUTORIAL_DONE_WEB_V1";
const TUTORIAL_STEP_KEY = "TUTORIAL_STEP_WEB_V1";
const GRID_SIZE = 6;

const THEMES = [
  { bg: "#F6FBFF", header: "#FFFFFF", tile: "#ECF6FF", border: "#E3F1FF" },
  { bg: "#FFF7F0", header: "#FFFFFF", tile: "#FFF0D9", border: "#FFE1B8" },
  { bg: "#F3FFF6", header: "#FFFFFF", tile: "#E6FFEF", border: "#CFF6DC" },
  { bg: "#FFF3FB", header: "#FFFFFF", tile: "#FFE6F4", border: "#FFD0EA" },
];


const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

const getCollected = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
};

const addCollected = (id) => {
  const current = getCollected();
  if (!current.includes(id)) {
    const next = [...current, id];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next.length;
  }
  return current.length;
};

const playSound = (type) => {
  const path = type === 'correct' ? '/assets/sounds/correct.mp3' : '/assets/sounds/wrong.mp3';
  new Audio(path).play().catch(() => {});
};

const playWinEffects = () => {
  
  const audio = new Audio("/assets/sounds/end_game.mp3");
  audio.volume = 1.0; 
  audio.play().catch((e) => console.log("Audio play error:", e));

 
  const count = 200;
  const defaults = { origin: { y: 0.7 } };

  function fire(particleRatio, opts) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio)
    });
  }

  fire(0.25, { spread: 26, startVelocity: 55 });
  fire(0.2, { spread: 60 });
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
  fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
  fire(0.1, { spread: 120, startVelocity: 45 });
};


const HandPointer = ({ emoji = "👆", className }) => (
  <div className={`hand-pointer ${className}`}>{emoji}</div>
);


function GameScreen({ theme, setThemeIndex }) {
  const navigate = useNavigate();
  
  
  const bagRef = useRef(shuffle(BALLOONS));
  const bagIndexRef = useRef(0);
  const [target, setTarget] = useState(bagRef.current[0]);
  const [grid, setGrid] = useState([]);
  const [collectedCount, setCollectedCount] = useState(0);
  const [won, setWon] = useState(false);
  const [lock, setLock] = useState(false);
  const [hintId, setHintId] = useState(null);
  const [revealAnim, setRevealAnim] = useState(false);


  const [tutorialDone, setTutorialDone] = useState(true);
  const [tutorialStep, setTutorialStep] = useState(null);

  useEffect(() => {
    
    setCollectedCount(getCollected().length);
    const done = localStorage.getItem(TUTORIAL_DONE_KEY) === "1";
    const step = localStorage.getItem(TUTORIAL_STEP_KEY);
    
    setTutorialDone(done);
    if (!done) {
      const s = step ? Number(step) : 0;
      setTutorialStep(s);
      if (s === 0) localStorage.setItem(TUTORIAL_STEP_KEY, "0");
      
      if (s === 3) {
        localStorage.setItem(TUTORIAL_DONE_KEY, "1");
        localStorage.removeItem(TUTORIAL_STEP_KEY);
        setTutorialDone(true);
      }
    }
  }, []);

  
  useEffect(() => {
    setRevealAnim(false);
    setTimeout(() => setRevealAnim(true), 50);

    const others = BALLOONS.filter((x) => x.id !== target.id);
    const pick = shuffle(others).slice(0, GRID_SIZE - 1);
    setGrid(shuffle([target, ...pick]));

    
    setHintId(null);
    if (!tutorialDone && tutorialStep === 1) {
      setHintId(target.id); 
    } else {
      const start = setTimeout(() => setHintId(target.id), 5000);
      const stop = setTimeout(() => setHintId(null), 6000);
      return () => { clearTimeout(start); clearTimeout(stop); };
    }
  }, [target, tutorialDone, tutorialStep]);

  
  useEffect(() => {
    if (!tutorialDone && tutorialStep === 0) {
      const t = setTimeout(() => {
        setTutorialStep(1);
        localStorage.setItem(TUTORIAL_STEP_KEY, "1");
      }, 900);
      return () => clearTimeout(t);
    }
  }, [tutorialDone, tutorialStep]);

  const handlePick = (item) => {
    if (lock || won) return;
    if (!tutorialDone && tutorialStep === 2) return; 

    if (item.id === target.id) {
      setLock(true);
      setHintId(null);
      playSound('correct');
      const count = addCollected(item.id);
      setCollectedCount(count);

      
      if (!tutorialDone && tutorialStep === 1) {
        setLock(false);
        setTutorialStep(2);
        localStorage.setItem(TUTORIAL_STEP_KEY, "2");
        return;
      }

      if (count >= BALLOONS.length) {
        setWon(true);
        playWinEffects();
        setTimeout(() => {
          const nextTheme = (prev) => (prev + 1) % THEMES.length;
          setThemeIndex(nextTheme); 
          localStorage.setItem(THEME_KEY, localStorage.getItem(THEME_KEY) ? Number(localStorage.getItem(THEME_KEY)) + 1 : 1);
          localStorage.removeItem(STORAGE_KEY);
          setCollectedCount(0);
          bagRef.current = shuffle(BALLOONS);
          bagIndexRef.current = 0;
          setTarget(bagRef.current[0]);
          setWon(false);
          setLock(false);
        }, 4500);
        return;
      }

      setTimeout(() => {
        setLock(false);
        let idx = bagIndexRef.current + 1;
        if (idx >= bagRef.current.length) {
            bagRef.current = shuffle(BALLOONS);
            idx = 0;
        }
        bagIndexRef.current = idx;
        setTarget(bagRef.current[idx]);
      }, 450);

    } else {
      playSound('wrong');
    }
  };

  return (
    <>
      <header className="header-card" style={{ backgroundColor: theme.header, borderColor: theme.border }}>
        <div className="target-big" style={{ backgroundColor: theme.tile, borderColor: theme.border }}>
           <img src={target.img} alt="target" style={{ opacity: revealAnim ? 1 : 0 }} />
           {/* Rączka Krok 0 */}
           {!tutorialDone && tutorialStep === 0 && <HandPointer emoji="👆" className="hand-on-header" />}
        </div>
        <div className="progress">🎈 {collectedCount}/{BALLOONS.length}</div>
      </header>

      <div className="grid">
        {grid.map(item => (
          <div 
            key={item.id} 
            className={`tile ${hintId === item.id ? 'shake' : ''}`}
            onClick={() => handlePick(item)}
            style={{ backgroundColor: theme.tile, borderColor: theme.border }}
          >
            <img src={item.img} alt="balloon" />
             {/* Rączka Krok 1 (tylko na poprawnym) */}
            {!tutorialDone && tutorialStep === 1 && item.id === target.id && (
               <HandPointer emoji="👉" className="hand-on-tile" />
            )}
          </div>
        ))}
      </div>
      
      {/* Rączka Krok 2 (wskazuje na tab bar w layoucie, ale renderujemy tu by mieć kontrolę stanu) */}
      {!tutorialDone && tutorialStep === 2 && (
         <div style={{ position: 'fixed', bottom: 120, right: '44%', zIndex: 2000 }}>
             <HandPointer emoji="👇" />
         </div>
      )}

      {won && <div className="overlay"><div className="win-card">🎉🎈😊</div></div>}
    </>
  );
}

// --- SCREEN: KOLEKCJA ---
function CollectionScreen({ theme }) {
  const [ids, setIds] = useState([]);
  const [showBackHand, setShowBackHand] = useState(false);

  useEffect(() => {
    setIds(getCollected());
    
    // Tutorial logika
    const done = localStorage.getItem(TUTORIAL_DONE_KEY) === "1";
    const step = Number(localStorage.getItem(TUTORIAL_STEP_KEY));
    
    if (!done) {
        if (step === 2) {
            localStorage.setItem(TUTORIAL_STEP_KEY, "3"); // Przejdź do kroku 3
            setShowBackHand(true);
        } else if (step === 3) {
            setShowBackHand(true);
        }
    }
  }, []);

  return (
    <div>
      <div className="top-bar">
        <div className="progress">🎈 {ids.length}/{BALLOONS.length}</div>
      </div>
      <div className="collection-grid">
        {BALLOONS.map(item => {
          const owned = ids.includes(item.id);
          return (
            <div key={item.id} className={`tile ${!owned ? 'missing' : ''}`} style={{ borderColor: theme.border }}>
              <img src={item.img} alt="col" />
            </div>
          );
        })}
      </div>
      {/* Rączka Krok 3 (wróć do gry) */}
      {showBackHand && (
           <div style={{ position: 'fixed', bottom: 110, left: '37%', zIndex: 2000 }}>
             <HandPointer emoji="👇" />
         </div>
      )}
    </div>
  );
}

// --- LAYOUT & ROUTER ---
export default function App() {
  const [themeIndex, setThemeIndex] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) setThemeIndex(Number(saved));
  }, []);

  const theme = THEMES[themeIndex % THEMES.length];

  // Ustawienie tła body przez CSS variable
  useEffect(() => {
    document.documentElement.style.setProperty('--bg-color', theme.bg);
    document.documentElement.style.setProperty('--header-bg', theme.header);
    document.documentElement.style.setProperty('--tile-bg', theme.tile);
    document.documentElement.style.setProperty('--border-color', theme.border);
  }, [theme]);

  return (
    <BrowserRouter>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<GameScreen theme={theme} setThemeIndex={setThemeIndex} />} />
          <Route path="/kolekcja" element={<CollectionScreen theme={theme} />} />
        </Routes>

        <nav className="tab-bar">
          <Link to="/">
            <button className={`tab-btn ${window.location.pathname === '/' ? 'active' : ''}`}>🎯</button>
          </Link>
          <Link to="/kolekcja">
            <button className={`tab-btn ${window.location.pathname === '/kolekcja' ? 'active' : ''}`}>🎈</button>
          </Link>
        </nav>
      </div>
    </BrowserRouter>
  );
}