import { useEffect, useRef } from "react";

type CanvasStrokeStyle = string | CanvasGradient | CanvasPattern;

interface GridOffset {
  x: number;
  y: number;
}

interface ShapeGridProps {
  direction?: "diagonal" | "up" | "right" | "down" | "left";
  speed?: number;
  borderColor?: CanvasStrokeStyle;
  squareSize?: number;
  hoverFillColor?: CanvasStrokeStyle;
  hoverColor?: CanvasStrokeStyle;
  size?: number;
  shape?: "square" | "hexagon" | "circle" | "triangle";
  hoverTrailAmount?: number;
}

export default function ShapeGrid({
  direction = "right",
  speed = 1,
  borderColor = "#999",
  squareSize,
  size,
  hoverFillColor,
  hoverColor,
  shape = "square",
  hoverTrailAmount = 0
}: ShapeGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);
  const gridOffset = useRef<GridOffset>({ x: 0, y: 0 });
  const hoveredSquareRef = useRef<GridOffset | null>(null);
  const trailCells = useRef<GridOffset[]>([]);
  const cellOpacities = useRef<Map<string, number>>(new Map());
  const cellSize = squareSize ?? size ?? 40;
  const fillColor = hoverFillColor ?? hoverColor ?? "#222";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const isHex = shape === "hexagon";
    const isTri = shape === "triangle";
    const hexHoriz = cellSize * 1.5;
    const hexVert = cellSize * Math.sqrt(3);

    const resizeCanvas = () => {
      const scale = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * scale;
      canvas.height = canvas.offsetHeight * scale;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
    };

    const drawHex = (cx: number, cy: number, shapeSize: number) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i += 1) {
        const angle = (Math.PI / 3) * i;
        const vx = cx + shapeSize * Math.cos(angle);
        const vy = cy + shapeSize * Math.sin(angle);
        if (i === 0) ctx.moveTo(vx, vy);
        else ctx.lineTo(vx, vy);
      }
      ctx.closePath();
    };

    const drawCircle = (cx: number, cy: number, shapeSize: number) => {
      ctx.beginPath();
      ctx.arc(cx, cy, shapeSize / 2, 0, Math.PI * 2);
      ctx.closePath();
    };

    const drawTriangle = (cx: number, cy: number, shapeSize: number, flip: boolean) => {
      ctx.beginPath();
      if (flip) {
        ctx.moveTo(cx, cy + shapeSize / 2);
        ctx.lineTo(cx + shapeSize / 2, cy - shapeSize / 2);
        ctx.lineTo(cx - shapeSize / 2, cy - shapeSize / 2);
      } else {
        ctx.moveTo(cx, cy - shapeSize / 2);
        ctx.lineTo(cx + shapeSize / 2, cy + shapeSize / 2);
        ctx.lineTo(cx - shapeSize / 2, cy + shapeSize / 2);
      }
      ctx.closePath();
    };

    const updateCellOpacities = () => {
      const targets = new Map<string, number>();

      if (hoveredSquareRef.current) {
        targets.set(`${hoveredSquareRef.current.x},${hoveredSquareRef.current.y}`, 1);
      }

      if (hoverTrailAmount > 0) {
        trailCells.current.forEach((cell, index) => {
          const key = `${cell.x},${cell.y}`;
          if (!targets.has(key)) {
            targets.set(key, (trailCells.current.length - index) / (trailCells.current.length + 1));
          }
        });
      }

      targets.forEach((_opacity, key) => {
        if (!cellOpacities.current.has(key)) {
          cellOpacities.current.set(key, 0);
        }
      });

      cellOpacities.current.forEach((opacity, key) => {
        const target = targets.get(key) || 0;
        const next = opacity + (target - opacity) * 0.15;
        if (next < 0.005) {
          cellOpacities.current.delete(key);
        } else {
          cellOpacities.current.set(key, next);
        }
      });
    };

    const drawGrid = () => {
      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;
      ctx.clearRect(0, 0, width, height);
      ctx.lineWidth = 1;

      if (isHex) {
        const colShift = Math.floor(gridOffset.current.x / hexHoriz);
        const offsetX = ((gridOffset.current.x % hexHoriz) + hexHoriz) % hexHoriz;
        const offsetY = ((gridOffset.current.y % hexVert) + hexVert) % hexVert;
        const cols = Math.ceil(width / hexHoriz) + 3;
        const rows = Math.ceil(height / hexVert) + 3;

        for (let col = -2; col < cols; col += 1) {
          for (let row = -2; row < rows; row += 1) {
            const cx = col * hexHoriz + offsetX;
            const cy = row * hexVert + ((col + colShift) % 2 !== 0 ? hexVert / 2 : 0) + offsetY;
            const alpha = cellOpacities.current.get(`${col},${row}`);
            if (alpha) {
              ctx.globalAlpha = alpha;
              drawHex(cx, cy, cellSize);
              ctx.fillStyle = fillColor;
              ctx.fill();
              ctx.globalAlpha = 1;
            }
            drawHex(cx, cy, cellSize);
            ctx.strokeStyle = borderColor;
            ctx.stroke();
          }
        }
      } else if (isTri) {
        const halfW = cellSize / 2;
        const colShift = Math.floor(gridOffset.current.x / halfW);
        const rowShift = Math.floor(gridOffset.current.y / cellSize);
        const offsetX = ((gridOffset.current.x % halfW) + halfW) % halfW;
        const offsetY = ((gridOffset.current.y % cellSize) + cellSize) % cellSize;
        const cols = Math.ceil(width / halfW) + 4;
        const rows = Math.ceil(height / cellSize) + 4;

        for (let col = -2; col < cols; col += 1) {
          for (let row = -2; row < rows; row += 1) {
            const cx = col * halfW + offsetX;
            const cy = row * cellSize + cellSize / 2 + offsetY;
            const flip = ((col + colShift + row + rowShift) % 2 + 2) % 2 !== 0;
            const alpha = cellOpacities.current.get(`${col},${row}`);
            if (alpha) {
              ctx.globalAlpha = alpha;
              drawTriangle(cx, cy, cellSize, flip);
              ctx.fillStyle = fillColor;
              ctx.fill();
              ctx.globalAlpha = 1;
            }
            drawTriangle(cx, cy, cellSize, flip);
            ctx.strokeStyle = borderColor;
            ctx.stroke();
          }
        }
      } else if (shape === "circle") {
        const offsetX = ((gridOffset.current.x % cellSize) + cellSize) % cellSize;
        const offsetY = ((gridOffset.current.y % cellSize) + cellSize) % cellSize;
        const cols = Math.ceil(width / cellSize) + 3;
        const rows = Math.ceil(height / cellSize) + 3;

        for (let col = -2; col < cols; col += 1) {
          for (let row = -2; row < rows; row += 1) {
            const cx = col * cellSize + cellSize / 2 + offsetX;
            const cy = row * cellSize + cellSize / 2 + offsetY;
            const alpha = cellOpacities.current.get(`${col},${row}`);
            if (alpha) {
              ctx.globalAlpha = alpha;
              drawCircle(cx, cy, cellSize);
              ctx.fillStyle = fillColor;
              ctx.fill();
              ctx.globalAlpha = 1;
            }
            drawCircle(cx, cy, cellSize);
            ctx.strokeStyle = borderColor;
            ctx.stroke();
          }
        }
      } else {
        const offsetX = ((gridOffset.current.x % cellSize) + cellSize) % cellSize;
        const offsetY = ((gridOffset.current.y % cellSize) + cellSize) % cellSize;
        const cols = Math.ceil(width / cellSize) + 3;
        const rows = Math.ceil(height / cellSize) + 3;

        for (let col = -2; col < cols; col += 1) {
          for (let row = -2; row < rows; row += 1) {
            const sx = col * cellSize + offsetX;
            const sy = row * cellSize + offsetY;
            const alpha = cellOpacities.current.get(`${col},${row}`);
            if (alpha) {
              ctx.globalAlpha = alpha;
              ctx.fillStyle = fillColor;
              ctx.fillRect(sx, sy, cellSize, cellSize);
              ctx.globalAlpha = 1;
            }
            ctx.strokeStyle = borderColor;
            ctx.strokeRect(sx, sy, cellSize, cellSize);
          }
        }
      }

      const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.sqrt(width ** 2 + height ** 2) / 2);
      gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
      gradient.addColorStop(1, "#0B1220");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    };

    const updateAnimation = () => {
      const effectiveSpeed = Math.max(speed, 0.1);
      const wrapX = isHex ? hexHoriz * 2 : cellSize;
      const wrapY = isHex ? hexVert : isTri ? cellSize * 2 : cellSize;

      if (direction === "right") gridOffset.current.x = (gridOffset.current.x - effectiveSpeed + wrapX) % wrapX;
      if (direction === "left") gridOffset.current.x = (gridOffset.current.x + effectiveSpeed + wrapX) % wrapX;
      if (direction === "up") gridOffset.current.y = (gridOffset.current.y + effectiveSpeed + wrapY) % wrapY;
      if (direction === "down") gridOffset.current.y = (gridOffset.current.y - effectiveSpeed + wrapY) % wrapY;
      if (direction === "diagonal") {
        gridOffset.current.x = (gridOffset.current.x - effectiveSpeed + wrapX) % wrapX;
        gridOffset.current.y = (gridOffset.current.y - effectiveSpeed + wrapY) % wrapY;
      }

      updateCellOpacities();
      drawGrid();
      requestRef.current = requestAnimationFrame(updateAnimation);
    };

    const getLocalMouseCoords = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      
      try {
        let currentElement: HTMLElement | null = canvas;
        let hasTransform = false;
        const transforms: { matrix: DOMMatrix; ox: number; oy: number }[] = [];

        while (currentElement && currentElement !== document.body) {
          const style = window.getComputedStyle(currentElement);
          const transform = style.transform || style.webkitTransform;
          if (transform && transform !== "none") {
            hasTransform = true;
            const r = currentElement.getBoundingClientRect();
            const cx = r.left + r.width / 2;
            const cy = r.top + r.height / 2;
            const m = new DOMMatrix(transform);
            transforms.push({ matrix: m, ox: cx, oy: cy });
          }
          currentElement = currentElement.parentElement;
        }

        if (hasTransform) {
          let x = clientX;
          let y = clientY;

          for (let i = transforms.length - 1; i >= 0; i--) {
            const { matrix: m, ox, oy } = transforms[i];
            x -= ox;
            y -= oy;
            const inv = m.inverse();
            const nx = x * inv.a + y * inv.c + inv.e;
            const ny = x * inv.b + y * inv.d + inv.f;
            x = nx + ox;
            y = ny + oy;
          }

          const firstTransform = transforms[0];
          const ox = firstTransform.ox;
          const oy = firstTransform.oy;
          const localX = x - (ox - canvas.offsetWidth / 2);
          const localY = y - (oy - canvas.offsetHeight / 2);
          return { x: localX, y: localY };
        }
      } catch (err) {
        console.error("Error in inverse matrix calculation:", err);
      }

      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    };

    const updateHoverState = (next: GridOffset) => {
      if (!hoveredSquareRef.current || hoveredSquareRef.current.x !== next.x || hoveredSquareRef.current.y !== next.y) {
        if (hoveredSquareRef.current && hoverTrailAmount > 0) {
          trailCells.current.unshift({ ...hoveredSquareRef.current });
          if (trailCells.current.length > hoverTrailAmount) {
            trailCells.current.length = hoverTrailAmount;
          }
        }
        hoveredSquareRef.current = next;
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      const { x: mouseX, y: mouseY } = getLocalMouseCoords(event.clientX, event.clientY);

      if (isHex) {
        const colShift = Math.floor(gridOffset.current.x / hexHoriz);
        const offsetX = ((gridOffset.current.x % hexHoriz) + hexHoriz) % hexHoriz;
        const offsetY = ((gridOffset.current.y % hexVert) + hexVert) % hexVert;
        const adjustedX = mouseX - offsetX;
        const adjustedY = mouseY - offsetY;

        const col = Math.round(adjustedX / hexHoriz);
        const rowOffset = (col + colShift) % 2 !== 0 ? hexVert / 2 : 0;
        const row = Math.round((adjustedY - rowOffset) / hexVert);

        updateHoverState({ x: col, y: row });
      } else if (isTri) {
        const halfW = cellSize / 2;
        const offsetX = ((gridOffset.current.x % halfW) + halfW) % halfW;
        const offsetY = ((gridOffset.current.y % cellSize) + cellSize) % cellSize;

        const adjustedX = mouseX - offsetX;
        const adjustedY = mouseY - offsetY;

        const col = Math.round(adjustedX / halfW);
        const row = Math.floor(adjustedY / cellSize);

        updateHoverState({ x: col, y: row });
      } else if (shape === "circle") {
        const offsetX = ((gridOffset.current.x % cellSize) + cellSize) % cellSize;
        const offsetY = ((gridOffset.current.y % cellSize) + cellSize) % cellSize;

        const adjustedX = mouseX - offsetX;
        const adjustedY = mouseY - offsetY;

        const col = Math.round(adjustedX / cellSize);
        const row = Math.round(adjustedY / cellSize);

        updateHoverState({ x: col, y: row });
      } else {
        const offsetX = ((gridOffset.current.x % cellSize) + cellSize) % cellSize;
        const offsetY = ((gridOffset.current.y % cellSize) + cellSize) % cellSize;

        const adjustedX = mouseX - offsetX;
        const adjustedY = mouseY - offsetY;

        const col = Math.floor(adjustedX / cellSize);
        const row = Math.floor(adjustedY / cellSize);

        updateHoverState({ x: col, y: row });
      }
    };

    const handleMouseLeave = () => {
      hoveredSquareRef.current = null;
    };

    window.addEventListener("resize", resizeCanvas);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);
    resizeCanvas();
    requestRef.current = requestAnimationFrame(updateAnimation);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [borderColor, cellSize, direction, fillColor, hoverTrailAmount, shape, speed]);

  return <canvas ref={canvasRef} className="block h-full w-full border-none" />;
}
