import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Eraser, Undo2, Paintbrush, Download } from 'lucide-react';

const DrawingCanvas = ({ onImageReady, width = 280, height = 280, scenario }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(12);
  const [history, setHistory] = useState([]);
  const [hasContent, setHasContent] = useState(false);

  // Initialize canvas with black background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveToHistory();
  }, []);

  const saveToHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const data = canvas.toDataURL('image/png');
    setHistory(prev => [...prev.slice(-20), data]);
  }, []);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e);

    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#FFFFFF';
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e);

    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasContent(true);
  };

  const stopDraw = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveToHistory();
      emitImage();
    }
  };

  const emitImage = () => {
    const canvas = canvasRef.current;
    if (canvas && onImageReady) {
      onImageReady(canvas.toDataURL('image/png'));
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasContent(false);
    saveToHistory();
    if (onImageReady) onImageReady(null);
  };

  const handleUndo = () => {
    if (history.length <= 1) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const prev = history[history.length - 2];
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      setHistory(h => h.slice(0, -1));
      emitImage();
    };
    img.src = prev;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
      }}
    >
      {/* Canvas Container */}
      <div style={{
        position: 'relative',
        borderRadius: '16px',
        overflow: 'hidden',
        border: '2px solid rgba(0, 240, 255, 0.3)',
        boxShadow: '0 0 30px rgba(0, 240, 255, 0.15), inset 0 0 20px rgba(0, 0, 0, 0.5)',
        background: '#000',
      }}>
        {/* Scanning line animation */}
        {!hasContent && (
          <motion.div
            animate={{ top: ['0%', '100%', '0%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              height: '2px',
              background: 'linear-gradient(90deg, transparent, #00F0FF, transparent)',
              zIndex: 2,
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Placeholder text */}
        {!hasContent && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '8px',
            pointerEvents: 'none',
            zIndex: 1,
          }}>
            <Paintbrush size={32} color="rgba(0, 240, 255, 0.3)" />
            <span style={{
              color: 'rgba(0, 240, 255, 0.4)',
              fontSize: '0.9rem',
              fontFamily: 'Outfit, sans-serif',
              letterSpacing: '1px',
            }}>
              DRAW HERE
            </span>
          </div>
        )}

        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          style={{
            width: `${Math.min(width, 350)}px`,
            height: `${Math.min(height, 350)}px`,
            cursor: 'crosshair',
            display: 'block',
            touchAction: 'none',
          }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
      </div>

      {/* Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}>
        {/* Brush Size */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(255, 255, 255, 0.05)',
          padding: '8px 16px',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
          <Paintbrush size={16} color="#00F0FF" />
          <input
            type="range"
            min="4"
            max="30"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            style={{
              width: '80px',
              accentColor: '#00F0FF',
            }}
          />
          <span style={{ color: '#c4c0d4', fontSize: '0.8rem', minWidth: '30px' }}>
            {brushSize}px
          </span>
        </div>

        {/* Undo Button */}
        <button
          onClick={handleUndo}
          disabled={history.length <= 1}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: '10px',
            border: '1px solid rgba(255, 153, 51, 0.3)',
            background: 'rgba(255, 153, 51, 0.1)',
            color: '#FF9933',
            cursor: history.length > 1 ? 'pointer' : 'not-allowed',
            opacity: history.length > 1 ? 1 : 0.4,
            fontSize: '0.85rem',
            fontWeight: 600,
            transition: 'all 0.2s',
          }}
        >
          <Undo2 size={16} /> Undo
        </button>

        {/* Clear Button */}
        <button
          onClick={handleClear}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: '10px',
            border: '1px solid rgba(255, 51, 102, 0.3)',
            background: 'rgba(255, 51, 102, 0.1)',
            color: '#FF3366',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 600,
            transition: 'all 0.2s',
          }}
        >
          <Eraser size={16} /> Clear
        </button>
      </div>
    </motion.div>
  );
};

export default DrawingCanvas;
