import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Volume2, VolumeX, RotateCcw, Undo2, Sparkles } from 'lucide-react';
import ToolSelector from './ToolSelector';
import ObjectPalette from './ObjectPalette';
import { useCanvas } from '../hooks/useCanvas';
import { useSoundManager } from '../hooks/useSoundManager';

export type Tool = 'rake' | 'place';
export type GardenObject = 'stone' | 'bonsai' | 'lantern';

export interface PlacedObject {
  id: string;
  type: GardenObject;
  x: number;
  y: number;
  rotation: number;
  scale: number;
}

const ZenGarden: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>('rake');
  const [selectedObject, setSelectedObject] = useState<GardenObject>('stone');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem('soundEnabled');
    return stored === null ? true : stored === 'true';
  });
  const [isGeneratingPattern, setIsGeneratingPattern] = useState(false);
  
  const { playSound } = useSoundManager(soundEnabled);
  const {
    undoStack,
    generatePattern,
    clearGarden,
    undo,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  } = useCanvas(canvasRef, tool, selectedObject, playSound);

  const handleSoundToggle = useCallback(() => {
    setSoundEnabled(prev => !prev);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('soundEnabled', String(soundEnabled));
    } catch {}
  }, [soundEnabled]);

  const handleGeneratePattern = useCallback(async () => {
    if (isGeneratingPattern) return;
    
    setIsGeneratingPattern(true);
    await generatePattern();
    setIsGeneratingPattern(false);
  }, [generatePattern, isGeneratingPattern]);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-light text-slate-100 mb-2">
          Zen Sand Garden
        </h1>
        <p className="text-slate-400 text-sm md:text-base">
          Rake patterns in the sand and create your peaceful moment
        </p>
      </div>

      {/* Main Garden Canvas */}
      <div className="relative bg-slate-800/80 backdrop-blur rounded-2xl shadow-xl overflow-hidden ring-1 ring-slate-700">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="block max-w-full h-auto cursor-crosshair touch-none"
          style={{ 
            width: '100%', 
            maxWidth: '800px',
            height: 'auto',
            aspectRatio: '4/3'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
        
        {/* Pattern Generation Overlay */}
        {isGeneratingPattern && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-2xl">
            <div className="bg-slate-900/90 px-6 py-4 rounded-xl shadow-lg flex items-center gap-3 ring-1 ring-slate-700">
              <div className="animate-spin">
                <Sparkles size={20} className="text-amber-400" />
              </div>
              <span className="text-slate-100 font-medium">Creating beautiful pattern...</span>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center gap-4 w-full max-w-4xl">
        {/* Tool Selector */}
        <ToolSelector tool={tool} onToolChange={setTool} />
        
        {/* Object Palette - only show when place tool is selected */}
        {tool === 'place' && (
          <ObjectPalette 
            selectedObject={selectedObject} 
            onObjectChange={setSelectedObject} 
          />
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 w-full sm:flex sm:w-auto sm:items-center">
          <button
            onClick={handleGeneratePattern}
            disabled={isGeneratingPattern}
            className="flex items-center justify-center w-full sm:w-auto gap-2 px-4 py-2 bg-purple-700/30 hover:bg-purple-700/40 disabled:bg-purple-900/30 disabled:text-purple-400 text-purple-200 rounded-xl transition-colors duration-200 ring-1 ring-purple-900/50"
            title="Generate beautiful pattern"
          >
            <Sparkles size={18} />
            <span className="text-sm font-medium">
              {isGeneratingPattern ? 'Creating...' : 'Auto Pattern'}
            </span>
          </button>

          <button
            onClick={undo}
            disabled={undoStack.length === 0}
            className="flex items-center justify-center w-full sm:w-auto gap-2 px-4 py-2 bg-slate-700/30 hover:bg-slate-700/40 disabled:bg-slate-800/30 disabled:text-slate-500 text-slate-100 rounded-xl transition-colors duration-200 ring-1 ring-slate-700"
            title="Undo last action"
          >
            <Undo2 size={18} />
            <span className="text-sm font-medium">Undo</span>
          </button>

          <button
            onClick={clearGarden}
            className="flex items-center justify-center w-full sm:w-auto gap-2 px-4 py-2 bg-amber-700/30 hover:bg-amber-700/40 text-amber-200 rounded-xl transition-colors duration-200 ring-1 ring-amber-900/40"
            title="Reset garden"
          >
            <RotateCcw size={18} />
            <span className="text-sm font-medium">Reset</span>
          </button>

          <button
            onClick={handleSoundToggle}
            className={`flex items-center justify-center w-full sm:w-auto gap-2 px-4 py-2 rounded-xl transition-colors duration-200 ring-1 ${
              soundEnabled 
                ? 'bg-emerald-700/30 hover:bg-emerald-700/40 text-emerald-200 ring-emerald-900/40' 
                : 'bg-slate-700/30 hover:bg-slate-700/40 text-slate-300 ring-slate-700'
            }`}
            title={soundEnabled ? 'Turn sound off' : 'Turn sound on'}
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            <span className="text-sm font-medium">Sound</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ZenGarden;