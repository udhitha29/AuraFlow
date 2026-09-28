import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useDragControls } from 'framer-motion';
import { useTheme } from './ThemeContext';
import ReactPlayer from 'react-player';

const LocalizationPage = () => {
    const { isDark, toggleTheme } = useTheme();
    const [file, setFile] = useState(null);
    const [videoUrl, setVideoUrl] = useState(null);
    const [metaData, setMetaData] = useState({ width: 0, height: 0, duration: 0, ratio: 'Unknown' });
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isExtracting, setIsExtracting] = useState(false);
    const playerRef = useRef(null);
    const videoRef = useRef(null); // Keep for compatibility if needed or removed
    const waveformRef = useRef(null);

    // Settings State
    const [outputRatio, setOutputRatio] = useState('original');
    const [activeFeatures, setActiveFeatures] = useState(new Set(['voice', 'subs']));
    const [targetLanguage, setTargetLanguage] = useState(''); // Keep for compatibility or remove if fully replaced
    const [selectedLanguages, setSelectedLanguages] = useState([]);
    const [selectedTracks, setSelectedTracks] = useState(new Set()); // For timeline selection
    const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
    const [langSearch, setLangSearch] = useState('');
    const dropdownRef = useRef(null);
    const [showProperties, setShowProperties] = useState(false);
    const [activeTool, setActiveTool] = useState(0);

    const LANGUAGES = [
        "English (US)", "English (UK)", "Spanish", "French", "German",
        "Italian", "Portuguese", "Japanese", "Chinese (Mandarin)", "Korean",
        "Russian", "Arabic", "Hindi", "Turkish", "Dutch",
        "Polish", "Swedish", "Indonesian", "Vietnamese", "Thai"
    ];

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsLangDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleLanguage = (lang) => {
        if (selectedLanguages.includes(lang)) {
            setSelectedLanguages(selectedLanguages.filter(l => l !== lang));
        } else {
            setSelectedLanguages([...selectedLanguages, lang]);
        }
    };

    const selectAllLanguages = () => {
        if (selectedLanguages.length === LANGUAGES.length) {
            setSelectedLanguages([]);
        } else {
            setSelectedLanguages([...LANGUAGES]);
        }
    };

    // Filtered languages based on search
    const filteredLanguages = LANGUAGES.filter(lang =>
        lang.toLowerCase().includes(langSearch.toLowerCase())
    );
    const [substituteAudio, setSubstituteAudio] = useState(true);

    // Cleanup object URL
    useEffect(() => {
        return () => {
            if (videoUrl) URL.revokeObjectURL(videoUrl);
        };
    }, [videoUrl]);

    const extractAudioWaveform = async (fileBlob) => {
        setIsExtracting(true);
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const arrayBuffer = await fileBlob.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            drawWaveform(audioBuffer);
        } catch (error) {
            console.error("Audio extraction failed:", error);
        } finally {
            setIsExtracting(false);
        }
    };

    const drawWaveform = (buffer) => {
        const canvas = waveformRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const data = buffer.getChannelData(0);
        const step = Math.ceil(data.length / width);
        const amp = height / 2;

        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#ec4899'; // accent-secondary
        ctx.beginPath();

        for (let i = 0; i < width; i++) {
            let min = 1.0;
            let max = -1.0;
            for (let j = 0; j < step; j++) {
                const datum = data[(i * step) + j];
                if (datum < min) min = datum;
                if (datum > max) max = datum;
            }
            ctx.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
        }
    };

    const handleFile = (selectedFile) => {
        if (!selectedFile) return;
        setFile(selectedFile);
        const url = URL.createObjectURL(selectedFile);
        setVideoUrl(url);
        setShowProperties(true); // Open properties panel

        // Trigger Audio Extraction
        setTimeout(() => extractAudioWaveform(selectedFile), 500);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleMetadata = (duration) => {
        setMetaData(prev => ({ ...prev, duration }));
    };

    const handleProgress = (state) => {
        setCurrentTime(state.playedSeconds);
    };

    const togglePlay = () => {
        setIsPlaying(!isPlaying);
    };

    const handleSeek = (e) => {
        const time = Number(e.target.value);
        if (playerRef.current) {
            playerRef.current.seekTo(time);
            setCurrentTime(time);
        }
    };

    const formatTime = (time) => {
        if (!time) return "00:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const startProcessing = () => {
        if (!file) return;
        setProcessing(true);
        // Mock processing
        const interval = setInterval(() => {
            setProgress(p => {
                if (p >= 100) {
                    clearInterval(interval);
                    setProcessing(false);
                    return 100;
                }
                return p + 1;
            });
        }, 50);
    };

    const toggleFeature = (id) => {
        const newSet = new Set(activeFeatures);
        newSet.has(id) ? newSet.delete(id) : newSet.add(id);
        setActiveFeatures(newSet);
    };

    const features = [
        { id: 'voice', label: 'AI Voice Cloning', icon: 'graphic_eq' },
        { id: 'subs', label: 'Smart Subtitles', icon: 'subtitles' },
        { id: 'translate', label: 'Full Translation', icon: 'translate' },
        { id: 'lipsync', label: 'Lip Sync (Beta)', icon: 'face_retouching_natural' },
    ];

    return (
        <div className="h-screen flex flex-col font-['Plus_Jakarta_Sans',_sans-serif] bg-theme-primary text-theme-primary overflow-hidden selection:bg-[var(--accent-primary)] selection:text-white relative">

            {/* Background Blobs */}
            <div className="blob-bg blob-1"></div>
            <div className="blob-bg blob-2"></div>

            {/* Top Navigation */}
            <header className="h-14 bg-theme-secondary border-b border-theme flex items-center justify-between px-4 z-50 shrink-0">
                <div className="flex items-center gap-4">
                    <Link to="/" className="w-8 h-8 flex items-center justify-center rounded hover:bg-theme-surface text-theme-secondary transition-colors">
                        <span className="material-symbols-rounded">arrow_back</span>
                    </Link>
                    <div className="w-[1px] h-6 bg-theme-surface"></div>
                    <div className="flex items-center gap-2">
                        <img src="/auraflow.png" alt="AuraFlow Logo" className="h-8" />
                    </div>
                    {/* Folder/Upload Options */}
                    <div className="flex bg-theme-surface rounded p-0.5 border border-theme ml-4">
                        <button
                            onClick={() => document.getElementById('file-upload').click()}
                            className="flex items-center gap-2 px-3 py-1 hover:bg-theme-primary rounded text-xs font-medium transition-colors"
                        >
                            <span className="material-symbols-rounded text-sm">upload_file</span>
                            File
                        </button>
                        <button className="flex items-center gap-2 px-3 py-1 hover:bg-theme-primary rounded text-xs font-medium transition-colors">
                            <span className="material-symbols-rounded text-sm">folder_open</span>
                            Folder
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="hidden md:flex items-center gap-2 text-xs text-theme-tertiary mr-4 bg-theme-surface px-3 py-1.5 rounded border border-theme">
                        <span className="material-symbols-rounded text-sm">cloud_queue</span>
                        <span>Auto-Save: ON</span>
                    </div>
                    <button onClick={toggleTheme} className="w-8 h-8 flex items-center justify-center rounded hover:bg-theme-surface text-theme-secondary">
                        <span className="material-symbols-rounded">{isDark ? 'light_mode' : 'dark_mode'}</span>
                    </button>
                    <button
                        onClick={startProcessing}
                        disabled={!file || processing || selectedLanguages.length === 0}
                        className={`thunder-btn px-5 py-1.5 rounded text-sm font-bold flex items-center gap-2 transition-all
                           ${(file && !processing && selectedLanguages.length > 0)
                                ? 'bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white shadow-lg shadow-[var(--accent-primary)]/30'
                                : 'bg-theme-surface text-theme-tertiary cursor-not-allowed'}`}
                    >
                        {processing ? (
                            <>
                                <span className="material-symbols-rounded animate-spin text-sm">progress_activity</span>
                                LOCALIZING {Math.round(progress)}%
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-rounded text-sm">{(file && selectedLanguages.length > 0) ? 'bolt' : 'rocket_launch'}</span>
                                {selectedLanguages.length > 0 ? 'LOCALIZE' : 'EXPORT'}
                            </>
                        )}
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">

                {/* Left Sidebar - Tools */}
                <div className="w-16 bg-theme-secondary border-r border-theme flex flex-col items-center py-4 gap-4 shrink-0 z-40">
                    {[
                        { icon: 'movie', label: 'Media' },
                        { icon: 'tune', label: 'Adjust' },
                        { icon: 'graphic_eq', label: 'Audio' },
                        { icon: 'style', label: 'Effects' },
                        { icon: 'settings', label: 'Config' }
                    ].map((tool, i) => (
                        <button key={i} className={`group relative w-10 h-10 rounded-xl flex items-center justify-center transition-all ${i === 0 ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]' : 'text-theme-tertiary hover:text-theme-primary hover:bg-theme-surface'}`}>
                            <span className="material-symbols-rounded">{tool.icon}</span>
                            <span className="absolute left-10 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 ml-2">
                                {tool.label}
                            </span>
                        </button>
                    ))}
                    <div className="mt-auto mb-2 text-[10px] font-mono text-theme-tertiary">v2.4</div>
                </div>

                {/* Center - Viewport */}
                <div className="flex-1 flex flex-col bg-theme-surface relative overflow-y-auto scrollbar-thin scrollbar-thumb-theme-border scrollbar-track-transparent">

                    {/* Viewport Info Bar */}
                    {file && (
                        <div className="h-10 bg-theme-secondary/50 backdrop-blur border-b border-theme flex items-center px-4 justify-between text-xs font-mono text-theme-tertiary z-10 shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1">
                                    <span className="material-symbols-rounded text-sm">aspect_ratio</span>
                                    <span className="text-theme-primary">{metaData.width > 0 ? `${metaData.width}x${metaData.height}` : '--'}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="material-symbols-rounded text-sm">schedule</span>
                                    <span className="text-theme-primary">{metaData.duration > 0 ? `${metaData.duration.toFixed(1)}s` : '--'}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="material-symbols-rounded text-sm">crop</span>
                                    <span className="text-[var(--accent-secondary)]">{metaData.ratio}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button className="hover:text-white transition-colors" title="Zoom In">+</button>
                                <span className="text-theme-primary">100%</span>
                                <button className="hover:text-white transition-colors" title="Zoom Out">-</button>
                            </div>
                        </div>
                    )}

                    {/* Canvas Area */}
                    <div className="flex-1 flex items-center justify-center p-8 overflow-hidden relative"
                        onDrop={handleDrop}
                        onDragOver={(e) => e.preventDefault()}
                    >
                        {/* Background Grid - Only show when editing */}
                        {file && (
                            <div className="absolute inset-0 opacity-20 pointer-events-none"
                                style={{ backgroundImage: 'radial-gradient(circle, var(--text-tertiary) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                        )}

                        {videoUrl ? (
                            <div className="flex flex-col w-full max-w-5xl mx-auto gap-6 px-4 py-8">
                                <div className="relative group w-full aspect-video rounded-xl overflow-hidden flex items-center justify-center bg-black shadow-2xl border border-theme shrink-0">
                                    <ReactPlayer
                                        ref={playerRef}
                                        url={videoUrl}
                                        playing={isPlaying}
                                        volume={volume}
                                        onProgress={handleProgress}
                                        onDuration={handleMetadata}
                                        onEnded={() => setIsPlaying(false)}
                                        width="100%"
                                        height="100%"
                                        className="object-contain"
                                    />

                                    {/* Professional Controls Overlay */}
                                    <div className="absolute inset-0 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                                        {/* Top Shade */}
                                        <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-black/60 to-transparent pointer-events-none"></div>

                                        {/* Center Play Button (Only visible when paused) */}
                                        {!isPlaying && (
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
                                                <button
                                                    onClick={togglePlay}
                                                    className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-red-600 hover:border-red-600 hover:scale-110 transition-all duration-300 shadow-xl"
                                                >
                                                    <span className="material-symbols-rounded text-5xl text-white ml-2">play_arrow</span>
                                                </button>
                                            </div>
                                        )}

                                        {/* Bottom Controls Bar */}
                                        <div className="bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 pb-2 pointer-events-auto">
                                            {/* Progress Bar - YouTube Red */}
                                            <div className="group/progress relative h-1 bg-white/20 cursor-pointer hover:h-1.5 transition-all mb-2">
                                                <div
                                                    className="absolute top-0 left-0 bottom-0 bg-[#ff0000] relative"
                                                    style={{ width: `${(currentTime / (metaData.duration || 1)) * 100}%` }}
                                                >
                                                    <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-3 h-3 bg-[#ff0000] rounded-full scale-0 group-hover/progress:scale-100 transition-all"></div>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max={metaData.duration || 100}
                                                    value={currentTime}
                                                    onChange={handleSeek}
                                                    className="absolute inset-0 w-full opacity-0 cursor-pointer"
                                                />
                                            </div>

                                            <div className="flex items-center justify-between text-white pb-1">
                                                <div className="flex items-center gap-4">
                                                    <button onClick={togglePlay} className="hover:scale-110 transition-transform">
                                                        <span className="material-symbols-rounded text-2xl">{isPlaying ? 'pause' : 'play_arrow'}</span>
                                                    </button>

                                                    <button className="hover:scale-110 transition-transform">
                                                        <span className="material-symbols-rounded text-2xl">skip_next</span>
                                                    </button>

                                                    <div className="flex items-center gap-2 group/vol">
                                                        <span className="material-symbols-rounded text-2xl">volume_up</span>
                                                        <input
                                                            type="range" min="0" max="1" step="0.1"
                                                            value={volume} onChange={(e) => { setVolume(e.target.value); }}
                                                            className="w-0 overflow-hidden group-hover/vol:w-16 transition-all h-1 bg-white/30 rounded-lg appearance-none cursor-pointer"
                                                        />
                                                    </div>

                                                    <div className="text-[11px] font-medium opacity-90 select-none">
                                                        {formatTime(currentTime)} / {formatTime(metaData.duration)}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    <button className="hover:text-red-500 transition-colors">
                                                        <span className="material-symbols-rounded text-xl">closed_caption</span>
                                                    </button>
                                                    <button className="hover:rotate-45 transition-transform">
                                                        <span className="material-symbols-rounded text-xl">settings</span>
                                                    </button>
                                                    <button className="hover:scale-110 transition-transform">
                                                        <span className="material-symbols-rounded text-xl">ad_units</span>
                                                    </button>
                                                    <button className="hover:scale-110 transition-transform">
                                                        <span className="material-symbols-rounded text-xl">fullscreen</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* YouTube Video Info Section */}
                                <div className="space-y-4 pb-12">
                                    <h1 className="text-2xl font-bold text-white leading-tight">
                                        {file?.name || "Marvel Studios' Avengers - Official Trailer"}
                                    </h1>

                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-red-600 to-orange-400 flex items-center justify-center shrink-0">
                                                <span className="material-symbols-rounded text-white">person</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-sm text-white flex items-center gap-1">
                                                    Aura Studio
                                                    <span className="material-symbols-rounded text-[14px] text-theme-tertiary">check_circle</span>
                                                </span>
                                                <span className="text-[12px] text-theme-tertiary">1.2M subscribers</span>
                                            </div>
                                            <button className="ml-4 bg-white text-black px-4 py-2 rounded-full text-sm font-bold hover:bg-white/90 transition-all">
                                                Subscribe
                                            </button>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center bg-white/10 rounded-full overflow-hidden border border-white/10">
                                                <button className="flex items-center gap-2 px-4 py-2 hover:bg-white/20 transition-all border-r border-white/10">
                                                    <span className="material-symbols-rounded text-xl">thumb_up</span>
                                                    <span className="text-sm font-bold">142K</span>
                                                </button>
                                                <button className="px-4 py-2 hover:bg-white/20 transition-all">
                                                    <span className="material-symbols-rounded text-xl">thumb_down</span>
                                                </button>
                                            </div>
                                            <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full border border-white/10 transition-all text-sm font-bold text-white">
                                                <span className="material-symbols-rounded text-xl">share</span>
                                                Share
                                            </button>
                                            <button className="bg-white/10 hover:bg-white/20 w-10 h-10 flex items-center justify-center rounded-full border border-white/10 transition-all text-white">
                                                <span className="material-symbols-rounded text-xl">more_horiz</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Description Box */}
                                    <div className="bg-white/10 rounded-xl p-4 text-sm text-white/90 hover:bg-white/15 cursor-pointer transition-all">
                                        <div className="font-bold space-x-2 text-white">
                                            <span>1.2M views</span>
                                            <span>2 hours ago</span>
                                            <span className="text-theme-tertiary">#localization #aura #ai</span>
                                        </div>
                                        <p className="mt-1 line-clamp-2">
                                            Experience the future of media with AuraStudio. Localizing content has never been this easy using our advanced AI cloning and translation engine.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div
                                className="group relative cursor-pointer flex flex-col items-center justify-center p-12 rounded-[2.5rem] border-2 border-dashed border-[var(--accent-primary)]/30 hover:border-[var(--accent-primary)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-surface)] transition-all text-center max-w-xl w-full overflow-hidden"
                                onClick={() => document.getElementById('file-upload').click()}
                            >
                                {/* Decorative Blobs */}
                                <div className="absolute -top-10 -left-10 w-40 h-40 bg-[var(--accent-primary)]/10 rounded-full blur-[80px] pointer-events-none group-hover:bg-[var(--accent-primary)]/20 transition-all duration-500"></div>
                                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[var(--accent-secondary)]/10 rounded-full blur-[80px] pointer-events-none group-hover:bg-[var(--accent-secondary)]/20 transition-all duration-500"></div>

                                {/* SVG Shapes - Edge Cutting (User Provided) */}
                                <svg className="absolute top-0 right-0 w-32 h-32 transform translate-x-10 -translate-y-10 group-hover:rotate-12 transition-transform duration-700 opacity-20" viewBox="0 0 100 100">
                                    <defs>
                                        <linearGradient id="sw-gradient-1" x1="0" x2="1" y1="1" y2="0">
                                            <stop stopColor="rgba(248, 117, 55, 1)" offset="0%"></stop>
                                            <stop stopColor="rgba(251, 168, 31, 1)" offset="100%"></stop>
                                        </linearGradient>
                                    </defs>
                                    <path fill="url(#sw-gradient-1)" d="M34.5,-19.4C41.1,-8.4,40.5,7.3,33.6,19.3C26.6,31.2,13.3,39.3,0.9,38.8C-11.5,38.3,-22.9,29.1,-29.9,17.1C-36.8,5.2,-39.2,-9.4,-33.5,-19.9C-27.7,-30.3,-13.9,-36.6,0,-36.7C13.9,-36.7,27.8,-30.4,34.5,-19.4Z" transform="translate(50 50)"></path>
                                </svg>
                                <svg className="absolute bottom-0 left-0 w-40 h-40 transform -translate-x-10 translate-y-10 group-hover:-rotate-12 transition-transform duration-700 opacity-20" viewBox="0 0 100 100">
                                    <defs>
                                        <linearGradient id="sw-gradient-2" x1="0" x2="1" y1="1" y2="0">
                                            <stop stopColor="rgba(248, 117, 55, 1)" offset="0%"></stop>
                                            <stop stopColor="rgba(251, 168, 31, 1)" offset="100%"></stop>
                                        </linearGradient>
                                    </defs>
                                    <path fill="url(#sw-gradient-2)" d="M20.1,10.3C14.2,21.9,-10.7,21.2,-17.3,9.3C-23.8,-2.6,-11.9,-25.9,0.6,-25.5C13,-25.2,26.1,-1.3,20.1,10.3Z" transform="translate(50 50)"></path>
                                </svg>

                                <input id="file-upload" type="file" className="hidden" onChange={(e) => handleFile(e.target.files[0])} accept="video/*" />

                                <div className="relative z-10 flex flex-col items-center gap-6">
                                    <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-[var(--accent-primary)] to-[var(--accent-secondary)] p-[1px] group-hover:scale-105 transition-transform duration-300">
                                        <div className="w-full h-full rounded-[23px] bg-[var(--bg-secondary)] flex items-center justify-center">
                                            <span className="material-symbols-rounded text-5xl text-transparent bg-clip-text bg-gradient-to-tr from-[var(--accent-primary)] to-[var(--accent-secondary)]">
                                                cloud_upload
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <h3 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">
                                            Upload Video
                                        </h3>
                                        <p className="text-[var(--text-secondary)] text-sm max-w-[240px] mx-auto leading-relaxed">
                                            Drag & drop your file here or click to browse for local media
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-3 text-[10px] font-mono text-[var(--text-tertiary)] border border-[var(--border-subtle)] rounded-full px-4 py-1.5 bg-[var(--bg-surface)] backdrop-blur-sm">
                                        <span className="text-[var(--text-tertiary)]">MP4</span>
                                        <div className="w-1 h-1 rounded-full bg-[var(--text-tertiary)]"></div>
                                        <span className="text-[var(--text-tertiary)]">MOV</span>
                                        <div className="w-1 h-1 rounded-full bg-[var(--text-tertiary)]"></div>
                                        <span className="text-[var(--text-tertiary)]">MKV</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Timeline Strip - Professional Edition */}
                    {file && (
                        <div className="h-auto min-h-[220px] bg-[var(--bg-secondary)] border-t border-[var(--border-subtle)] flex flex-col shrink-0 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] z-30">
                            {/* Timeline Header & Controls */}
                            <div className="h-10 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] flex items-center justify-between px-4 z-20 sticky top-0">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => {
                                                if (selectedTracks.size === 2) setSelectedTracks(new Set());
                                                else setSelectedTracks(new Set(['video-main', 'audio-main']));
                                            }}
                                            className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${selectedTracks.size === 2 ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]' : 'border-[var(--text-tertiary)] hover:border-[var(--text-secondary)]'}`}
                                        >
                                            {selectedTracks.size === 2 && <span className="material-symbols-rounded text-[10px] text-white">check</span>}
                                        </button>
                                        <span className="text-xs font-medium text-[var(--text-secondary)]">Select All Tracks</span>
                                    </div>
                                    <div className="h-4 w-[1px] bg-[var(--border-subtle)]"></div>
                                    <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
                                        <span className="material-symbols-rounded text-sm">zoom_in</span>
                                        <div className="w-20 h-1 bg-[var(--border-subtle)] rounded-full overflow-hidden">
                                            <div className="w-1/3 h-full bg-[var(--accent-primary)] rounded-full"></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="font-mono text-xs text-[var(--accent-primary)] font-bold tracking-wider bg-[var(--bg-surface)] border border-[var(--border-subtle)] px-3 py-1 rounded shadow-sm">
                                    {formatTime(currentTime)} <span className="text-[var(--text-tertiary)]">/ {formatTime(metaData.duration)}</span>
                                </div>
                            </div>

                            {/* Timeline Content */}
                            <div className="flex-1 relative overflow-x-auto overflow-y-hidden select-none custom-scrollbar p-4" style={{ backgroundImage: 'linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px)', backgroundSize: '100px 100%' }}>
                                <div className="min-w-full relative h-full flex flex-col pb-4">

                                    {/* Ruler */}
                                    <div className="h-6 border-b border-[var(--border-subtle)] flex relative mb-2 opacity-50">
                                        {[...Array(20)].map((_, i) => (
                                            <div key={i} className="flex-1 border-r border-[var(--border-subtle)] h-full relative" >
                                                <span className="absolute top-1 right-1 text-[9px] text-[var(--text-tertiary)] font-mono">00:{(i * 5).toString().padStart(2, '0')}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Track Container */}
                                    <div className="space-y-3 flex-1">

                                        {/* Video Track */}
                                        <div
                                            className={`h-14 rounded-xl border flex items-center relative overflow-hidden transition-all group shadow-sm
                                                ${selectedTracks.has('video-main')
                                                    ? 'bg-[var(--bg-surface)] border-[var(--accent-primary)] ring-1 ring-[var(--accent-primary)]/50'
                                                    : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--text-tertiary)]'}`}
                                            onClick={() => {
                                                const newSet = new Set(selectedTracks);
                                                newSet.has('video-main') ? newSet.delete('video-main') : newSet.add('video-main');
                                                setSelectedTracks(newSet);
                                            }}
                                        >
                                            <div className="w-12 h-full border-r border-[var(--border-subtle)] flex items-center justify-center bg-[var(--bg-secondary)] z-20 shrink-0">
                                                <span className={`material-symbols-rounded text-xl ${selectedTracks.has('video-main') ? 'text-[var(--accent-primary)]' : 'text-[var(--text-tertiary)]'}`}>videocam</span>
                                            </div>
                                            <div className="flex-1 relative h-full">
                                                <div className="absolute inset-0 bg-[var(--accent-primary)]/5 flex items-center px-3 gap-2">
                                                    <div className="flex gap-0.5 opacity-40">
                                                        {[...Array(15)].map((_, i) => (
                                                            <div key={i} className="w-8 h-8 bg-[var(--accent-primary)]/10 rounded-sm"></div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <span className="absolute left-3 top-3 z-30 text-xs font-bold text-[var(--text-primary)] drop-shadow-sm truncate max-w-[200px] bg-[var(--bg-surface)]/80 px-2 py-0.5 rounded backdrop-blur-sm">
                                                    {file.name}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Audio Track */}
                                        <div
                                            className={`h-24 rounded-xl border flex items-center relative overflow-hidden transition-all group shadow-sm
                                                ${selectedTracks.has('audio-main')
                                                    ? 'bg-[var(--bg-surface)] border-[var(--accent-secondary)] ring-1 ring-[var(--accent-secondary)]/50'
                                                    : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--text-tertiary)]'}`}
                                            onClick={() => {
                                                const newSet = new Set(selectedTracks);
                                                newSet.has('audio-main') ? newSet.delete('audio-main') : newSet.add('audio-main');
                                                setSelectedTracks(newSet);
                                            }}
                                        >
                                            <div className="w-12 h-full border-r border-[var(--border-subtle)] flex items-center justify-center bg-[var(--bg-secondary)] z-20 shrink-0">
                                                <span className={`material-symbols-rounded text-xl ${selectedTracks.has('audio-main') ? 'text-[var(--accent-secondary)]' : 'text-[var(--text-tertiary)]'}`}>graphic_eq</span>
                                            </div>
                                            <div className="flex-1 relative h-full group-hover:bg-[var(--bg-secondary)]/50 transition-colors">
                                                {/* Waveform Canvas */}
                                                <canvas ref={waveformRef} width="1000" height="96" className="absolute inset-0 w-full h-full opacity-80 mix-blend-multiply dark:mix-blend-screen"></canvas>

                                                {isExtracting && (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-surface)]/80 z-30 backdrop-blur-sm">
                                                        <span className="text-xs text-[var(--accent-secondary)] font-bold flex items-center gap-2 animate-pulse">
                                                            <span className="material-symbols-rounded animate-spin">sync</span>
                                                            Generating Waveform...
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                    </div>

                                    {/* Framer Motion Playhead */}
                                    <div className="absolute top-0 bottom-0 left-0 right-0 pointer-events-none z-50">
                                        <motion.div
                                            className="absolute top-0 bottom-0 w-[2px] bg-[var(--accent-primary)] shadow-[0_0_15px_var(--accent-primary)] z-50"
                                            animate={{ left: `${(currentTime / (metaData.duration || 1)) * 100}%` }}
                                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                        >
                                            <div className="absolute -top-1 -left-[6px] w-[14px] h-4 bg-[var(--accent-primary)] rounded-b-md shadow-md flex justify-center items-end pb-[2px]">
                                                <div className="w-[2px] h-2 bg-white/50 rounded-full"></div>
                                            </div>
                                        </motion.div>
                                    </div>

                                </div>
                            </div>
                        </div>
                    )}

                    {/* Floating Toggle Button - Neat & Minimal */}
                    <div className={`absolute bottom-6 right-6 z-50 transition-all duration-500 ${showProperties ? 'translate-x-[200px]' : 'translate-x-0'}`}>
                        <button
                            onClick={() => setShowProperties(true)}
                            className="w-14 h-14 bg-[var(--accent-primary)] text-white shadow-lg hover:shadow-[var(--accent-primary)]/50 hover:scale-105 active:scale-95 flex items-center justify-center transition-all duration-300"
                            style={{
                                clipPath: 'polygon(20% 0%, 100% 0, 100% 100%, 0% 100%, 0% 20%)',
                                borderRadius: '0px 16px 16px 16px'
                            }}
                        >
                            <span className="material-symbols-rounded text-2xl">tune</span>
                        </button>
                    </div>

                    {/* Miniature Re-open Trigger (Visible when open? No, user said "when opne... show small icon")
                        Actually, if it's open, the panel is there. Maybe they mean the button *on* the panel?
                        No, "make the colllapsible button neat... when opne dont show it show small icon" 
                        likely means the floating button transforms. 
                    */}

                    <button
                        onClick={() => setShowProperties(!showProperties)}
                        className={`absolute bottom-6 right-6 z-50 flex items-center justify-center transition-all duration-500 ease-out border border-[var(--border-subtle)]
                            ${showProperties
                                ? 'w-8 h-8 rounded-full bg-[var(--bg-surface)] text-[var(--text-tertiary)] hover:bg-[var(--bg-secondary)] shadow-sm opacity-80 hover:opacity-100'
                                : 'opacity-0 pointer-events-none w-0 h-0 overflow-hidden'}`}
                    >
                        <span className="material-symbols-rounded text-lg">chevron_right</span>
                    </button>
                </div>

                {/* Right Inspector panel - YouTube Like */}
                <div className={`transition-all duration-300 ease-in-out border-l border-theme flex flex-col shrink-0 overflow-hidden bg-theme-surface/80 backdrop-blur-md z-40
                    ${showProperties ? 'w-[400px] opacity-100' : 'w-0 opacity-0'}`}>
                    <div className="p-4 border-b border-theme bg-theme-secondary/50 flex justify-between items-center">
                        <h3 className="font-bold text-sm text-theme-primary flex items-center gap-2">
                            <span className="material-symbols-rounded text-sm text-[var(--accent-primary)]">tune</span>
                            Studio Settings
                        </h3>
                        <button onClick={() => setShowProperties(false)} className="text-theme-tertiary hover:text-theme-primary">
                            <span className="material-symbols-rounded text-lg">close</span>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin scrollbar-thumb-theme-border">

                        {/* YouTube Style Branding Header */}
                        <div className="flex gap-6 items-start">
                            <div className="w-16 h-16 bg-red-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-red-600/20">
                                <span className="material-symbols-rounded text-white text-3xl">play_circle</span>
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-2xl font-bold leading-tight text-white">
                                    AuraStudio <br /> Pro Features:
                                </h2>
                            </div>
                        </div>

                        {/* Feature List with Red Plus Symbols */}
                        <div className="space-y-3 pl-2">
                            {[
                                'AI Video Localization & Cloning',
                                'Sync Playback & Playlists',
                                'Dynamic Subtitles (Optional)',
                                'Preserve Vocal Emotion',
                                'Customize Export Resolution',
                                'Configurable Keyboard Shortcuts',
                                'Advanced Context Options',
                                'Pro Player Control Bar'
                            ].map((feature, idx) => (
                                <div key={idx} className="flex items-center gap-3 group">
                                    <span className="text-red-600 font-bold text-lg leading-none">+</span>
                                    <span className="text-[13px] text-theme-secondary group-hover:text-theme-primary transition-colors">
                                        {feature}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="h-px bg-theme-border opacity-50"></div>

                        {/* Output Settings */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-theme-tertiary uppercase tracking-wider">Output Layout</label>

                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { id: 'original', label: 'Original', icon: 'crop_free' },
                                    { id: '9:16', label: 'Story 9:16', icon: 'crop_portrait' },
                                    { id: '16:9', label: 'Wide 16:9', icon: 'crop_landscape' },
                                    { id: '1:1', label: 'Square 1:1', icon: 'crop_square' },
                                ].map(opt => (
                                    <button
                                        key={opt.id}
                                        onClick={() => setOutputRatio(opt.id)}
                                        className={`flex flex-col items-center gap-2 p-3 rounded border transition-all
                                            ${outputRatio === opt.id
                                                ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)] text-[var(--accent-primary)]'
                                                : 'bg-theme-secondary border-theme hover:border-[var(--text-tertiary)]'}`}
                                    >
                                        <span className="material-symbols-rounded">{opt.icon}</span>
                                        <span className="text-[10px] font-medium">{opt.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Language & Audio Settings */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-theme-tertiary uppercase tracking-wider">Localization</label>

                            <div className="space-y-1 relative" ref={dropdownRef}>
                                <label className="text-[10px] text-theme-tertiary">Target Languages</label>

                                {/* Dropdown Trigger */}
                                <div
                                    onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                                    className={`w-full bg-theme-secondary border ${isLangDropdownOpen ? 'border-[var(--accent-primary)]' : 'border-theme'} rounded px-3 py-2 text-sm text-theme-primary cursor-pointer flex items-center justify-between transition-colors hover:border-[var(--text-tertiary)]`}
                                >
                                    <div className="truncate pr-2">
                                        {selectedLanguages.length === 0
                                            ? <span className="text-theme-tertiary">Select languages...</span>
                                            : <span className="font-medium">{selectedLanguages.length} selected</span>}
                                    </div>
                                    <span className="material-symbols-rounded text-theme-tertiary text-sm">expand_more</span>
                                </div>

                                {/* Dropdown Content */}
                                {isLangDropdownOpen && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-theme-secondary border border-theme rounded-lg shadow-xl z-50 overflow-hidden flex flex-col max-h-60">

                                        {/* Search & Actions */}
                                        <div className="p-2 border-b border-theme space-y-2 bg-theme-surface">
                                            <input
                                                type="text"
                                                placeholder="Search..."
                                                value={langSearch}
                                                onChange={(e) => setLangSearch(e.target.value)}
                                                className="w-full bg-theme-secondary text-theme-primary text-xs px-2 py-1.5 rounded border border-theme focus:border-[var(--accent-primary)] outline-none"
                                                autoFocus
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={selectAllLanguages}
                                                    className="flex-1 text-[10px] bg-theme-secondary hover:bg-theme-primary border border-theme rounded py-1 text-theme-primary transition-colors"
                                                >
                                                    {selectedLanguages.length === LANGUAGES.length ? 'None' : 'All'}
                                                </button>
                                            </div>
                                        </div>

                                        {/* List */}
                                        <div className="overflow-y-auto flex-1 p-1">
                                            {filteredLanguages.length > 0 ? (
                                                filteredLanguages.map(lang => (
                                                    <div
                                                        key={lang}
                                                        onClick={() => toggleLanguage(lang)}
                                                        className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-xs transition-colors
                                                            ${selectedLanguages.includes(lang)
                                                                ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] font-bold'
                                                                : 'hover:bg-theme-surface text-theme-primary'}`}
                                                    >
                                                        <div className={`w-3 h-3 rounded-[3px] border flex items-center justify-center
                                                            ${selectedLanguages.includes(lang)
                                                                ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]'
                                                                : 'border-theme-tertiary'}`}>
                                                            {selectedLanguages.includes(lang) && <span className="material-symbols-rounded text-[10px] text-white">check</span>}
                                                        </div>
                                                        {lang}
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-2 text-center text-xs text-theme-tertiary">No results</div>
                                            )}
                                        </div>

                                        {/* Footer Summary */}
                                        <div className="px-2 py-1.5 border-t border-theme bg-theme-surface text-[10px] text-theme-tertiary text-right">
                                            {selectedLanguages.length} of {LANGUAGES.length}
                                        </div>
                                    </div>
                                )}

                                {/* Selected Tags Preview (Outside dropdown) */}
                                {selectedLanguages.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {selectedLanguages.map(lang => (
                                            <span key={lang} className="text-[10px] bg-theme-secondary border border-theme rounded px-1.5 py-0.5 text-theme-primary flex items-center gap-1">
                                                {lang}
                                                <span
                                                    onClick={(e) => { e.stopPropagation(); toggleLanguage(lang); }}
                                                    className="hover:text-red-500 cursor-pointer text-[12px] leading-none"
                                                >
                                                    x
                                                </span>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div
                                onClick={() => setSubstituteAudio(!substituteAudio)}
                                className={`flex items-center gap-3 p-3 rounded border cursor-pointer select-none transition-all
                                ${substituteAudio
                                        ? 'bg-theme-secondary border-[var(--accent-secondary)]'
                                        : 'border-theme hover:bg-theme-secondary'}`}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors
                                    ${substituteAudio ? 'bg-[var(--accent-secondary)]/20 text-[var(--accent-secondary)]' : 'bg-theme-surface text-theme-tertiary'}`}>
                                    <span className="material-symbols-rounded text-lg">graphic_eq</span>
                                </div>
                                <div className="flex-1">
                                    <div className="text-sm font-medium text-theme-primary">Substitute Audio</div>
                                    <div className="text-[10px] text-theme-tertiary leading-tight">Generate translated audio track</div>
                                </div>
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors
                                    ${substituteAudio ? 'bg-[var(--accent-secondary)] border-[var(--accent-secondary)]' : 'border-theme-tertiary'}`}>
                                    {substituteAudio && <span className="material-symbols-rounded text-sm text-black font-bold">check</span>}
                                </div>
                            </div>
                        </div>

                        {/* Processing Features */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-theme-tertiary uppercase tracking-wider">Processing Agents</label>
                            <div className="flex flex-col gap-2">
                                {features.map(f => (
                                    <div
                                        key={f.id}
                                        onClick={() => toggleFeature(f.id)}
                                        className={`flex items-center gap-3 p-3 rounded border cursor-pointer select-none transition-all
                                            ${activeFeatures.has(f.id)
                                                ? 'bg-theme-secondary border-[var(--accent-primary)]'
                                                : 'border-theme hover:bg-theme-secondary'}`}
                                    >
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors
                                            ${activeFeatures.has(f.id) ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]' : 'border-theme-tertiary'}`}>
                                            {activeFeatures.has(f.id) && <span className="material-symbols-rounded text-sm text-white">check</span>}
                                        </div>
                                        <div className="flex-1 flex items-center gap-2">
                                            <span className="material-symbols-rounded text-theme-tertiary text-lg">{f.icon}</span>
                                            <span className="text-sm font-medium text-theme-primary">{f.label}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* File Details Box */}
                        {file && (
                            <div className="p-4 rounded bg-theme-secondary border border-theme space-y-2 mt-4">
                                <div className="flex justify-between text-xs">
                                    <span className="text-theme-tertiary">Format</span>
                                    <span className="font-mono text-theme-primary uppercase">{file.type.split('/')[1] || 'MP4'}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-theme-tertiary">Size</span>
                                    <span className="font-mono text-theme-primary">
                                        {(file.size / 1048576).toFixed(2)} MB
                                    </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-theme-tertiary">Resolution</span>
                                    <span className="font-mono text-theme-primary">
                                        {metaData.width} x {metaData.height}
                                    </span>
                                </div>
                            </div>
                        )}

                    </div>
                </div>

            </div>
        </div>
    );
};

export default LocalizationPage;
