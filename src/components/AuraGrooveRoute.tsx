
/**
 * #ЗАЧЕМ: UI AuraGroove V6.1 — "Header Heritage Integration".
 * #ЧТО: ПЛАН №1650 — Добавлена кнопка "Like" в хедер Навигатора.
 */
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
    Plus, X, Shuffle, Music, Pause, Settings2, 
    Activity, Timer, ThumbsUp, Radio, TowerControl,
    Home, RefreshCw, SlidersHorizontal, ArrowUp, ArrowDown, Mic2,
    Save, FolderOpen, Trash2, Check, Navigation, Sliders, Cog,
    GripVertical
} from 'lucide-react';
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import type { AuraGrooveProps, PresetItem } from "@/hooks/use-aura-groove";
import type { RouteItem } from "@/types/music";
import { cn, formatTime } from "@/lib/utils";
import { SpectrumAnalyzer } from "./SpectrumAnalyzer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";

// DND Kit Imports
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  TouchSensor
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const GENRES = [
    { id: 'ambient', label: 'Deep Ambient' },
    { id: 'psybient', label: 'Neuro Space' },
    { id: 'blues', label: "Cafe's Blues" },
    { id: 'reggae', label: 'Root Reggey' },
    { id: 'random', label: '⚡ SURPRISE' }
];

const MOODS = [
    { id: 'melancholic', label: 'Melancholic' },
    { id: 'dreamy', label: 'Dreamy' },
    { id: 'calm', label: 'Calm' },
    { id: 'joyful', label: 'Joyful' },
    { id: 'dark', label: 'Dark Ritual' },
    { id: 'epic', label: 'Epic Call' },
    { id: 'random', label: '⚡ ANY' }
];

const MIXER_CHANNELS = [
    { key: 'master', label: 'M' },
    { key: 'bass', label: 'B' },
    { key: 'melody', label: 'Mel' },
    { key: 'accompaniment', label: 'Acc' },
    { key: 'harmony', label: 'Har' },
    { key: 'pianoAccompaniment', label: 'Rh' },
    { key: 'sparkles', label: 'Sp' },
    { key: 'sfx', label: 'SFX' },
    { key: 'drums', label: 'D' }
];

const EQ_BANDS = [
  { freq: '60', label: '60' }, { freq: '125', label: '125' }, { freq: '250', label: '250' },
  { freq: '500', label: '500' }, { freq: '1k', label: '1k' }, { freq: '2k', label: '2k' }, { freq: '4k', label: '4k' },
];

function SimpleVerticalList({ 
    items, 
    value, 
    onChange 
}: { 
    items: {id: string, label: string}[], 
    value: string, 
    onChange: (id: string) => void 
}) {
    return (
        <ScrollArea className="flex-grow w-full bg-background/10 border-r border-primary/5 last:border-r-0">
            <div className="flex flex-col p-1 gap-1">
                {items.map((item) => {
                    const isActive = item.id === value;
                    return (
                        <button
                            key={item.id}
                            onClick={() => onChange(item.id)}
                            className={cn(
                                "flex items-center justify-center h-8 px-2 rounded-md transition-all text-[10px] font-black uppercase tracking-tight",
                                isActive 
                                    ? "bg-primary text-primary-foreground shadow-md scale-[0.98]" 
                                    : "text-muted-foreground/60 hover:bg-muted hover:text-foreground"
                            )}
                        >
                            {item.label}
                        </button>
                    );
                })}
            </div>
        </ScrollArea>
    );
}

function PresetManager({ 
    presets, 
    onSave, 
    onLoad, 
    onDelete, 
    title 
}: { 
    presets: PresetItem[], 
    onSave: (name: string) => void, 
    onLoad: (id: string) => void, 
    onDelete: (id: string) => void,
    title: string
}) {
    const [name, setName] = useState("");
    return (
        <div className="space-y-4 pt-4 border-t border-primary/10 mt-4">
            <Label className="text-[10px] font-black uppercase opacity-50 tracking-widest">{title} Presets</Label>
            <div className="flex gap-2">
                <Input placeholder="Preset Name" value={name} onChange={e => setName(e.target.value)} className="h-8 text-xs bg-background" />
                <Button size="sm" onClick={() => { if(name.trim()){ onSave(name); setName(""); }}} className="h-8 px-3"><Save className="h-3.5 w-3.5" /></Button>
            </div>
            <ScrollArea className="h-32">
                <div className="space-y-1">
                    {presets.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-1.5 rounded bg-muted/30 border border-transparent hover:border-primary/20 group">
                            <span className="text-[10px] font-bold uppercase cursor-pointer flex-grow" onClick={() => onLoad(p.id)}>{p.name}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100" onClick={() => onDelete(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}

function SortableRouteItem({ 
    item, 
    isActive, 
    progress,
    onRemove 
}: { 
    item: RouteItem, 
    isActive: boolean, 
    progress?: number,
    onRemove: (id: string) => void 
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div 
            ref={setNodeRef} 
            style={style} 
            className={cn(
                "flex items-center justify-between p-2 rounded-lg border transition-all group relative overflow-hidden",
                isActive ? "bg-primary/10 border-primary/40 shadow-inner" : "bg-muted/30 border-transparent",
                isDragging && "opacity-50 z-50 scale-105 shadow-2xl ring-2 ring-primary/50"
            )}
        >
            {isActive && progress !== undefined && (
                <div className="absolute bottom-0 left-0 h-[2px] w-full bg-primary/20">
                    <div 
                        className="h-full bg-primary transition-all duration-1000 ease-linear" 
                        style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
                    />
                </div>
            )}

            <div className="flex items-center gap-3 overflow-hidden z-10">
                <div 
                    {...attributes} 
                    {...listeners} 
                    className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-primary transition-colors"
                >
                    <GripVertical className="h-4 w-4" />
                </div>
                <div className="truncate">
                    <div className="text-[11px] font-black uppercase tracking-tight">
                        {item.genre} / {item.mood}
                    </div>
                </div>
            </div>
            <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity z-10" 
                onClick={() => onRemove(item.id)}
            >
                <X className="h-4 w-4" />
            </Button>
        </div>
    );
}

export function AuraGrooveRoute(props: AuraGrooveProps) {
    const router = useRouter();
    const [selectedGenre, setSelectedGenre] = useState<any>('ambient');
    const [selectedMood, setSelectedMood] = useState<any>('melancholic');
    const [isSpectrumOpen, setIsSpectrumOpen] = useState(false);
    const [isStudioOpen, setIsStudioOpen] = useState(false);
    const [isEqOpen, setIsEqOpen] = useState(false);
    const [isSaveRouteOpen, setIsSaveRouteOpen] = useState(false);
    const [isLoadRouteOpen, setIsLoadRouteOpen] = useState(false);
    const [isTimerDialogOpen, setIsTimerDialogOpen] = useState(false);
    const [routeName, setRouteName] = useState("");

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleAdd = () => props.addToRoute(selectedGenre, selectedMood);
    const handleSave = () => { if (!routeName.trim()) return; props.saveRoute(routeName); setRouteName(""); setIsSaveRouteOpen(false); };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            props.reorderRoute(active.id as string, over.id as string);
        }
    };

    return (
        <div className="w-full h-full flex flex-col bg-card overflow-hidden">
            {/* TOP 50%: Header + Selectors */}
            <div className="h-1/2 flex flex-col shrink-0 overflow-hidden border-b border-primary/20">
                <header className="p-3 bg-background/40 shrink-0">
                    {/* Row 1: AuraGroove (Active) | Play */}
                    <div className="flex items-center justify-between mb-2">
                        <div 
                            onClick={props.handleGoHome}
                            className="flex flex-row items-center gap-2 cursor-pointer hover:opacity-80 transition-all"
                        >
                            <Image src="/assets/icon8.jpeg" alt="AuraGroove Logo" width={32} height={32} className="rounded-full" />
                            <h1 className="text-lg font-bold text-primary tracking-tighter">AuraGroove</h1>
                        </div>
                        <Button onClick={props.handlePlayPause} disabled={props.isInitializing} className="h-9 px-6 font-black uppercase tracking-widest shadow-lg">
                            {props.isPlaying ? <Pause className="mr-2 h-5 w-5" /> : <Music className="mr-2 h-5 w-5" />}
                            {props.isPlaying ? "Pause" : "Play"}
                        </Button>
                    </div>
                    
                    {/* Row 2: Secondary Controls */}
                    <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
                        {/* Left Side: Home, Broadcast, Record, Regenerate, Like */}
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={props.handleGoHome} className="h-8 w-8 shrink-0"><Home className="h-4 w-4" /></Button>
                            <Button variant={props.isBroadcastActive ? "destructive" : "outline"} onClick={props.handleToggleBroadcast} className="h-8 w-8 p-0 shrink-0">
                                <TowerControl className={cn("h-4 w-4", props.isBroadcastActive && "animate-pulse text-primary")} />
                            </Button>
                            <Button variant={props.isRecording ? "destructive" : "outline"} onClick={props.handleToggleRecording} className="h-8 w-8 p-0 shrink-0">
                                <Radio className={cn("h-4 w-4", props.isRecording && "animate-pulse")} />
                            </Button>
                            <Button variant="outline" onClick={props.handleRegenerate} className="h-8 w-8 p-0 shrink-0"><RefreshCw className={cn("h-4 w-4", props.isRegenerating && "animate-spin")} /></Button>
                            {/* #ЗАЧЕМ: ПЛАН №1650. Кнопка Лайк в общем ряду. */}
                            <Button 
                                variant="outline" 
                                onClick={props.handleSaveMasterpiece} 
                                disabled={!props.isPlaying}
                                className="h-8 w-8 p-0 shrink-0"
                                title="Like"
                            >
                                <ThumbsUp className="h-4 w-4 text-primary" />
                            </Button>
                        </div>
                        {/* Right Side: EQ, Mixer (Under Play) */}
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => setIsEqOpen(true)} className="h-8 w-8 text-xs font-black shrink-0">EQ</Button>
                            <Button variant="ghost" size="icon" onClick={() => setIsStudioOpen(true)} className="h-8 w-8 shrink-0"><Settings2 className="h-4 w-4" /></Button>
                        </div>
                    </div>
                </header>

                <div className="flex-grow grid grid-cols-2 gap-px bg-primary/10 overflow-hidden">
                    <div className="bg-card flex flex-col h-full overflow-hidden">
                        <Label className="text-[8px] font-black uppercase text-center py-1 opacity-50 tracking-[0.2em]">Genre</Label>
                        <SimpleVerticalList items={GENRES} value={selectedGenre} onChange={setSelectedGenre} />
                    </div>
                    <div className="bg-card flex flex-col h-full overflow-hidden">
                        <Label className="text-[8px] font-black uppercase text-center py-1 opacity-50 tracking-[0.2em]">Mood</Label>
                        <SimpleVerticalList items={MOODS} value={selectedMood} onChange={setSelectedMood} />
                    </div>
                </div>
            </div>

            {/* BOTTOM 50%: Controls + Path List + Footer */}
            <div className="h-1/2 flex flex-col bg-muted/5 relative overflow-hidden">
                <div className="p-2 flex gap-2 bg-background/20 shrink-0">
                    <Button onClick={handleAdd} className="flex-grow font-black uppercase text-[10px] tracking-widest h-10 shadow-lg"><Plus className="h-4 w-4 mr-2" /> Add to Route</Button>
                    <div className="flex gap-1">
                        <Dialog open={isSaveRouteOpen} onOpenChange={setIsSaveRouteOpen}>
                            <DialogTrigger asChild><Button variant="outline" size="icon" className="h-10 w-10"><Save className="h-4 w-4" /></Button></DialogTrigger>
                            <DialogContent className="bg-card border-primary/20"><DialogHeader><DialogTitle className="font-black uppercase text-primary">Capture Journey</DialogTitle></DialogHeader><div className="py-4"><Input placeholder="Name..." value={routeName} onChange={e => setRouteName(e.target.value)} className="bg-background" /></div><DialogFooter><Button onClick={handleSave} className="w-full font-black uppercase tracking-widest">Store Journey</Button></DialogFooter></DialogContent>
                        </Dialog>
                        <Dialog open={isLoadRouteOpen} onOpenChange={setIsLoadRouteOpen}>
                            <DialogTrigger asChild><Button variant="outline" size="icon" className="h-10 w-10"><FolderOpen className="h-4 w-4" /></Button></DialogTrigger>
                            <DialogContent className="bg-card border-primary/20"><DialogHeader><DialogTitle className="font-black uppercase text-primary">Library</DialogTitle></DialogHeader><ScrollArea className="h-64 pr-3">{props.savedRoutes?.map(saved => (<div key={saved.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:border-primary/20 border border-transparent group mb-1"><div className="cursor-pointer flex-grow" onClick={() => { props.loadRoute(saved); setIsLoadRouteOpen(false); }}><div className="text-xs font-black uppercase">{saved.name}</div><div className="text-[9px] font-bold opacity-40 uppercase">{saved.items.length} steps</div></div><Button variant="ghost" size="icon" onClick={() => props.deleteSavedRoute(saved.id)} className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100"><Trash2 className="h-3.5 w-3.5" /></Button></div>))}</ScrollArea></DialogContent>
                        </Dialog>
                        <Button variant="outline" size="icon" onClick={() => props.setShuffle(!props.isShuffle)} className={cn("h-10 w-10", props.isShuffle && "bg-primary/10 border-primary/40 text-primary")}><Shuffle className="h-4 w-4" /></Button>
                    </div>
                </div>

                <div className="flex-grow overflow-hidden flex flex-col p-3 pt-1 gap-2">
                    <div className="flex items-center justify-between px-1 shrink-0"><Label className="text-[10px] font-black uppercase opacity-50">Current Path</Label><Badge variant="outline" className="text-[9px] font-mono opacity-50">{props.route.length} steps</Badge></div>
                    <ScrollArea className="flex-grow pr-3">
                        <div className="space-y-1.5 pb-24">
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                <SortableContext items={props.route.map(i => i.id)} strategy={verticalListSortingStrategy}>
                                    {props.route.map((item, idx) => {
                                        const isActive = idx === props.activeRouteIndex && props.isPlaying;
                                        const progress = isActive ? (props.currentBar / (props.totalBars || 1)) : 0;
                                        return (
                                            <SortableRouteItem 
                                                key={item.id} 
                                                item={item} 
                                                isActive={isActive}
                                                progress={progress}
                                                onRemove={props.removeFromRoute}
                                            />
                                        );
                                    })}
                                </SortableContext>
                            </DndContext>
                            {props.route.length === 0 && (
                                <div className="py-10 text-center opacity-30 flex flex-col items-center gap-2">
                                    <TowerControl className="h-8 w-8" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">No Journey Defined</span>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>

                <footer className="p-4 bg-background/80 backdrop-blur-sm border-t border-primary/10 flex items-center justify-between shrink-0 absolute bottom-0 left-0 right-0 z-40">
                    <Button variant="outline" size="icon" onClick={() => setIsSpectrumOpen(true)} className="h-10 w-10"><Activity className="h-5 w-5" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => router.push('/aura-groove')} className="h-10 w-10 opacity-20 hover:opacity-100 transition-opacity"><Cog className="h-4 w-4" /></Button>
                    
                    <Dialog open={isTimerDialogOpen} onOpenChange={setIsTimerDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className={cn("h-10 min-w-[100px] gap-2 font-black uppercase text-[10px] tracking-widest", props.timerSettings.isActive && "border-destructive text-destructive")}>
                                <Timer className="h-4 w-4" /> {props.timerSettings.isActive ? formatTime(props.timerSettings.timeLeft) : 'Timer'}
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md bg-card border-primary/20 shadow-2xl">
                            <DialogHeader>
                                <DialogTitle className="font-black uppercase text-primary flex items-center gap-2">
                                    <Timer className="h-5 w-5" /> Sleep Timer
                                </DialogTitle>
                                <DialogDescription className="text-[10px] uppercase font-bold opacity-50 tracking-widest">Set session duration</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-8 py-6">
                                <div className="grid grid-cols-[1fr_2fr_auto] items-center gap-4 px-2">
                                    <Label className="text-right text-[10px] font-black uppercase opacity-50">Minutes</Label>
                                    <Slider
                                        value={[props.timerSettings.duration / 60]}
                                        min={0}
                                        max={30}
                                        step={5}
                                        onValueChange={(v) => props.handleTimerDurationChange(v[0])}
                                        disabled={props.timerSettings.isActive}
                                    />
                                    <span className="text-xs w-10 text-right font-mono font-bold text-primary">{props.timerSettings.duration / 60}</span>
                                </div>
                                <Button
                                    onClick={() => {
                                        props.handleToggleTimer();
                                        if (!props.timerSettings.isActive) setIsTimerDialogOpen(false);
                                    }}
                                    disabled={props.timerSettings.duration === 0}
                                    variant={props.timerSettings.isActive ? 'destructive' : 'default'}
                                    className="w-full h-12 font-black uppercase tracking-widest text-xs shadow-lg"
                                >
                                    {props.timerSettings.isActive ? `Stop Timer` : 'Activate Timer'}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </footer>
            </div>

            {/* Modals */}
            <Dialog open={isStudioOpen} onOpenChange={setIsStudioOpen}>
                <DialogContent className="sm:max-w-xl bg-card border-primary/20 shadow-2xl">
                    <DialogHeader><DialogTitle className="font-black uppercase text-primary flex items-center gap-2"><Mic2 className="h-5 w-5"/> Studio Mixer</DialogTitle></DialogHeader>
                    <div className="flex justify-between items-end h-48 gap-2 py-4">{MIXER_CHANNELS.map(ch => {
                        const vol = ch.key === 'master' ? props.calibrationGains.master : (ch.key === 'drums' ? props.drumSettings.volume : (['sparkles','sfx'].includes(ch.key) ? (props.textureSettings as any)[ch.key].volume : (props.instrumentSettings as any)[ch.key]?.volume ?? 0.5));
                        return (<div key={ch.key} className="flex flex-col items-center gap-2 flex-1 h-full group"><span className="text-[8px] font-mono opacity-50">{Math.round(vol * 100)}</span><Slider orientation="vertical" value={[vol]} max={ch.key === 'master' ? 1.5 : 1.0} step={0.01} onValueChange={v => { if(ch.key === 'master') props.handleCalibrationChange('master', v[0]); else props.handleVolumeChange(ch.key as any, v[0]); }} className="h-full" /><span className="text-[8px] font-black uppercase opacity-50 group-hover:text-primary">{ch.label}</span></div>);
                    })}</div>
                    <PresetManager title="Mixer" presets={props.mixerPresets} onSave={props.saveMixerPreset} onLoad={props.loadMixerPreset} onDelete={props.deleteMixerPreset} />
                </DialogContent>
            </Dialog>

            <Dialog open={isEqOpen} onOpenChange={setIsEqOpen}>
                <DialogContent className="sm:max-w-md bg-card border-primary/20 shadow-2xl">
                    <DialogHeader><DialogTitle className="font-black uppercase text-primary flex items-center gap-2"><Sliders className="h-5 w-5" /> Equalizer</DialogTitle></DialogHeader>
                    <div className="flex justify-around items-end pt-4 h-48">{EQ_BANDS.map((band, index) => (<div key={index} className="flex flex-col items-center justify-end space-y-2 flex-1 h-full group"><span className="text-[10px] font-mono text-muted-foreground">{props.eqSettings[index] > 0 ? '+' : ''}{props.eqSettings[index].toFixed(1)}</span><Slider value={[props.eqSettings[index]]} min={-10} max={10} step={0.5} onValueChange={v => props.handleEqChange(index, v[0])} orientation="vertical" className="h-32" /><Label className="text-[10px] font-black uppercase opacity-50 group-hover:text-primary">{band.label}</Label></div>))}</div>
                    <PresetManager title="EQ" presets={props.eqPresets} onSave={props.saveEqPreset} onLoad={props.loadEqPreset} onDelete={props.deleteEqPreset} />
                </DialogContent>
            </Dialog>

            <Dialog open={isSpectrumOpen} onOpenChange={setIsSpectrumOpen}>
                <DialogContent className="sm:max-w-2xl bg-card border-primary/20"><DialogHeader><DialogTitle className="font-black uppercase text-primary">Spectrum Monitor</DialogTitle></DialogHeader><div className="h-64"><SpectrumAnalyzer /></div></DialogContent>
            </Dialog>
        </div>
    );
}
