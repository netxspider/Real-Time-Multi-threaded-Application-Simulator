# 🧵 Real-Time Multi-threaded Application Simulator

> An interactive, visual educational tool for understanding OS-level multithreading concepts — built entirely in the browser with no backend required.

![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite)
![TailwindCSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?style=flat-square&logo=tailwindcss)
![Zustand](https://img.shields.io/badge/Zustand-5-FF6B00?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

---

## 📖 Overview

The **Real-Time Multi-threaded Application Simulator** is a fully client-side, interactive dashboard that simulates operating-system-level thread scheduling. It lets students and developers visualise how different CPU scheduling algorithms manage threads across their lifecycle — from creation to termination — in real time.

Because JavaScript is single-threaded, the simulator does **not** use Web Workers. Instead, it uses a central **Simulation Engine (Scheduler)** that drives a state-machine of virtual threads forward one tick at a time using `setInterval`. All state is synchronous and managed by a **Zustand** store, making the simulation deterministic and easy to reason about.

---

## ✨ Features

### 🕹️ Simulation Engine
- **Tick-based game loop** driven by `setInterval` with configurable speed (0.25× to 8×)
- **Full thread lifecycle**: `NEW → READY → RUNNING → TERMINATED`
- **No blocking states** — threads are only preempted to the Ready Queue, never blocked
- **CPU Idle detection** — correctly shows idle CPU when no thread is runnable
- **Context switch tracking** — counts and reports every time the CPU switches between threads
- **Real-time event log** — auto-scrolling timestamped log of every scheduler decision

### 📐 Scheduling Algorithms (5 total)

| Algorithm | Type | Description |
|-----------|------|-------------|
| **FCFS** | Non-preemptive | First-Come-First-Served — threads run in arrival order until completion |
| **SJF** | Non-preemptive | Shortest Job First — picks the thread with the smallest burst time |
| **Round Robin** | Preemptive | Rotates threads on CPU for exactly `timeQuantum` ticks then moves to back of queue |
| **SRTF** | Preemptive | Shortest Remaining Time First — always picks the thread closest to finishing; preempts on arrival of shorter thread |
| **Priority** | Preemptive | Schedules by user-assigned priority; preempts if a higher-priority thread arrives |

### 🔗 Thread Models (3 total)

| Model | Description |
|-------|-------------|
| **One-to-One** | Each user thread maps to its own kernel thread |
| **Many-to-One** | All user threads share a single kernel thread |
| **Many-to-Many** | User threads multiplexed across a pool of kernel threads |

### 📊 Visualisations
- **Thread Mapper** — live SVG diagram showing User Thread → Kernel Thread → CPU connections with animated flow lines and glow effects
- **Gantt Chart** — real-time horizontal timeline showing which thread occupies the CPU at each tick, with entry/exit time labels and thread names inside blocks
- **CPU Utilisation Graph** — live line chart (via Recharts) showing CPU busy/idle history over the last 60 ticks
- **Thread State Chart** — bar chart of threads in each state (New / Ready / Running / Done)
- **Queue Status Panel** — live view of which thread is running, the ordered ready queue with progress bars, and arriving threads

### 📋 Simulation Results Modal
After a simulation completes, a detailed results modal appears showing:
- **Per-thread metrics** — Arrival Time, Burst Time, Start Time, Completion Time, Response Time, Waiting Time, Turnaround Time
- **Averages row** for all key metrics
- **5 summary cards** — Avg Turnaround, Avg Waiting, Avg Response, Avg Burst, **Context Switches**
- Metric formula legend for quick reference

### ⚙️ Configuration
- **Thread count** — 1 to 10 user threads via slider
- **Per-thread config** — individual Arrival Time and Burst Time (+ Priority when using Priority scheduling)
- **Time Quantum** — configurable 1–20 ticks for Round Robin
- **Priority Mode** — toggle between *Low # Wins* (default: priority 1 beats priority 5) and *High # Wins* (priority 10 beats priority 1)
- **Simulation Speed** — 0.25×, 0.5×, 0.75×, 1×, 2×, 4×, 8×

---

## 🏗️ Architecture

```
src/
├── engine/
│   ├── scheduler.js        # Pure scheduling algorithm functions (FCFS, SJF, SRTF, RR, Priority)
│   ├── threadModel.js      # Kernel count logic & user→kernel mapping builder
│   ├── gameLoop.js         # setInterval-based tick loop hook (main simulator)
│   └── syncGameLoop.js     # Separate tick loop for Thread Sync Simulator
│
├── store/
│   └── simulationStore.js  # Central Zustand store — all simulation state & tick() logic
│
├── components/
│   ├── controls/
│   │   ├── ControlPanel.jsx        # Left sidebar: config, playback, algorithm & thread settings
│   │   └── ThreadConfigModal.jsx   # Modal for editing per-thread arrival/burst/priority
│   │
│   ├── visualization/
│   │   ├── ThreadMapper.jsx        # SVG user↔kernel↔CPU diagram with live animations
│   │   └── StateLegend.jsx         # Colour-coded state legend (New/Ready/Running/Terminated)
│   │
│   ├── scheduling/
│   │   ├── GanttChart.jsx          # Scrollable SVG Gantt chart with tick boundary labels
│   │   └── ReadyQueuePanel.jsx     # Live CPU running + ready queue + arriving threads panel
│   │
│   ├── metrics/
│   │   ├── RightSidebar.jsx        # Right panel: CPU graph, thread state chart, status table, log
│   │   ├── CpuUtilChart.jsx        # Recharts line graph of CPU utilisation
│   │   ├── ThreadStateChart.jsx    # Recharts bar chart of thread state counts
│   │   ├── ThreadTable.jsx         # Per-thread status table (ID, priority, state, burst, remaining)
│   │   ├── EventLog.jsx            # Auto-scrolling scheduler event log
│   │   └── ResultsModal.jsx        # Post-simulation results modal with full metrics
│   │
│   └── sync/                       # Thread Synchronisation Simulator (Semaphores, Monitors, etc.)
│
├── pages/                          # Page-level route components
├── App.jsx                         # Root layout — three-column dashboard
├── main.jsx                        # React entry point
└── index.css                       # Global styles, animations, custom utilities
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18 or higher
- **npm** v9 or higher

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/arnavraj/Real-Time-Multi-threaded-Application-Simulator.git
cd Real-Time-Multi-threaded-Application-Simulator

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

The app will be available at **http://localhost:5173**.

### Build for Production

```bash
npm run build
# Output is placed in the dist/ directory

npm run preview
# Serves the production build locally
```

---

## 🛠️ Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19 | UI framework (functional components + hooks) |
| **Vite** | 8 | Build tool and dev server |
| **Tailwind CSS** | v4 | Utility-first styling (dark dashboard theme) |
| **Zustand** | 5 | Lightweight global state management |
| **Recharts** | 3 | CPU utilisation & thread state charts |
| **Lucide React** | latest | SVG icon library |

All rendering is **SVG-based** for the thread mapper and Gantt chart — no external diagramming library required.

---

## 🎓 Concepts Demonstrated

This simulator is designed as an educational tool for the following OS concepts:

- **Thread lifecycle** — how threads transition through states from creation to termination
- **CPU scheduling** — how an OS decides which thread gets the processor at each moment
- **Preemption** — how higher-priority or shorter-remaining-time threads can forcibly take the CPU
- **Context switching** — the overhead cost of switching between threads (counted and displayed)
- **Waiting time & turnaround time** — standard scheduling metrics with real computed values
- **Response time** — time from arrival until a thread first touches the CPU
- **User threads vs. kernel threads** — the three major thread-to-kernel mapping models (1:1, M:1, M:M)
- **Round Robin fairness** — how time quantums distribute CPU time evenly
- **Priority inversion risks** — observable when using Priority scheduling with varied arrival times

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to your branch: `git push origin feature/your-feature-name`
5. Open a Pull Request

---

## 👥 Credits

This project was designed and built by:

| Contributor | GitHub |
|-------------|--------|
| **Arnav Raj** | [@netxspider](https://github.com/netxspider) |
| **Parul** | [@Parul-0812](https://github.com/Parul-0812) |
| **Pragati** | [@Pragati1512](https://github.com/Pragati1512) |

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <p>Built with ❤️ as an educational OS concepts visualisation tool.</p>
</div>
