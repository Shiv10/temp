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
  const backgroundCacheRef = useRef<HTMLCanvasElement | null>(null);
  const backgroundSizeRef = useRef<{ w: number; h: number } | null>(null);

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

  // Helpers for garden layout and shapes
  const getSandRect = useCallback((width: number, height: number) => {
    const frameMargin = 16; // outer breathing room
    const frameWidth = 26;  // wood frame thickness
    const radius = 28;      // sand corner radius
    const x = frameMargin + frameWidth;
    const y = frameMargin + frameWidth;
    const w = Math.max(0, width - 2 * (frameMargin + frameWidth));
    const h = Math.max(0, height - 2 * (frameMargin + frameWidth));
    return { x, y, w, h, r: radius, frameMargin, frameWidth };
  }, []);

  const roundedRectPath = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }, []);

  // Draw wooden frame and sand area with texture
  const drawSandTexture = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, sandRect: { x: number; y: number; w: number; h: number; r: number; frameMargin: number; frameWidth: number; }) => {
    // Wood frame (fills entire canvas background)
    const woodGrad = ctx.createLinearGradient(0, 0, 0, height);
    woodGrad.addColorStop(0, '#9C6B3E');
    woodGrad.addColorStop(0.5, '#84562E');
    woodGrad.addColorStop(1, '#6E4725');
    ctx.fillStyle = woodGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle wood grain
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    for (let i = 0; i < 16; i++) {
      const ny = (i / 16) * height;
      ctx.beginPath();
      ctx.moveTo(0, ny + Math.sin(i) * 2);
      ctx.bezierCurveTo(width * 0.33, ny + Math.sin(i * 1.3) * 3, width * 0.66, ny + Math.sin(i * 1.7) * 3, width, ny + Math.sin(i * 2.1) * 2);
      ctx.stroke();
    }
    ctx.restore();

    // Inner bevel shadow around where the sand sits
    ctx.save();
    const bevel = 10;
    roundedRectPath(ctx, sandRect.x - bevel, sandRect.y - bevel, sandRect.w + bevel * 2, sandRect.h + bevel * 2, sandRect.r + 12);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 8;
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;
    ctx.stroke();
    ctx.restore();

    // Sand area
    roundedRectPath(ctx, sandRect.x, sandRect.y, sandRect.w, sandRect.h, sandRect.r);
    ctx.save();
    ctx.clip();

    // Base sand gradient (lighter center, darker edges)
    const centerX = sandRect.x + sandRect.w / 2;
    const centerY = sandRect.y + sandRect.h / 2;
    const maxR = Math.hypot(sandRect.w, sandRect.h) / 2;
    const sandGrad = ctx.createRadialGradient(centerX, centerY, maxR * 0.1, centerX, centerY, maxR);
    sandGrad.addColorStop(0, '#F2E7C9');
    sandGrad.addColorStop(0.6, '#E8D9B4');
    sandGrad.addColorStop(1, '#D9C49C');
    ctx.fillStyle = sandGrad;
    ctx.fillRect(sandRect.x, sandRect.y, sandRect.w, sandRect.h);

    // Sand speckle texture
    ctx.globalAlpha = 0.12;
    for (let i = 0; i < Math.max(600, Math.floor((sandRect.w * sandRect.h) / 1500)); i++) {
      const x = sandRect.x + Math.random() * sandRect.w;
      const y = sandRect.y + Math.random() * sandRect.h;
      const size = Math.random() * 1.6 + 0.2;
      ctx.fillStyle = Math.random() > 0.5 ? '#CDBA92' : '#BFA982';
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Inner edge vignette to seat the frame
    const edgeGrad = ctx.createLinearGradient(sandRect.x, sandRect.y, sandRect.x, sandRect.y + sandRect.h);
    edgeGrad.addColorStop(0, 'rgba(0,0,0,0.15)');
    edgeGrad.addColorStop(0.05, 'rgba(0,0,0,0.05)');
    edgeGrad.addColorStop(0.95, 'rgba(0,0,0,0.05)');
    edgeGrad.addColorStop(1, 'rgba(0,0,0,0.15)');
    ctx.fillStyle = edgeGrad;
    ctx.fillRect(sandRect.x, sandRect.y, sandRect.w, sandRect.h);

    ctx.restore();

    // Decorative vines with flowers on the wooden frame (outer edges)
    const drawVine = (points: { x: number; y: number }[]) => {
      if (points.length < 2) return;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(0,0,0,0.2)';
      ctx.shadowBlur = 2;
      ctx.strokeStyle = '#2E6B3E';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();

      const drawLeaf = (cx: number, cy: number, angle: number, size: number) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.fillStyle = '#4FA16A';
        ctx.beginPath();
        ctx.ellipse(-size * 0.7, 0, size, size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(size * 0.7, 0, size, size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };

      const drawFlower = (cx: number, cy: number, size: number) => {
        ctx.save();
        ctx.translate(cx, cy);
        for (let p = 0; p < 5; p++) {
          const a = (p / 5) * Math.PI * 2;
          const px = Math.cos(a) * size;
          const py = Math.sin(a) * size;
          const petalGrad = ctx.createRadialGradient(px, py, 0, px, py, size * 1.2);
          petalGrad.addColorStop(0, '#FFE6F1');
          petalGrad.addColorStop(1, '#F5A3C2');
          ctx.fillStyle = petalGrad;
          ctx.beginPath();
          ctx.ellipse(px, py, size * 0.9, size * 0.55, a, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#F3D36B';
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };

      for (let i = 1; i < points.length - 1; i += 12) {
        const prev = points[i - 1];
        const curr = points[i];
        const next = points[i + 1];
        const angle = Math.atan2(next.y - prev.y, next.x - prev.x);
        const leafSize = 6 + Math.random() * 3;
        drawLeaf(curr.x, curr.y, angle - Math.PI / 4, leafSize);
        if (i % 24 === 0) {
          drawFlower(
            curr.x + Math.cos(angle - Math.PI / 2) * 9,
            curr.y + Math.sin(angle - Math.PI / 2) * 9,
            4.5 + Math.random() * 2
          );
        }
      }
      ctx.restore();
    };

    const buildWavePoints = (startX: number, startY: number, endX: number, endY: number, amplitude: number, waves: number) => {
      const pts: { x: number; y: number }[] = [];
      const steps = 120;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = startX + (endX - startX) * t;
        const y = startY + (endY - startY) * t + Math.sin(t * Math.PI * 2 * waves) * amplitude;
        pts.push({ x, y });
      }
      return pts;
    };

    const outerInset = Math.max(10, sandRect.frameMargin * 0.7);
    const topY = outerInset;
    const bottomY = height - outerInset;
    const leftX = outerInset;
    const rightX = width - outerInset;

    drawVine(buildWavePoints(leftX, topY, rightX, topY, 7, 4));
    drawVine(buildWavePoints(rightX, bottomY, leftX, bottomY, 7, 4));
    drawVine(buildWavePoints(leftX, bottomY, leftX, topY, 7, 3));
    drawVine(buildWavePoints(rightX, topY, rightX, bottomY, 7, 3));

    // Frame inner highlight
    ctx.save();
    roundedRectPath(ctx, sandRect.x - 1, sandRect.y - 1, sandRect.w + 2, sandRect.h + 2, sandRect.r + 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }, [roundedRectPath]);

  const getBackgroundCanvas = useCallback((width: number, height: number) => {
    const needsNew =
      !backgroundCacheRef.current ||
      !backgroundSizeRef.current ||
      backgroundSizeRef.current.w !== width ||
      backgroundSizeRef.current.h !== height;

    if (needsNew) {
      const off = document.createElement('canvas');
      off.width = width;
      off.height = height;
      const offCtx = off.getContext('2d');
      if (offCtx) {
        const sandRect = getSandRect(width, height);
        drawSandTexture(offCtx, width, height, sandRect);
      }
      backgroundCacheRef.current = off;
      backgroundSizeRef.current = { w: width, h: height };
    }

    return backgroundCacheRef.current!;
  }, [getSandRect, drawSandTexture]);

  // Draw rake grooves
  const drawRakeGrooves = useCallback((ctx: CanvasRenderingContext2D) => {
    rakePaths.forEach(path => {
      if (path.points.length < 2) return;

      // Draw shadow first
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.lineWidth = path.width + 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
      ctx.shadowBlur = 3;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      ctx.beginPath();
      ctx.moveTo(path.points[0].x, path.points[0].y);
      path.points.forEach(point => ctx.lineTo(point.x, point.y));
      ctx.stroke();
      ctx.restore();

      // Draw main groove
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.strokeStyle = '#A18B6A'; // warm groove tone on sand
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
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
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

        case 'flower':
          // Flower shadow
          ctx.save();
          ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
          ctx.translate(2, 3);
          ctx.beginPath();
          ctx.ellipse(0, 0, 12, 8, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // Flower petals
          const petalColors = ['#FFB6C1', '#FFC0CB', '#FF69B4', '#FF1493'];
          for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            const petalX = Math.cos(angle) * 8;
            const petalY = Math.sin(angle) * 8;
            
            ctx.save();
            ctx.translate(petalX, petalY);
            ctx.rotate(angle);
            
            const petalGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 6);
            petalGradient.addColorStop(0, petalColors[i % petalColors.length]);
            petalGradient.addColorStop(1, '#FF69B4');
            ctx.fillStyle = petalGradient;
            
            ctx.beginPath();
            ctx.ellipse(0, 0, 6, 3, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }

          // Flower center
          const centerGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 4);
          centerGradient.addColorStop(0, '#FFD700');
          centerGradient.addColorStop(1, '#FFA500');
          ctx.fillStyle = centerGradient;
          ctx.beginPath();
          ctx.arc(0, 0, 4, 0, Math.PI * 2);
          ctx.fill();

          // Stem
          ctx.strokeStyle = '#228B22';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(0, 15);
          ctx.stroke();

          // Leaves
          ctx.fillStyle = '#32CD32';
          ctx.beginPath();
          ctx.ellipse(-3, 8, 4, 2, -0.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(3, 12, 4, 2, 0.3, 0, Math.PI * 2);
          ctx.fill();
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

    const sandRect = getSandRect(canvas.width, canvas.height);
    const bg = getBackgroundCanvas(canvas.width, canvas.height);
    ctx.drawImage(bg, 0, 0);

    // Clip drawing to sand area so strokes/objects stay inside
    ctx.save();
    roundedRectPath(ctx, sandRect.x, sandRect.y, sandRect.w, sandRect.h, sandRect.r);
    ctx.clip();
    drawRakeGrooves(ctx);
    drawObjects(ctx);
    ctx.restore();
  }, [getSandRect, getBackgroundCanvas, roundedRectPath, drawRakeGrooves, drawObjects]);

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