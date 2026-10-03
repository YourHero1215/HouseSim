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
  Sparkles,
  ShoppingBag,
  Store,
  UserCheck,
  Zap,
  Wrench,
  ThumbsUp,
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

interface InteractiveJobTask {
  id: string;
  title: string;
  customerName?: string;
  customerAvatar?: string;
  customerRequest?: string;
  actionButtonLabel: string;
  soundType: 'scan' | 'coffee' | 'cook' | 'task' | 'snack';
  points: number;
  tipReward: number;
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
  const [activeTaskIndex, setActiveTaskIndex] = useState(0);
  const [completedTasksCount, setCompletedTasksCount] = useState(0);
  const [totalShiftTips, setTotalShiftTips] = useState(0);
  const [shiftMessage, setShiftMessage] = useState<string | null>(null);
  const [customerSpeech, setCustomerSpeech] = useState<string | null>(null);

  useEffect(() => {
    if (currentJobId) {
      const found = JOBS_LIST.find((j) => j.id === currentJobId);
      if (found) setSelectedJob(found);
    }
  }, [currentJobId]);

  // Tasks customized for each job type
  const getJobTasks = (jobType: JobInfo['taskType']): InteractiveJobTask[] => {
    switch (jobType) {
      case 'clerk':
        return [
          {
            id: 'clerk-1',
            title: 'Scan Groceries for Customer',
            customerName: 'Mrs. Higgins',
            customerAvatar: '👵',
            customerRequest: 'I have 2 cartons of Oat Milk and Fresh Apples! Can you scan them quickly please?',
            actionButtonLabel: 'Beep & Scan Barcodes 🏷️',
            soundType: 'scan',
            points: 25,
            tipReward: 24,
          },
          {
            id: 'clerk-2',
            title: 'Restock Produce & Beverage Aisle',
            customerName: 'Store Manager Marcus',
            customerAvatar: '👨‍💼',
            customerRequest: 'Aisle 3 ran out of Arabica Coffee Beans and Citrus Berry Sodas! Place fresh boxes on shelves.',
            actionButtonLabel: 'Stock Shelves in Aisle 3 📦',
            soundType: 'task',
            points: 25,
            tipReward: 20,
          },
          {
            id: 'clerk-3',
            title: 'Checkout & Bag Artisan Groceries',
            customerName: 'Chef Antoine',
            customerAvatar: '👨‍🍳',
            customerRequest: 'I am cooking a banquet tonight! Prime Rib Steaks and Brioche Buns need double bagging.',
            actionButtonLabel: 'Bag Prime Steaks & Collect Payment 💳',
            soundType: 'scan',
            points: 25,
            tipReward: 35,
          },
          {
            id: 'clerk-4',
            title: 'Customer Price Check & Assistance',
            customerName: 'Sophie from Downtown',
            customerAvatar: '👩',
            customerRequest: 'Where can I find the Unbleached Coffee Filters and Vanilla Gelato?',
            actionButtonLabel: 'Guide Customer to Aisle 1 & 4 🗺️',
            soundType: 'task',
            points: 25,
            tipReward: 22,
          },
        ];
      case 'coffee':
        return [
          {
            id: 'coffee-1',
            title: 'Brew Double Shot Caramel Latte',
            customerName: 'Oliver Vance',
            customerAvatar: '👨‍💼',
            customerRequest: 'Good morning! Double shot espresso with creamy steamed oat milk, please!',
            actionButtonLabel: 'Grind Beans & Steam Oat Milk ☕',
            soundType: 'coffee',
            points: 25,
            tipReward: 28,
          },
          {
            id: 'coffee-2',
            title: 'Handcraft Iced Vanilla Macchiato',
            customerName: 'Maya Lin',
            customerAvatar: '👩‍💻',
            customerRequest: 'Heading to the auto showroom! Extra ice and drizzle of caramel syrup.',
            actionButtonLabel: 'Pour Espresso Over Cold Ice 🧊',
            soundType: 'coffee',
            points: 25,
            tipReward: 30,
          },
          {
            id: 'coffee-3',
            title: 'Restock Bakery Croissants & Beans',
            customerName: 'Cafe Owner Leo',
            customerAvatar: '🧔',
            customerRequest: 'Refill the hopper with fresh dark-roast Arabica coffee beans!',
            actionButtonLabel: 'Refill Espresso Grinder 🫘',
            soundType: 'task',
            points: 25,
            tipReward: 25,
          },
          {
            id: 'coffee-4',
            title: 'Serve Morning Rush Queue',
            customerName: 'Dr. Clara Soto',
            customerAvatar: '👩‍⚕️',
            customerRequest: 'Hot Flat White before my shift at Pet Haven starts! Thank you so much!',
            actionButtonLabel: 'Serve Drink & Hand Receipt 🌟',
            soundType: 'coffee',
            points: 25,
            tipReward: 35,
          },
        ];
      case 'mechanic':
        return [
          {
            id: 'mech-1',
            title: 'Engine Diagnostic & Oil Change',
            customerName: 'Jax Wheeler',
            customerAvatar: '🏎️',
            customerRequest: 'My V8 muscle coupe is hitting the speedway stunt ramp! Check the oil pressure.',
            actionButtonLabel: 'Drain & Refill Synthetic Oil 🔧',
            soundType: 'task',
            points: 25,
            tipReward: 40,
          },
          {
            id: 'mech-2',
            title: 'Mount Performance Racing Tires',
            customerName: 'Captain Brody',
            customerAvatar: '⚓',
            customerRequest: 'Need new all-weather treads for hauling the boat trailer down to the marina!',
            actionButtonLabel: 'Torque Wheel Lug Nuts ⚙️',
            soundType: 'task',
            points: 25,
            tipReward: 38,
          },
          {
            id: 'mech-3',
            title: 'Brake Caliper Inspection',
            customerName: 'Grace Sterling',
            customerAvatar: '🏦',
            customerRequest: 'The brakes feel a bit soft on the downtown highway commute.',
            actionButtonLabel: 'Bleed Hydraulic Brake Line 🛑',
            soundType: 'task',
            points: 25,
            tipReward: 45,
          },
          {
            id: 'mech-4',
            title: 'Supercharger Dyno Tuning',
            customerName: 'Dealership Boss Maya',
            customerAvatar: '🚗',
            customerRequest: 'Tune the ECU for maximum horsepower and smooth throttle response.',
            actionButtonLabel: 'Flash ECU & Test Rev Engine 🏁',
            soundType: 'task',
            points: 25,
            tipReward: 50,
          },
        ];
      case 'courier':
        return [
          {
            id: 'cour-1',
            title: 'Express Parcel to Marina Harbor',
            customerName: 'Harbor Dispatch',
            customerAvatar: '📦',
            customerRequest: 'Rush delivery to the yacht slip at Sunset Marina! Drive carefully.',
            actionButtonLabel: 'Load Cargo & Dispatch Navigation 🚀',
            soundType: 'task',
            points: 25,
            tipReward: 42,
          },
          {
            id: 'cour-2',
            title: 'Architectural Blueprints to Civic Hall',
            customerName: 'Architect Samuel',
            customerAvatar: '📐',
            customerRequest: 'Urgent city zoning blueprints needed for the mayoral expansion hearing.',
            actionButtonLabel: 'Secure Document Tube & Deliver 🏛️',
            soundType: 'task',
            points: 25,
            tipReward: 45,
          },
          {
            id: 'cour-3',
            title: 'Gourmet Catering to Grand Villa',
            customerName: 'VIP Resident',
            customerAvatar: '💎',
            customerRequest: 'Keep the gourmet meal warm all the way to the hillside residential estate.',
            actionButtonLabel: 'Express Transit to Villa Gate 🏰',
            soundType: 'task',
            points: 25,
            tipReward: 55,
          },
          {
            id: 'cour-4',
            title: 'Helipad Aviation Parts Drop',
            customerName: 'Airport Control Tower',
            customerAvatar: '🚁',
            customerRequest: 'Replacement rotor sensors needed at the East Airport Hangar.',
            actionButtonLabel: 'Deliver to Helipad Technician 🛫',
            soundType: 'task',
            points: 25,
            tipReward: 60,
          },
        ];
      case 'coding':
        return [
          {
            id: 'code-1',
            title: 'Fix High-Load Payment Microservice',
            customerName: 'Tech Lead Jordan',
            customerAvatar: '💻',
            customerRequest: 'Transactions are spiking during peak shopping hours. Optimize the async lock!',
            actionButtonLabel: 'Deploy Non-Blocking Worker ⚡',
            soundType: 'task',
            points: 25,
            tipReward: 65,
          },
          {
            id: 'code-2',
            title: 'Implement City Real-Time GPS Tracking',
            customerName: 'Product Manager Lisa',
            customerAvatar: '📱',
            customerRequest: 'Add real-time telemetry markers for cars, boats, and helicopters on the mini-map.',
            actionButtonLabel: 'Stream Spatial Coordinates 🛰️',
            soundType: 'task',
            points: 25,
            tipReward: 70,
          },
          {
            id: 'code-3',
            title: 'Refactor 3D WebGL Shader Pipeline',
            customerName: 'Principal Engineer Alex',
            customerAvatar: '🎨',
            customerRequest: 'Enhance the ocean water reflection shaders and daytime shadow cascaded maps.',
            actionButtonLabel: 'Compile Optimized GLSL Shaders 🌌',
            soundType: 'task',
            points: 25,
            tipReward: 80,
          },
          {
            id: 'code-4',
            title: 'Ship Zero-Downtime Production Release',
            customerName: 'CTO Vikram',
            customerAvatar: '🚀',
            customerRequest: 'All automated tests passed with 100% code coverage. Push to production edge!',
            actionButtonLabel: 'Launch Global Edge Cluster 🌐',
            soundType: 'task',
            points: 25,
            tipReward: 95,
          },
        ];
      case 'architect':
        return [
          {
            id: 'arch-1',
            title: 'Design Sunset Bay Marina Expansion',
            customerName: 'Mayor Sterling',
            customerAvatar: '🏛️',
            customerRequest: 'Draw new yacht docking slips and waterfront promenade dining terraces.',
            actionButtonLabel: 'Draft Waterfront CAD Plans 🌊',
            soundType: 'task',
            points: 25,
            tipReward: 90,
          },
          {
            id: 'arch-2',
            title: 'Plan Tier 3 Luxury Residential Estates',
            customerName: 'Civic Zoning Board',
            customerAvatar: '📐',
            customerRequest: 'Allocate property footprints with private double driveways and swimming pool yards.',
            actionButtonLabel: 'Render 3D Villa Blueprints 🏡',
            soundType: 'task',
            points: 25,
            tipReward: 110,
          },
          {
            id: 'arch-3',
            title: 'Urban Boulevard & Speedway Layout',
            customerName: 'Grand Prix Committee',
            customerAvatar: '🏎️',
            customerRequest: 'Design high-speed chicanes, pedestrian skybridges, and viewing grandstands.',
            actionButtonLabel: 'Design Track Curve Geometry 🏁',
            soundType: 'task',
            points: 25,
            tipReward: 125,
          },
          {
            id: 'arch-4',
            title: 'Metropolis Eco-Park & Fountain Plaza',
            customerName: 'City Greenscape Initiative',
            customerAvatar: '🌳',
            customerRequest: 'Integrate natural botanical gardens, marble water fountains, and solar lighting.',
            actionButtonLabel: 'Finalize Master Civic Plan 🌿',
            soundType: 'task',
            points: 25,
            tipReward: 140,
          },
        ];
      default:
        return [];
    }
  };

  const currentTasks = getJobTasks(selectedJob.taskType);
  const activeTask = currentTasks[activeTaskIndex] || currentTasks[0];

  // Auto-tick background progression during shift
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isWorkingShift) {
      interval = setInterval(() => {
        setShiftProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            completeShift(totalShiftTips);
            return 100;
          }
          return prev + 3;
        });
      }, 700);
    }
    return () => clearInterval(interval);
  }, [isWorkingShift, selectedJob, totalShiftTips]);

  if (!isOpen) return null;

  const handleApply = (job: JobInfo) => {
    setSelectedJob(job);
    onSelectJob(job);
    soundFX.playInteractChime();
    setShiftMessage(`Hired as ${job.title} at ${job.workplaceName}! Clock in to start serving customers.`);
  };

  const startShift = () => {
    setIsWorkingShift(true);
    setShiftProgress(10);
    setActiveTaskIndex(0);
    setCompletedTasksCount(0);
    setTotalShiftTips(0);
    const firstTask = currentTasks[0];
    setCustomerSpeech(firstTask?.customerRequest || null);
    setShiftMessage(`Shift started at ${selectedJob.workplaceName}! Fulfill customer requests to earn huge tips!`);
    soundFX.playWorkTask();
  };

  const handleExecuteActiveTask = () => {
    if (!isWorkingShift) return;

    // Play appropriate sound effect based on task
    if (activeTask.soundType === 'scan') {
      soundFX.playRegisterScan();
    } else if (activeTask.soundType === 'coffee') {
      soundFX.playCoffeeBrew();
    } else if (activeTask.soundType === 'cook') {
      soundFX.playCookingSizzle();
    } else {
      soundFX.playWorkTask();
    }

    const tipEarned = activeTask.tipReward;
    const newTotalTips = totalShiftTips + tipEarned;
    setTotalShiftTips(newTotalTips);
    setCompletedTasksCount((prev) => prev + 1);

    const nextIndex = (activeTaskIndex + 1) % currentTasks.length;
    setActiveTaskIndex(nextIndex);
    const nextTask = currentTasks[nextIndex];
    setCustomerSpeech(nextTask?.customerRequest || null);

    const newProgress = Math.min(100, shiftProgress + 25);
    setShiftProgress(newProgress);

    setShiftMessage(`🌟 Completed: "${activeTask.title}"! Customer left a $${tipEarned} tip!`);

    if (newProgress >= 100 || completedTasksCount + 1 >= currentTasks.length) {
      setTimeout(() => {
        completeShift(newTotalTips);
      }, 400);
    }
  };

  const completeShift = (finalTips: number) => {
    setIsWorkingShift(false);
    const totalEarned = selectedJob.basePay + finalTips;
    soundFX.playCashRegister();
    onEarnCash(totalEarned, `Completed shift as ${selectedJob.title}`);
    setShiftMessage(
      `🎉 Shift Complete! Earned $${selectedJob.basePay} base wage + $${finalTips} customer tips = $${totalEarned} total payout!`
    );
    setCustomerSpeech(null);
  };

  const getJobIcon = (type: JobInfo['taskType']) => {
    switch (type) {
      case 'clerk':
        return <Store className="w-4 h-4 text-emerald-400" />;
      case 'coffee':
        return <Coffee className="w-4 h-4 text-amber-400" />;
      case 'mechanic':
        return <Wrench className="w-4 h-4 text-rose-400" />;
      case 'courier':
        return <Truck className="w-4 h-4 text-cyan-400" />;
      case 'coding':
        return <Code className="w-4 h-4 text-blue-400" />;
      case 'architect':
        return <Compass className="w-4 h-4 text-purple-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 select-none">
      <div className="w-full max-w-5xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-display">City Employment & Interactive Careers</h2>
              <p className="text-xs text-slate-400">
                Serve customers, scan groceries, brew artisan espresso, and perform real job duties for base wage + tips!
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

        {/* Status Alert */}
        {shiftMessage && (
          <div className="px-6 py-2.5 bg-gradient-to-r from-emerald-950/80 to-slate-900 border-b border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{shiftMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 overflow-y-auto flex-1">
          {/* Job Listings Column */}
          <div className="md:col-span-5 space-y-3">
            <span className="text-xs font-semibold text-slate-400 block mb-1">Select Career / Workplace</span>
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
                    <span className="font-mono text-emerald-400 text-xs font-bold">${job.basePay} base</span>
                  </div>
                  <div className="text-xs text-slate-400 mb-2">{job.workplaceName}</div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-amber-300/90 font-medium">+ High Customer Tips</span>
                    {isEmployed ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Active Career
                      </span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApply(job);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 transition-colors font-bold"
                      >
                        Apply Now
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Interactive Job Station & Active Shift Column */}
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
                  <span className="text-[11px] text-slate-500 block">Base Pay</span>
                  <span className="font-mono text-emerald-400 text-sm font-bold">${selectedJob.basePay}</span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed mb-4">{selectedJob.description}</p>

              {/* Active Interactive Shift Station */}
              <div className="bg-slate-900 border border-white/10 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-300">Shift Progress</span>
                    <span className="text-[11px] font-mono text-slate-400">
                      ({completedTasksCount}/{currentTasks.length} tasks)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-emerald-400 font-bold">Tips: +${totalShiftTips}</span>
                    <span className="font-mono text-amber-400 font-bold">{shiftProgress}%</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 via-emerald-400 to-cyan-400 transition-all duration-300"
                    style={{ width: `${shiftProgress}%` }}
                  />
                </div>

                {isWorkingShift ? (
                  <div className="space-y-4 pt-1">
                    {/* Customer Interaction Card */}
                    {activeTask && (
                      <div className="p-4 rounded-xl bg-slate-950/90 border border-amber-500/30 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="text-3xl p-1 rounded-xl bg-slate-900 border border-white/5">
                              {activeTask.customerAvatar || '👤'}
                            </span>
                            <div>
                              <div className="font-bold text-white text-xs">{activeTask.customerName}</div>
                              <div className="text-[11px] text-amber-400 font-semibold">{activeTask.title}</div>
                            </div>
                          </div>
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                            +${activeTask.tipReward} Tip
                          </span>
                        </div>

                        {customerSpeech && (
                          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-white/5 text-xs text-slate-200 italic">
                            "{customerSpeech}"
                          </div>
                        )}

                        <button
                          onClick={handleExecuteActiveTask}
                          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-emerald-400 to-emerald-500 hover:opacity-95 text-slate-950 font-bold text-xs transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10"
                        >
                          <Zap className="w-4 h-4 fill-slate-950" />
                          <span>{activeTask.actionButtonLabel}</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="pt-2">
                    {currentJobId === selectedJob.id ? (
                      <button
                        onClick={startShift}
                        className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-md"
                      >
                        <Play className="w-4 h-4 fill-slate-950" />
                        Clock In for Shift (${selectedJob.basePay} base + customer tips)
                      </button>
                    ) : (
                      <button
                        onClick={() => handleApply(selectedJob)}
                        className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-2"
                      >
                        <UserCheck className="w-4 h-4" />
                        Accept Job Offer as {selectedJob.title}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-white/5 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Earn unlimited cash ($) & performance bonuses</span>
              <span>Metro Commerce City Hub</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
