import { useRef, useCallback, useState, useEffect } from 'react';
import { Tool, GardenObject, PlacedObject } from '../components/ZenGarden';

interface Point {
  x: number;
  y: number;
}

interface RakePath {
  id: string;
  points: Point[];
  width: number;
}

interface CanvasState {
  rakePaths: RakePath[];
  placedObjects: PlacedObject[];
}

export const useCanvas = (
  canvasRef: React.RefObject<HTMLCanvasElement>,
  tool: Tool,
  selectedObject: GardenObject,
  playSound: (sound: string) => void
) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [rakePaths, setRakePaths] = useState<RakePath[]>([]);
  const [placedObjects, setPlacedObjects] = useState<PlacedObject[]>([]);
  const [undoStack, setUndoStack] = useState<CanvasState[]>([]);
  const currentPathRef = useRef<RakePath | null>(null);
  const lastPointRef = useRef<Point | null>(null);

  // Save state for undo functionality
  const saveState = useCallback(() => {
    setUndoStack(prev => [
      ...prev,
      { rakePaths: [...rakePaths], placedObjects: [...placedObjects] }
    ].slice(-20)); // Keep last 20 states
  }, [rakePaths, placedObjects]);

  // Get canvas coordinates from any pointer-like object with clientX/clientY
  const getCanvasCoordinates = useCallback((pointLike: { clientX: number; clientY: number }, canvas: HTMLCanvasElement): Point => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (pointLike.clientX - rect.left) * scaleX,
      y: (pointLike.clientY - rect.top) * scaleY
    };
  }, []);

  // Draw sand texture background
  const drawSandTexture = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Base dark sand color
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#1f2937'); // slate-800
    gradient.addColorStop(0.5, '#111827'); // gray-900 / slate-900
    gradient.addColorStop(1, '#0b1220'); // deeper navy-slate
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Add subtle texture
    ctx.globalAlpha = 0.05;
    for (let i = 0; i < 1000; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = Math.random() * 2;
      ctx.fillStyle = Math.random() > 0.5 ? '#334155' : '#1e293b'; // slate tones
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }, []);

  // Draw rake grooves
  const drawRakeGrooves = useCallback((ctx: CanvasRenderingContext2D) => {
    rakePaths.forEach(path => {
      if (path.points.length < 2) return;

      // Draw shadow first
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.lineWidth = path.width + 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      ctx.beginPath();
      ctx.moveTo(path.points[0].x, path.points[0].y);
      path.points.forEach(point => ctx.lineTo(point.x, point.y));
      ctx.stroke();
      ctx.restore();

      // Draw main groove
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.strokeStyle = '#64748b'; // slate-500
      ctx.lineWidth = path.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(path.points[0].x, path.points[0].y);
      path.points.forEach(point => ctx.lineTo(point.x, point.y));
      ctx.stroke();
      ctx.restore();

      // Add inner highlight
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = Math.max(1, path.width / 3);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(path.points[0].x, path.points[0].y);
      path.points.forEach(point => ctx.lineTo(point.x, point.y));
      ctx.stroke();
      ctx.restore();
    });
  }, [rakePaths]);

  // Draw garden objects
  const drawObjects = useCallback((ctx: CanvasRenderingContext2D) => {
    placedObjects.forEach(obj => {
      ctx.save();
      ctx.translate(obj.x, obj.y);
      ctx.rotate(obj.rotation);
      ctx.scale(obj.scale, obj.scale);

      switch (obj.type) {
        case 'stone':
          // Stone shadow
          ctx.save();
          ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
          ctx.translate(2, 3);
          ctx.beginPath();
          ctx.ellipse(0, 0, 15, 12, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // Stone body
          const stoneGradient = ctx.createRadialGradient(-5, -5, 0, 0, 0, 20);
          stoneGradient.addColorStop(0, '#B8B5B2');
          stoneGradient.addColorStop(0.7, '#8E8B88');
          stoneGradient.addColorStop(1, '#6B6865');
          ctx.fillStyle = stoneGradient;
          ctx.beginPath();
          ctx.ellipse(0, 0, 15, 12, 0, 0, Math.PI * 2);
          ctx.fill();

          // Stone highlights
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.beginPath();
          ctx.ellipse(-6, -4, 4, 3, 0, 0, Math.PI * 2);
          ctx.fill();
          break;

        case 'bonsai':
          // Tree shadow
          ctx.save();
          ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
          ctx.translate(3, 4);
          ctx.beginPath();
          ctx.ellipse(0, 5, 12, 8, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // Trunk
          ctx.fillStyle = '#8B4513';
          ctx.fillRect(-2, 0, 4, 15);
          
          // Foliage
          const treeGradient = ctx.createRadialGradient(0, -5, 0, 0, -5, 15);
          treeGradient.addColorStop(0, '#90EE90');
          treeGradient.addColorStop(0.7, '#228B22');
          treeGradient.addColorStop(1, '#006400');
          ctx.fillStyle = treeGradient;
          ctx.beginPath();
          ctx.ellipse(0, -5, 12, 10, 0, 0, Math.PI * 2);
          ctx.fill();

          // Highlights on foliage
          ctx.fillStyle = 'rgba(144, 238, 144, 0.6)';
          ctx.beginPath();
          ctx.ellipse(-4, -8, 3, 2, 0, 0, Math.PI * 2);
          ctx.fill();
          break;

        case 'lantern':
          // Lantern shadow
          ctx.save();
          ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
          ctx.translate(2, 3);
          ctx.fillRect(-6, -12, 12, 20);
          ctx.restore();

          // Lantern base
          ctx.fillStyle = '#CD853F';
          ctx.fillRect(-6, -12, 12, 20);
          
          // Lantern paper
          const lanternGradient = ctx.createLinearGradient(-5, -10, 5, 6);
          lanternGradient.addColorStop(0, '#FFF8DC');
          lanternGradient.addColorStop(0.5, '#F0E68C');
          lanternGradient.addColorStop(1, '#DAA520');
          ctx.fillStyle = lanternGradient;
          ctx.fillRect(-5, -10, 10, 16);

          // Lantern frame
          ctx.strokeStyle = '#8B4513';
          ctx.lineWidth = 1;
          ctx.strokeRect(-5, -10, 10, 16);
          ctx.beginPath();
          ctx.moveTo(-5, -2);
          ctx.lineTo(5, -2);
          ctx.stroke();

          // Top cap
          ctx.fillStyle = '#8B4513';
          ctx.fillRect(-7, -14, 14, 3);
          break;
      }

      ctx.restore();
    });
  }, [placedObjects]);

  // Main render function
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    drawSandTexture(ctx, canvas.width, canvas.height);
    drawRakeGrooves(ctx);
    drawObjects(ctx);
  }, [drawSandTexture, drawRakeGrooves, drawObjects]);

  // Initialize canvas
  useEffect(() => {
    render();
  }, [render]);

  // Mouse event handlers
  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const point = getCanvasCoordinates(event.nativeEvent, canvas);

    if (tool === 'rake') {
      saveState();
      setIsDrawing(true);
      const newPath: RakePath = {
        id: Date.now().toString(),
        points: [point],
        width: 8 + Math.random() * 4
      };
      currentPathRef.current = newPath;
      lastPointRef.current = point;
      playSound('rake');
    } else if (tool === 'place') {
      saveState();
      const newObject: PlacedObject = {
        id: Date.now().toString(),
        type: selectedObject,
        x: point.x,
        y: point.y,
        rotation: (Math.random() - 0.5) * 0.4,
        scale: 0.8 + Math.random() * 0.4
      };
      setPlacedObjects(prev => [...prev, newObject]);
      playSound('place');
    }
  }, [tool, selectedObject, getCanvasCoordinates, saveState, playSound]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || tool !== 'rake' || !currentPathRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const point = getCanvasCoordinates(event.nativeEvent, canvas);
    
    if (lastPointRef.current) {
      const distance = Math.sqrt(
        Math.pow(point.x - lastPointRef.current.x, 2) + 
        Math.pow(point.y - lastPointRef.current.y, 2)
      );
      
      if (distance > 3) {
        currentPathRef.current.points.push(point);
        lastPointRef.current = point;
        setRakePaths(prev => {
          const newPaths = [...prev];
          const index = newPaths.findIndex(p => p.id === currentPathRef.current!.id);
          if (index >= 0) {
            newPaths[index] = { ...currentPathRef.current! };
          } else {
            newPaths.push({ ...currentPathRef.current! });
          }
          return newPaths;
        });
      }
    }
  }, [isDrawing, tool, getCanvasCoordinates]);

  const handleMouseUp = useCallback(() => {
    if (isDrawing) {
      setIsDrawing(false);
      currentPathRef.current = null;
      lastPointRef.current = null;
    }
  }, [isDrawing]);

  // Touch event handlers
  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas || event.touches.length === 0) return;

    const touch = event.touches[0];
    const point = getCanvasCoordinates(touch, canvas);

    if (tool === 'rake') {
      saveState();
      setIsDrawing(true);
      const newPath: RakePath = {
        id: Date.now().toString(),
        points: [point],
        width: 8 + Math.random() * 4
      };
      currentPathRef.current = newPath;
      lastPointRef.current = point;
      playSound('rake');
    } else if (tool === 'place') {
      saveState();
      const newObject: PlacedObject = {
        id: Date.now().toString(),
        type: selectedObject,
        x: point.x,
        y: point.y,
        rotation: (Math.random() - 0.5) * 0.4,
        scale: 0.8 + Math.random() * 0.4
      };
      setPlacedObjects(prev => [...prev, newObject]);
      playSound('place');
    }
  }, [tool, selectedObject, getCanvasCoordinates, saveState, playSound]);

  const handleTouchMove = useCallback((event: React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    if (!isDrawing || tool !== 'rake' || !currentPathRef.current || event.touches.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const touch = event.touches[0];
    const point = getCanvasCoordinates(touch, canvas);
    
    if (lastPointRef.current) {
      const distance = Math.sqrt(
        Math.pow(point.x - lastPointRef.current.x, 2) + 
        Math.pow(point.y - lastPointRef.current.y, 2)
      );
      
      if (distance > 3) {
        currentPathRef.current.points.push(point);
        lastPointRef.current = point;
        setRakePaths(prev => {
          const newPaths = [...prev];
          const index = newPaths.findIndex(p => p.id === currentPathRef.current!.id);
          if (index >= 0) {
            newPaths[index] = { ...currentPathRef.current! };
          } else {
            newPaths.push({ ...currentPathRef.current! });
          }
          return newPaths;
        });
      }
    }
  }, [isDrawing, tool, getCanvasCoordinates]);

  const handleTouchEnd = useCallback((event: React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    if (isDrawing) {
      setIsDrawing(false);
      currentPathRef.current = null;
      lastPointRef.current = null;
    }
  }, [isDrawing]);

  // Clear garden
  const clearGarden = useCallback(() => {
    saveState();
    setRakePaths([]);
    setPlacedObjects([]);
    playSound('clear');
  }, [saveState, playSound]);

  // Undo last action
  const undo = useCallback(() => {
    if (undoStack.length > 0) {
      const lastState = undoStack[undoStack.length - 1];
      setRakePaths(lastState.rakePaths);
      setPlacedObjects(lastState.placedObjects);
      setUndoStack(prev => prev.slice(0, -1));
      playSound('undo');
    }
  }, [undoStack, playSound]);

  // Pattern generation functions
  const generateSpiralPattern = useCallback((centerX: number, centerY: number, radius: number, turns: number) => {
    const points: Point[] = [];
    const totalPoints = turns * 50;
    
    for (let i = 0; i <= totalPoints; i++) {
      const angle = (i / totalPoints) * turns * 2 * Math.PI;
      const currentRadius = (i / totalPoints) * radius;
      const x = centerX + Math.cos(angle) * currentRadius;
      const y = centerY + Math.sin(angle) * currentRadius;
      points.push({ x, y });
    }
    
    return points;
  }, []);

  const generateWavePattern = useCallback((startX: number, startY: number, endX: number, amplitude: number, frequency: number) => {
    const points: Point[] = [];
    const distance = endX - startX;
    const steps = Math.floor(distance / 3);
    
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      const x = startX + progress * distance;
      const y = startY + Math.sin(progress * frequency * Math.PI * 2) * amplitude;
      points.push({ x, y });
    }
    
    return points;
  }, []);

  const generateCirclePattern = useCallback((centerX: number, centerY: number, radius: number) => {
    const points: Point[] = [];
    const totalPoints = Math.floor(radius * 0.5);
    
    for (let i = 0; i <= totalPoints; i++) {
      const angle = (i / totalPoints) * 2 * Math.PI;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      points.push({ x, y });
    }
    
    return points;
  }, []);

  const generateEllipsePattern = useCallback((centerX: number, centerY: number, radiusX: number, radiusY: number) => {
    const points: Point[] = [];
    const approxPerimeter = Math.PI * (3 * (radiusX + radiusY) - Math.sqrt((3 * radiusX + radiusY) * (radiusX + 3 * radiusY)));
    const totalPoints = Math.max(24, Math.floor(approxPerimeter * 0.3));

    for (let i = 0; i <= totalPoints; i++) {
      const angle = (i / totalPoints) * 2 * Math.PI;
      const x = centerX + Math.cos(angle) * radiusX;
      const y = centerY + Math.sin(angle) * radiusY;
      points.push({ x, y });
    }

    return points;
  }, []);

  const generateZenPattern = useCallback((canvas: HTMLCanvasElement) => {
    const patterns = [
      // Concentric circles
      () => {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const paths: RakePath[] = [];
        
        for (let radius = 50; radius < Math.min(canvas.width, canvas.height) / 2 - 50; radius += 40) {
          const points = generateCirclePattern(centerX, centerY, radius);
          paths.push({
            id: `circle-${radius}`,
            points,
            width: 6 + Math.random() * 4
          });
        }
        
        return paths;
      },
      
      // Spiral garden
      () => {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const maxRadius = Math.min(canvas.width, canvas.height) / 2 - 50;
        
        return [{
          id: 'spiral-main',
          points: generateSpiralPattern(centerX, centerY, maxRadius, 4),
          width: 8 + Math.random() * 4
        }];
      },
      
      // Wave patterns
      () => {
        const paths: RakePath[] = [];
        const waveCount = 5;
        const spacing = canvas.height / (waveCount + 1);
        
        for (let i = 1; i <= waveCount; i++) {
          const y = spacing * i;
          const amplitude = 30 + Math.random() * 20;
          const frequency = 2 + Math.random() * 2;
          const points = generateWavePattern(50, y, canvas.width - 50, amplitude, frequency);
          
          paths.push({
            id: `wave-${i}`,
            points,
            width: 6 + Math.random() * 4
          });
        }
        
        return paths;
      },
      
      // Mandala-like pattern
      () => {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const paths: RakePath[] = [];
        const petals = 8;
        
        for (let i = 0; i < petals; i++) {
          const angle = (i / petals) * 2 * Math.PI;
          const startX = centerX + Math.cos(angle) * 50;
          const startY = centerY + Math.sin(angle) * 50;
          const endX = centerX + Math.cos(angle) * 200;
          const endY = centerY + Math.sin(angle) * 200;
          
          // Create curved petal
          const points: Point[] = [];
          const steps = 30;
          
          for (let j = 0; j <= steps; j++) {
            const t = j / steps;
            const curveOffset = Math.sin(t * Math.PI) * 30;
            const perpAngle = angle + Math.PI / 2;
            
            const x = startX + (endX - startX) * t + Math.cos(perpAngle) * curveOffset;
            const y = startY + (endY - startY) * t + Math.sin(perpAngle) * curveOffset;
            points.push({ x, y });
          }
          
          paths.push({
            id: `petal-${i}`,
            points,
            width: 5 + Math.random() * 3
          });
        }
        
        // Add center circle
        const centerPoints = generateCirclePattern(centerX, centerY, 30);
        paths.push({
          id: 'center-circle',
          points: centerPoints,
          width: 8
        });
        
        return paths;
      },
      
      // Zen garden raked lines
      () => {
        const paths: RakePath[] = [];
        const lineCount = 12;
        const spacing = canvas.width / (lineCount + 1);
        
        for (let i = 1; i <= lineCount; i++) {
          const x = spacing * i;
          const points: Point[] = [];
          const steps = 40;
          
          for (let j = 0; j <= steps; j++) {
            const t = j / steps;
            const y = 50 + t * (canvas.height - 100);
            const waveOffset = Math.sin(t * Math.PI * 3) * (15 + Math.random() * 10);
            points.push({ x: x + waveOffset, y });
          }
          
          paths.push({
            id: `zen-line-${i}`,
            points,
            width: 6 + Math.random() * 4
          });
        }
        
        return paths;
      },

      // Elliptical concentric rings
      () => {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const paths: RakePath[] = [];
        const maxRadiusX = Math.min(canvas.width, canvas.height) / 2 - 60;
        const maxRadiusY = maxRadiusX * (0.6 + Math.random() * 0.3);

        for (let r = 40; r < maxRadiusX; r += 36) {
          const rx = r;
          const ry = Math.max(24, (r / maxRadiusX) * maxRadiusY);
          const points = generateEllipsePattern(centerX, centerY, rx, ry);
          paths.push({ id: `ellipse-${r.toFixed(0)}`, points, width: 6 + Math.random() * 3 });
        }

        return paths;
      },

      // Double spiral (yin-yang inspired)
      () => {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const maxRadius = Math.min(canvas.width, canvas.height) / 2 - 50;
        const main = {
          id: 'double-spiral-a',
          points: generateSpiralPattern(centerX, centerY, maxRadius, 3.5),
          width: 7 + Math.random() * 3
        };
        const offsetAngle = Math.PI;
        const pointsB = main.points.map(p => {
          const dx = p.x - centerX;
          const dy = p.y - centerY;
          const angle = Math.atan2(dy, dx) + offsetAngle;
          const radius = Math.hypot(dx, dy);
          return { x: centerX + Math.cos(angle) * radius, y: centerY + Math.sin(angle) * radius };
        });
        const other = { id: 'double-spiral-b', points: pointsB, width: 7 + Math.random() * 3 };
        return [main, other];
      },

      // Bamboo grove (vertical swaying waves)
      () => {
        const paths: RakePath[] = [];
        const stalks = 10 + Math.floor(Math.random() * 6);
        const margin = 60;
        for (let i = 0; i < stalks; i++) {
          const x = margin + (i + 0.5) * ((canvas.width - margin * 2) / stalks);
          const sway = 18 + Math.random() * 14;
          const freq = 2 + Math.random() * 2.5;
          const points: Point[] = [];
          const steps = 48;
          for (let j = 0; j <= steps; j++) {
            const t = j / steps;
            const y = 50 + t * (canvas.height - 100);
            const offset = Math.sin(t * Math.PI * freq) * sway;
            points.push({ x: x + offset, y });
          }
          paths.push({ id: `bamboo-${i}`, points, width: 5 + Math.random() * 3 });
        }
        return paths;
      },

      // Multi-center ripples
      () => {
        const paths: RakePath[] = [];
        const centers = 2 + Math.floor(Math.random() * 2);
        for (let c = 0; c < centers; c++) {
          const cx = 120 + Math.random() * (canvas.width - 240);
          const cy = 120 + Math.random() * (canvas.height - 240);
          const maxR = Math.min(canvas.width, canvas.height) / 3;
          for (let r = 40; r < maxR; r += 32 + Math.random() * 12) {
            const points = generateCirclePattern(cx, cy, r);
            paths.push({ id: `ripple-${c}-${r.toFixed(0)}`, points, width: 5 + Math.random() * 3 });
          }
        }
        return paths;
      },

      // Serpentine fill
      () => {
        const points: Point[] = [];
        const rows = 10;
        const margin = 50;
        const heightAvail = canvas.height - margin * 2;
        for (let row = 0; row < rows; row++) {
          const y = margin + (row / (rows - 1)) * heightAvail;
          const leftToRight = row % 2 === 0;
          const startX = margin;
          const endX = canvas.width - margin;
          const steps = 80;
          for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = leftToRight ? startX + t * (endX - startX) : endX - t * (endX - startX);
            const amp = 10 + Math.random() * 8;
            const offset = Math.sin((t + row * 0.15) * Math.PI * 2) * amp;
            points.push({ x, y: y + offset });
          }
        }
        return [{ id: 'serpentine', points, width: 6 + Math.random() * 3 }];
      }
    ];
    
    const selectedPattern = patterns[Math.floor(Math.random() * patterns.length)];
    return selectedPattern();
  }, [generateCirclePattern, generateSpiralPattern, generateWavePattern, generateEllipsePattern]);

  // Animate pattern generation
  const generatePattern = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    saveState();
    
    // Clear existing patterns
    setRakePaths([]);
    setPlacedObjects([]);
    
    // Generate new pattern
    const newPaths = generateZenPattern(canvas);
    
    // Animate the drawing of each path
    for (const path of newPaths) {
      const animatedPath: RakePath = {
        ...path,
        points: []
      };
      
      // Add points gradually for smooth animation
      for (let i = 0; i < path.points.length; i++) {
        animatedPath.points.push(path.points[i]);
        
        setRakePaths(prev => {
          const newPaths = prev.filter(p => p.id !== path.id);
          return [...newPaths, { ...animatedPath }];
        });
        
        // Play gentle rake sound occasionally
        if (i % 10 === 0) {
          playSound('rake');
        }
        
        // Small delay for smooth animation
        await new Promise(resolve => setTimeout(resolve, 20));
      }
    }
    
    // Optionally add some objects
    if (Math.random() > 0.3) {
      const objectTypes: GardenObject[] = ['stone', 'bonsai', 'lantern'];
      const objectCount = 1 + Math.floor(Math.random() * 3);
      
      for (let i = 0; i < objectCount; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const newObject: PlacedObject = {
          id: `auto-${Date.now()}-${i}`,
          type: objectTypes[Math.floor(Math.random() * objectTypes.length)],
          x: 100 + Math.random() * (canvas.width - 200),
          y: 100 + Math.random() * (canvas.height - 200),
          rotation: (Math.random() - 0.5) * 0.4,
          scale: 0.8 + Math.random() * 0.4
        };
        
        setPlacedObjects(prev => [...prev, newObject]);
        playSound('place');
      }
    }
  }, [saveState, generateZenPattern, playSound]);
  return {
    isDrawing,
    placedObjects,
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
  };
};