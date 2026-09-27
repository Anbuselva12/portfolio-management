import React, { useState } from 'react';
import { SlideDrawer } from '../ui/SlideDrawer';
import { CustomWeights } from '../../types';
import { Sliders, RotateCcw } from 'lucide-react';

interface CustomWeightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  weights: CustomWeights;
  onSave: (weights: CustomWeights, saveAsDefault: boolean) => void;
}

export const CustomWeightsModal: React.FC<CustomWeightsModalProps> = ({
  isOpen,
  onClose,
  weights,
  onSave,
}) => {
  const [rate, setRate] = useState(weights.weightRate);
  const [balance, setBalance] = useState(weights.weightBalance);
  const [flexibility, setFlexibility] = useState(weights.weightFlexibility);
  const [penalty, setPenalty] = useState(weights.weightPenalty);
  const [tenure, setTenure] = useState(weights.weightTenure);
  const [mode, setMode] = useState<'cascade' | 'split'>(weights.mode);
  const [saveAsDefault, setSaveAsDefault] = useState(false);

  const handleReset = () => {
    setRate(40);
    setBalance(30);
    setFlexibility(10);
    setPenalty(10);
    setTenure(10);
    setMode('cascade');
  };

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(
      {
        weightRate: Number(rate),
        weightBalance: Number(balance),
        weightFlexibility: Number(flexibility),
        weightPenalty: Number(penalty),
        weightTenure: Number(tenure),
        mode,
      },
      saveAsDefault,
    );
    onClose();
  };

  return (
    <SlideDrawer isOpen={isOpen} onClose={onClose} title="Custom-Weighted Strategy Tuning">
      <form onSubmit={handleApply} className="space-y-6">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Adjust the relative priority score factors to customize how your household debt surplus is distributed across active loans.
        </p>

        {/* Sliders */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-slate-700 dark:text-slate-300">Interest Rate (APR) Priority</span>
              <span className="font-mono text-cyan-600 dark:text-cyan-400">{rate}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-600"
            />
            <span className="text-[11px] text-slate-400">Heavier weighting favors paying off expensive loans.</span>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-slate-700 dark:text-slate-300">Smallest Balance Priority (Snowball factor)</span>
              <span className="font-mono text-cyan-600 dark:text-cyan-400">{balance}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={balance}
              onChange={(e) => setBalance(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-600"
            />
            <span className="text-[11px] text-slate-400">Heavier weighting favors clearing smaller liabilities first.</span>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-slate-700 dark:text-slate-300">Flexible EMI Preference</span>
              <span className="font-mono text-cyan-600 dark:text-cyan-400">{flexibility}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={flexibility}
              onChange={(e) => setFlexibility(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-600"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-slate-700 dark:text-slate-300">Zero Prepayment Penalty Priority</span>
              <span className="font-mono text-cyan-600 dark:text-cyan-400">{penalty}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={penalty}
              onChange={(e) => setPenalty(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-600"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-slate-700 dark:text-slate-300">Shorter Remaining Tenure Preference</span>
              <span className="font-mono text-cyan-600 dark:text-cyan-400">{tenure}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={tenure}
              onChange={(e) => setTenure(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-600"
            />
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
            Surplus Distribution Mode
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMode('cascade')}
              className={`p-3 rounded-xl border text-xs text-left transition-all cursor-pointer ${
                mode === 'cascade'
                  ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/60 text-cyan-900 dark:text-cyan-200 ring-2 ring-cyan-500/20'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
              }`}
            >
              <div className="font-bold mb-0.5">Cascade Mode (Default)</div>
              <div className="text-[11px] opacity-80">100% of surplus directed to highest scored loan until paid off.</div>
            </button>

            <button
              type="button"
              onClick={() => setMode('split')}
              className={`p-3 rounded-xl border text-xs text-left transition-all cursor-pointer ${
                mode === 'split'
                  ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/60 text-cyan-900 dark:text-cyan-200 ring-2 ring-cyan-500/20'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
              }`}
            >
              <div className="font-bold mb-0.5">Split Mode</div>
              <div className="text-[11px] opacity-80">Surplus split proportionally across all eligible loans each month.</div>
            </button>
          </div>
        </div>

        {/* Save as default check */}
        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="save-default-weights"
            checked={saveAsDefault}
            onChange={(e) => setSaveAsDefault(e.target.checked)}
            className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500"
          />
          <label htmlFor="save-default-weights" className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Save as family default weights in Family Settings
          </label>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 flex items-center justify-between border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Defaults</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-700 rounded-xl shadow-sm"
            >
              Apply Weights
            </button>
          </div>
        </div>
      </form>
    </SlideDrawer>
  );
};

