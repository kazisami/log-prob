/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { TokenStep, AnalysisResponse } from './types';
import {
  Sparkles,
  Send,
  Loader2,
  Cpu,
  Clock,
  Info,
  ChevronRight,
  BarChart2,
  Flame,
  HelpCircle,
  X,
  Gauge,
  Calculator,
} from 'lucide-react';

export default function App() {
  const [prompt, setPrompt] = useState<string>('The capital of France is');
  const [steps, setSteps] = useState<TokenStep[]>([]);
  const [fullResponseText, setFullResponseText] = useState<string>('');
  const [modelUsed, setModelUsed] = useState<string>('gemini-2.5-flash');
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStepIdx, setSelectedStepIdx] = useState<number | null>(0);
  const [entropyModalStep, setEntropyModalStep] = useState<TokenStep | null>(null);
  const [logProbModalData, setLogProbModalData] = useState<{
    token: string;
    logProbability: number;
    probability: number;
    stepIndex?: number;
  } | null>(null);

  const samplePrompts = [
    'The capital of France is',
    'Once upon a time in a deep dark',
    'To be or not to',
    'Photosynthesis is the chemical process where plants',
    'def fibonacci(n):',
  ];

  // Call real Gemini API endpoint with native responseLogprobs
  const fetchTokenProbabilities = async (textToAnalyze?: string) => {
    const text = (textToAnalyze !== undefined ? textToAnalyze : prompt).trim();
    if (!text) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/analyze-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          maxTokens: 10,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!res.ok) {
        if (contentType.includes('application/json')) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error || `Server error (${res.status})`);
        } else {
          const textErr = await res.text().catch(() => '');
          throw new Error(`Server error (${res.status}): ${textErr.slice(0, 100)}`);
        }
      }

      if (!contentType.includes('application/json')) {
        const textResp = await res.text().catch(() => '');
        throw new Error(`Unexpected non-JSON response from server: ${textResp.slice(0, 80)}`);
      }

      const data: AnalysisResponse = await res.json();
      if (data.steps && data.steps.length > 0) {
        setSteps(data.steps);
        setFullResponseText(data.fullResponseText || '');
        setModelUsed(data.modelUsed || 'gemini-2.5-flash');
        setDurationMs(data.durationMs || null);
        setSelectedStepIdx(0);
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
    fetchTokenProbabilities('The capital of France is');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeStep =
    selectedStepIdx !== null && steps[selectedStepIdx]
      ? steps[selectedStepIdx]
      : null;

  const getProbBadgeStyle = (p: number) => {
    if (p >= 0.8) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (p >= 0.5) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (p >= 0.25) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-rose-50 text-rose-700 border-rose-200';
  };

  const getProbBarStyle = (p: number) => {
    if (p >= 0.8) return 'bg-emerald-500';
    if (p >= 0.5) return 'bg-blue-500';
    if (p >= 0.25) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* Light Top Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-3.5 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 tracking-tight">
                TokenLens
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-100 border border-slate-200 text-xs font-mono text-slate-700">
              <Cpu className="w-3.5 h-3.5 text-blue-600" />
              <span>{modelUsed.replace(/\s*\(.*?\)\s*/g, '').trim()}</span>
            </div>
            {durationMs && (
              <div className="hidden sm:flex items-center gap-1 text-xs text-slate-500 font-mono">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{(durationMs / 1000).toFixed(2)}s</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main 2-Column Split: Left Input, Right Token Probs Vertically */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT SIDE: Text Box Input & Step Detail */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Enter Text / Prompt
                </label>
                <span className="text-xs text-slate-400 font-mono">
                  {prompt.length} chars
                </span>
              </div>

              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    fetchTokenProbabilities();
                  }
                }}
                rows={6}
                placeholder="Type your prompt here..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition-all font-mono leading-relaxed resize-y"
              />

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => fetchTokenProbabilities()}
                  disabled={isLoading || !prompt.trim()}
                  className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-xs transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Calling Gemini API (logprobs)...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Get Response & Token Probs</span>
                    </>
                  )}
                </button>
              </div>

              {/* Sample Prompts */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                  Sample Prompts:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {samplePrompts.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setPrompt(s);
                        fetchTokenProbabilities(s);
                      }}
                      disabled={isLoading}
                      className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-md transition-colors border border-slate-200"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-rose-500" />
                  <span>API Notice:</span>
                </div>
                <div className="leading-relaxed">{error}</div>
              </div>
            )}

            {/* Real Full Response Text */}
            {fullResponseText && (
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs text-xs space-y-2">
                <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-blue-600" />
                  <span>Generated Completion:</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 font-mono text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {fullResponseText}
                </div>
              </div>
            )}

            {/* Selected Step Deep Dive Card */}
            {activeStep && (
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Step #{activeStep.stepIndex} Selected Token
                  </span>
                  <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    &quot;{activeStep.selectedToken}&quot;
                  </span>
                </div>

                <div className="text-xs text-slate-600 space-y-2">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50/60 border border-blue-200/80">
                    <div className="flex items-center gap-1.5">
                      <Calculator className="w-3.5 h-3.5 text-blue-600" />
                      <span className="text-slate-700 font-medium">Log-Probability (ln P):</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLogProbModalData({
                          token: activeStep.selectedToken,
                          logProbability: activeStep.selectedLogProb,
                          probability: activeStep.selectedProbability,
                          stepIndex: activeStep.stepIndex,
                        });
                      }}
                      className="group flex items-center gap-1 px-2 py-0.5 rounded bg-white hover:bg-blue-100 text-blue-900 border border-blue-300 transition-all font-mono font-bold text-xs shadow-2xs hover:scale-105 cursor-pointer"
                      title="Click to understand Log-Probability (ln P) with an analogy"
                    >
                      <span>{activeStep.selectedLogProb.toFixed(5)}</span>
                      <HelpCircle className="w-3.5 h-3.5 text-blue-600 group-hover:text-blue-800 transition-colors" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Calculated P(w) = exp(ln P):</span>
                    <span className="font-mono font-bold text-blue-700">
                      {(activeStep.selectedProbability * 100).toFixed(2)}%
                    </span>
                  </div>

                  {typeof activeStep.entropy === 'number' && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50/60 border border-amber-200/80">
                      <div className="flex items-center gap-1.5">
                        <Gauge className="w-3.5 h-3.5 text-amber-600" />
                        <span className="text-slate-700 font-medium">Shannon Entropy:</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEntropyModalStep(activeStep);
                        }}
                        className="group flex items-center gap-1 px-2 py-0.5 rounded bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 transition-all font-mono font-bold text-xs shadow-2xs hover:scale-105 cursor-pointer"
                        title="Click to understand Shannon entropy with an analogy"
                      >
                        <span>{activeStep.entropy.toFixed(3)} bits</span>
                        <HelpCircle className="w-3.5 h-3.5 text-amber-600 group-hover:text-amber-800 transition-colors" />
                      </button>
                    </div>
                  )}

                  <div className="pt-2">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                      Top Candidates Returned by Gemini API:
                    </span>
                    <div className="space-y-1.5">
                      {activeStep.topCandidates.map((cand, cIdx) => (
                        <div
                          key={cIdx}
                          className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100 text-xs font-mono"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400">#{cIdx + 1}</span>
                            <span className="font-bold text-slate-900">
                              &quot;{cand.token}&quot;
                            </span>
                            {cand.tokenId && (
                              <span className="text-[10px] text-slate-400">
                                (id:{cand.tokenId})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLogProbModalData({
                                  token: cand.token,
                                  logProbability: cand.logProbability,
                                  probability: cand.probability,
                                  stepIndex: activeStep.stepIndex,
                                });
                              }}
                              className="text-slate-500 hover:text-blue-700 hover:underline text-[11px] cursor-pointer"
                              title="Click to understand Log-Probability"
                            >
                              ln P: {cand.logProbability.toFixed(3)}
                            </button>
                            <span className="font-bold text-blue-700">
                              {(cand.probability * 100).toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT SIDE: Vertical Token Probabilities Stream */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-blue-600" />
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Next-Token Probabilities (Vertical Stream)
                  </h2>
                </div>
                <span className="text-xs text-slate-400">
                  {steps.length} sequential tokens from API
                </span>
              </div>

              {isLoading && steps.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <span className="text-sm font-medium">Fetching real token logprobs from Gemini API...</span>
                </div>
              ) : steps.length === 0 ? (
                <div className="py-20 text-center text-slate-400">
                  <p className="text-sm">No token probabilities loaded yet.</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Enter text on the left and click &quot;Get Response & Token Probs&quot;.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {steps.map((step, idx) => {
                    const isSelected = selectedStepIdx === idx;
                    const pct = (step.selectedProbability * 100).toFixed(1);

                    return (
                      <div
                        key={step.stepIndex}
                        onClick={() => setSelectedStepIdx(idx)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50/50 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                        }`}
                      >
                        {/* Token Row Header */}
                        <div className="flex items-center justify-between gap-3 mb-2.5">
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 text-xs font-mono font-bold flex items-center justify-center border border-slate-200">
                              {step.stepIndex}
                            </span>
                            <span className="font-mono text-sm font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                              &quot;{step.selectedToken}&quot;
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLogProbModalData({
                                  token: step.selectedToken,
                                  logProbability: step.selectedLogProb,
                                  probability: step.selectedProbability,
                                  stepIndex: step.stepIndex,
                                });
                              }}
                              className="group inline-flex items-center gap-0.5 text-[11px] font-mono text-slate-500 hover:text-blue-700 hover:bg-blue-50 px-1.5 py-0.5 rounded border border-transparent hover:border-blue-200 transition-colors cursor-pointer"
                              title="Click to understand Log-Probability"
                            >
                              <span>ln P: {step.selectedLogProb.toFixed(3)}</span>
                              <HelpCircle className="w-2.5 h-2.5 text-blue-500 opacity-50 group-hover:opacity-100" />
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            {typeof step.entropy === 'number' && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEntropyModalStep(step);
                                }}
                                className="group flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-mono font-medium transition-all shadow-2xs hover:scale-105 cursor-pointer"
                                title="Click to understand Shannon entropy with an analogy"
                              >
                                <Gauge className="w-3 h-3 text-amber-600" />
                                <span>{step.entropy.toFixed(2)} bits</span>
                                <HelpCircle className="w-2.5 h-2.5 text-amber-500 opacity-60 group-hover:opacity-100" />
                              </button>
                            )}
                            <span
                              className={`text-xs font-mono font-bold px-2.5 py-1 rounded-md border ${getProbBadgeStyle(
                                step.selectedProbability
                              )}`}
                            >
                              {pct}%
                            </span>
                            <ChevronRight
                              className={`w-4 h-4 text-slate-400 transition-transform ${
                                isSelected ? 'rotate-90 text-blue-600' : ''
                              }`}
                            />
                          </div>
                        </div>

                        {/* Top Candidate Distribution from Gemini API */}
                        <div className="space-y-2 pt-1">
                          {step.topCandidates.slice(0, 4).map((cand, cIdx) => {
                            const candPct = (cand.probability * 100).toFixed(1);
                            const isChosen = cand.token === step.selectedToken;

                            return (
                              <div key={cIdx} className="space-y-1">
                                <div className="flex items-center justify-between text-xs font-mono text-slate-600">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] text-slate-400">
                                      #{cIdx + 1}
                                    </span>
                                    <span
                                      className={`${
                                        isChosen
                                          ? 'font-bold text-slate-900'
                                          : 'text-slate-600'
                                      }`}
                                    >
                                      &quot;{cand.token}&quot;
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setLogProbModalData({
                                          token: cand.token,
                                          logProbability: cand.logProbability,
                                          probability: cand.probability,
                                          stepIndex: step.stepIndex,
                                        });
                                      }}
                                      className="text-[10px] text-slate-400 hover:text-blue-700 hover:underline cursor-pointer"
                                      title="Click to understand Log-Probability"
                                    >
                                      (ln P: {cand.logProbability.toFixed(2)})
                                    </button>
                                  </div>
                                  <span
                                    className={`font-semibold ${
                                      isChosen ? 'text-blue-700' : 'text-slate-500'
                                    }`}
                                  >
                                    {candPct}%
                                  </span>
                                </div>

                                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-300 ${getProbBarStyle(
                                      cand.probability
                                    )}`}
                                    style={{
                                      width: `${Math.max(2, cand.probability * 100)}%`,
                                    }}
                                  ></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>
      </main>

      {/* Shannon Entropy Explanation Modal */}
      {entropyModalStep && typeof entropyModalStep.entropy === 'number' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setEntropyModalStep(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-lg w-full border border-slate-200 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-xs">
                  <Gauge className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">
                    Understanding Shannon Entropy
                  </h3>
                  <p className="text-xs text-amber-100 font-mono">
                    Step #{entropyModalStep.stepIndex}: &quot;{entropyModalStep.selectedToken}&quot;
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEntropyModalStep(null)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Current Value Highlight */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-amber-50 border border-amber-200">
                <div>
                  <span className="text-xs text-amber-800 font-medium block">
                    Current Measured Value:
                  </span>
                  <span className="text-2xl font-bold font-mono text-amber-950">
                    {entropyModalStep.entropy.toFixed(3)}{' '}
                    <span className="text-sm font-semibold text-amber-700">bits</span>
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">Surprise Level:</span>
                  <span
                    className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                      entropyModalStep.entropy < 0.2
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : entropyModalStep.entropy < 1.0
                        ? 'bg-blue-100 text-blue-800 border border-blue-300'
                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}
                  >
                    {entropyModalStep.entropy < 0.2
                      ? 'Very Low (Certain)'
                      : entropyModalStep.entropy < 1.0
                      ? 'Moderate (Few choices)'
                      : 'High (Great uncertainty)'}
                  </span>
                </div>
              </div>

              {/* The Analogy Section */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>The 20 Questions / Coin Toss Analogy</span>
                </h4>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2.5 leading-relaxed">
                  <p>
                    Think of <strong>Shannon Entropy</strong> as the number of <em>fair Yes/No questions</em> you would have to ask on average to guess what word or token the AI will pick next.
                  </p>
                  
                  {entropyModalStep.entropy < 0.3 ? (
                    <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg text-emerald-900">
                      <strong>🎯 Here, entropy is near 0 ({entropyModalStep.entropy.toFixed(2)} bits):</strong>
                      <p className="mt-1">
                        Like completing <em>&quot;The capital of France is...&quot;</em>. There is practically no guessing game required—the answer is almost certainly <strong>&quot;{entropyModalStep.selectedToken}&quot;</strong> ({(entropyModalStep.selectedProbability * 100).toFixed(1)}% prob). The model is completely confident.
                      </p>
                    </div>
                  ) : entropyModalStep.entropy < 1.2 ? (
                    <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-blue-900">
                      <strong>⚖️ Here, entropy is around {entropyModalStep.entropy.toFixed(2)} bits (1 question):</strong>
                      <p className="mt-1">
                        Like a coin flip between 2 good candidates (e.g. <em>&quot;is&quot;</em> vs <em>&quot;was&quot;</em>). You only need about 1 Yes/No question to resolve the uncertainty.
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-lg text-rose-900">
                      <strong>🎲 Here, entropy is high ({entropyModalStep.entropy.toFixed(2)} bits):</strong>
                      <p className="mt-1">
                        Like rolling an 8-sided die or picking from dozens of equally plausible words (e.g. starting a brand new topic). The model has many competitive paths and no single dominant choice.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Formula & Rule of Thumb */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <span className="font-semibold text-slate-800 block mb-1">
                    Mathematical Formula
                  </span>
                  <code className="text-[11px] font-mono text-blue-700 bg-white px-1.5 py-0.5 rounded border border-slate-200 block">
                    H = - Σ (P * log₂ P)
                  </code>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Computed over candidate token probabilities.
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <span className="font-semibold text-slate-800 block mb-1">
                    Intuitive Rule
                  </span>
                  <span className="text-[11px] text-slate-600 block leading-normal">
                    <strong>0 bits</strong> = Total certainty<br />
                    <strong>1 bit</strong> = 50/50 two-way split<br />
                    <strong>2+ bits</strong> = Open-ended choices
                  </span>
                </div>
              </div>

              {/* Token Candidate Split at this step */}
              <div className="pt-1">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Candidate Competition at Step #{entropyModalStep.stepIndex}:
                </span>
                <div className="space-y-1">
                  {entropyModalStep.topCandidates.map((c, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs font-mono p-1.5 rounded bg-slate-50 border border-slate-100"
                    >
                      <span className="text-slate-800 font-semibold">
                        &quot;{c.token}&quot;
                      </span>
                      <span className="text-blue-700 font-bold">
                        {(c.probability * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setEntropyModalStep(null)}
                className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log-Probability Explanation Modal */}
      {logProbModalData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setLogProbModalData(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-lg w-full border border-slate-200 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-xs">
                  <Calculator className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">
                    Understanding Log-Probability (ln P)
                  </h3>
                  <p className="text-xs text-blue-100 font-mono">
                    Token: &quot;{logProbModalData.token}&quot; {logProbModalData.stepIndex ? `(Step #${logProbModalData.stepIndex})` : ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLogProbModalData(null)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Values Highlight Grid */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-blue-50/70 border border-blue-200">
                <div>
                  <span className="text-xs text-blue-800 font-medium block">
                    Log-Probability (ln P):
                  </span>
                  <span className="text-xl font-bold font-mono text-blue-950">
                    {logProbModalData.logProbability.toFixed(4)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-blue-800 font-medium block">
                    Actual Probability: P = e^(ln P)
                  </span>
                  <span className="text-xl font-bold font-mono text-blue-700">
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
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2.5 leading-relaxed">
                  <p>
                    Because probabilities multiply together across a sentence ($P_1 \times P_2 \times P_3$), numbers quickly shrink into astronomically tiny fractions like <code>0.000000000041</code> that computers cannot easily store without rounding errors (underflow).
                  </p>
                  <p>
                    <strong>Log-probability</strong> turns multiplication into simple <em>addition</em>:
                  </p>
                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg font-mono text-slate-800 text-[11px]">
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
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
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
            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setLogProbModalData(null)}
                className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors cursor-pointer"
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
