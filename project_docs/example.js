import React, { useState, useMemo } from 'react';
import { Shield, Zap, Activity, Map as MapIcon, Tent, Sword, Footprints, Flame, PlusCircle, Sparkles } from 'lucide-react';

// --- HEX GRID MATH & UTILS ---
const HEX_SIZE = 40;
const MAP_RADIUS = 3;

// Convert axial coordinates (q, r) to pixel coordinates (x, y)
const hexToPixel = (q, r, size) => {
  const x = size * Math.sqrt(3) * (q + r / 2);
  const y = size * (3 / 2) * r;
  return { x, y };
};

// Generate the points for a pointy-topped SVG polygon
const getHexPoints = (size) => {
  const points = [];
  for (let i = 0; i < 6; i++) {
    const angle_deg = 60 * i - 30;
    const angle_rad = (Math.PI / 180) * angle_deg;
    points.push(`${size * Math.cos(angle_rad)},${size * Math.sin(angle_rad)}`);
  }
  return points.join(' ');
};

// Generate a hexagonal grid of a given radius
const generateGrid = (radius) => {
  const grid = [];
  for (let q = -radius; q <= radius; q++) {
    const r1 = Math.max(-radius, -q - radius);
    const r2 = Math.min(radius, -q + radius);
    for (let r = r1; r <= r2; r++) {
      grid.push({ q, r, id: `${q},${r}` });
    }
  }
  return grid;
};

// --- MOCK CONTENT ---
const NEXUS_REWARDS = [
  { id: 1, title: "Fancy Bath Product", cost: 50, icon: "🛁", desc: "Lush bath bomb or Epsom salts" },
  { id: 2, title: "Personal Sauna Drop-in", cost: 150, icon: "🔥", desc: "1 hour at the local sauna" },
  { id: 3, title: "New Workout Gear", cost: 300, icon: "👕", desc: "Fresh athletic wear" },
  { id: 4, title: "Specialty Studio Class", cost: 500, icon: "🧘", desc: "Drop-in to a premium boutique gym" },
  { id: 5, title: "Professional Massage", cost: 1000, icon: "💆", desc: "90-minute deep tissue massage" },
];

const MOCK_ENCOUNTERS = {
  "1,0": { type: "basic", name: "Corrupted Drone", strikes: 1, gold: 10 },
  "-1,-1": { type: "elite", name: "Aether Golem", strikes: 3, gold: 50 },
  "0,3": { type: "boss", name: "Realm Warden", strikes: 5, gold: 200 },
  "2,-2": { type: "anomaly", name: "Sealed Terminal", stat: "Focus", cost: 2, gold: 30 },
};

export default function App() {
  const [activeTab, setActiveTab] = useState('map');
  
  // Character State
  const [stats, setStats] = useState({ brawn: 2, flow: 1, haste: 0, focus: -1 });
  const [resources, setResources] = useState({ slipstream: 5, strikes: 2, wards: 0, aether: 1 });
  const [progression, setProgression] = useState({ xp: 4, level: 1, currency: 120 });
  
  // Map State
  const [playerPos, setPlayerPos] = useState({ q: 0, r: 0 });
  const [revealedHexes, setRevealedHexes] = useState(new Set(["0,0", "1,0", "-1,0", "0,1", "0,-1", "1,-1", "-1,1"]));
  const [clearedHexes, setClearedHexes] = useState(new Set(["0,0"]));

  const grid = useMemo(() => generateGrid(MAP_RADIUS), []);
  const hexPoints = useMemo(() => getHexPoints(HEX_SIZE), []);

  // Actions
  const logWorkout = (type) => {
    setResources(prev => {
      const next = { ...prev };
      if (type === 'cardio') next.slipstream += 1; // 20 mins cardio
      if (type === 'strength') next.strikes += 1;  // 15 mins strength
      if (type === 'yoga') next.wards += 1;        // 20 mins yoga
      if (type === 'wellness') next.aether += 1;   // Meditation/Cooking
      return next;
    });
  };

  const movePlayer = (q, r, id) => {
    // Check adjacency
    const dq = Math.abs(playerPos.q - q);
    const dr = Math.abs(playerPos.r - r);
    const ds = Math.abs((-playerPos.q - playerPos.r) - (-q - r));
    const distance = Math.max(dq, dr, ds);

    if (distance !== 1) return; // Must move 1 hex at a time
    if (resources.slipstream < 1) {
      alert("Not enough Slipstream Tokens! Log some Cardio.");
      return;
    }

    setResources(prev => ({ ...prev, slipstream: prev.slipstream - 1 }));
    setPlayerPos({ q, r });
    
    // Reveal surrounding hexes
    const newRevealed = new Set(revealedHexes);
    newRevealed.add(id);
    
    // Simple mock reveal of adjacent hexes
    const adjacent = [
      [1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]
    ];
    adjacent.forEach(([dq, dr]) => {
      newRevealed.add(`${q + dq},${r + dr}`);
    });
    
    setRevealedHexes(newRevealed);
  };

  const engageEncounter = (id, encounter) => {
    if (encounter.type === 'anomaly') {
      if (resources.aether >= encounter.cost) { // Hardcoding Aether/Focus for prototype
        setResources(prev => ({ ...prev, aether: prev.aether - encounter.cost }));
        completeEncounter(id, encounter.gold);
      } else {
        alert(`Need ${encounter.cost} Aether to clear this anomaly.`);
      }
    } else {
      if (resources.strikes >= encounter.strikes) {
        setResources(prev => ({ ...prev, strikes: prev.strikes - encounter.strikes }));
        completeEncounter(id, encounter.gold, encounter.type === 'elite' ? 1 : encounter.type === 'boss' ? 3 : 0);
      } else {
        alert(`Need ${encounter.strikes} Strikes to defeat ${encounter.name}. Log more Strength!`);
      }
    }
  };

  const completeEncounter = (id, gold, xpGain = 0) => {
    setClearedHexes(prev => new Set(prev).add(id));
    setProgression(prev => {
      let newXp = prev.xp + xpGain;
      let newLevel = prev.level;
      let xpCap = 10 * Math.pow(2, prev.level - 1);
      
      if (newXp >= xpCap) {
        newLevel += 1;
        newXp -= xpCap;
      }
      return { ...prev, currency: prev.currency + gold, xp: newXp, level: newLevel };
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex overflow-hidden">
      
      {/* SIDEBAR - Character Sheet & Action Log */}
      <aside className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col shadow-2xl z-10">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-blue-500 mb-1">
            Kinetic Campaigns
          </h1>
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">The Worldhopper</p>
        </div>

        {/* Level & XP */}
        <div className="p-6 border-b border-slate-800 bg-slate-900/50">
          <div className="flex justify-between items-end mb-2">
            <div>
              <span className="text-sm text-slate-400">Level</span>
              <span className="text-2xl font-bold text-white ml-2">{progression.level}</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-amber-400 font-bold flex items-center">
                <Sparkles className="w-3 h-3 mr-1" /> {progression.currency} Currency
              </span>
            </div>
          </div>
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500" 
              style={{ width: `${(progression.xp / (10 * Math.pow(2, progression.level - 1))) * 100}%` }}
            />
          </div>
          <div className="text-right mt-1 text-xs text-slate-500">
            {progression.xp} / {10 * Math.pow(2, progression.level - 1)} XP
          </div>
        </div>

        {/* Resources */}
        <div className="p-6 border-b border-slate-800 flex-1 overflow-y-auto">
          <h2 className="text-xs uppercase tracking-widest text-slate-500 mb-4 font-bold">Dimensional Resources</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 flex flex-col items-center">
              <Footprints className="w-5 h-5 text-teal-400 mb-1" />
              <span className="text-2xl font-bold">{resources.slipstream}</span>
              <span className="text-[10px] uppercase text-slate-400">Slipstream</span>
            </div>
            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 flex flex-col items-center">
              <Sword className="w-5 h-5 text-orange-400 mb-1" />
              <span className="text-2xl font-bold">{resources.strikes}</span>
              <span className="text-[10px] uppercase text-slate-400">Strikes</span>
            </div>
            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 flex flex-col items-center">
              <Shield className="w-5 h-5 text-blue-400 mb-1" />
              <span className="text-2xl font-bold">{resources.wards}</span>
              <span className="text-[10px] uppercase text-slate-400">Wards</span>
            </div>
            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 flex flex-col items-center">
              <Flame className="w-5 h-5 text-purple-400 mb-1" />
              <span className="text-2xl font-bold">{resources.aether}</span>
              <span className="text-[10px] uppercase text-slate-400">Aether</span>
            </div>
          </div>

          <h2 className="text-xs uppercase tracking-widest text-slate-500 mt-8 mb-4 font-bold">Log Activity (Mock)</h2>
          <div className="space-y-2">
            <button onClick={() => logWorkout('cardio')} className="w-full flex items-center justify-between p-3 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 transition-colors border border-teal-500/20">
              <span className="flex items-center text-sm font-medium"><Footprints className="w-4 h-4 mr-2"/> 20m Cardio</span>
              <span className="text-xs font-bold">+1 Slipstream</span>
            </button>
            <button onClick={() => logWorkout('strength')} className="w-full flex items-center justify-between p-3 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 transition-colors border border-orange-500/20">
              <span className="flex items-center text-sm font-medium"><Sword className="w-4 h-4 mr-2"/> 15m Strength</span>
              <span className="text-xs font-bold">+1 Strike</span>
            </button>
            <button onClick={() => logWorkout('yoga')} className="w-full flex items-center justify-between p-3 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 transition-colors border border-blue-500/20">
              <span className="flex items-center text-sm font-medium"><Shield className="w-4 h-4 mr-2"/> 20m Yoga</span>
              <span className="text-xs font-bold">+1 Ward</span>
            </button>
            <button onClick={() => logWorkout('wellness')} className="w-full flex items-center justify-between p-3 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 transition-colors border border-purple-500/20">
              <span className="flex items-center text-sm font-medium"><Flame className="w-4 h-4 mr-2"/> Wellness / Prep</span>
              <span className="text-xs font-bold">+1 Aether</span>
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col relative bg-slate-950 overflow-hidden">
        
        {/* Top Navigation */}
        <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md flex items-center px-6 absolute top-0 w-full z-10">
          <nav className="flex space-x-2">
            <button 
              onClick={() => setActiveTab('map')}
              className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'map' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
            >
              <MapIcon className="w-4 h-4 mr-2" /> Realm Map
            </button>
            <button 
              onClick={() => setActiveTab('nexus')}
              className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'nexus' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
            >
              <Tent className="w-4 h-4 mr-2" /> The Nexus Tent
            </button>
          </nav>
        </header>

        {/* Tab Content */}
        <div className="flex-1 mt-16 relative">
          
          {/* MAP VIEW */}
          {activeTab === 'map' && (
            <div className="absolute inset-0 flex items-center justify-center cursor-move bg-[#0f172a] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
              <svg viewBox="-300 -300 600 600" className="w-full h-full max-w-4xl max-h-4xl drop-shadow-2xl">
                <g className="hex-grid">
                  {grid.map((hex) => {
                    const { x, y } = hexToPixel(hex.q, hex.r, HEX_SIZE);
                    const isRevealed = revealedHexes.has(hex.id);
                    const isPlayerHere = playerPos.q === hex.q && playerPos.r === hex.r;
                    const encounter = MOCK_ENCOUNTERS[hex.id];
                    const isCleared = clearedHexes.has(hex.id);

                    // Determine fill color
                    let fill = "#1e293b"; // Unrevealed Fog
                    let stroke = "#0f172a";
                    if (isRevealed) {
                      fill = "#334155"; // Explored empty
                      stroke = "#475569";
                      if (encounter && !isCleared) {
                        if (encounter.type === 'basic') fill = "#713f12"; // Yellow/Brownish threat
                        if (encounter.type === 'elite') fill = "#7f1d1d"; // Red threat
                        if (encounter.type === 'boss') fill = "#4c1d95"; // Purple boss
                        if (encounter.type === 'anomaly') fill = "#0c4a6e"; // Blue anomaly
                      } else if (isCleared) {
                        fill = "#1e293b"; // Dimmed cleared
                      }
                    }

                    return (
                      <g key={hex.id} transform={`translate(${x}, ${y})`}>
                        <polygon
                          points={hexPoints}
                          fill={fill}
                          stroke={stroke}
                          strokeWidth="2"
                          className={`transition-all duration-300 ${isRevealed && !isPlayerHere ? 'cursor-pointer hover:opacity-80' : ''}`}
                          onClick={() => {
                            if (isRevealed && !isPlayerHere) movePlayer(hex.q, hex.r, hex.id);
                          }}
                        />
                        {/* Encounter Icon */}
                        {isRevealed && encounter && !isCleared && (
                          <text x="0" y="5" textAnchor="middle" fill="white" fontSize="16" pointerEvents="none">
                            {encounter.type === 'basic' ? '⚔️' : encounter.type === 'boss' ? '💀' : encounter.type === 'anomaly' ? '🔮' : '👹'}
                          </text>
                        )}
                        {/* Player Token */}
                        {isPlayerHere && (
                          <circle cx="0" cy="0" r="12" fill="#2dd4bf" className="animate-pulse" />
                        )}
                      </g>
                    );
                  })}
                </g>
              </svg>

              {/* Context Action Panel for Current Hex */}
              {MOCK_ENCOUNTERS[`${playerPos.q},${playerPos.r}`] && !clearedHexes.has(`${playerPos.q},${playerPos.r}`) && (
                <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-2xl w-96 text-center animate-in slide-in-from-bottom-10 fade-in">
                  <h3 className="text-xl font-bold text-white mb-2">
                    {MOCK_ENCOUNTERS[`${playerPos.q},${playerPos.r}`].name}
                  </h3>
                  <p className="text-slate-400 text-sm mb-4">
                    {MOCK_ENCOUNTERS[`${playerPos.q},${playerPos.r}`].type === 'anomaly' 
                      ? `Requires ${MOCK_ENCOUNTERS[`${playerPos.q},${playerPos.r}`].cost} Aether to clear.`
                      : `Requires ${MOCK_ENCOUNTERS[`${playerPos.q},${playerPos.r}`].strikes} Strikes to defeat.`}
                  </p>
                  <button 
                    onClick={() => engageEncounter(`${playerPos.q},${playerPos.r}`, MOCK_ENCOUNTERS[`${playerPos.q},${playerPos.r}`])}
                    className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-lg shadow-indigo-500/20"
                  >
                    Engage Encounter
                  </button>
                </div>
              )}
            </div>
          )}

          {/* NEXUS TENT VIEW */}
          {activeTab === 'nexus' && (
            <div className="absolute inset-0 overflow-y-auto p-10 bg-slate-950">
              <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-10">
                  <div>
                    <h2 className="text-3xl font-bold text-white mb-2">The Nexus Tent</h2>
                    <p className="text-slate-400">Trade your dimensional currency for real-world rewards.</p>
                  </div>
                  <div className="bg-slate-800/80 px-6 py-4 rounded-2xl border border-slate-700 flex items-center">
                    <Sparkles className="w-6 h-6 text-amber-400 mr-3" />
                    <span className="text-3xl font-black text-amber-400">{progression.currency}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {NEXUS_REWARDS.map(reward => (
                    <div key={reward.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-colors flex flex-col">
                      <div className="text-4xl mb-4">{reward.icon}</div>
                      <h3 className="text-lg font-bold text-white mb-1">{reward.title}</h3>
                      <p className="text-sm text-slate-500 flex-1 mb-6">{reward.desc}</p>
                      
                      <button 
                        onClick={() => {
                          if (progression.currency >= reward.cost) {
                            setProgression(prev => ({ ...prev, currency: prev.currency - reward.cost }));
                            alert(`Purchased ${reward.title}! Go treat yourself.`);
                          } else {
                            alert("Not enough Currency!");
                          }
                        }}
                        className={`w-full py-3 rounded-xl font-bold transition-all flex justify-center items-center ${
                          progression.currency >= reward.cost 
                            ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/30' 
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                        }`}
                      >
                        {reward.cost} Currency
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}