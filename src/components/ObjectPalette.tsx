import React from 'react';
import { GardenObject } from './ZenGarden';

interface ObjectPaletteProps {
  selectedObject: GardenObject;
  onObjectChange: (object: GardenObject) => void;
}

const ObjectPalette: React.FC<ObjectPaletteProps> = ({ selectedObject, onObjectChange }) => {
  const objects = [
    { type: 'stone' as GardenObject, label: 'Stone', emoji: '🪨' },
    { type: 'bonsai' as GardenObject, label: 'Bonsai', emoji: '🌳' },
    { type: 'lantern' as GardenObject, label: 'Lantern', emoji: '🏮' }
  ];

  return (
    <div className="flex items-center bg-slate-800/80 backdrop-blur rounded-xl shadow-md p-2 gap-1 ring-1 ring-slate-700">
      {objects.map(({ type, label, emoji }) => (
        <button
          key={type}
          onClick={() => onObjectChange(type)}
          className={`flex flex-col items-center gap-1 px-4 py-3 rounded-lg transition-all duration-200 ${
            selectedObject === type
              ? 'bg-emerald-700/30 text-emerald-200 ring-1 ring-emerald-900/40'
              : 'text-slate-300 hover:bg-slate-700/40'
          }`}
          title={`Place ${label.toLowerCase()}`}
        >
          <span className="text-xl">{emoji}</span>
          <span className="font-medium text-xs text-slate-200">{label}</span>
        </button>
      ))}
    </div>
  );
};

export default ObjectPalette;