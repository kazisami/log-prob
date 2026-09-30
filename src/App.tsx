/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { TokenStep, AnalysisResponse } from './types';
import {
  Sparkles,
  Send,
  Loader2,
  Cpu,
  Clock,
  Sliders,
  Thermometer,
  Layers,
  ChevronDown,
  X,
  Calculator,
  CornerDownLeft,
  Flame,
  Zap,
} from 'lucide-react';

export default function App() {
  const [prompt, setPrompt] = useState<string>('The capital of France is');
  const [analyzedPrompt, setAnalyzedPrompt] = useState<string>('The capital of France is');
  const [steps, setSteps] = useState<TokenStep[]>([]);
  const [modelUsed, setModelUsed] = useState<string>('gemini-2.5-flash');
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Parameters
  const [maxTokens, setMaxTokens] = useState<number>(10);
  const [temperature, setTemperature] = useState<number>(1.0);
  const [topK, setTopK] = useState<number>(40);

  // Popover state for 3 param buttons
  const [openParam, setOpenParam] = useState<'tokens' | 'temp' | 'topK' | null>(null);

  // Hovered token for tooltip & inspection
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Log-prob modal data
  const [logProbModalData, setLogProbModalData] = useState<{
    token: string;
    logProbability: number;
    probability: number;
    stepIndex?: number;
  } | null>(null);

  // Refs for closing popovers on outside click
  const paramBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (paramBarRef.current && !paramBarRef.current.contains(event.target as Node)) {
        setOpenParam(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch token probabilities
  const fetchResponse = async (textToAnalyze?: string) => {
    const text = (textToAnalyze !== undefined ? textToAnalyze : prompt).trim();
    if (!text) return;

    setAnalyzedPrompt(text);
    setOpenParam(null);
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/analyze-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          maxTokens,
          temperature,
          topK,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server error (${res.status})`);
      }

      const data: AnalysisResponse = await res.json();
      if (data.steps && data.steps.length > 0) {
        setSteps(data.steps);
        setModelUsed(data.modelUsed || 'gemini-2.5-flash');
        setDurationMs(data.durationMs || null);
      } else {
        throw new Error('No token logprobs returned by Gemini API.');
      }
    } catch (err: any) {
      console.error('Error fetching token probabilities:', err);
      setError(err?.message || 'Failed to call Gemini API.');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchResponse('The capital of France is');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper color styling according to confidence level
  const getTokenConfidenceStyle = (p: number) => {
    if (p >= 0.8) {
      return {
        bg: 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/40 text-emerald-800 shadow-emerald-500/10',
        badge: 'bg-emerald-500 text-white',
        dot: 'bg-emerald-500',
        bar: 'bg-emerald-500',
        label: 'Very High (≥80%)',
      };
    }
    if (p >= 0.5) {
      return {
        bg: 'bg-sky-500/15 hover:bg-sky-500/25 border-sky-500/40 text-sky-800 shadow-sky-500/10',
        badge: 'bg-sky-500 text-white',
        dot: 'bg-sky-500',
        bar: 'bg-sky-500',
        label: 'High (50–79%)',
      };
    }
    if (p >= 0.25) {
      return {
        bg: 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/40 text-amber-900 shadow-amber-500/10',
        badge: 'bg-amber-500 text-white',
        dot: 'bg-amber-500',
        bar: 'bg-amber-500',
        label: 'Moderate (25–49%)',
      };
    }
    return {
      bg: 'bg-rose-500/15 hover:bg-rose-500/25 border-rose-500/40 text-rose-900 shadow-rose-500/10',
      badge: 'bg-rose-500 text-white',
      dot: 'bg-rose-500',
      bar: 'bg-rose-500',
      label: 'Low (<25%)',
    };
  };

  return (
    <div className="min-h-screen bg-slate-50/80 bg-radial-glow text-slate-900 font-sans flex flex-col selection:bg-blue-500/20 selection:text-blue-900 relative overflow-x-hidden">
      {/* Subtle decorative glow circles in background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[720px] h-[340px] bg-gradient-to-b from-blue-400/10 via-indigo-300/5 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Modern Frosted Header */}
      <header className="backdrop-blur-md bg-white/75 border-b border-slate-200/80 px-6 py-3.5 sticky top-0 z-30 shadow-xs transition-all">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3 group cursor-default">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform duration-300">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-slate-900 tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 bg-clip-text text-transparent">
                  TokenLens
                </h1>
                <span className="text-[10px] font-bold font-mono tracking-wider uppercase px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200/60">
                  Live Probabilities
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/90 border border-slate-200 text-xs font-mono text-slate-700 shadow-2xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Cpu className="w-3.5 h-3.5 text-blue-600 ml-0.5" />
              <span className="font-semibold">{modelUsed.replace(/\s*\(.*?\)\s*/g, '').trim()}</span>
            </div>
            {durationMs && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 font-mono px-2 py-1 rounded-md bg-slate-100/70 border border-slate-200/60">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{(durationMs / 1000).toFixed(2)}s</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Centered Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-10 space-y-7">
        {/* PROMPT BOX IN THE MIDDLE WITH 4 BOTTOM BUTTONS */}
        <div className="relative group">
          {/* Subtle gradient backlight on focus */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-purple-500/20 rounded-3xl blur-md opacity-0 group-focus-within:opacity-100 transition duration-500 pointer-events-none" />

          <div className="relative bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-sm transition-all duration-300 group-focus-within:border-blue-400 group-focus-within:shadow-xl group-focus-within:shadow-blue-500/5">
            <div className="p-5 sm:p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                  Input Prompt
                </span>
                <span className="text-[11px] font-mono text-slate-400 hidden sm:inline-flex items-center gap-1">
                  <span>Press</span>
                  <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 bg-slate-100 border border-slate-300 rounded shadow-2xs">⌘ + Enter</kbd>
                  <span>to run</span>
                </span>
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    fetchResponse();
                  }
                }}
                rows={4}
                placeholder="Enter your prompt here (e.g., 'The capital of France is')..."
                className="w-full bg-transparent text-slate-900 placeholder-slate-400 text-base font-mono resize-none focus:outline-none leading-relaxed transition-colors"
              />
            </div>

            {/* BOTTOM BUTTONS BAR */}
            <div
              ref={paramBarRef}
              className="border-t border-slate-100/90 px-4 py-3 bg-gradient-to-b from-slate-50/50 to-slate-100/60 rounded-b-2xl flex flex-wrap items-center justify-between gap-3 relative"
            >
              {/* Left 3 Param Buttons */}
              <div className="flex items-center gap-2 relative">
                {/* BUTTON 1: Tokens */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenParam(openParam === 'tokens' ? null : 'tokens')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold font-mono border transition-all duration-200 cursor-pointer ${
                      openParam === 'tokens'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25 scale-[1.02]'
                        : 'bg-white text-slate-700 border-slate-200/90 hover:bg-blue-50/60 hover:text-blue-700 hover:border-blue-200 shadow-2xs hover:scale-[1.02] active:scale-[0.98]'
                    }`}
                  >
                    <Sliders className={`w-3.5 h-3.5 ${openParam === 'tokens' ? 'text-white' : 'text-blue-600'}`} />
                    <span>Tokens: <strong>{maxTokens}</strong></span>
                    <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${openParam === 'tokens' ? 'rotate-180 text-white' : 'text-slate-400'}`} />
                  </button>

                  {/* Tokens Popover */}
                  {openParam === 'tokens' && (
                    <div className="absolute left-0 bottom-full mb-3 w-76 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-2xl p-4 z-40 animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1.5">
                          <Sliders className="w-3.5 h-3.5 text-blue-600" />
                          <span className="text-xs font-bold text-slate-800">Tokens to Generate</span>
                        </div>
                        <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                          {maxTokens} tokens
                        </span>
                      </div>

                      <input
                        type="range"
                        min={1}
                        max={60}
                        step={1}
                        value={maxTokens}
                        onChange={(e) => setMaxTokens(Number(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                      <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1">
                        <span>1</span>
                        <span>15</span>
                        <span>30</span>
                        <span>45</span>
                        <span>60</span>
                      </div>

                      <div className="mt-3.5 pt-3 border-t border-slate-100">
                        <span className="text-[11px] text-slate-500 block mb-2 font-medium">Quick Presets:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {[5, 10, 15, 20, 30, 45, 60].map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => {
                                setMaxTokens(t);
                                setOpenParam(null);
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all duration-150 cursor-pointer ${
                                maxTokens === t
                                  ? 'bg-blue-600 text-white shadow-xs scale-105'
                                  : 'bg-slate-100/80 hover:bg-blue-50 hover:text-blue-700 text-slate-700'
                              }`}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* BUTTON 2: Temp */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenParam(openParam === 'temp' ? null : 'temp')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold font-mono border transition-all duration-200 cursor-pointer ${
                      openParam === 'temp'
                        ? 'bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-500/25 scale-[1.02]'
                        : 'bg-white text-slate-700 border-slate-200/90 hover:bg-rose-50/60 hover:text-rose-700 hover:border-rose-200 shadow-2xs hover:scale-[1.02] active:scale-[0.98]'
                    }`}
                  >
                    <Thermometer className={`w-3.5 h-3.5 ${openParam === 'temp' ? 'text-white' : 'text-rose-500'}`} />
                    <span>Temp: <strong>{temperature.toFixed(1)}</strong></span>
                    <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${openParam === 'temp' ? 'rotate-180 text-white' : 'text-slate-400'}`} />
                  </button>

                  {/* Temp Popover */}
                  {openParam === 'temp' && (
                    <div className="absolute left-0 bottom-full mb-3 w-80 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-2xl p-4 z-40 animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1.5">
                          <Thermometer className="w-3.5 h-3.5 text-rose-500" />
                          <span className="text-xs font-bold text-slate-800">Sampling Temperature</span>
                        </div>
                        <span className="font-mono text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100">
                          {temperature.toFixed(2)}
                        </span>
                      </div>

                      <input
                        type="range"
                        min={0.0}
                        max={2.0}
                        step={0.05}
                        value={temperature}
                        onChange={(e) => setTemperature(parseFloat(Number(e.target.value).toFixed(2)))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-500"
                      />
                      <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1">
                        <span>0.0 (Argmax)</span>
                        <span>1.0 (Default)</span>
                        <span>2.0 (Max)</span>
                      </div>

                      <div className="mt-3.5 pt-3 border-t border-slate-100">
                        <span className="text-[11px] text-slate-500 block mb-2 font-medium">Sampling Mode:</span>
                        <div className="grid grid-cols-2 gap-1.5 text-xs">
                          {[
                            { label: '0.0 Greedy', val: 0.0, desc: 'Deterministic' },
                            { label: '0.3 Precise', val: 0.3, desc: 'Fact-focused' },
                            { label: '0.7 Balanced', val: 0.7, desc: 'Standard' },
                            { label: '1.0 Default', val: 1.0, desc: 'Original' },
                            { label: '1.4 Creative', val: 1.4, desc: 'Novel ideas' },
                            { label: '1.8 Wild', val: 1.8, desc: 'High variance' },
                          ].map((item) => (
                            <button
                              key={item.label}
                              type="button"
                              onClick={() => {
                                setTemperature(item.val);
                                setOpenParam(null);
                              }}
                              className={`p-2 rounded-xl text-left transition-all duration-150 cursor-pointer border ${
                                Math.abs(temperature - item.val) < 0.01
                                  ? 'bg-rose-50 border-rose-300 text-rose-800 font-semibold shadow-2xs'
                                  : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-100 text-slate-700'
                              }`}
                            >
                              <span className="block font-mono text-[11px] font-bold">{item.label}</span>
                              <span className="text-[10px] text-slate-400">{item.desc}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* BUTTON 3: Top-K */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenParam(openParam === 'topK' ? null : 'topK')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold font-mono border transition-all duration-200 cursor-pointer ${
                      openParam === 'topK'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/25 scale-[1.02]'
                        : 'bg-white text-slate-700 border-slate-200/90 hover:bg-indigo-50/60 hover:text-indigo-700 hover:border-indigo-200 shadow-2xs hover:scale-[1.02] active:scale-[0.98]'
                    }`}
                  >
                    <Layers className={`w-3.5 h-3.5 ${openParam === 'topK' ? 'text-white' : 'text-indigo-600'}`} />
                    <span>Top-K: <strong>{topK}</strong></span>
                    <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${openParam === 'topK' ? 'rotate-180 text-white' : 'text-slate-400'}`} />
                  </button>

                  {/* Top-K Popover */}
                  {openParam === 'topK' && (
                    <div className="absolute left-0 bottom-full mb-3 w-76 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-2xl p-4 z-40 animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-indigo-600" />
                          <span className="text-xs font-bold text-slate-800">Top-K Candidate Pool</span>
                        </div>
                        <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                          {topK} tokens
                        </span>
                      </div>

                      <input
                        type="range"
                        min={1}
                        max={100}
                        step={1}
                        value={topK}
                        onChange={(e) => setTopK(Number(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                      <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1">
                        <span>1</span>
                        <span>20</span>
                        <span>40 (Default)</span>
                        <span>64</span>
                        <span>100</span>
                      </div>

                      <div className="mt-3.5 pt-3 border-t border-slate-100">
                        <span className="text-[11px] text-slate-500 block mb-2 font-medium">Quick Presets:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {[1, 5, 10, 20, 40, 64, 100].map((k) => (
                            <button
                              key={k}
                              type="button"
                              onClick={() => {
                                setTopK(k);
                                setOpenParam(null);
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all duration-150 cursor-pointer ${
                                topK === k
                                  ? 'bg-indigo-600 text-white shadow-xs scale-105'
                                  : 'bg-slate-100/80 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700'
                              }`}
                            >
                              {k}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Button: Response Action */}
              <button
                type="button"
                onClick={() => fetchResponse()}
                disabled={isLoading || !prompt.trim()}
                className="group relative inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-600 active:scale-[0.97] text-white font-semibold text-xs shadow-md shadow-blue-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer overflow-hidden"
              >
                {/* Button shine sweep effect */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <span>Response</span>
                    <Send className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ERROR DISPLAY */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-300 text-rose-800 text-xs flex items-center justify-between shadow-sm animate-in fade-in">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => fetchResponse()}
              className="px-3 py-1 bg-white hover:bg-rose-50 text-rose-700 rounded-lg border border-rose-200 font-semibold cursor-pointer transition-colors shadow-2xs"
            >
              Retry
            </button>
          </div>
        )}

        {/* LIVELY CUTE WAITING ANIMATION WHILE GENERATING */}
        {isLoading && (
          <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/90 p-9 shadow-lg shadow-blue-500/5 text-center space-y-4 animate-in fade-in duration-300">
            {/* Whimsical animated loader with orbiting particles */}
            <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
              {/* Outer pulsing ring */}
              <div className="absolute inset-0 rounded-full bg-blue-400/20 animate-ping opacity-60"></div>
              {/* Spinning gradient ring */}
              <div className="absolute inset-1 rounded-full border-3 border-transparent border-t-blue-600 border-r-indigo-500 border-b-purple-500 animate-spin"></div>
              {/* Floating inner core */}
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 animate-float">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-slate-800 tracking-tight">
                Sampling Model Probabilities...
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                Predicting {maxTokens} tokens (Temp: {temperature.toFixed(1)} · Top-K: {topK})
              </p>
            </div>

            {/* Pulsing wave of multi-color bouncing dots */}
            <div className="flex items-center justify-center gap-2 pt-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-bounce"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-bounce [animation-delay:0.15s]"></span>
            </div>
          </div>
        )}

        {/* PROMINENT LIVELY RESPONSE DISPLAY: PROMPT PREPENDED + COLOR-CODED TOKENS */}
        {!isLoading && steps.length > 0 && (
          <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/90 shadow-md shadow-slate-900/5 p-6 sm:p-8 space-y-5 transition-all duration-300">
            {/* Confidence Legend Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 font-mono uppercase tracking-wider">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Token Stream</span>
                <span className="text-slate-300">/</span>
                <span className="text-slate-400 font-normal">{steps.length} generated</span>
              </div>

              <div className="flex items-center gap-2 text-[11px] font-mono">
                <span className="text-slate-400 text-[10px] hidden sm:inline">Confidence:</span>
                <span className="flex items-center gap-1.5 text-emerald-800 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-lg font-semibold shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> ≥80%
                </span>
                <span className="flex items-center gap-1.5 text-sky-800 bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 rounded-lg font-semibold shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-sky-500"></span> 50-79%
                </span>
                <span className="flex items-center gap-1.5 text-amber-900 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-lg font-semibold shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span> 25-49%
                </span>
                <span className="flex items-center gap-1.5 text-rose-900 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-lg font-semibold shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span> &lt;25%
                </span>
              </div>
            </div>

            {/* UNIFIED MEANINGFUL TEXT: PROMPT + COLOR-CODED GENERATED TOKENS */}
            <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-50/80 to-slate-100/50 border border-slate-200/80 font-mono text-base leading-loose flex flex-wrap items-center gap-2">
              {/* Original User Prompt Prepended */}
              <span className="text-slate-800 font-semibold px-2.5 py-1 rounded-xl bg-white border border-slate-200 shadow-2xs select-text">
                {analyzedPrompt}
              </span>

              {/* Color-coded Generated Tokens */}
              {steps.map((step, idx) => {
                const pct = (step.selectedProbability * 100).toFixed(1);
                const style = getTokenConfidenceStyle(step.selectedProbability);
                const isHovered = hoveredIdx === idx;

                return (
                  <div
                    key={step.stepIndex}
                    className="relative inline-block"
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setLogProbModalData({
                          token: step.selectedToken,
                          logProbability: step.selectedLogProb,
                          probability: step.selectedProbability,
                          stepIndex: step.stepIndex,
                        })
                      }
                      className={`group relative px-2.5 py-1 rounded-xl border text-sm font-bold transition-all duration-150 cursor-pointer shadow-xs ${style.bg} ${
                        isHovered
                          ? 'scale-110 z-20 ring-2 ring-blue-500/50 shadow-md'
                          : 'hover:scale-105'
                      }`}
                    >
                      {/* Token Text with readable whitespace indicators */}
                      {step.selectedToken === '\n' ? (
                        <span className="text-slate-400">↵</span>
                      ) : (
                        <span>{step.selectedToken}</span>
                      )}
                    </button>

                    {/* LIVELY HOVER TOOLTIP SHOWING EXACT PERCENTAGE & CANDIDATES */}
                    {isHovered && (
                      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 w-60 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl p-3.5 z-50 text-xs font-sans pointer-events-none animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-150 border border-slate-700/80">
                        {/* Tooltip Header */}
                        <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
                          <span className="font-mono font-bold text-sm text-blue-300">
                            &quot;{step.selectedToken}&quot;
                          </span>
                          <span className={`text-[11px] font-mono px-2 py-0.5 rounded-md font-bold shadow-xs ${style.badge}`}>
                            {pct}%
                          </span>
                        </div>

                        {/* Probability Progress Bar */}
                        <div className="w-full bg-slate-800 rounded-full h-1.5 mb-2.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${style.bar}`}
                            style={{ width: `${Math.min(100, Math.max(5, step.selectedProbability * 100))}%` }}
                          />
                        </div>

                        {/* Step Details */}
                        <div className="text-[11px] text-slate-300 space-y-1.5 font-mono">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Step:</span>
                            <span className="text-slate-200 font-bold">#{step.stepIndex}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Log-Prob (ln P):</span>
                            <span className="text-blue-200">{step.selectedLogProb.toFixed(3)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Confidence:</span>
                            <span className="text-slate-200 font-medium">{style.label}</span>
                          </div>
                        </div>

                        {/* Top Alternatives considered by the model */}
                        {step.topCandidates && step.topCandidates.length > 1 && (
                          <div className="pt-2.5 mt-2.5 border-t border-slate-800 space-y-1.5">
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                              Top Alternatives:
                            </span>
                            {step.topCandidates.slice(0, 3).map((c, cIdx) => (
                              <div key={cIdx} className="flex justify-between items-center text-[11px] font-mono">
                                <span className="text-slate-300">&quot;{c.token}&quot;</span>
                                <span className="text-slate-400 font-semibold">
                                  {(c.probability * 100).toFixed(1)}%
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="pt-2 mt-2 border-t border-slate-800/80 text-[10px] text-slate-400 text-center flex items-center justify-center gap-1">
                          <Calculator className="w-2.5 h-2.5 text-blue-400" />
                          <span>Click token to inspect math</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Log-Probability Explanation Modal */}
      {logProbModalData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setLogProbModalData(null)}
        >
          <div
            className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-6 py-4.5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs shadow-inner">
                  <Calculator className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base leading-tight">
                    Understanding Log-Probability (ln P)
                  </h3>
                  <p className="text-xs text-blue-100 font-mono mt-0.5">
                    Token: &quot;{logProbModalData.token}&quot; {logProbModalData.stepIndex ? `(Step #${logProbModalData.stepIndex})` : ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLogProbModalData(null)}
                className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Values Highlight Grid */}
              <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-200/80 shadow-inner">
                <div>
                  <span className="text-xs text-blue-800 font-medium block">
                    Log-Probability (ln P):
                  </span>
                  <span className="text-2xl font-black font-mono text-blue-950">
                    {logProbModalData.logProbability.toFixed(4)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-blue-800 font-medium block">
                    Actual Probability: P = e^(ln P)
                  </span>
                  <span className="text-2xl font-black font-mono text-blue-600">
                    {(logProbModalData.probability * 100).toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* The Analogy Section */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>The Richter Scale / Volume Knob Analogy</span>
                </h4>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-700 space-y-2.5 leading-relaxed">
                  <p>
                    Because probabilities multiply together across a sentence ($P_1 \times P_2 \times P_3$), numbers quickly shrink into astronomically tiny fractions like <code>0.000000000041</code> that computers cannot easily store without rounding errors (underflow).
                  </p>
                  <p>
                    <strong>Log-probability</strong> turns multiplication into simple <em>addition</em>:
                  </p>
                  <div className="p-2.5 bg-white border border-slate-200 rounded-xl font-mono text-slate-800 text-[11px] shadow-2xs">
                    ln(P₁ × P₂) = ln(P₁) + ln(P₂)
                  </div>
                  <p>
                    Think of log-probability like the <strong>decibel scale</strong> for sound or the <strong>Richter scale</strong> for earthquakes:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      <strong>0.00</strong> = 100% certainty ($e^0 = 1.0$).
                    </li>
                    <li>
                      <strong>-0.69</strong> = 50% probability (a coin flip).
                    </li>
                    <li>
                      <strong>-2.30</strong> = 10% probability (1 in 10 chance).
                    </li>
                    <li>
                      <strong>-4.60</strong> = 1% probability (rare event).
                    </li>
                    <li>
                      <strong>-9.21</strong> = 0.01% probability (very unusual token).
                    </li>
                  </ul>
                </div>
              </div>

              {/* Intuitive Gauge for Current Token */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5 text-xs">
                <span className="font-semibold text-slate-800 block">
                  What does {logProbModalData.logProbability.toFixed(3)} mean for &quot;{logProbModalData.token}&quot;?
                </span>
                <p className="text-slate-600 leading-normal">
                  {logProbModalData.probability >= 0.8
                    ? `With ln P = ${logProbModalData.logProbability.toFixed(3)}, this token is virtually guaranteed (${(logProbModalData.probability * 100).toFixed(1)}%). The model has high conviction.`
                    : logProbModalData.probability >= 0.3
                    ? `With ln P = ${logProbModalData.logProbability.toFixed(3)}, this token is a top contender (${(logProbModalData.probability * 100).toFixed(1)}%), but other viable words compete closely.`
                    : logProbModalData.probability >= 0.05
                    ? `With ln P = ${logProbModalData.logProbability.toFixed(3)}, this is an alternative branch (${(logProbModalData.probability * 100).toFixed(1)}%) that might be picked under higher sampling temperatures.`
                    : `With ln P = ${logProbModalData.logProbability.toFixed(3)}, this is a low-likelihood candidate (${(logProbModalData.probability * 100).toFixed(2)}%) representing a surprise or creative leap.`}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50/80 px-6 py-3.5 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setLogProbModalData(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
