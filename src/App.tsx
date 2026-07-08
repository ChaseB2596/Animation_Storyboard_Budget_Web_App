/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence, Reorder, useDragControls } from 'motion/react';
import { 
  Sparkles, 
  Plus, 
  Type,
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Download, 
  Calendar, 
  DollarSign, 
  Music, 
  Mic2,
  Layers,
  LayoutList,
  FileDown,
  Info,
  Loader2,
  Image as ImageIcon,
  FolderOpen,
  Edit2,
  Check,
  X,
  Copy,
  Video,
  FileText,
  Save,
  GripVertical,
  Briefcase
} from 'lucide-react';
import { Asset, Project, Scene, AssetStatus, BillingMode } from './types';
import { cn, formatCurrency, calculateSceneTotal, calculateProjectTotal, formatDate } from './lib/utils';
import { generateProjectScope } from './services/aiService';
import { jsPDF } from 'jspdf';
import { toCanvas } from 'html-to-image';
import Papa from 'papaparse';

// Mock Thumbnails (in real app, these would be generated or uploaded)
const MOCK_THUMB = "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=2070&auto=format&fit=crop";

// This build is a public, read-mostly demo: scene artwork, exports, saving,
// and the AI generator are locked so visitors can explore the UI without
// consuming API quota, overwriting the sample data, or leaving the tab in a
// broken state. Nothing here persists — a refresh always returns to
// DEFAULT_PROJECT below.
const DEMO_MODE = true;

const DEMO_SCENE_IMAGES = [
  '/images/scenes/scene-1.jpg',
  '/images/scenes/scene-2.jpg',
  '/images/scenes/scene-3.jpg',
  '/images/scenes/scene-4.jpg',
  '/images/scenes/scene-5.jpg',
];

export const get3DHours = (scene: Scene): number => {
  if (scene.hours3D !== undefined) return scene.hours3D;
  return Math.round(scene.hours * 0.7 * 10) / 10;
};

export const getCompHours = (scene: Scene): number => {
  if (scene.hoursComp !== undefined) return scene.hoursComp;
  return Math.round((scene.hours - get3DHours(scene)) * 10) / 10;
};

const generateDefaultScenes = (): Scene[] => {
  const sceneTemplates = [
    {
      title: 'Intro & Brand Hook',
      description: 'The camera sweeps across a dark landscape. A neon logo flickers to life in the center.',
      textOverlayStyle: 'Lower Thirds',
      textOverlayContent: 'Neon Brand Logo',
      tags: ["Dark", "Logo"],
      cameraMove: "Orbit around the glowing neon core showing depth of landscape",
      shotCount: 3,
      references: [
        { id: 'ref-1', url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=300&auto=format&fit=crop', note: 'Moodboard - futuristic neon' },
        { id: 'ref-2', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=300&auto=format&fit=crop', note: 'Style reference - detailed circuit lines' }
      ]
    },
    {
      title: 'Character Introduction',
      description: 'The hero is revealed standing on a wet street looking up at skyscrapers.',
      textOverlayStyle: 'Minimal Subtitles',
      textOverlayContent: 'Act I: The Descent',
      tags: ["Character", "Sci-Fi"],
      cameraMove: "Tilt up from wet pavement to hero's face, then pull back and pan up to skyline",
      shotCount: 2,
      references: [
        { id: 'ref-3', url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=300&auto=format&fit=crop', note: 'Character back-lighting reference' }
      ]
    },
    {
      title: 'The Chase Sequence',
      description: 'High-speed chase through the narrow neon alleys. Hovercycles weave through traffic.',
      textOverlayStyle: 'None',
      textOverlayContent: '',
      tags: ["Action", "VFX"],
      cameraMove: "Wide tracking shot following the cycles, cutting to tight dynamic close-ups",
      shotCount: 5,
      references: [
        { id: 'ref-4', url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=300&auto=format&fit=crop', note: 'Fast action motion blur ref' }
      ]
    },
    {
      title: 'The Hidden Lab',
      description: 'The characters break into the holographic research lab, activating the central reactor.',
      textOverlayStyle: 'Call-out Labels',
      textOverlayContent: 'System Active - 100%',
      tags: ["Interior", "Holograms"],
      cameraMove: "Circular crane shot rising above the reactor as holograms expand",
      shotCount: 4,
      references: [
        { id: 'ref-5', url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=300&auto=format&fit=crop', note: 'Lab console interfaces' }
      ]
    },
    {
      title: 'Climax & Title Card',
      description: 'An explosion of golden energy forces the screen to whiteout before settling into the final title.',
      textOverlayStyle: 'Title Card',
      textOverlayContent: 'NEON RUNNER',
      tags: ["VFX", "Outro"],
      cameraMove: "Push forward aggressively into the center light, slow transition to static text",
      shotCount: 2,
      references: [
        { id: 'ref-6', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=300&auto=format&fit=crop', note: 'Golden light burst look' }
      ]
    }
  ];

  return sceneTemplates.map((scene, idx) => {
    // Generate random hours: max 20 per scene
    const h3d = Math.floor(Math.random() * 11) + 2; // 2 to 12
    const hComp = Math.floor(Math.random() * 7) + 1; // 1 to 7
    const hours = h3d + hComp;
    return {
      id: `sample-scene-${idx + 1}-${Date.now()}`,
      title: scene.title,
      description: scene.description,
      thumbnailUrl: DEMO_SCENE_IMAGES[idx],
      audioVO: 'Draft Script',
      textOverlayStyle: scene.textOverlayStyle,
      textOverlayContent: scene.textOverlayContent,
      baseSceneCost: hours * 150,
      hours: hours,
      hours3D: h3d,
      hoursComp: hComp,
      assets: idx === 0 ? [
        { id: 'a-1', name: 'Primary Character Design', status: AssetStatus.CREATED, cost: 450 },
        { id: 'a-2', name: 'Environment Megapack', status: AssetStatus.PURCHASED, cost: 99 }
      ] : [],
      tags: scene.tags,
      cameraMove: scene.cameraMove,
      shotCount: scene.shotCount,
      references: scene.references
    };
  });
};

const DEFAULT_PROJECT: Project = {
  id: 'draft-' + Date.now(),
  name: "New Animation Project",
  description: "",
  startDate: new Date().toISOString().split('T')[0],
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  tags: ["3D Animation", "Commercial"],
  resolution: "1920x1080",
  frameRate: "24fps",
  duration: "30s",
  billingMode: BillingMode.HOURLY,
  billingRate: 150,
  billingRateUnit: 'hour',
  revisionsAllowed: 2,
  extendedRevisionPrice: 150,
  platformName: "Google Drive",
  platformLink: "https://drive.google.com",
  paymentMethods: ["Check", "Credit Card", "Wire Transfer"],
  scenes: generateDefaultScenes(),
  milestones: [
    { name: "Project Start", date: new Date().toISOString().split('T')[0] },
    { name: "Final Delivery", date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] }
  ]
};

export default function App() {
  const [project, setProject] = useState<Project>(DEFAULT_PROJECT);
  const [projects, setProjects] = useState<Project[]>([]);
  const [viewMode, setViewMode] = useState<'edit' | 'view'>('edit');
  const [isPromptExpanded, setIsPromptExpanded] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("");
  const [expandedScenes, setExpandedScenes] = useState<Record<string, boolean>>({});
  const [expandedReferences, setExpandedReferences] = useState<Record<string, boolean>>({});
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);
  const [confirmingDeleteSceneId, setConfirmingDeleteSceneId] = useState<string | null>(null);
  const [viewingProjects, setViewingProjects] = useState(false);
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [isEditingRevisions, setIsEditingRevisions] = useState(false);
  const [isEditingPlatform, setIsEditingPlatform] = useState(false);
  const [isEditingPayment, setIsEditingPayment] = useState(false);
  const [newTag, setNewTag] = useState("");

  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [isGlobalAssetsOpen, setIsGlobalAssetsOpen] = useState(false);

  const total3DHours = useMemo(() => {
    const raw = (project.scenes || []).reduce((sum, scene) => sum + get3DHours(scene), 0);
    return Math.round(raw * 10) / 10;
  }, [project.scenes]);

  const totalCompHours = useMemo(() => {
    const raw = (project.scenes || []).reduce((sum, scene) => sum + getCompHours(scene), 0);
    return Math.round(raw * 10) / 10;
  }, [project.scenes]);

  // Auto-save logic (local storage simulation)
  useEffect(() => {
    if (DEMO_MODE) return; // Demo never reads persisted state — always starts fresh.
    try {
      const saved = localStorage.getItem('aniscope_projects');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setProjects(parsed);
      }
    } catch (e) {
      console.error("Failed to load projects:", e);
    }
  }, []);

  // Save projects when they change
  useEffect(() => {
    if (DEMO_MODE) return; // Demo never persists changes to disk.
    if (projects.length > 0) {
      try {
        localStorage.setItem('aniscope_projects', JSON.stringify(projects));
      } catch (e) {
        console.error("Failed to save projects to localStorage:", e);
        if (e instanceof Error && e.name === 'QuotaExceededError') {
          // Handle quota exceeded
          console.warn("Storage quota exceeded. Some data might not be saved.");
        }
      }
    }
  }, [projects]);

  const deleteProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    if (project?.id === id) setProject(DEFAULT_PROJECT);
  };

  const duplicateProject = (proj: Project) => {
    const newProject = {
      ...proj,
      id: Math.random().toString(36).substr(2, 9),
      name: `${proj.name} (Copy)`,
      updatedAt: new Date().toISOString()
    };
    setProjects(prev => [...prev, newProject]);
  };

  const saveProject = (proj: Project) => {
    setProjects(prev => {
      const exists = prev.find(p => p.id === proj.id);
      return exists ? prev.map(p => p.id === proj.id ? proj : p) : [...prev, proj];
    });
  };

  const handleGenerate = async () => {
    if (DEMO_MODE) return; // AI generation is disabled in the public demo.
    if (!prompt.trim()) return;
    setIsGenerating(true);
    try {
      const generated = await generateProjectScope(prompt, style);
      
      const newProject: Project = {
        id: Math.random().toString(36).substr(2, 9),
        name: generated.name || "New 3D Animation Project",
        description: generated.description || prompt,
        startDate: generated.startDate || new Date().toISOString().split('T')[0],
        endDate: generated.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        scenes: (generated.scenes || []).map((s: any, idx: number) => {
          const totalHours = s.hours || 10;
          const h3d = Math.round(totalHours * 0.7 * 10) / 10;
          const hComp = Math.round((totalHours - h3d) * 10) / 10;
          return {
            ...s,
            id: `scene-${idx}-${Date.now()}`,
            thumbnailUrl: undefined, 
            audioVO: "Voiceover Required",
            textOverlayStyle: s.textOverlayStyle || "None",
            textOverlayContent: s.textOverlayContent || "",
            hours: totalHours,
            hours3D: h3d,
            hoursComp: hComp,
            tags: s.tags || [],
            cameraMove: s.cameraMove || s.cameraMovement || "Orbit panning around subject",
            shotCount: s.shotCount || 2,
            references: s.references || [],
            assets: (s.assets || []).map((a: any, aidx: number) => ({
              ...a,
              id: `asset-${aidx}-${Date.now()}`
            }))
          };
        }),
        tags: ["AI Generated"],
        resolution: "1920x1080",
        frameRate: "24fps",
        duration: "30s",
        billingMode: BillingMode.HOURLY,
        billingRate: generated.billingRate || 150,
        billingRateUnit: 'hour',
        revisionsAllowed: generated.revisionsAllowed || 2,
        extendedRevisionPrice: generated.extendedRevisionPrice || 150,
        platformName: generated.platformName || "Google Drive",
        platformLink: generated.platformLink || "https://drive.google.com",
        paymentMethods: generated.paymentMethods || ["Check", "Credit Card"],
        milestones: generated.milestones || []
      };
      
      setProject(newProject);
      saveProject(newProject);
      setViewingProjects(false);
    } catch (error) {
      alert("Failed to generate project scope. Check console for details.");
    } finally {
      setIsGenerating(false);
    }
  };

  const duplicateScene = (sceneId: string) => {
    const sceneToCopy = project.scenes.find(s => s.id === sceneId);
    if (!sceneToCopy) return;

    const newScene: Scene = {
      ...sceneToCopy,
      id: `scene-copy-${Date.now()}`,
      assets: sceneToCopy.assets.map(a => ({ ...a, id: `asset-copy-${Math.random().toString(36).substr(2, 9)}` }))
    };

    const newProject = {
      ...project,
      scenes: [...project.scenes, newScene]
    };
    setProject(newProject);
    saveProject(newProject);
  };

  const deleteScene = (sceneId: string) => {
    const newProject = {
      ...project,
      scenes: project.scenes.filter(s => s.id !== sceneId)
    };
    setProject(newProject);
    saveProject(newProject);
    setConfirmingDeleteSceneId(null);
  };

  const updateProject = (updates: Partial<Project>) => {
    let newProject = { ...project, ...updates };
    
    // Sync milestones if dates change
    if (updates.startDate || updates.endDate) {
      newProject.milestones = [
        { name: "Project Start", date: newProject.startDate },
        { name: "Final Delivery", date: newProject.endDate }
      ];
    }

    setProject(newProject);
    saveProject(newProject);
  };

  const updateScene = (sceneId: string, updates: Partial<Scene>) => {
    const newProject = {
      ...project,
      scenes: project.scenes.map(s => s.id === sceneId ? { ...s, ...updates } : s)
    };
    setProject(newProject);
    saveProject(newProject);
  };

  const updateAsset = (sceneId: string, assetId: string, updates: Partial<Asset>) => {
    const newProject = {
      ...project,
      scenes: project.scenes.map(scene => {
        if (scene.id !== sceneId) return scene;
        return {
          ...scene,
          assets: scene.assets.map(asset => 
            asset.id === assetId ? { ...asset, ...updates } : asset
          )
        };
      })
    };
    setProject(newProject);
    saveProject(newProject);
  };

  const addAsset = (sceneId: string, status: AssetStatus) => {
    const newAsset: Asset = {
      id: Math.random().toString(36).substr(2, 9),
      name: "New Asset",
      status,
      cost: 0,
      description: ""
    };
    const newProject = {
      ...project,
      scenes: project.scenes.map(scene => 
        scene.id === sceneId ? { ...scene, assets: [...scene.assets, newAsset] } : scene
      )
    };
    setProject(newProject);
    saveProject(newProject);
  };

  const removeAsset = (sceneId: string, assetId: string) => {
    const newProject = {
      ...project,
      scenes: project.scenes.map(scene => 
        scene.id === sceneId ? { ...scene, assets: scene.assets.filter(a => a.id !== assetId) } : scene
      )
    };
    setProject(newProject);
    saveProject(newProject);
  };

  const toggleSceneExpand = (sceneId: string) => {
    setExpandedScenes(prev => ({ ...prev, [sceneId]: !prev[sceneId] }));
  };

  const toggleReferencesExpand = (sceneId: string) => {
    setExpandedReferences(prev => ({ ...prev, [sceneId]: !prev[sceneId] }));
  };

  const addReference = (sceneId: string) => {
    const newRef = {
      id: `ref-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      url: 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=300&auto=format&fit=crop',
      note: 'Reference clip / note'
    };
    const newProject = {
      ...project,
      scenes: project.scenes.map(scene => 
        scene.id === sceneId ? { ...scene, references: [...(scene.references || []), newRef] } : scene
      )
    };
    setProject(newProject);
    saveProject(newProject);
  };

  const updateReference = (sceneId: string, refId: string, updates: Partial<{ url: string; note: string }>) => {
    const newProject = {
      ...project,
      scenes: project.scenes.map(scene => {
        if (scene.id !== sceneId) return scene;
        return {
          ...scene,
          references: (scene.references || []).map(ref => 
            ref.id === refId ? { ...ref, ...updates } : ref
          )
        };
      })
    };
    setProject(newProject);
    saveProject(newProject);
  };

  const removeReference = (sceneId: string, refId: string) => {
    const newProject = {
      ...project,
      scenes: project.scenes.map(scene => {
        if (scene.id !== sceneId) return scene;
        return {
          ...scene,
          references: (scene.references || []).filter(ref => ref.id !== refId)
        };
      })
    };
    setProject(newProject);
    saveProject(newProject);
  };

  const [isExporting, setIsExporting] = useState(false);
  const projectRef = useRef<HTMLDivElement>(null);

  const exportPDF = async () => {
    if (!project) return;
    
    setIsExporting(true);
    const originalMode = viewMode;
    setViewMode('view');
    
    // Wait for state update and re-render to view mode
    setTimeout(async () => {
      try {
        const sections = document.querySelectorAll('[data-export-section]');
        if (!sections.length) {
          console.error("No sections found for export");
          return;
        }

        // Force letter size: 8.5 x 11 inches = 215.9 x 279.4 mm
        const pdf = new jsPDF('p', 'mm', 'letter');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 15; 
        const innerWidth = pageWidth - (margin * 2);
        let currentY = margin;

        for (let i = 0; i < sections.length; i++) {
          const section = sections[i] as HTMLElement;
          
          // html-to-image is more robust for modern CSS colors (oklch)
          const canvas = await toCanvas(section, {
            backgroundColor: '#ffffff',
            pixelRatio: 2, // High resolution
            cacheBust: true,
          });
          
          const imgData = canvas.toDataURL('image/jpeg', 0.9);
          const imgWidth = innerWidth;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          // Check if section fits on current page. 
          if (currentY + imgHeight > pageHeight - margin && i > 0) {
            pdf.addPage();
            currentY = margin;
          }

          pdf.addImage(imgData, 'JPEG', margin, currentY, imgWidth, imgHeight);
          currentY += imgHeight + 6; 
        }

        const fileName = `${project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_proposal.pdf`;
        pdf.save(fileName);
      } catch (err) {
        console.error("PDF Export failed:", err);
      } finally {
        setViewMode(originalMode);
        setIsExporting(false);
      }
    }, 1500);
  };

  const exportCSV = () => {
    if (!project) return;
    const rows = project.scenes.flatMap(s => 
      s.assets.map(a => ({
        Scene: s.title,
        AssetName: a.name,
        Status: a.status,
        Cost: a.cost
      }))
    );
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `${project.name}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="flex min-h-screen bg-[#FDFCFB] text-slate-900 font-sans selection:bg-blue-100">
      {/* Sidebar */}
      <aside className="w-16 md:w-20 bg-white border-r border-slate-200 flex flex-col items-center py-8 gap-8 shrink-0">
        <button 
          onClick={() => {
            setProject({...DEFAULT_PROJECT, id: 'draft-' + Date.now()});
            setViewingProjects(false);
            setPrompt("");
          }}
          className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95 group relative"
          title="New Budget Proposal"
        >
          <Plus size={24} />
          <div className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[100]">
            New Proposal
          </div>
        </button>

        <div className="flex-1 flex flex-col gap-6">
          <button 
            onClick={() => setViewingProjects(!viewingProjects)}
            className={cn(
              "w-12 h-12 rounded-2xl flex flex-col items-center justify-center transition-all group relative",
              viewingProjects ? "bg-blue-50 text-blue-600" : "text-slate-400 hover:bg-slate-50 hover:text-blue-600"
            )}
          >
            <FolderOpen size={20} />
            <span className="text-[9px] font-bold mt-1 uppercase tracking-tighter">Projects</span>
            <div className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[100]">
              All Projects
            </div>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="bg-white/40 backdrop-blur-xl border-b border-slate-200/50 shrink-0 sticky top-0 z-[60]">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <LayoutList className="text-white w-5 h-5" />
                </div>
                <h1 className="text-xl font-display font-bold tracking-tight">AnimationScope</h1>
                {DEMO_MODE && (
                  <span
                    className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold uppercase tracking-widest"
                    title="Exports, saving, image uploads, and AI generation are disabled. Nothing you edit here is saved — refresh to reset."
                  >
                    Demo
                  </span>
                )}
              </div>

              {/* View/Edit Toggle */}
              <div className="flex bg-slate-100 p-1 rounded-full border border-slate-200 shadow-inner">
                <button 
                  onClick={() => setViewMode('edit')}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all",
                    viewMode === 'edit' ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  Edit
                </button>
                <button 
                  onClick={() => setViewMode('view')}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all",
                    viewMode === 'view' ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  View
                </button>
              </div>
            </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    if (DEMO_MODE) return;
                    saveProject(project);
                  }}
                  disabled={DEMO_MODE}
                  title={DEMO_MODE ? "Saving is disabled in this demo — changes reset on reload" : undefined}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-blue-600 disabled:active:scale-100"
                >
                  <Save size={18} />
                  Save Project
                </button>
              </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto pb-32">
          <div ref={projectRef} data-capture-area="true" className="w-full">
            <main className="max-w-7xl mx-auto px-6 py-12 space-y-12">
            {viewingProjects ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-display font-bold">Your Projects</h2>
                  <button onClick={() => setViewingProjects(false)} className="text-sm font-bold text-blue-600 hover:underline">Back to Editor</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {projects.length === 0 ? (
                    <div className="col-span-full py-20 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
                      No saved projects yet.
                    </div>
                  ) : (
                    projects.map(p => (
                      <div 
                        key={p.id} 
                        className="group bg-white border border-slate-200 p-0 rounded-2xl text-left hover:border-blue-400 hover:shadow-lg transition-all relative overflow-hidden flex flex-col"
                      >
                        {/* Delete Confirmation Overlay */}
                        <AnimatePresence>
                          {isDeletingId === p.id && (
                            <motion.div 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="absolute inset-0 z-10 bg-slate-900/90 flex flex-col items-center justify-center p-6 text-center"
                            >
                              <p className="text-white text-sm font-medium mb-4">Are you sure you want to delete this project?</p>
                              <div className="flex gap-3">
                                <button 
                                  onClick={() => setIsDeletingId(null)}
                                  className="px-3 py-1.5 bg-slate-700 text-white rounded-lg text-xs font-bold hover:bg-slate-600 transition-colors"
                                >
                                  Cancel
                                </button>
                                <button 
                                  onClick={() => {
                                    deleteProject(p.id);
                                    setIsDeletingId(null);
                                  }}
                                  className="px-3 py-1.5 bg-rose-500 text-white rounded-lg text-xs font-bold hover:bg-rose-600 transition-colors"
                                >
                                  Delete
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div 
                          className="p-6 cursor-pointer flex-1"
                          onClick={() => {
                            setProject(p);
                            setViewingProjects(false);
                          }}
                        >
                          <div className="flex justify-between items-start mb-4">
                            <h4 className="font-bold text-lg group-hover:text-blue-600 transition-colors">{p.name}</h4>
                          </div>
                          <p className="text-sm text-slate-500 line-clamp-2 mb-4">{p.description}</p>
                          <div className="flex justify-between items-center text-xs font-bold text-slate-400 mt-auto">
                            <span>{p.scenes?.length || 0} Scenes</span>
                            <span className="text-emerald-600">{formatCurrency(calculateProjectTotal(p))}</span>
                          </div>
                        </div>

                        {/* Action Buttons (Bottom Bar) */}
                        <div className="border-t border-slate-50 bg-slate-50/50 p-2 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => duplicateProject(p)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-all"
                            title="Duplicate Project"
                          >
                            <Copy size={16} />
                          </button>
                          <button 
                            onClick={() => setIsDeletingId(p.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-100 rounded-lg transition-all"
                            title="Delete Project"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            ) : (
              <>
                {/* Prompt Section */}
                {viewMode === 'edit' && (
                  <section className="max-w-4xl mx-auto space-y-4">
                    {/* Billing Mode Toggle Section - Integrated Above Prompt */}
                    {project && (
                      <div className="flex items-center justify-center">
                        <div className="flex items-center gap-4 bg-white px-5 py-2.5 rounded-2xl shadow-sm border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Billing Model</span>
                          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                            <button 
                              onClick={() => updateProject({ billingMode: BillingMode.QUOTE })}
                              className={cn(
                                "px-4 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all",
                                project.billingMode === BillingMode.QUOTE ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                              )}
                            >
                              Fixed Quote
                            </button>
                            <button 
                              onClick={() => updateProject({ billingMode: BillingMode.HOURLY })}
                              className={cn(
                                "px-4 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all",
                                project.billingMode === BillingMode.HOURLY ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                              )}
                            >
                              Billing Rate
                            </button>
                          </div>
                          
                          {project.billingMode === BillingMode.HOURLY && (
                            <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
                              <span className="text-[10px] font-bold text-slate-400 uppercase">Rate</span>
                              <div className="flex items-center gap-1">
                                <span className="text-xs font-bold text-slate-700">$</span>
                                <input 
                                  type="number"
                                  className="w-16 bg-transparent border-b border-blue-400 focus:outline-none text-xs font-bold text-slate-700 h-5"
                                  value={project.billingRate}
                                  onChange={(e) => updateProject({ billingRate: Number(e.target.value) })}
                                />
                                <select 
                                  className="text-[10px] font-bold text-slate-400 bg-transparent border-none p-0 focus:ring-0"
                                  value={project.billingRateUnit}
                                  onChange={(e) => updateProject({ billingRateUnit: e.target.value as 'hour' | 'day' })}
                                >
                                  <option value="hour">/hr</option>
                                  <option value="day">/day</option>
                                </select>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="relative group">
                      <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl blur opacity-10 group-hover:opacity-25 transition duration-1000"></div>
                      <div className="relative bg-white border border-slate-200 rounded-xl shadow-xl shadow-blue-500/5 overflow-hidden">
                        {/* Collapsible Header */}
                        <div 
                          onClick={() => setIsPromptExpanded(!isPromptExpanded)}
                          className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors border-b border-slate-100"
                        >
                          <div className="flex items-center gap-3">
                            <Sparkles size={16} className="text-blue-500" />
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">AI Project Scoping</span>
                          </div>
                          <div className="text-slate-400">
                            {isPromptExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </div>
                        </div>

                        <AnimatePresence>
                          {isPromptExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="p-4">
                                <textarea 
                                  value={prompt}
                                  onChange={(e) => setPrompt(e.target.value)}
                                  placeholder="E.g., A 30-second cinematic product reveal for a futuristic sneaker..."
                                  className="w-full h-24 resize-none border-none focus:ring-0 text-slate-700 placeholder:text-slate-300 text-lg leading-relaxed mb-4 overflow-hidden hover:overflow-y-auto"
                                />
                                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                  <div className="flex flex-wrap items-center gap-4">
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-200 text-xs font-medium text-slate-600">
                                      <ImageIcon size={14} className="text-slate-400" />
                                      <span className="cursor-pointer hover:text-blue-600">Reference Images</span>
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-200 text-xs font-medium text-slate-600">
                                      <Video size={14} className="text-slate-400" />
                                      <span className="cursor-pointer hover:text-blue-600">Import Video Transcript</span>
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-200 text-xs font-medium text-slate-600">
                                      <FileDown size={14} className="text-slate-400" />
                                      <span className="cursor-pointer hover:text-blue-600">Import CSV</span>
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-200 text-xs font-medium text-slate-600">
                                      <FileText size={14} className="text-slate-400" />
                                      <span className="cursor-pointer hover:text-blue-600">Import Document</span>
                                    </div>
                                  </div>
                                  <button
                                    onClick={handleGenerate}
                                    disabled={DEMO_MODE || isGenerating || !prompt}
                                    title={DEMO_MODE ? "AI generation is disabled in this demo — try editing scenes directly instead" : undefined}
                                    className="flex items-center gap-2 px-4 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all text-xs font-bold active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-slate-900 shadow-lg shadow-slate-900/10 uppercase tracking-widest"
                                  >
                                    {isGenerating ? (
                                      <Loader2 className="animate-spin" size={14} />
                                    ) : (
                                      <Sparkles size={14} className="text-blue-400" />
                                    )}
                                    {isGenerating ? "Analyzing..." : DEMO_MODE ? "Disabled in Demo" : "Generate"}
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </section>
                )}

                <AnimatePresence mode="wait">
                  <motion.div 
                    key="project"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-12"
                  >
                    {/* Project Title Area */}
                    <div data-export-section="header" className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-slate-200 relative group/project">
                      <div className="space-y-6 flex-1">
                        <div className="space-y-1">
                          {isEditingProject ? (
                            <input 
                              className="text-5xl font-display font-bold tracking-tight text-slate-900 border-b-2 border-blue-600 focus:outline-none bg-transparent w-full"
                              value={project.name}
                              onChange={(e) => updateProject({ name: e.target.value })}
                            />
                          ) : (
                            <h2 className="text-5xl font-display font-bold tracking-tight text-slate-900">{project.name}</h2>
                          )}
                        </div>

                        {/* Tags Rendering - Moved Up */}
                        <div className="flex flex-wrap gap-2">
                          {project.tags.map(tag => (
                            <span key={tag} className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                              {tag}
                              {isEditingProject && (
                                <button 
                                  onClick={() => updateProject({ tags: project.tags.filter(t => t !== tag) })}
                                  className="hover:text-blue-800"
                                >
                                  <X size={10} />
                                </button>
                              )}
                            </span>
                          ))}
                          {isEditingProject && (
                            <div className="flex items-center gap-1">
                              <input 
                                className="text-[10px] font-bold border-b border-slate-200 focus:border-blue-400 focus:outline-none w-20 px-1"
                                placeholder="Add Tag..."
                                value={newTag}
                                onChange={(e) => setNewTag(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && newTag.trim()) {
                                    updateProject({ tags: [...project.tags, newTag.trim()] });
                                    setNewTag("");
                                  }
                                }}
                              />
                            </div>
                          )}
                        </div>

                        <div className="w-full">
                          {isEditingProject ? (
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Project Description</span>
                              <textarea 
                                className="w-full text-slate-600 text-sm leading-relaxed border border-slate-200 rounded-lg p-3 bg-white focus:outline-none focus:border-blue-500 transition-colors"
                                rows={2}
                                value={project.description || ""}
                                onChange={(e) => updateProject({ description: e.target.value })}
                                placeholder="Add a description for this animation project..."
                              />
                            </div>
                          ) : (
                            project.description ? (
                              <p className="text-slate-500 max-w-2xl text-lg leading-relaxed">
                                {project.description}
                              </p>
                            ) : (
                              <p className="text-slate-400 italic text-sm">
                                No project description provided. Click "Edit" to add one.
                              </p>
                            )
                          )}
                        </div>

                        {/* Moved Spec Row & Timeline Row Under Description to align with Investment */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-y-4 gap-x-8 pt-4">
                           <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Resolution</span>
                              {isEditingProject ? (
                                <input 
                                  className="font-semibold text-slate-700 bg-transparent border-b border-blue-400 focus:outline-none w-24"
                                  value={project.resolution}
                                  onChange={(e) => updateProject({ resolution: e.target.value })}
                                />
                              ) : (
                                <span className="font-semibold text-slate-700">{project.resolution}</span>
                              )}
                           </div>
                           <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Frame Rate</span>
                              {isEditingProject ? (
                                <input 
                                  className="font-semibold text-slate-700 bg-transparent border-b border-blue-400 focus:outline-none w-16"
                                  value={project.frameRate}
                                  onChange={(e) => updateProject({ frameRate: e.target.value })}
                                />
                              ) : (
                                <span className="font-semibold text-slate-700">{project.frameRate}</span>
                              )}
                           </div>
                           <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Duration</span>
                              {isEditingProject ? (
                                <input 
                                  className="font-semibold text-slate-700 bg-transparent border-b border-blue-400 focus:outline-none w-16"
                                  value={project.duration}
                                  onChange={(e) => updateProject({ duration: e.target.value })}
                                />
                              ) : (
                                <span className="font-semibold text-slate-700">{project.duration}</span>
                              )}
                           </div>
                           <div className="flex flex-col">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Timeline Start</span>
                              {isEditingProject && (
                                <button 
                                  onClick={() => updateProject({ startDate: project.startDate === 'N/A' ? '' : 'N/A' })}
                                  className={cn(
                                    "text-[9px] font-bold px-1.5 py-0.5 rounded transition-colors",
                                    project.startDate === 'N/A' ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                                  )}
                                >
                                  N/A
                                </button>
                              )}
                            </div>
                            {isEditingProject ? (
                              project.startDate === 'N/A' ? (
                                <div className="font-semibold text-slate-400 h-6 flex items-center italic text-sm">None specified</div>
                              ) : (
                                <input 
                                  type="date"
                                  className="font-semibold text-slate-700 bg-transparent border-b border-blue-400 focus:outline-none"
                                  value={project.startDate}
                                  onChange={(e) => updateProject({ startDate: e.target.value })}
                                />
                              )
                            ) : (
                              <span className="font-semibold text-slate-700">{formatDate(project.startDate)}</span>
                            )}
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">End Date</span>
                              {isEditingProject && (
                                <button 
                                  onClick={() => updateProject({ endDate: project.endDate === 'N/A' ? '' : 'N/A' })}
                                  className={cn(
                                    "text-[9px] font-bold px-1.5 py-0.5 rounded transition-colors",
                                    project.endDate === 'N/A' ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                                  )}
                                >
                                  N/A
                                </button>
                              )}
                            </div>
                            {isEditingProject ? (
                              project.endDate === 'N/A' ? (
                                <div className="font-semibold text-slate-400 h-6 flex items-center italic text-sm">None specified</div>
                              ) : (
                                <input 
                                  type="date"
                                  className="font-semibold text-slate-700 bg-transparent border-b border-blue-400 focus:outline-none"
                                  value={project.endDate}
                                  onChange={(e) => updateProject({ endDate: e.target.value })}
                                />
                              )
                            ) : (
                              <span className="font-semibold text-slate-700">{formatDate(project.endDate)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6 text-sm relative">
                        {viewMode === 'edit' && (
                          <button 
                            onClick={() => setIsEditingProject(!isEditingProject)}
                            className="absolute -top-10 right-0 px-3 py-1.5 text-slate-400 hover:text-blue-600 transition-colors flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest bg-white rounded-md shadow-sm border border-slate-100"
                          >
                            {isEditingProject ? <Check size={12} /> : <Edit2 size={12} />}
                            {isEditingProject ? 'Done' : 'Edit'}
                          </button>
                        )}

                        <div className="h-10 w-px bg-slate-200 hidden md:block"></div>
                        <div className="flex flex-col text-right">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Estimated Investment</span>
                          <span className="text-2xl font-display font-bold text-slate-900">{formatCurrency(calculateProjectTotal(project))}</span>
                        </div>

                        {project.billingMode === BillingMode.HOURLY && (
                          <>
                            <div className="h-10 w-px bg-slate-200 hidden md:block"></div>
                            <div className="flex flex-col text-right">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Project Hours</span>
                              <div className="flex flex-col items-end">
                                <div className="flex items-center gap-1.5 leading-tight">
                                  <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wide">3D:</span>
                                  <span className="text-sm font-display font-bold text-blue-600">{total3DHours} hrs</span>
                                </div>
                                <div className="flex items-center gap-1.5 leading-tight mt-0.5">
                                  <span className="text-[10px] font-bold text-purple-500 uppercase tracking-wide">Comp:</span>
                                  <span className="text-sm font-display font-bold text-purple-600">{totalCompHours} hrs</span>
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Scenes Header */}
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-4 relative">
                       <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{project.scenes.length} Scenes in Project</span>
                       
                      {/* Global Assets Breakdown Dropdown */}
                      {(() => {
                        const globalAssets = (project.scenes || []).flatMap(scene => 
                          (scene.assets || []).map(asset => ({
                            ...asset,
                            sceneTitle: scene.title
                          }))
                        );

                        const assetsByStatus = Object.values(AssetStatus).reduce((acc, status) => {
                          const filtered = globalAssets.filter(a => a.status === status);
                          const totalCost = filtered.reduce((sum, a) => sum + (a.cost || 0), 0);
                          acc[status] = {
                            assets: filtered,
                            count: filtered.length,
                            totalCost
                          };
                          return acc;
                        }, {} as Record<AssetStatus, { assets: typeof globalAssets; count: number; totalCost: number }>);

                        return (
                          <div className="relative">
                            <button 
                              onClick={() => setIsGlobalAssetsOpen(!isGlobalAssetsOpen)}
                              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-xs font-bold text-slate-600 shadow-sm"
                            >
                              <Briefcase size={14} className="text-blue-500" />
                              <span>Global Assets</span>
                              <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[9px] font-bold">
                                {globalAssets.length}
                              </span>
                              <ChevronDown size={14} className={cn("text-slate-400 transition-transform", isGlobalAssetsOpen && "rotate-180")} />
                            </button>

                            <AnimatePresence>
                              {isGlobalAssetsOpen && (
                                <>
                                  {/* Backdrop to close */}
                                  <div className="fixed inset-0 z-40" onClick={() => setIsGlobalAssetsOpen(false)} />
                                  <motion.div 
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 8 }}
                                    className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-4 space-y-4 text-left"
                                  >
                                    <div className="border-b border-slate-100 pb-2">
                                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Project Assets Summary</h4>
                                      <p className="text-[10px] text-slate-400 mt-0.5">Aggregated from all {project.scenes.length} scenes</p>
                                    </div>

                                    <div className="space-y-3 font-sans">
                                      {(Object.values(AssetStatus) as AssetStatus[]).map(status => {
                                        const data = assetsByStatus[status];
                                        const colorClass = 
                                          status === AssetStatus.PURCHASED ? "bg-rose-500" :
                                          status === AssetStatus.PROVIDED ? "bg-blue-900" :
                                          status === AssetStatus.EXISTING ? "bg-emerald-500" : "bg-blue-400";
                                        const label = 
                                          status === AssetStatus.PURCHASED ? "To Be Purchased" :
                                          status === AssetStatus.PROVIDED ? "To Be Provided" :
                                          status === AssetStatus.CREATED ? "To Be Created" : "Existing";

                                        return (
                                          <div key={status} className="space-y-1">
                                            <div className="flex items-center justify-between text-[11px] font-semibold">
                                              <div className="flex items-center gap-1.5 text-slate-700">
                                                <div className={cn("w-1.5 h-1.5 rounded-full", colorClass)}></div>
                                                <span>{label}</span>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <span className="text-slate-400 font-normal">{data.count} items</span>
                                                {data.totalCost > 0 && (
                                                  <span className="text-emerald-600 font-bold">{formatCurrency(data.totalCost)}</span>
                                                )}
                                              </div>
                                            </div>
                                            {data.count > 0 && (
                                              <div className="max-h-24 overflow-y-auto pl-3 space-y-1 text-[10px] text-slate-500 border-l border-slate-100">
                                                {data.assets.map(asset => (
                                                  <div key={asset.id} className="flex justify-between items-center py-0.5">
                                                    <span className="line-clamp-1 flex-1 pr-2" title={asset.name}>
                                                      {asset.name} <span className="text-[9px] text-slate-400">({asset.sceneTitle})</span>
                                                    </span>
                                                    {asset.cost > 0 && <span className="text-emerald-600 font-medium">{formatCurrency(asset.cost)}</span>}
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>

                                    {globalAssets.length > 0 && (
                                      <div className="border-t border-slate-100 pt-3 flex justify-between items-center text-xs font-bold text-slate-700">
                                        <span>Total Assets Cost</span>
                                        <span className="text-emerald-600">
                                          {formatCurrency(globalAssets.reduce((sum, a) => sum + (a.cost || 0), 0))}
                                        </span>
                                      </div>
                                    )}
                                  </motion.div>
                                </>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Scenes List */}
                    <Reorder.Group 
                      axis="y" 
                      values={project.scenes} 
                      onReorder={(newScenes) => updateProject({ scenes: newScenes })}
                      className="space-y-6"
                    >
                      {project.scenes.map((scene, sceneIdx) => (
                        <Reorder.Item 
                          key={scene.id} 
                          value={scene}
                          drag={viewMode === 'edit'}
                          data-export-section="scene"
                          className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden transition-shadow hover:shadow-md relative"
                        >
                          {/* Scene Indicator & Drag Handle (Left) */}
                          <div className={cn("absolute left-0 top-0 w-8 flex flex-col items-center pt-6 gap-4 z-20 transition-all", viewMode === 'edit' ? "h-32" : "h-16")}>
                            {/* Scene Number */}
                            <div className="text-sm font-bold text-slate-900 select-none">
                              {sceneIdx + 1}
                            </div>
                            
                            {/* Shortened Drag Handle */}
                            {viewMode === 'edit' && (
                              <div className="flex-1 flex items-center justify-center text-slate-300 hover:text-blue-400 cursor-grab active:cursor-grabbing">
                                <GripVertical size={16} />
                              </div>
                            )}
                          </div>

                          {/* Scene Action Buttons */}
                          {viewMode === 'edit' && (
                            <div className="absolute top-4 right-4 flex items-center gap-1 z-20">
                              <button 
                                onClick={() => setEditingSceneId(editingSceneId === scene.id ? null : scene.id)}
                                className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                                title="Edit Scene"
                              >
                                {editingSceneId === scene.id ? <Check size={18} /> : <Edit2 size={18} />}
                              </button>
                              <button 
                                onClick={() => duplicateScene(scene.id)}
                                className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                                title="Duplicate Scene"
                              >
                                <Copy size={18} />
                              </button>
                              <button 
                                onClick={() => setConfirmingDeleteSceneId(scene.id)}
                                className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                                title="Delete Scene"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          )}

                          {/* Delete Confirmation Overlay */}
                          <AnimatePresence>
                            {confirmingDeleteSceneId === scene.id && (
                              <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 z-30 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center space-y-4"
                              >
                                <div className="p-3 bg-rose-50 text-rose-600 rounded-full">
                                  <Trash2 size={32} />
                                </div>
                                <div className="space-y-1">
                                  <h3 className="font-bold text-lg text-slate-900">Delete Scene?</h3>
                                  <p className="text-sm text-slate-500">This action cannot be undone. Are you sure?</p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <button 
                                    onClick={() => setConfirmingDeleteSceneId(null)}
                                    className="px-6 py-2 rounded-full border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                  <button 
                                    onClick={() => deleteScene(scene.id)}
                                    className="px-6 py-2 rounded-full bg-rose-600 text-white text-sm font-bold hover:bg-rose-700 transition-colors shadow-lg shadow-rose-600/20"
                                  >
                                    Confirm Delete
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          <div className={cn("p-6 flex flex-col lg:flex-row items-stretch gap-8", viewMode === 'edit' ? "pl-14" : "pl-6")}>
                            {/* Left: Blank Thumbnail & Title */}
                            <div className="w-full lg:w-72 shrink-0 space-y-3">
                              <div className="aspect-video bg-slate-50 rounded-lg overflow-hidden border border-slate-100 shadow-inner group relative flex items-center justify-center">
                                {scene.thumbnailUrl ? (
                                  <img 
                                    src={scene.thumbnailUrl} 
                                    alt={scene.title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="text-slate-200">
                                    <ImageIcon size={48} strokeWidth={1} />
                                  </div>
                                )}
                                {DEMO_MODE ? (
                                  <div
                                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40"
                                    title="Scene artwork is fixed in this demo"
                                  >
                                    <span className="px-2 py-1 bg-white/90 rounded-full text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                                      Locked in Demo
                                    </span>
                                  </div>
                                ) : (
                                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10">
                                    <input
                                      type="file"
                                      id={`thumb-upload-${scene.id}`}
                                      className="hidden"
                                      accept="image/*"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          // Simple size check (2MB limit for base64 storage)
                                          if (file.size > 2 * 1024 * 1024) {
                                            alert("Image is too large. Please select an image smaller than 2MB.");
                                            return;
                                          }
                                          const reader = new FileReader();
                                          reader.onload = (event) => {
                                            if (event.target?.result) {
                                              updateScene(scene.id, { thumbnailUrl: event.target.result as string });
                                            }
                                          };
                                          reader.onerror = (error) => {
                                            console.error("FileReader error:", error);
                                          };
                                          reader.readAsDataURL(file);
                                        }
                                      }}
                                    />
                                    <button
                                      onClick={() => document.getElementById(`thumb-upload-${scene.id}`)?.click()}
                                      className="bg-white/90 p-1.5 rounded-full shadow-lg hover:scale-110 transition-transform"
                                    >
                                      <Plus size={14} className="text-slate-700" />
                                    </button>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center justify-between gap-3 flex-wrap">
                                {editingSceneId === scene.id ? (
                                  <input 
                                    className="w-full font-bold text-lg text-slate-900 border-b border-blue-400 focus:outline-none"
                                    value={scene.title}
                                    onChange={(e) => updateScene(scene.id, { title: e.target.value })}
                                  />
                                ) : (
                                  <h4 className="font-bold text-lg text-slate-900">{scene.title}</h4>
                                )}
                              </div>
                              <div className="mt-1">
                                {editingSceneId === scene.id ? (
                                  <div className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 rounded px-2 py-0.5" title="Shots count">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Shots:</span>
                                    <input 
                                      type="number"
                                      min={1}
                                      className="w-8 text-center bg-transparent text-xs font-bold text-slate-700 focus:outline-none"
                                      value={scene.shotCount || 1}
                                      onChange={(e) => updateScene(scene.id, { shotCount: Math.max(1, Number(e.target.value)) })}
                                    />
                                  </div>
                                ) : (
                                  <span className="inline-block px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[11px] font-bold text-slate-600" title="Shots count">
                                    {scene.shotCount || 1} { (scene.shotCount || 1) === 1 ? 'Shot' : 'Shots' }
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Middle: Description & Audio Span */}
                            <div className="flex-1 flex flex-col pt-1">
                               <div className="flex flex-col gap-6">
                                  {/* Description Section */}
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</span>
                                    </div>
                                    {editingSceneId === scene.id ? (
                                      <textarea 
                                        className="w-full text-slate-600 text-sm leading-relaxed border-blue-400 border-b focus:outline-none resize-none bg-slate-50/30 p-2 rounded"
                                        rows={3}
                                        value={scene.description}
                                        onChange={(e) => updateScene(scene.id, { description: e.target.value })}
                                      />
                                    ) : (
                                      <p className="text-slate-600 text-sm leading-relaxed min-h-[3rem]">
                                        {scene.description}
                                      </p>
                                    )}
                                  </div>

                                  {/* Audio Details Section */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-slate-50">
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <Mic2 size={12} className="text-blue-500" />
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Voiceover / Script</span>
                                      </div>
                                      {editingSceneId === scene.id ? (
                                        <input 
                                          className="w-full bg-transparent border-b border-blue-400 p-0 text-xs font-medium text-slate-700 focus:outline-none h-6"
                                          value={scene.audioVO}
                                          onChange={(e) => updateScene(scene.id, { audioVO: e.target.value })}
                                        />
                                      ) : (
                                        <span className="text-xs font-medium text-slate-700 block h-6 flex items-center">{scene.audioVO}</span>
                                      )}
                                    </div>
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <Type size={12} className="text-blue-500" />
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Text Overlays</span>
                                      </div>
                                      <div className="flex flex-col gap-1 w-full">
                                        {editingSceneId === scene.id ? (
                                          <>
                                            <input 
                                              placeholder="Overlay text/titles"
                                              className="bg-transparent border-b border-blue-400 p-0 text-xs font-semibold text-slate-800 focus:outline-none h-6 w-full"
                                              value={scene.textOverlayContent || ""}
                                              onChange={(e) => updateScene(scene.id, { textOverlayContent: e.target.value })}
                                            />
                                            <select 
                                              value={scene.textOverlayStyle || "None"}
                                              onChange={(e) => updateScene(scene.id, { textOverlayStyle: e.target.value })}
                                              className="bg-transparent border-b border-slate-300 p-0 text-[10px] font-medium text-slate-400 focus:outline-none cursor-pointer h-5 w-full mt-0.5"
                                            >
                                              <option value="None">None</option>
                                              <option value="Lower Thirds">Lower Thirds</option>
                                              <option value="Minimal Subtitles">Minimal Subtitles</option>
                                              <option value="Kinetic Typography">Kinetic Typography</option>
                                              <option value="Title Card">Title Card</option>
                                              <option value="Call-out Labels">Call-out Labels</option>
                                            </select>
                                          </>
                                        ) : (
                                          <>
                                            <span className="text-xs font-semibold text-slate-800 block h-6 flex items-center">
                                              {scene.textOverlayStyle === 'None' ? 'None' : (scene.textOverlayContent || 'No text content')}
                                            </span>
                                            {scene.textOverlayStyle !== 'None' && (
                                              <span className="text-[10px] text-slate-400 font-medium block h-3">
                                                {scene.textOverlayStyle}
                                              </span>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Camera Move Section */}
                                  <div className="space-y-1 pt-4 border-t border-slate-100">
                                    <div className="flex items-center gap-2">
                                      <Video size={12} className="text-indigo-500" />
                                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Camera Move</span>
                                    </div>
                                    {editingSceneId === scene.id ? (
                                      <textarea 
                                        className="w-full text-slate-600 text-sm leading-relaxed border-blue-400 border-b focus:outline-none resize-none bg-slate-50/30 p-2 rounded animate-fade-in"
                                        rows={2}
                                        placeholder="Describe the camera movement and shot framing (e.g., dynamic tracking shot, crane tilt, slow zoom)..."
                                        value={scene.cameraMove || ""}
                                        onChange={(e) => updateScene(scene.id, { cameraMove: e.target.value })}
                                      />
                                    ) : (
                                      <p className="text-slate-600 text-sm leading-relaxed min-h-[1.5rem]">
                                        {scene.cameraMove || "No camera movement described."}
                                      </p>
                                    )}
                                  </div>
                               </div>
                            </div>

                            <div className="w-full lg:w-48 text-center lg:text-right flex flex-col justify-center gap-3 border-l border-slate-50 pl-6">
                              {project.billingMode === BillingMode.HOURLY ? (
                                <div className="pt-2 border-slate-100 mt-1">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Est. Hours</span>
                                  {editingSceneId === scene.id ? (
                                    <div className="flex flex-col gap-2 items-end">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">3D:</span>
                                        <div className="flex items-center border-b border-blue-400 pb-0.5 w-20">
                                          <input 
                                            type="number"
                                            step="0.5"
                                            className="w-full text-sm font-semibold text-blue-600 bg-transparent focus:outline-none text-right"
                                            value={get3DHours(scene)}
                                            onChange={(e) => {
                                              const h3d = Number(e.target.value);
                                              const hComp = getCompHours(scene);
                                              updateScene(scene.id, { 
                                                hours3D: h3d, 
                                                hours: h3d + hComp 
                                              });
                                            }}
                                          />
                                          <span className="text-[10px] text-blue-400 font-bold ml-1">h</span>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-purple-500 uppercase tracking-wider">Comp:</span>
                                        <div className="flex items-center border-b border-purple-400 pb-0.5 w-20">
                                          <input 
                                            type="number"
                                            step="0.5"
                                            className="w-full text-sm font-semibold text-purple-600 bg-transparent focus:outline-none text-right"
                                            value={getCompHours(scene)}
                                            onChange={(e) => {
                                              const hComp = Number(e.target.value);
                                              const h3d = get3DHours(scene);
                                              updateScene(scene.id, { 
                                                hoursComp: hComp, 
                                                hours: h3d + hComp 
                                              });
                                            }}
                                          />
                                          <span className="text-[10px] text-purple-400 font-bold ml-1">h</span>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col gap-1 items-end">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[11px] font-bold text-blue-500 uppercase tracking-wide">3D:</span>
                                        <span className="text-xl font-display font-bold text-blue-600">{get3DHours(scene)} hrs</span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[11px] font-bold text-purple-500 uppercase tracking-wide">Comp:</span>
                                        <span className="text-xl font-display font-bold text-purple-600">{getCompHours(scene)} hrs</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="pt-2 border-slate-100 mt-1">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Subtotal</span>
                                  {editingSceneId === scene.id ? (
                                    <div className="flex items-center justify-end gap-1 border-b-2 border-slate-900 pb-1">
                                      <span className="text-xl font-display font-bold text-slate-900">$</span>
                                      <input 
                                        type="number"
                                        className="w-24 text-2xl font-display font-bold text-slate-900 bg-transparent focus:outline-none text-right"
                                        value={calculateSceneTotal(scene, project)}
                                        onChange={(e) => {
                                          const newSubtotal = Number(e.target.value);
                                          const assetsTotal = (scene.assets || []).reduce((sum, a) => sum + (a.cost || 0), 0);
                                          const targetLaborCost = Math.max(0, newSubtotal - assetsTotal);
                                          updateScene(scene.id, { baseSceneCost: targetLaborCost });
                                        }}
                                      />
                                    </div>
                                  ) : (
                                    <div className="text-2xl font-display font-bold text-slate-900">
                                      {formatCurrency(calculateSceneTotal(scene, project))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Asset Collapsible Header */}
                          <button 
                            onClick={() => toggleSceneExpand(scene.id)}
                            className="w-full px-6 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between hover:bg-slate-100/50 transition-colors group"
                          >
                            <div className="flex items-center gap-4">
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Asset Breakdown</span>
                              <div className="flex gap-2">
                                {Object.values(AssetStatus).map(status => {
                                  const count = scene.assets.filter(a => a.status === status).length;
                                  if (count === 0) return null;
                                  const colorClass = 
                                    status === AssetStatus.PURCHASED ? "bg-rose-500" :
                                    status === AssetStatus.PROVIDED ? "bg-blue-900" :
                                    status === AssetStatus.EXISTING ? "bg-emerald-500" : "bg-blue-400";
                                  return (
                                    <span key={status} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] text-slate-500 font-medium capitalize flex items-center gap-1.5">
                                      <div className={cn("w-1.5 h-1.5 rounded-full", colorClass)}></div>
                                      {status === AssetStatus.PURCHASED ? "to be purchased" :
                                       status === AssetStatus.PROVIDED ? "to be provided" :
                                       status === AssetStatus.CREATED ? "to be created" : "existing"}: {count}
                                    </span>
                                  )
                                })}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400 group-hover:text-blue-600 transition-colors">
                              <span className="text-xs font-medium">{expandedScenes[scene.id] ? 'Hide Assets' : 'Manage Assets'}</span>
                              {expandedScenes[scene.id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </div>
                          </button>

                          {/* Assets Expansion */}
                          <AnimatePresence>
                            {expandedScenes[scene.id] && (
                              <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden bg-white border-t border-slate-100"
                              >
                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                  {(Object.values(AssetStatus) as AssetStatus[]).map(status => (
                                    <div key={status} className="space-y-3">
                                      <div className="flex items-center justify-between">
                                        <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 leading-none">
                                          <div className={cn("w-1.5 h-1.5 rounded-full", 
                                            status === AssetStatus.PURCHASED ? "bg-rose-500" :
                                            status === AssetStatus.PROVIDED ? "bg-blue-900" :
                                            status === AssetStatus.EXISTING ? "bg-emerald-500" : "bg-blue-400")}></div>
                                          {status === AssetStatus.PURCHASED ? "to be purchased" :
                                           status === AssetStatus.PROVIDED ? "to be provided" :
                                           status === AssetStatus.CREATED ? "to be created" : "existing"}
                                        </h5>
                                        {viewMode === 'edit' && (
                                          <button 
                                            onClick={() => addAsset(scene.id, status)}
                                            className="p-1 hover:bg-blue-50 text-blue-400 hover:text-blue-600 rounded transition-colors"
                                          >
                                            <Plus size={14} />
                                          </button>
                                        )}
                                      </div>
                                      <div className="space-y-2">
                                        {scene.assets.filter(a => a.status === status).map(asset => (
                                          <div key={asset.id} className="group relative p-3 bg-slate-50 rounded-lg border border-transparent hover:border-slate-200 transition-all">
                                              <div className="flex justify-between gap-2">
                                                {viewMode === 'edit' ? (
                                                  <input 
                                                    className="bg-transparent border-none p-0 text-xs font-semibold text-slate-800 focus:ring-0 w-full"
                                                    value={asset.name}
                                                    onChange={(e) => updateAsset(scene.id, asset.id, { name: e.target.value })}
                                                  />
                                                ) : (
                                                  <span className="text-xs font-semibold text-slate-800 line-clamp-1">{asset.name}</span>
                                                )}
                                                <div className="flex items-center gap-1 group/cost">
                                                  <span className="text-[10px] text-slate-400 leading-none">$</span>
                                                  {viewMode === 'edit' ? (
                                                    <input 
                                                      type="number"
                                                      className="bg-transparent border-none p-0 text-xs font-bold text-emerald-600 focus:ring-0 w-16 text-right"
                                                      value={asset.cost}
                                                      onChange={(e) => updateAsset(scene.id, asset.id, { cost: Number(e.target.value) })}
                                                    />
                                                  ) : (
                                                    <span className="text-xs font-bold text-emerald-600">{asset.cost}</span>
                                                  )}
                                                </div>
                                              </div>
                                            {viewMode === 'edit' && (
                                              <div className="absolute top-2 -right-1 translate-x-full opacity-0 group-hover:opacity-100 transition-opacity pl-2">
                                                <button 
                                                  onClick={() => removeAsset(scene.id, asset.id)}
                                                  className="p-1.5 bg-white shadow-sm border border-slate-200 rounded text-rose-500 hover:bg-rose-50 transition-colors"
                                                >
                                                  <Trash2 size={12} />
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                        {scene.assets.filter(a => a.status === status).length === 0 && (
                                          <div className="py-8 border border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center gap-1 opacity-40">
                                            <span className="text-[10px]">No assets</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Visual References Collapsible Header */}
                          <button 
                            onClick={() => toggleReferencesExpand(scene.id)}
                            className="w-full px-6 py-3 bg-slate-50/30 border-t border-slate-100 flex items-center justify-between hover:bg-slate-100/50 transition-colors group"
                          >
                            <div className="flex items-center gap-4">
                              <span className="text-xs font-bold text-indigo-500/80 uppercase tracking-widest">Visual References & Moodboards</span>
                              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold">
                                {(scene.references || []).length} { (scene.references || []).length === 1 ? 'Reference' : 'References' }
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400 group-hover:text-indigo-600 transition-colors">
                              <span className="text-xs font-medium">{expandedReferences[scene.id] ? 'Hide References' : 'View References'}</span>
                              {expandedReferences[scene.id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </div>
                          </button>

                          {/* References Expansion */}
                          <AnimatePresence>
                            {expandedReferences[scene.id] && (
                              <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden bg-white border-t border-slate-100"
                              >
                                <div className="p-6">
                                  {viewMode === 'edit' && (
                                    <div className="flex justify-end mb-4">
                                      <button 
                                        onClick={() => addReference(scene.id)}
                                        className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                                      >
                                        <Plus size={14} />
                                        Add Reference Image
                                      </button>
                                    </div>
                                  )}

                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                    {(scene.references || []).map(ref => (
                                      <div key={ref.id} className="group relative bg-slate-50 border border-slate-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                                        <div className="aspect-video bg-slate-200 relative overflow-hidden">
                                          <img 
                                            src={ref.url} 
                                            alt={ref.note || "Reference"}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            referrerPolicy="no-referrer"
                                          />
                                        </div>

                                        <div className="p-3 space-y-2">
                                          {viewMode === 'edit' ? (
                                            <>
                                              <div>
                                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Image URL</label>
                                                <input 
                                                  className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 font-mono"
                                                  value={ref.url}
                                                  onChange={(e) => updateReference(scene.id, ref.id, { url: e.target.value })}
                                                 />
                                              </div>
                                              <div>
                                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Note</label>
                                                <input 
                                                  className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                                                  value={ref.note}
                                                  onChange={(e) => updateReference(scene.id, ref.id, { note: e.target.value })}
                                                  placeholder="Description"
                                                 />
                                              </div>
                                            </>
                                          ) : (
                                            <div>
                                              <p className="text-xs font-semibold text-slate-800 line-clamp-2">{ref.note || 'Reference mood / style'}</p>
                                            </div>
                                          )}
                                        </div>

                                        {viewMode === 'edit' && (
                                          <button 
                                            onClick={() => removeReference(scene.id, ref.id)}
                                            className="absolute top-2 right-2 p-1.5 bg-white/95 backdrop-blur-sm rounded shadow-sm border border-slate-200 text-rose-500 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100"
                                            title="Delete Reference"
                                          >
                                            <Trash2 size={12} />
                                          </button>
                                        )}
                                      </div>
                                    ))}

                                    {(scene.references || []).length === 0 && (
                                      <div className="col-span-full py-12 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 bg-slate-50/50">
                                        <div className="p-3 bg-white border border-slate-200 rounded-full text-slate-300">
                                          <ImageIcon size={24} />
                                        </div>
                                        <div className="text-center">
                                          <p className="text-xs font-semibold text-slate-600">No visual references added yet</p>
                                          <p className="text-[10px] text-slate-400 mt-0.5">Add moodboards or style reference images</p>
                                        </div>
                                        {viewMode === 'edit' && (
                                          <button 
                                            onClick={() => addReference(scene.id)}
                                            className="mt-2 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                                          >
                                            <Plus size={12} /> Add Reference
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </Reorder.Item>
                      ))}

                      <button 
                        onClick={() => {
                          const newScene: Scene = {
                            id: `scene-${Date.now()}`,
                            title: "New Scene",
                            description: "Brief description of the scene's content.",
                            thumbnailUrl: undefined,
                            audioVO: "Voiceover Required",
                            textOverlayStyle: "None",
                            textOverlayContent: "",
                            baseSceneCost: 1000,
                            hours: 5,
                            hours3D: 3.5,
                            hoursComp: 1.5,
                            assets: [],
                            tags: [],
                            cameraMove: "Orbit panning around the main subject",
                            shotCount: 1,
                            references: []
                          };
                          setProject({...project, scenes: [...project.scenes, newScene]});
                        }}
                        className={cn(
                          "w-full py-4 border-2 border-dashed border-slate-200 rounded-xl hover:border-blue-400 hover:bg-blue-50/30 transition-all flex items-center justify-center gap-2 text-slate-400 hover:text-blue-600 group",
                          viewMode === 'view' && "hidden"
                        )}
                      >
                        <Plus size={18} className="translate-y-px" />
                        <span className="font-semibold text-sm">Add New Scene</span>
                      </button>
                    </Reorder.Group>

                    {/* Combined Project Details Section */}
                    <div data-export-section="footer" className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-12">
                      <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 divide-x divide-slate-50">
                          {/* Revisions Column */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Revisions</h3>
                              {viewMode === 'edit' && (
                                <button 
                                  onClick={() => setIsEditingRevisions(!isEditingRevisions)}
                                  className={cn("p-1 rounded-lg transition-colors", isEditingRevisions ? "bg-blue-600 text-white" : "text-blue-500 hover:bg-blue-50")}
                                >
                                  {isEditingRevisions ? <Check size={14} /> : <Edit2 size={14} />}
                                </button>
                              )}
                            </div>
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] text-slate-500 font-medium">Included</span>
                                {isEditingRevisions ? (
                                  <input 
                                    type="number"
                                    className="w-10 bg-transparent border-b border-blue-400 focus:outline-none text-right font-bold text-slate-700 text-xs"
                                    value={project.revisionsAllowed}
                                    onChange={(e) => updateProject({ revisionsAllowed: Number(e.target.value) })}
                                  />
                                ) : (
                                  <span className="font-bold text-slate-700 text-xs">{project.revisionsAllowed} Rounds</span>
                                )}
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] text-slate-500 font-medium">Extra Round</span>
                                {isEditingRevisions ? (
                                  <div className="flex items-center gap-1">
                                    <span className="text-[11px] font-bold text-slate-700">$</span>
                                    <input 
                                      type="number"
                                      className="w-14 bg-transparent border-b border-blue-400 focus:outline-none text-right font-bold text-slate-700 text-xs"
                                      value={project.extendedRevisionPrice}
                                      onChange={(e) => updateProject({ extendedRevisionPrice: Number(e.target.value) })}
                                    />
                                  </div>
                                ) : (
                                  <span className="font-bold text-emerald-600 text-xs">{formatCurrency(project.extendedRevisionPrice)}</span>
                                )}
                              </div>
                            </div>
                          </div>

                           {/* Content Platform Column */}
                          <div className="pl-6 space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Platform</h3>
                              <div className="flex items-center gap-2">
                                {viewMode === 'edit' && (
                                  <button 
                                    onClick={() => setIsEditingPlatform(!isEditingPlatform)}
                                    className={cn("p-1 rounded-lg transition-colors", isEditingPlatform ? "bg-blue-600 text-white" : "text-blue-500 hover:bg-blue-50")}
                                  >
                                    {isEditingPlatform ? <Check size={12} /> : <Edit2 size={12} />}
                                  </button>
                                )}
                                <FolderOpen size={16} className="text-blue-500" />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[9px] font-bold text-slate-400 uppercase">Access Link</span>
                              {isEditingPlatform ? (
                                <div className="space-y-2">
                                  <input 
                                    placeholder="Name"
                                    className="w-full text-xs font-bold bg-transparent border-b border-blue-400 focus:outline-none"
                                    value={project.platformName}
                                    onChange={(e) => updateProject({ platformName: e.target.value })}
                                  />
                                  <input 
                                    placeholder="URL"
                                    className="w-full text-[11px] text-blue-500 bg-transparent border-b border-blue-400 focus:outline-none"
                                    value={project.platformLink}
                                    onChange={(e) => updateProject({ platformLink: e.target.value })}
                                  />
                                </div>
                              ) : DEMO_MODE ? (
                                <span
                                  className="flex items-center gap-2 text-slate-400 font-bold text-[13px] truncate cursor-not-allowed"
                                  title="External links are disabled in this demo"
                                >
                                  {project.platformName}
                                  <Download size={10} />
                                </span>
                              ) : (
                                <a
                                  href={project.platformLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-blue-600 hover:underline font-bold text-[13px] truncate"
                                >
                                  {project.platformName}
                                  <Download size={10} />
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Payment Methods Column */}
                          <div className="pl-6 space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Payment</h3>
                              <div className="flex items-center gap-2">
                                {viewMode === 'edit' && (
                                  <button 
                                    onClick={() => setIsEditingPayment(!isEditingPayment)}
                                    className={cn("p-1 rounded-lg transition-colors", isEditingPayment ? "bg-blue-600 text-white" : "text-blue-500 hover:bg-blue-50")}
                                  >
                                    {isEditingPayment ? <Check size={12} /> : <Edit2 size={12} />}
                                  </button>
                                )}
                                <DollarSign size={16} className="text-emerald-500" />
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {project.paymentMethods.map((method, idx) => (
                                <div key={idx} className="flex items-center gap-2 px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-100 text-[11px] font-bold text-slate-600">
                                  {method}
                                  {isEditingPayment && (
                                    <button 
                                      onClick={() => updateProject({ paymentMethods: project.paymentMethods.filter((_, i) => i !== idx) })}
                                      className="text-slate-400 hover:text-rose-500"
                                    >
                                      <X size={10} />
                                    </button>
                                  )}
                                </div>
                              ))}
                              {isEditingPayment && (
                                <button 
                                  onClick={() => {
                                    const m = window.prompt("Enter payment method:");
                                    if (m) updateProject({ paymentMethods: [...project.paymentMethods, m] });
                                  }}
                                  className="px-2.5 py-1 border border-dashed border-slate-300 rounded-lg text-[11px] font-bold text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
                                >
                                  +
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Investment Breakdown */}
                      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col h-fit">
                        <div className="bg-blue-600 px-6 py-3">
                          <h3 className="text-xs font-bold text-white uppercase tracking-widest">Investment Summary</h3>
                        </div>
                        <div className="p-5 space-y-4">
                          <div className="space-y-4">
                            {project.billingMode === BillingMode.HOURLY ? (
                              <div className="flex justify-between items-end border-b border-slate-100 pb-2">
                                 <span className="text-xs text-slate-500 font-medium">Total Hours ({(project.scenes || []).reduce((acc, s) => acc + (s.hours || 0), 0)} hrs)</span>
                                 <span className="font-display font-bold text-sm text-slate-900">
                                  {formatCurrency((project.scenes || []).reduce((acc, s) => acc + (s.hours || 0), 0) * (project.billingRate || 0))}
                                 </span>
                              </div>
                            ) : (
                              <div className="flex justify-between items-end border-b border-slate-100 pb-2">
                                 <span className="text-xs text-slate-500 font-medium">Total Scene Base Costs</span>
                                 <span className="font-display font-bold text-sm text-slate-900">
                                  {formatCurrency((project.scenes || []).reduce((acc, s) => acc + (s.baseSceneCost || 0), 0))}
                                 </span>
                              </div>
                            )}
                            <div className="flex justify-between items-end border-b-2 border-slate-200 pb-2">
                               <span className="text-xs text-slate-500 font-medium">All Asset Costs</span>
                               <span className="font-display font-bold text-sm text-slate-900">
                                {formatCurrency((project.scenes || []).reduce((acc, s) => acc + (s.assets || []).reduce((sum, a) => sum + (a.cost || 0), 0), 0))}
                               </span>
                            </div>
                            <div className="flex justify-between items-end pt-2">
                               <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Grand Total</span>
                               <span className="font-display font-bold text-2xl text-slate-900">
                                {formatCurrency(calculateProjectTotal(project))}
                               </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </>
            )}
          </main>
        </div>
      </div>
    </div>

      {/* Floating Action Bar */}
      {project && !viewingProjects && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-full px-6 py-3 shadow-2xl flex items-center gap-6">
            <div className="flex items-center gap-2 pr-6 border-r border-slate-100">
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden md:block">Total</span>
               <span className="font-display font-bold text-slate-900">{formatCurrency(calculateProjectTotal(project))}</span>
            </div>
            <button
              onClick={DEMO_MODE ? undefined : exportCSV}
              disabled={DEMO_MODE}
              title={DEMO_MODE ? "Spreadsheet export is disabled in this demo" : undefined}
              className="px-4 py-1.5 hover:bg-slate-50 rounded-full text-xs font-bold text-slate-500 transition-colors flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            >
              <FileDown size={14} />
              Spreadsheet
            </button>
            <div className="flex gap-3">
              <button
                onClick={DEMO_MODE ? undefined : exportPDF}
                disabled={DEMO_MODE || isExporting}
                title={DEMO_MODE ? "PDF export is disabled in this demo" : undefined}
                className="flex items-center gap-2 px-5 py-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors text-xs font-bold shadow-md shadow-blue-600/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
              >
                {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                {isExporting ? 'Exporting...' : 'PDF'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
