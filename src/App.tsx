import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, Trophy, Skull, Gamepad2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const TRACKS = [
  {
    id: 1,
    title: "Neon City Rider",
    artist: "AI Synthwave",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
  },
  {
    id: 2,
    title: "Cybernetic Drift",
    artist: "Neural Network",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"
  },
  {
    id: 3,
    title: "Digital Horizon",
    artist: "DeepMind Audio",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3"
  }
];

const GRID_SIZE = 20;
const INITIAL_SPEED = 120;

type Point = { x: number; y: number };

const INITIAL_SNAKE: Point[] = [
  { x: 10, y: 10 },
  { x: 10, y: 11 },
  { x: 10, y: 12 },
];
const INITIAL_DIRECTION: Point = { x: 0, y: -1 };

export default function App() {
  // Game State
  const [snake, setSnake] = useState<Point[]>(INITIAL_SNAKE);
  const [direction, setDirection] = useState<Point>(INITIAL_DIRECTION);
  const [food, setFood] = useState<Point>({ x: 15, y: 5 });
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(true);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);

  const directionRef = useRef<Point>(INITIAL_DIRECTION);
  const nextDirectionRef = useRef<Point>(INITIAL_DIRECTION);
  const gameLoopRef = useRef<number | null>(null);

  // Music Player State
  const [currentTrack, setCurrentTrack] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Focus tracking to show tip
  const [hasInteracted, setHasInteracted] = useState(false);

  // --- Music Player Logic ---
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const skipTrack = (forward: boolean) => {
    let nextTrack = forward ? currentTrack + 1 : currentTrack - 1;
    if (nextTrack >= TRACKS.length) nextTrack = 0;
    if (nextTrack < 0) nextTrack = TRACKS.length - 1;
    setCurrentTrack(nextTrack);
    // Auto-play the new track if it was already playing
    if (isPlaying) {
      setTimeout(() => {
        audioRef.current?.play().catch(() => setIsPlaying(false));
      }, 50);
    }
  };

  // --- Snake Game Logic ---
  const generateFood = useCallback((currentSnake: Point[]): Point => {
    let newFood: Point;
    let isOccupied = true;
    while (isOccupied) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      };
      // eslint-disable-next-line no-loop-func
      isOccupied = currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y);
    }
    return newFood!;
  }, []);

  const resetGame = () => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    directionRef.current = INITIAL_DIRECTION;
    nextDirectionRef.current = INITIAL_DIRECTION;
    setScore(0);
    setFood(generateFood(INITIAL_SNAKE));
    setIsGameOver(false);
    setIsPaused(false);
    setHasInteracted(true);
  };

  const tick = useCallback(() => {
    if (isPaused || isGameOver) return;

    setSnake(prev => {
      const dir = nextDirectionRef.current;
      directionRef.current = dir;
      setDirection(dir);

      const head = prev[0];
      const newHead = { x: head.x + dir.x, y: head.y + dir.y };

      // Wall collision
      if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
        setIsGameOver(true);
        return prev;
      }

      // Self collision
      if (prev.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
        setIsGameOver(true);
        return prev;
      }

      const newSnake = [newHead, ...prev];

      // Food collision
      if (newHead.x === food.x && newHead.y === food.y) {
        setScore(s => {
          const newScore = s + 10;
          if (newScore > highScore) setHighScore(newScore);
          return newScore;
        });
        setFood(generateFood(newSnake));
      } else {
        newSnake.pop(); // Remove tail if no food eaten
      }

      return newSnake;
    });
  }, [isPaused, isGameOver, food, generateFood, highScore]);

  // Keep track of the game interval
  useEffect(() => {
    if (!isPaused && !isGameOver) {
      // Speed increases slightly as score goes up
      const currentSpeed = Math.max(50, INITIAL_SPEED - Math.floor(score / 50) * 5);
      gameLoopRef.current = window.setInterval(tick, currentSpeed);
    }
    return () => {
      if (gameLoopRef.current) window.clearInterval(gameLoopRef.current);
    };
  }, [tick, isPaused, isGameOver, score]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default scrolling for arrow keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        if (!hasInteracted) setHasInteracted(true);
        e.preventDefault();
      }

      const dir = directionRef.current;

      if (e.key === ' ' && !isGameOver) {
        setIsPaused(p => !p);
        return;
      }

      if (isPaused || isGameOver) return;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (dir.y === 0) nextDirectionRef.current = { x: 0, y: -1 };
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (dir.y === 0) nextDirectionRef.current = { x: 0, y: 1 };
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (dir.x === 0) nextDirectionRef.current = { x: -1, y: 0 };
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (dir.x === 0) nextDirectionRef.current = { x: 1, y: 0 };
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPaused, isGameOver, hasInteracted]);

  return (
    <div className="bg-[#050505] w-full min-h-screen overflow-hidden text-white font-sans p-4 sm:p-6 selection:bg-cyan-500 selection:text-white">
      <div className="grid grid-cols-1 md:grid-cols-12 grid-rows-none md:grid-rows-6 gap-4 h-full max-w-[1240px] mx-auto min-h-[calc(100vh-2rem)] sm:min-h-[calc(100vh-3rem)] md:min-h-0 md:h-[calc(100vh-3rem)]">
        
        {/* Header / Branding */}
        <div className="md:col-span-3 md:row-span-1 bg-[#111] border border-cyan-500/30 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-cyan-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.5)]">
            <Gamepad2 className="w-6 h-6 text-black" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-cyan-400 uppercase">Neon_Beat</h1>
            <p className="text-[10px] text-gray-500 font-mono">v2.0.4-STABLE</p>
          </div>
        </div>

        {/* Score Display */}
        <div className="md:col-span-2 md:row-span-1 bg-[#111] border border-lime-500/30 rounded-2xl p-4 flex flex-col justify-center">
          <span className="text-[10px] uppercase text-lime-500 font-mono">Score</span>
          <span className="text-3xl font-black font-mono tracking-tighter">{score.toString().padStart(5, '0')}</span>
        </div>

        <div className="md:col-span-2 md:row-span-1 bg-[#111] border border-pink-500/30 rounded-2xl p-4 flex flex-col justify-center">
          <span className="text-[10px] uppercase text-pink-500 font-mono">High Score</span>
          <span className="text-3xl font-black font-mono tracking-tighter">{highScore.toString().padStart(5, '0')}</span>
        </div>

        {/* Song List */}
        <div className="md:col-span-5 md:row-span-4 bg-[#111] border border-gray-800 rounded-2xl p-6 overflow-hidden flex flex-col">
          <h2 className="text-xs uppercase text-gray-400 mb-4 tracking-widest font-semibold">Tracklist</h2>
          <div className="space-y-3 flex-1 overflow-y-auto pr-2">
            {TRACKS.map((track, idx) => (
              <div 
                key={track.id}
                onClick={() => {
                  setCurrentTrack(idx);
                  if (!isPlaying) togglePlay();
                }}
                className={`p-3 rounded-lg flex justify-between items-center transition-colors cursor-pointer ${
                  currentTrack === idx 
                    ? 'bg-cyan-500/10 border-l-2 border-cyan-500 rounded-r-lg' 
                    : 'hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${currentTrack === idx && isPlaying ? 'bg-cyan-500 animate-pulse' : 'bg-transparent'}`}></div>
                  <div>
                    <div className={`text-sm font-medium ${currentTrack === idx ? 'text-white' : 'text-gray-300'}`}>{track.title}</div>
                    <div className="text-xs text-gray-500">{track.artist}</div>
                  </div>
                </div>
                <div className="text-[10px] font-mono text-gray-500">AI</div>
              </div>
            ))}
          </div>
          
          <div className="mt-8">
            <div className="h-40 w-full bg-gradient-to-t from-cyan-900/20 to-transparent rounded-lg border border-dashed border-gray-800 flex items-center justify-center overflow-hidden relative">
               {isPlaying ? (
                <div className="flex gap-1 items-end h-16">
                  <motion.div animate={{ height: ["20%", "80%", "40%", "100%", "30%"] }} transition={{ repeat: Infinity, duration: 1.2 }} className="w-1.5 bg-cyan-400 rounded-[1px]"></motion.div>
                  <motion.div animate={{ height: ["60%", "20%", "90%", "30%", "70%"] }} transition={{ repeat: Infinity, duration: 0.9 }} className="w-1.5 bg-cyan-400 rounded-[1px]"></motion.div>
                  <motion.div animate={{ height: ["90%", "50%", "30%", "80%", "40%"] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-1.5 bg-cyan-400 rounded-[1px]"></motion.div>
                  <motion.div animate={{ height: ["30%", "90%", "60%", "20%", "70%"] }} transition={{ repeat: Infinity, duration: 1.1 }} className="w-1.5 bg-cyan-400 rounded-[1px]"></motion.div>
                  <motion.div animate={{ height: ["70%", "30%", "100%", "50%", "20%"] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-1.5 bg-cyan-400 rounded-[1px]"></motion.div>
                  <motion.div animate={{ height: ["40%", "80%", "30%", "90%", "50%"] }} transition={{ repeat: Infinity, duration: 1.3 }} className="w-1.5 bg-cyan-400 rounded-[1px]"></motion.div>
                  <motion.div animate={{ height: ["80%", "20%", "70%", "40%", "90%"] }} transition={{ repeat: Infinity, duration: 1.0 }} className="w-1.5 bg-cyan-400 rounded-[1px]"></motion.div>
                </div>
               ) : (
                <div className="flex gap-1 items-end h-16 opacity-30">
                  <div className="w-1.5 bg-cyan-400 h-8 rounded-[1px]"></div>
                  <div className="w-1.5 bg-cyan-400 h-12 rounded-[1px]"></div>
                  <div className="w-1.5 bg-cyan-400 h-16 rounded-[1px]"></div>
                  <div className="w-1.5 bg-cyan-400 h-10 rounded-[1px]"></div>
                  <div className="w-1.5 bg-cyan-400 h-14 rounded-[1px]"></div>
                  <div className="w-1.5 bg-cyan-400 h-6 rounded-[1px]"></div>
                  <div className="w-1.5 bg-cyan-400 h-11 rounded-[1px]"></div>
                </div>
               )}
            </div>
          </div>
        </div>

        {/* Game Window */}
        <div className="md:col-span-7 md:row-span-5 bg-black border-2 border-gray-800 rounded-3xl p-2 relative overflow-hidden flex flex-col justify-center items-center min-h-[400px]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(6,182,212,0.1)_0%,_transparent_70%)] pointer-events-none"></div>
          
          <div className="w-full h-full bg-[#080808] rounded-2xl relative z-10 flex items-center justify-center p-2 isolate">
            <div 
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
                gap: '1px',
                width: '100%',
                maxWidth: 'min(100%, 75vh, 600px)',
                aspectRatio: '1 / 1',
              }}
            >
              {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, index) => {
                const x = index % GRID_SIZE;
                const y = Math.floor(index / GRID_SIZE);
                
                const isSnakeHead = snake[0].x === x && snake[0].y === y;
                const isSnakeBody = !isSnakeHead && snake.some(segment => segment.x === x && segment.y === y);
                const isFood = food.x === x && food.y === y;

                return (
                  <div 
                    key={index} 
                    className={`w-full h-full transition-all duration-[50ms] ${
                      isSnakeHead 
                        ? 'bg-lime-500 shadow-[0_0_10px_#39ff14] rounded-[2px] z-10 relative' 
                        : isSnakeBody 
                        ? 'bg-lime-500/80 shadow-[0_0_5px_rgba(57,255,20,0.5)] rounded-[2px]'
                        : isFood 
                        ? 'bg-pink-500 shadow-[0_0_15px_#ff00ff] animate-pulse rounded-[2px]'
                        : 'bg-transparent border-[0.5px] border-white/5'
                    }`}
                  />
                );
              })}
            </div>
          </div>
          
          {/* Overlays */}
          <AnimatePresence>
            {isGameOver && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-3xl z-20"
              >
                <Skull className="w-16 h-16 text-pink-500 mb-4 drop-shadow-[0_0_10px_#ff00ff]" />
                <h2 className="text-4xl font-black text-white tracking-widest mb-2 uppercase font-mono">Game Over</h2>
                <p className="text-lime-500 mb-8 font-bold font-mono">Final Score: {score}</p>
                <button 
                  onClick={resetGame}
                  className="px-8 py-3 bg-white text-black font-bold tracking-widest rounded-full transition-transform hover:scale-105 active:scale-95"
                >
                  PLAY AGAIN
                </button>
              </motion.div>
            )}

            {!hasInteracted && isPaused && !isGameOver && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center rounded-3xl z-20"
              >
                <button 
                  onClick={resetGame}
                  className="px-8 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-bold tracking-widest rounded-full transition-transform hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(6,182,212,0.5)] mb-4"
                >
                  START GAME
                </button>
              </motion.div>
            )}

            {hasInteracted && isPaused && !isGameOver && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center rounded-3xl z-20"
              >
                <div className="px-8 py-4 bg-[#111] border-2 border-cyan-500/50 rounded-lg text-cyan-400 font-bold font-mono tracking-[0.2em] shadow-[0_0_15px_rgba(6,182,212,0.3)] animate-pulse">
                  PAUSED
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Overlay Hint */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-gray-500 uppercase tracking-widest font-mono z-20 bg-black/80 px-4 py-1 rounded-full border border-gray-800">
            Use arrow keys to navigate. Space to pause.
          </div>
        </div>

        {/* Music Controls Bar */}
        <div className="md:col-span-5 md:row-span-1 bg-[#111] border border-cyan-500/30 rounded-2xl p-4 flex flex-col justify-center mt-4 md:mt-0">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => skipTrack(false)}
                  className="text-gray-400 hover:text-white p-2 hover:bg-white/5 rounded-full transition-colors"
                >
                  <SkipBack className="w-5 h-5 fill-current" />
                </button>
                <button 
                  onClick={togglePlay}
                  className="p-4 bg-white rounded-full text-black hover:scale-105 transition-transform"
                >
                  {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
                </button>
                <button 
                  onClick={() => skipTrack(true)}
                  className="text-gray-400 hover:text-white p-2 hover:bg-white/5 rounded-full transition-colors"
                >
                  <SkipForward className="w-5 h-5 fill-current" />
                </button>
              </div>
              
              <div className="flex-1 mx-4 sm:mx-6 flex flex-col gap-2">
                <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                  <span>0:00</span>
                  <span>{isPlaying ? "Live" : "Stopped"}</span>
                </div>
                <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden flex items-center group relative cursor-pointer">
                  {/* Fake progress bar */}
                  <div className={`h-full bg-cyan-500 shadow-[0_0_10px_#06b6d4] ${isPlaying ? 'w-full animate-[pulse_4s_ease-in-out_infinite]' : 'w-0'}`}></div>
                </div>
              </div>

              <div className="hidden sm:flex items-center group relative">
                <button className="p-2 text-gray-500 hover:text-white transition-colors cursor-default">
                  {volume > 0 ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                </button>
                <div className="absolute right-0 bottom-full mb-2 hidden group-hover:flex bg-[#111] border border-gray-800 p-3 rounded-lg shadow-xl origin-bottom">
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.01" 
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-2 appearance-none hover:bg-gray-700 bg-gray-800 rounded-full cursor-pointer focus:outline-none flex-col [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(34,211,238,0.8)]"
                    style={{ writingMode: 'vertical-lr', direction: 'rtl', height: '100px' }}
                  />
                </div>
              </div>
           </div>
        </div>

        {/* Hidden Audio Element */}
        <audio 
          ref={audioRef} 
          src={TRACKS[currentTrack].src} 
          onEnded={() => skipTrack(true)} 
        />
      </div>
    </div>
  );
}

