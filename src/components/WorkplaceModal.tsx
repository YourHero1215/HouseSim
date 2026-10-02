import React, { useState, useEffect } from 'react';
import {
  X,
  Briefcase,
  DollarSign,
  Coffee,
  Truck,
  Code,
  Compass,
  CheckCircle,
  Play,
  Award,
} from 'lucide-react';
import { JobInfo } from '../types/housesim';
import { JOBS_LIST } from '../data/catalog';
import { soundFX } from '../utils/soundEffects';

interface WorkplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentJobId: string | null;
  onSelectJob: (job: JobInfo) => void;
  onEarnCash: (amount: number, reason: string) => void;
}

export const WorkplaceModal: React.FC<WorkplaceModalProps> = ({
  isOpen,
  onClose,
  currentJobId,
  onSelectJob,
  onEarnCash,
}) => {
  const [selectedJob, setSelectedJob] = useState<JobInfo>(() => {
    const found = JOBS_LIST.find((j) => j.id === currentJobId);
    return found || JOBS_LIST[0];
  });

  const [isWorkingShift, setIsWorkingShift] = useState(false);
  const [shiftProgress, setShiftProgress] = useState(0); // 0 to 100
  const [shiftTaskClicks, setShiftTaskClicks] = useState(0);
  const [shiftMessage, setShiftMessage] = useState<string | null>(null);

  useEffect(() => {
    if (currentJobId) {
      const found = JOBS_LIST.find((j) => j.id === currentJobId);
      if (found) setSelectedJob(found);
    }
  }, [currentJobId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isWorkingShift) {
      interval = setInterval(() => {
        setShiftProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            completeShift();
            return 100;
          }
          return prev + 6;
        });
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isWorkingShift, selectedJob]);

  if (!isOpen) return null;

  const handleApply = (job: JobInfo) => {
    setSelectedJob(job);
    onSelectJob(job);
    soundFX.playInteractChime();
    setShiftMessage(`Hired as ${job.title} at ${job.workplaceName}! Clock in to earn dollars.`);
  };

  const startShift = () => {
    setIsWorkingShift(true);
    setShiftProgress(5);
    setShiftTaskClicks(0);
    setShiftMessage(`Working shift at ${selectedJob.workplaceName}... Click tasks to boost tips!`);
    soundFX.playWorkTask();
  };

  const handleTaskClick = () => {
    if (!isWorkingShift) return;
    setShiftTaskClicks((p) => p + 1);
    setShiftProgress((p) => Math.min(100, p + 12));
    soundFX.playWorkTask();
  };

  const completeShift = () => {
    setIsWorkingShift(false);
    const tipBonus = shiftTaskClicks * 15;
    const totalEarned = selectedJob.basePay + tipBonus;
    soundFX.playCashRegister();
    onEarnCash(totalEarned, `Completed shift as ${selectedJob.title}`);
    setShiftMessage(
      `Shift Finished! You earned $${selectedJob.basePay} base pay + $${tipBonus} performance bonus = $${totalEarned}!`
    );
  };

  const getJobIcon = (type: JobInfo['taskType']) => {
    switch (type) {
      case 'coffee':
        return <Coffee className="w-4 h-4 text-amber-400" />;
      case 'courier':
        return <Truck className="w-4 h-4 text-emerald-400" />;
      case 'coding':
        return <Code className="w-4 h-4 text-cyan-400" />;
      case 'architect':
        return <Compass className="w-4 h-4 text-purple-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4">
      <div className="w-full max-w-4xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-display">City Employment & Career Hub</h2>
              <p className="text-xs text-slate-400">
                Get a job, work shifts, earn dollars ($) to fund your house expansion, cars, and pets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Toast */}
        {shiftMessage && (
          <div className="px-6 py-2 bg-emerald-500/15 border-b border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            {shiftMessage}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 overflow-y-auto">
          {/* Job Listings Column */}
          <div className="md:col-span-5 space-y-3">
            <span className="text-xs font-semibold text-slate-400 block mb-2">Available Careers in the City</span>
            {JOBS_LIST.map((job) => {
              const isEmployed = currentJobId === job.id;
              const isSelected = selectedJob.id === job.id;
              return (
                <div
                  key={job.id}
                  onClick={() => setSelectedJob(job)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-950 border-amber-400/80 shadow-md'
                      : 'bg-slate-950/60 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 font-semibold text-sm text-white">
                      {getJobIcon(job.taskType)}
                      {job.title}
                    </div>
                    <span className="font-mono text-emerald-400 text-xs font-bold">${job.basePay} / shift</span>
                  </div>
                  <div className="text-xs text-slate-400 mb-2">{job.workplaceName}</div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">~{job.shiftDurationSec}s cycle</span>
                    {isEmployed ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Current Job
                      </span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApply(job);
                        }}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 transition-colors font-semibold"
                      >
                        Apply Now
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active Job Workplace & Shift Station Column */}
          <div className="md:col-span-7 flex flex-col justify-between bg-slate-950/80 border border-white/10 rounded-2xl p-5 space-y-4">
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                    {getJobIcon(selectedJob.taskType)}
                    {selectedJob.title}
                  </h3>
                  <div className="text-xs text-slate-400">{selectedJob.workplaceName}</div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-500 block">Salary</span>
                  <span className="font-mono text-emerald-400 text-sm font-bold">${selectedJob.basePay}</span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed mb-4">{selectedJob.description}</p>

              {/* Active Shift Card */}
              <div className="bg-slate-900 border border-white/10 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">Shift Progress</span>
                  <span className="font-mono text-amber-400">{shiftProgress}%</span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-300"
                    style={{ width: `${shiftProgress}%` }}
                  />
                </div>

                {isWorkingShift ? (
                  <div className="space-y-3 pt-2">
                    <p className="text-xs text-slate-400">
                      Tap the action button rapidly to speed up the shift and earn extra tip bonuses!
                    </p>
                    <button
                      onClick={handleTaskClick}
                      className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg"
                    >
                      <Award className="w-4 h-4" />
                      Complete Work Task! (+12% & Bonus Tips)
                    </button>
                  </div>
                ) : (
                  <div className="pt-2">
                    {currentJobId === selectedJob.id ? (
                      <button
                        onClick={startShift}
                        className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-2"
                      >
                        <Play className="w-4 h-4" />
                        Clock In for Shift (${selectedJob.basePay})
                      </button>
                    ) : (
                      <button
                        onClick={() => handleApply(selectedJob)}
                        className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-white font-bold text-xs transition-colors"
                      >
                        Accept Job Offer as {selectedJob.title}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-white/5 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Earnings go directly into your account ($)</span>
              <span>Unlimited shifts available daily</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
