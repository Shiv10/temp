import React from 'react';
import { Brush, Plus } from 'lucide-react';
import { Tool } from './ZenGarden';

interface ToolSelectorProps {
  tool: Tool;
  onToolChange: (tool: Tool) => void;
}

const ToolSelector: React.FC<ToolSelectorProps> = ({ tool, onToolChange }) => {
  return (
    <div className="flex items-center bg-slate-800/80 backdrop-blur rounded-xl shadow-md p-2 gap-1 ring-1 ring-slate-700">
      <button
        onClick={() => onToolChange('rake')}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
          tool === 'rake'
            ? 'bg-indigo-700/30 text-indigo-200 ring-1 ring-indigo-900/40'
            : 'text-slate-300 hover:bg-slate-700/40'
        }`}
        title="Rake tool - drag to create patterns in sand"
      >
        <Brush size={20} />
        <span className="font-medium text-sm">Rake</span>
      </button>
      
      <button
        onClick={() => onToolChange('place')}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
          tool === 'place'
            ? 'bg-emerald-700/30 text-emerald-200 ring-1 ring-emerald-900/40'
            : 'text-slate-300 hover:bg-slate-700/40'
        }`}
        title="Place tool - click to add objects to the garden"
      >
        <Plus size={20} />
        <span className="font-medium text-sm">Place</span>
      </button>
    </div>
  );
};

export default ToolSelector;