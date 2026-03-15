import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft, RotateCcw, RotateCw, SlidersHorizontal, Sparkles,
  Scissors, ZoomIn, Wand2, Palette, Crop, ChevronRight, Check, Eye, Upload, Layers, Brush, Eraser
} from "lucide-react";
import Cropper from "react-easy-crop";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { bgRemoverAI } from "../../../services/OnDeviceAI";

const PORTRAIT_URL = "https://images.unsplash.com/photo-1632776088367-d0709928731e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3J0cmFpdCUyMHdvbWFuJTIwZ29sZGVuJTIwaG91ciUyMHBob3RvZ3JhcGh5fGVufDF8fHx8MTc3MjM4NzU4Mnww&ixlib=rb-4.1.0&q=80&w=400";

const adjustments = [
  { id: "brightness", value: 0, min: -100, max: 100 },
  { id: "contrast", value: 0, min: -100, max: 100 },
  { id: "saturation", value: 0, min: -100, max: 100 },
  { id: "sepia", value: 0, min: 0, max: 100 },
  { id: "blur", value: 0, min: 0, max: 20 },
];

const filters = [
  { id: "none", color: null, filter: "" },
  { id: "cinematic", color: "#C9A84C", filter: "sepia(0.2) contrast(1.1) brightness(0.95)" },
  { id: "vivid", color: "#E05656", filter: "saturate(1.5) contrast(1.1)" },
  { id: "matte", color: "#8A8A9E", filter: "contrast(0.9) saturate(0.8) brightness(1.05)" },
  { id: "moody", color: "#4A90D9", filter: "brightness(0.85) contrast(1.2) saturate(0.7)" },
  { id: "warm", color: "#E8A830", filter: "sepia(0.15) saturate(1.2)" },
];

export function EditorScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("ai");
  const [activeAiTool, setActiveAiTool] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState("none");
  const [processing, setProcessing] = useState(false);
  const [applied, setApplied] = useState(false);
  const [sliders, setSliders] = useState<Record<string, number>>({
    brightness: 0,
    contrast: 0,
    saturation: 0,
    sepia: 0,
    blur: 0,
  });
  const [history, setHistory] = useState<string[]>([]);
  const [redoHistory, setRedoHistory] = useState<string[]>([]);
  
  // Image & Crop state
  const [originalImageSrc, setOriginalImageSrc] = useState(PORTRAIT_URL);
  const [currentImageSrc, setCurrentImageSrc] = useState(PORTRAIT_URL);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [showLayers, setShowLayers] = useState(false);

  // Canvas & Drawing state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(20);
  const [brushHardness, setBrushHardness] = useState(0.5);
  const [drawingMode, setDrawingMode] = useState<"brush" | "eraser">("brush");

  // Handle drawing events (touch & mouse)
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (activeTab !== "draw" || !canvasRef.current) return;
    setIsDrawing(true);
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = drawingMode === "eraser" ? "rgba(0,0,0,1)" : "rgba(201, 168, 76, 0.5)";
    ctx.globalCompositeOperation = drawingMode === "eraser" ? "destination-out" : "source-over";
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || activeTab !== "draw" || !canvasRef.current) return;
    e.preventDefault(); // Prevent scrolling while drawing

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.closePath();
  };

  // Sync canvas size with image
  useEffect(() => {
    if (imgRef.current && canvasRef.current) {
      const img = imgRef.current;
      const canvas = canvasRef.current;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
    }
  }, [currentImageSrc]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const tabs = useMemo(() => [
    { id: "ai", icon: Sparkles },
    { id: "adjust", icon: SlidersHorizontal },
    { id: "filters", icon: Palette },
    { id: "crop", icon: Crop },
    { id: "draw", icon: Brush },
  ], []);

  const aiTools = useMemo(() => [
    { id: "enhance", icon: Sparkles, credits: 1, color: "#C9A84C" },
    { id: "bg", icon: Scissors, credits: 2, color: "#E05656" },
    { id: "upscale2", icon: ZoomIn, credits: 2, color: "#4A90D9" },
    { id: "upscale4", icon: ZoomIn, credits: 4, color: "#4A90D9", pro: true },
    { id: "deblur", icon: Wand2, credits: 1, color: "#3DBA8C" },
    { id: "style", icon: Palette, credits: 3, color: "#B07DD9", pro: true },
  ], []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setOriginalImageSrc(url);
      setCurrentImageSrc(url);
      setSliders({ brightness: 0, contrast: 0, saturation: 0, sepia: 0, blur: 0 });
      setHistory([]);
      setRedoHistory([]);
      setApplied(false);
      setActiveFilter("none");
    }
  };

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const getImageStyle = () => {
    if (isCompareMode) return {}; // Return raw style for original image
    
    const filterStyle = filters.find(f => f.id === activeFilter)?.filter || "";
    const adjustmentStyle = `brightness(${100 + sliders.brightness}%) contrast(${100 + sliders.contrast}%) saturate(${100 + sliders.saturation}%) sepia(${sliders.sepia}%) blur(${sliders.blur}px)`;
    
    return {
      filter: `${filterStyle} ${adjustmentStyle}`.trim(),
      transition: "filter 0.2s ease-out",
    };
  };

  const applyAI = async (toolId: string) => {
    if (processing) return;
    
    setProcessing(true);
    setActiveAiTool(toolId);
    
    try {
      if (toolId === "bg") {
        if (imgRef.current) {
          await bgRemoverAI.loadModel();
          // Mock inference delay
          await new Promise(r => setTimeout(r, 2000));
          setHistory((prev) => [...prev, toolId]);
          setRedoHistory([]);
          setApplied(true);
          setTimeout(() => setApplied(false), 2000);
        }
      } else {
        setTimeout(() => {
          setHistory((prev) => [...prev, toolId]);
          setRedoHistory([]);
          setApplied(true);
          setTimeout(() => setApplied(false), 2000);
        }, 2000);
      }
    } catch (error) {
      console.error("AI Processing failed:", error);
    } finally {
      setProcessing(false);
    }
  };

  const handleUndo = () => {
    // Implement undo logic for slider/filter state
  };

  const handleRedo = () => {
    // Implement redo logic
  };

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 44px)", background: "#060608" }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0 z-20 bg-[#060608]/80 backdrop-blur-md">
        <button
          onClick={() => navigate("/home")}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <ArrowLeft size={18} style={{ color: "#F0F0FA" }} />
        </button>
        <span className="text-[15px] font-bold" style={{ color: "#F0F0FA" }}>{t("editor.title")}</span>
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.25)" }}
          >
            <Upload size={16} style={{ color: "#C9A84C" }} />
          </button>
          <button
            onClick={() => setShowLayers(!showLayers)}
            className={`w-9 h-9 rounded-xl flex items-center justify-center border ${showLayers ? 'bg-white/10 border-white/20' : 'bg-transparent border-transparent'}`}
          >
            <Layers size={16} className={showLayers ? "text-[#C9A84C]" : "text-white"} />
          </button>
          <button onClick={handleUndo} className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/5 border border-white/10">
            <RotateCcw size={16} className="text-white" />
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="relative flex-1 bg-[#060608] overflow-hidden flex items-center justify-center">
        {activeTab === "crop" ? (
          <div className="absolute inset-0 z-10">
            <Cropper
              image={currentImageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={4 / 3}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
            />
          </div>
        ) : (
          <TransformWrapper
            initialScale={1}
            minScale={0.5}
            maxScale={4}
            centerOnInit
            disabled={activeTab === "draw"}
          >
            <TransformComponent wrapperClass="w-full h-full" contentClass="w-full h-full flex items-center justify-center">
              <div className="relative inline-block">
                <img
                  ref={imgRef}
                  src={isCompareMode ? originalImageSrc : currentImageSrc}
                  alt="Edit"
                  className="max-w-full max-h-full object-contain pointer-events-none select-none"
                  style={getImageStyle()}
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-auto touch-none"
                  style={{ 
                    display: activeTab === "draw" ? "block" : "none",
                    width: "100%",
                    height: "100%"
                  }}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>
            </TransformComponent>
          </TransformWrapper>
        )}

        {/* Layers Panel (Photoshop-like) */}
        <AnimatePresence>
          {showLayers && (
            <motion.div
              initial={{ x: 200, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 200, opacity: 0 }}
              className="absolute top-4 right-4 w-48 bg-[#1A1A1A] rounded-xl border border-white/10 shadow-2xl z-30 overflow-hidden"
            >
              <div className="p-3 border-b border-white/10 bg-[#222]">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Layers</span>
              </div>
              <div className="p-2 flex flex-col gap-1 max-h-48 overflow-y-auto">
                <div className="flex items-center gap-2 p-2 bg-[#C9A84C]/10 rounded-lg border border-[#C9A84C]/30">
                  <Eye size={12} className="text-[#C9A84C]" />
                  <div className="w-8 h-8 bg-black/50 rounded overflow-hidden">
                    <img src={currentImageSrc} className="w-full h-full object-cover" />
                  </div>
                  <span className="text-xs text-white font-medium">Base Layer</span>
                </div>
                {/* Mock additional layers */}
                <div className="flex items-center gap-2 p-2 hover:bg-white/5 rounded-lg transition-colors opacity-50">
                  <Eye size={12} className="text-white" />
                  <div className="w-8 h-8 bg-white/5 rounded border border-white/10 flex items-center justify-center">
                    <Sparkles size={12} className="text-white/50" />
                  </div>
                  <span className="text-xs text-white/50">Adjustment 1</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Processing Overlay */}
        <AnimatePresence>
          {processing && (
            <motion.div
              className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="w-12 h-12 rounded-full border-2 border-[#C9A84C]/30 border-t-[#C9A84C]"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              />
              <p className="mt-3 text-sm font-medium text-white">{t("editor.processing")}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Compare Button (Hold) */}
        <button
          className="absolute bottom-4 right-4 z-20 px-4 py-2 rounded-full bg-black/60 border border-white/10 backdrop-blur-md flex items-center gap-2 active:scale-95 transition-transform"
          onMouseDown={() => setIsCompareMode(true)}
          onMouseUp={() => setIsCompareMode(false)}
          onTouchStart={() => setIsCompareMode(true)}
          onTouchEnd={() => setIsCompareMode(false)}
        >
          <Eye size={16} className="text-white" />
          <span className="text-xs font-medium text-white">{t("home.quick_actions.compare")}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="px-4 py-2 shrink-0 bg-[#060608] z-20">
        <div className="flex p-1 rounded-xl bg-white/5 border border-white/10 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 min-w-[60px] flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-semibold transition-all"
              style={{
                background: activeTab === tab.id ? "rgba(201,168,76,0.15)" : "transparent",
                color: activeTab === tab.id ? "#C9A84C" : "#6B6B84",
              }}
            >
              <tab.icon size={13} />
              <span className="whitespace-nowrap">{t(`editor.tabs.${tab.id}`) || tab.id}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tool Panel */}
      <div className="flex-1 px-4 py-3 overflow-y-auto bg-[#060608] z-20" style={{ minHeight: "140px", maxHeight: "180px" }}>
        <AnimatePresence mode="wait">
          {activeTab === "ai" && (
            <motion.div
              key="ai"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-2 gap-2.5"
            >
              {aiTools.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => !tool.pro && applyAI(tool.id)}
                  className="relative flex items-center gap-3 p-3 rounded-xl text-left bg-white/5 border border-white/10 active:scale-95 transition-transform"
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${tool.color}18` }}>
                    <tool.icon size={18} style={{ color: tool.color }} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-white">{t(`editor.tools.${tool.id}.label`)}</div>
                    <div className="text-[11px] text-[#6B6B84]">{tool.credits} credits</div>
                  </div>
                </button>
              ))}
            </motion.div>
          )}

          {activeTab === "adjust" && (
            <motion.div
              key="adjust"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-4 px-2"
            >
              {adjustments.map((adj) => (
                <div key={adj.id} className="flex flex-col gap-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-[#A0A0B8] capitalize">{adj.id}</span>
                    <span className="font-bold text-[#C9A84C]">{sliders[adj.id]}</span>
                  </div>
                  <input
                    type="range"
                    min={adj.min}
                    max={adj.max}
                    value={sliders[adj.id]}
                    onChange={(e) => setSliders(prev => ({ ...prev, [adj.id]: Number(e.target.value) }))}
                    className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#C9A84C]"
                  />
                </div>
              ))}
            </motion.div>
          )}

          {activeTab === "filters" && (
            <motion.div
              key="filters"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex gap-3 overflow-x-auto pb-2"
            >
              {filters.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  className="flex flex-col gap-2 items-center shrink-0"
                >
                  <div
                    className="w-16 h-16 rounded-xl overflow-hidden relative border-2 transition-all"
                    style={{
                      borderColor: activeFilter === filter.id ? "#C9A84C" : "transparent",
                    }}
                  >
                    <img
                      src={currentImageSrc}
                      alt={filter.id}
                      className="w-full h-full object-cover"
                      style={{ filter: filter.filter }}
                    />
                  </div>
                  <span className={`text-[10px] font-medium ${activeFilter === filter.id ? "text-[#C9A84C]" : "text-[#8A8A9E]"}`}>
                    {filter.id}
                  </span>
                </button>
              ))}
            </motion.div>
          )}
          
          {activeTab === "crop" && (
            <div className="flex flex-col gap-4">
               <div className="flex justify-between items-center text-xs text-[#A0A0B8]">
                 <span>Rotation: {rotation}°</span>
                 <span>Zoom: {zoom.toFixed(1)}x</span>
               </div>
               <input
                  type="range"
                  min={0}
                  max={360}
                  value={rotation}
                  onChange={(e) => setRotation(Number(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#C9A84C]"
                />
            </div>
          )}
          {activeTab === "draw" && (
            <div className="flex flex-col gap-4 px-2">
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => setDrawingMode("brush")}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold ${drawingMode === "brush" ? "bg-[#C9A84C] text-black" : "bg-white/10 text-white"}`}
                >
                  Brush
                </button>
                <button
                  onClick={() => setDrawingMode("eraser")}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold ${drawingMode === "eraser" ? "bg-[#C9A84C] text-black" : "bg-white/10 text-white"}`}
                >
                  Eraser
                </button>
              </div>
              
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-[#A0A0B8]">Size</span>
                  <span className="font-bold text-[#C9A84C]">{brushSize}px</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#C9A84C]"
                />
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom action bar */}
      <div className="px-4 pb-4 pt-2 shrink-0 border-t border-white/10 bg-[#060608] z-20">
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/home")}
            className="flex-1 py-3.5 rounded-2xl text-[15px] font-semibold bg-white/5 text-white"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={() => navigate("/export")}
            className="flex-1 py-3.5 rounded-2xl flex items-center justify-center gap-2 text-[15px] font-bold bg-gradient-to-br from-[#C9A84C] to-[#E8C97A] text-black shadow-lg shadow-[#C9A84C]/20"
          >
            {t("common.done")}
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
