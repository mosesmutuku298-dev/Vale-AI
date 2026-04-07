import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Text, Float, Stars, MeshDistortMaterial, MeshWobbleMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'motion/react';
import { Play, RotateCcw, Trophy, ArrowLeft, ArrowRight, Zap, MessageSquare, Send, Loader2, AlertCircle } from 'lucide-react';

// --- Constants ---
const LANE_WIDTH = 4;
const LANES = [-LANE_WIDTH, 0, LANE_WIDTH];
const INITIAL_SPEED = 0.5;
const SPEED_INCREMENT = 0.0001;
const OBSTACLE_SPAWN_INTERVAL = 1500; // ms
const PLAYER_Y = 0.5;

// --- Types ---
type GameState = 'START' | 'PLAYING' | 'GAMEOVER';

interface ObstacleData {
  id: number;
  lane: number;
  z: number;
}

interface ChatMessage {
  id: string;
  sender: 'USER' | 'AI';
  text: string;
}

// --- Components ---

const Player = ({ laneIndex, isHit }: { laneIndex: number; isHit: boolean }) => {
  const meshRef = useRef<THREE.Group>(null);
  const wheelsRef = useRef<THREE.Group>(null);
  const targetX = LANES[laneIndex];
  
  // Use a ref for the spotlight target to avoid R3F issues
  const lightTargetRef = useRef<THREE.Object3D>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      // Smooth lane switching
      meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, targetX, 0.15);
      // Subtle tilt when moving
      const tilt = (targetX - meshRef.current.position.x) * 0.1;
      meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, tilt, 0.1);
      // Hover effect
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 4) * 0.05;
    }
    
    // Rotate wheels
    if (wheelsRef.current && !isHit) {
      wheelsRef.current.children.forEach((wheel) => {
        wheel.rotation.x += 0.2;
      });
    }

    // Update light target
    if (lightTargetRef.current && meshRef.current) {
      lightTargetRef.current.position.set(meshRef.current.position.x, 0, meshRef.current.position.z + 10);
    }
  });

  return (
    <group ref={meshRef} position={[0, 0.4, 0]}>
      <primitive object={new THREE.Object3D()} ref={lightTargetRef} />
      
      {/* Car Body */}
      <mesh castShadow>
        <boxGeometry args={[1.2, 0.4, 2.2]} />
        <meshStandardMaterial color={isHit ? "#550000" : "#111"} metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Cabin */}
      <mesh position={[0, 0.35, -0.2]} castShadow>
        <boxGeometry args={[0.9, 0.4, 1]} />
        <meshStandardMaterial color={isHit ? "#330000" : "#00f2ff"} transparent opacity={0.6} metalness={1} roughness={0} />
      </mesh>

      {/* Front Hood Slope */}
      <mesh position={[0, 0.1, 0.8]} rotation={[-0.2, 0, 0]}>
        <boxGeometry args={[1.1, 0.2, 0.8]} />
        <meshStandardMaterial color="#111" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Wheels */}
      <group ref={wheelsRef}>
        {/* Front Left */}
        <mesh position={[-0.65, -0.1, 0.7]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.25, 0.25, 0.2, 16]} />
          <meshStandardMaterial color="#222" />
        </mesh>
        {/* Front Right */}
        <mesh position={[0.65, -0.1, 0.7]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.25, 0.25, 0.2, 16]} />
          <meshStandardMaterial color="#222" />
        </mesh>
        {/* Rear Left */}
        <mesh position={[-0.65, -0.1, -0.7]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.25, 0.25, 0.2, 16]} />
          <meshStandardMaterial color="#222" />
        </mesh>
        {/* Rear Right */}
        <mesh position={[0.65, -0.1, -0.7]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.25, 0.25, 0.2, 16]} />
          <meshStandardMaterial color="#222" />
        </mesh>
      </group>

      {/* Headlights */}
      <group position={[0, 0.1, 1.1]}>
        <mesh position={[-0.4, 0, 0]}>
          <boxGeometry args={[0.3, 0.1, 0.1]} />
          <meshStandardMaterial emissive="#fff" emissiveIntensity={5} />
          <spotLight position={[0, 0, 0.1]} angle={0.5} penumbra={0.5} intensity={2} color="#fff" target={lightTargetRef.current || undefined} />
        </mesh>
        <mesh position={[0.4, 0, 0]}>
          <boxGeometry args={[0.3, 0.1, 0.1]} />
          <meshStandardMaterial emissive="#fff" emissiveIntensity={5} />
          <spotLight position={[0, 0, 0.1]} angle={0.5} penumbra={0.5} intensity={2} color="#fff" target={lightTargetRef.current || undefined} />
        </mesh>
      </group>

      {/* Taillights */}
      <group position={[0, 0.1, -1.1]}>
        <mesh position={[-0.4, 0, 0]}>
          <boxGeometry args={[0.4, 0.1, 0.1]} />
          <meshStandardMaterial emissive={isHit ? "#ff0000" : "#ff0080"} emissiveIntensity={isHit ? 10 : 2} />
        </mesh>
        <mesh position={[0.4, 0, 0]}>
          <boxGeometry args={[0.4, 0.1, 0.1]} />
          <meshStandardMaterial emissive={isHit ? "#ff0000" : "#ff0080"} emissiveIntensity={isHit ? 10 : 2} />
        </mesh>
      </group>

      {/* Underglow */}
      <pointLight position={[0, -0.2, 0]} color="#00f2ff" intensity={1} distance={3} />
    </group>
  );
};

const Obstacle = ({ lane, z, onHit }: { lane: number; z: number; onHit: () => void }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const x = LANES[lane];

  return (
    <mesh ref={meshRef} position={[x, 0.5, z]}>
      <boxGeometry args={[2, 1, 0.5]} />
      <meshStandardMaterial color="#ff0080" emissive="#ff0080" emissiveIntensity={1.5} />
      <pointLight color="#ff0080" intensity={1} distance={5} />
    </mesh>
  );
};

const GridFloor = ({ speed }: { speed: number }) => {
  const textureRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (textureRef.current) {
      // Scroll the grid texture
      (textureRef.current.material as THREE.MeshStandardMaterial).map!.offset.y -= speed * 0.1;
    }
  });

  const gridTexture = useMemo(() => {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    ctx.strokeStyle = '#00f2ff';
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, size, size);
    
    // Add some glow to the lines
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00f2ff';
    ctx.strokeRect(0, 0, size, size);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(10, 100);
    return tex;
  }, []);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, -200]} ref={textureRef}>
      <planeGeometry args={[100, 1000]} />
      <meshStandardMaterial map={gridTexture} transparent opacity={0.8} />
    </mesh>
  );
};

const Environment = () => {
  return (
    <>
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <fog attach="fog" args={['#050505', 10, 50]} />
      <ambientLight intensity={0.2} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      
      {/* Distant mountains/cityscape effect */}
      <group position={[0, 0, -60]}>
        {Array.from({ length: 20 }).map((_, i) => (
          <mesh key={i} position={[(i - 10) * 8, 0, 0]}>
            <coneGeometry args={[4, 10 + Math.random() * 10, 4]} />
            <meshStandardMaterial color="#1a0033" wireframe />
          </mesh>
        ))}
      </group>
    </>
  );
};

// --- Main Game Logic ---

export default function App() {
  const [gameState, setGameState] = useState<GameState>('START');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [laneIndex, setLaneIndex] = useState(1); // Middle lane
  const [obstacles, setObstacles] = useState<ObstacleData[]>([]);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  
  // Chat State
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const gameRef = useRef({
    nextObstacleId: 0,
    lastSpawnTime: 0,
    speed: INITIAL_SPEED,
    score: 0
  });

  const startGame = () => {
    setGameState('PLAYING');
    setScore(0);
    setObstacles([]);
    setSpeed(INITIAL_SPEED);
    setLaneIndex(1);
    gameRef.current = {
      nextObstacleId: 0,
      lastSpawnTime: Date.now(),
      speed: INITIAL_SPEED,
      score: 0
    };
  };

  const gameOver = () => {
    setGameState('GAMEOVER');
    if (score > highScore) setHighScore(score);
  };

  // AI Chat Handler
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isAiLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'USER',
      text: chatInput
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsAiLoading(true);
    setAiError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.text,
          gameState: {
            score,
            speed,
            laneIndex,
            gameState
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to communicate with AI');
      }

      const data = await response.json();
      
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'AI',
        text: data.reply
      };

      setChatMessages(prev => [...prev, aiMessage]);

      // Apply commands
      if (data.command === 'SPEED_UP') {
        gameRef.current.speed += 0.2;
        setSpeed(gameRef.current.speed);
      } else if (data.command === 'SLOW_DOWN') {
        gameRef.current.speed = Math.max(0.3, gameRef.current.speed - 0.2);
        setSpeed(gameRef.current.speed);
      } else if (data.command === 'EXTRA_POINTS') {
        gameRef.current.score += 1000;
      }

    } catch (err) {
      console.error("Chat Error:", err);
      setAiError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsAiLoading(false);
    }
  };

  // Input handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'PLAYING' || chatOpen) return;
      if (e.key === 'ArrowLeft' || e.key === 'a') {
        setLaneIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowRight' || e.key === 'd') {
        setLaneIndex(prev => Math.min(LANES.length - 1, prev + 1));
      } else if (e.key === 't' || e.key === 'Enter') {
        setChatOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, chatOpen]);

  // Game Loop (Logic side)
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const interval = setInterval(() => {
      const now = Date.now();
      
      // Update score and speed
      gameRef.current.score += 1;
      setScore(Math.floor(gameRef.current.score / 10));
      gameRef.current.speed += SPEED_INCREMENT;
      setSpeed(gameRef.current.speed);

      // Spawn obstacles
      if (now - gameRef.current.lastSpawnTime > OBSTACLE_SPAWN_INTERVAL / (gameRef.current.speed * 2)) {
        const lane = Math.floor(Math.random() * 3);
        setObstacles(prev => [
          ...prev,
          { id: gameRef.current.nextObstacleId++, lane, z: -100 }
        ]);
        gameRef.current.lastSpawnTime = now;
      }

      // Move and check collisions
      setObstacles(prev => {
        const next = prev
          .map(obs => ({ ...obs, z: obs.z + gameRef.current.speed * 2 }))
          .filter(obs => obs.z < 10);

        // Collision detection
        const playerX = LANES[laneIndex];
        const hit = next.find(obs => 
          obs.z > -1 && obs.z < 1 && // Z-range
          Math.abs(LANES[obs.lane] - playerX) < 1.5 // X-range
        );

        if (hit) {
          gameOver();
        }

        return next;
      });
    }, 16); // ~60fps logic

    return () => clearInterval(interval);
  }, [gameState, laneIndex]);

  return (
    <div className="w-full h-screen bg-[#050505] text-white font-sans overflow-hidden relative">
      {/* Game Canvas */}
      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 3, 8]} fov={60} />
        <Environment />
        
        {(gameState === 'PLAYING' || gameState === 'GAMEOVER') && (
          <>
            <Player laneIndex={laneIndex} isHit={gameState === 'GAMEOVER'} />
            {obstacles.map(obs => (
              <Obstacle key={obs.id} lane={obs.lane} z={obs.z} onHit={gameOver} />
            ))}
            <GridFloor speed={gameState === 'GAMEOVER' ? 0 : speed} />
          </>
        )}
        
        {/* Visual flair for start screen */}
        {gameState !== 'PLAYING' && (
          <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
            <mesh position={[0, 1, -5]}>
              <torusKnotGeometry args={[2, 0.5, 128, 16]} />
              <MeshWobbleMaterial color="#ff0080" factor={0.6} speed={1} emissive="#ff0080" emissiveIntensity={0.5} />
            </mesh>
          </Float>
        )}
      </Canvas>

      {/* UI Overlays */}
      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-8">
        {/* Header / Score */}
        <div className="w-full flex justify-between items-start pointer-events-auto">
          <div className="flex flex-col">
            <h1 className="text-4xl font-black tracking-tighter italic text-transparent bg-clip-text bg-gradient-to-r from-[#00f2ff] to-[#ff0080]">
              NEON PULSE
            </h1>
            <p className="text-xs font-mono text-[#00f2ff]/60 uppercase tracking-widest">System Online</p>
          </div>
          
          {gameState === 'PLAYING' && (
            <div className="flex flex-col items-end">
              <div className="text-5xl font-black italic tabular-nums text-[#00f2ff] drop-shadow-[0_0_10px_rgba(0,242,255,0.5)]">
                {score.toString().padStart(6, '0')}
              </div>
              <div className="text-xs font-mono text-[#ff0080] uppercase">Distance Units</div>
            </div>
          )}
        </div>

        {/* AI Chat Button */}
        <div className="absolute top-24 right-8 pointer-events-auto">
          <button 
            onClick={() => setChatOpen(!chatOpen)}
            className="p-4 rounded-full bg-black/50 border border-[#00f2ff]/30 text-[#00f2ff] hover:bg-[#00f2ff]/20 transition-all"
          >
            <MessageSquare />
          </button>
        </div>

        {/* Chat Window */}
        <AnimatePresence>
          {chatOpen && (
            <motion.div 
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className="absolute top-36 right-8 w-80 h-96 bg-black/80 backdrop-blur-xl border border-[#00f2ff]/30 rounded-2xl flex flex-col pointer-events-auto overflow-hidden shadow-[0_0_30px_rgba(0,242,255,0.1)]"
            >
              <div className="p-4 border-b border-[#00f2ff]/20 flex justify-between items-center bg-[#00f2ff]/5">
                <span className="text-xs font-mono text-[#00f2ff] uppercase tracking-widest">Neural Interface</span>
                <button onClick={() => setChatOpen(false)} className="text-gray-500 hover:text-white">×</button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                {chatMessages.length === 0 && (
                  <div className="text-center text-gray-500 text-xs mt-10 italic">
                    Establish connection... Type to communicate with the Game Master.
                  </div>
                )}
                {chatMessages.map(msg => (
                  <div key={msg.id} className={`flex flex-col ${msg.sender === 'USER' ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-xl text-sm ${
                      msg.sender === 'USER' 
                        ? 'bg-[#00f2ff]/20 border border-[#00f2ff]/30 text-white' 
                        : 'bg-[#ff0080]/10 border border-[#ff0080]/30 text-[#ff0080]'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isAiLoading && (
                  <div className="flex items-center gap-2 text-[#ff0080] text-xs">
                    <Loader2 className="animate-spin" size={12} />
                    Processing signal...
                  </div>
                )}
                {aiError && (
                  <div className="flex items-center gap-2 text-red-500 text-xs bg-red-500/10 p-2 rounded border border-red-500/30">
                    <AlertCircle size={12} />
                    {aiError}
                  </div>
                )}
              </div>

              <form onSubmit={handleChatSubmit} className="p-4 border-t border-[#00f2ff]/20 bg-black/40">
                <div className="relative">
                  <input 
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Enter command..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 pr-10 text-sm focus:outline-none focus:border-[#00f2ff]/50 transition-all"
                  />
                  <button 
                    type="submit"
                    disabled={isAiLoading}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#00f2ff] disabled:text-gray-600"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Center Messages */}
        <AnimatePresence>
          {gameState === 'START' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="pointer-events-auto flex flex-col items-center gap-8 bg-black/40 backdrop-blur-xl p-12 rounded-3xl border border-white/10"
            >
              <div className="text-center">
                <h2 className="text-6xl font-black italic mb-2">READY?</h2>
                <p className="text-gray-400 max-w-xs">Navigate the pulse. Avoid the barriers. Survive the void.</p>
              </div>
              
              <button 
                onClick={startGame}
                className="group relative flex items-center gap-4 bg-white text-black px-10 py-5 rounded-full font-bold text-xl transition-all hover:scale-105 hover:bg-[#00f2ff] active:scale-95"
              >
                <Play className="fill-current" />
                START PULSE
                <div className="absolute -inset-1 bg-[#00f2ff] rounded-full blur opacity-0 group-hover:opacity-50 transition-opacity" />
              </button>

              <div className="flex gap-8 text-xs font-mono text-gray-500">
                <div className="flex items-center gap-2"><ArrowLeft size={14} /> MOVE LEFT</div>
                <div className="flex items-center gap-2">MOVE RIGHT <ArrowRight size={14} /></div>
              </div>
            </motion.div>
          )}

          {gameState === 'GAMEOVER' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="pointer-events-auto flex flex-col items-center gap-6 bg-black/80 backdrop-blur-2xl p-12 rounded-3xl border-2 border-[#ff0080]"
            >
              <div className="text-center">
                <h2 className="text-6xl font-black italic text-[#ff0080] mb-2">PULSE LOST</h2>
                <p className="text-gray-400">Your signal faded at distance {score}</p>
              </div>

              <div className="flex gap-12 my-4">
                <div className="text-center">
                  <div className="text-sm text-gray-500 uppercase font-mono">Final Score</div>
                  <div className="text-4xl font-bold">{score}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-500 uppercase font-mono">Best Pulse</div>
                  <div className="text-4xl font-bold text-[#00f2ff]">{highScore}</div>
                </div>
              </div>
              
              <button 
                onClick={startGame}
                className="flex items-center gap-4 bg-[#ff0080] text-white px-10 py-5 rounded-full font-bold text-xl transition-all hover:scale-105 hover:brightness-110 active:scale-95 shadow-[0_0_20px_rgba(255,0,128,0.4)]"
              >
                <RotateCcw />
                REBOOT SYSTEM
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer / Controls Hint */}
        <div className="w-full flex justify-between items-end text-[10px] font-mono text-gray-600 tracking-widest uppercase">
          <div>v1.1.0 // NEURAL_LINK_ESTABLISHED</div>
          <div className="flex gap-4">
            <span className="flex items-center gap-1"><Zap size={10} className="text-[#00f2ff]" /> Performance: Optimal</span>
            <span>© 2026 NEON_LABS</span>
          </div>
        </div>
      </div>

      {/* CRT Overlay Effect */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
    </div>
  );
}
