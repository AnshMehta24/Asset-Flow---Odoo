"use client";

import React, { useState, useMemo } from "react";
import type { ReportsData } from "../_lib/reports-data";
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Award,
  Clock,
  ArrowDownToLine,
  ChevronDown,
  Wrench,
  ShieldAlert,
  Package,
  Activity,
  DollarSign,
  Heart
} from "lucide-react";

const NEARING_RETIREMENT_DISPLAY_YEARS = 6;

export function ReportsDashboard({ data }: { data: ReportsData }) {
  const [dateRange, setDateRange] = useState("Last 30 Days");
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{ day: string; timeSlot: string } | null>(null);

  const {
    totalAssets,
    activeAllocations,
    allocationRate,
    pendingMaintenance,
    totalValue,
    deptUtilization,
    maintFrequency,
    mostUsed,
    idleAssets,
    alerts,
    heatmap,
    deptSummary,
  } = data;

  // Helper to format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    }).format(val);
  };

  // Export report to CSV
  const handleExportCSV = (type: "all" | "utilization" | "maintenance") => {
    let csvContent = "data:text/csv;charset=utf-8,";
    const filename = `asset_flow_report_${type}_${new Date().toISOString().split("T")[0]}.csv`;

    if (type === "all" || type === "utilization") {
      csvContent += "--- DEPARTMENT UTILIZATION AND ALLOCATION SUMMARY ---\r\n";
      csvContent += "Department,Total Assets,Active Allocations,Availability Rate (%),Total Acquisition Cost\r\n";
      deptSummary.forEach((row) => {
        csvContent += `"${row.departmentName}",${row.totalAssets},${row.activeAllocations},${row.availabilityRate}%,$${row.totalCost}\r\n`;
      });
      csvContent += "\r\n";
    }

    if (type === "all" || type === "maintenance") {
      csvContent += "--- MAINTENANCE FREQUENCY OVER PAST 6 MONTHS ---\r\n";
      csvContent += "Month,Resolved Maintenance Requests\r\n";
      maintFrequency.forEach((row) => {
        csvContent += `"${row.month}",${row.count}\r\n`;
      });
      csvContent += "\r\n";
    }

    if (type === "all") {
      csvContent += "--- CRITICAL ALERTS (MAINTENANCE AND RETIREMENT) ---\r\n";
      csvContent += "Asset ID,Asset Name,Alert Type,Alert Message,Priority\r\n";
      alerts.forEach((alert) => {
        csvContent += `"${alert.tagNumberFormatted}","${alert.assetName}","${alert.type}","${alert.message}","${alert.priority}"\r\n`;
      });
      csvContent += "\r\n";

      csvContent += "--- TOP BOOKED ASSETS ---\r\n";
      csvContent += "Asset ID,Asset Name,Usage Count/Details\r\n";
      mostUsed.forEach((asset) => {
        csvContent += `"${asset.tagNumberFormatted}","${asset.assetName}","${asset.detail}"\r\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportDropdownOpen(false);
  };

  // Spline calculations for Maintenance Line Chart
  const svgWidth = 500;
  const svgHeight = 220;
  const chartPadding = { top: 20, right: 30, bottom: 40, left: 40 };

  const linePoints = useMemo(() => {
    const maxVal = Math.max(...maintFrequency.map((d) => d.count), 4);
    const widthAvailable = svgWidth - chartPadding.left - chartPadding.right;
    const heightAvailable = svgHeight - chartPadding.top - chartPadding.bottom;

    return maintFrequency.map((d, index) => {
      const x = chartPadding.left + (index / (maintFrequency.length - 1)) * widthAvailable;
      const y = chartPadding.top + heightAvailable - (d.count / maxVal) * heightAvailable;
      return { x, y, count: d.count, month: d.month };
    });
  }, [maintFrequency]);

  const splinePath = useMemo(() => {
    if (linePoints.length === 0) return "";
    let path = `M ${linePoints[0].x} ${linePoints[0].y}`;
    for (let i = 0; i < linePoints.length - 1; i++) {
      const p0 = linePoints[i];
      const p1 = linePoints[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 2;
      const cpY1 = p0.y;
      const cpX2 = p0.x + (p1.x - p0.x) / 2;
      const cpY2 = p1.y;
      path += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }
    return path;
  }, [linePoints]);

  const splineAreaPath = useMemo(() => {
    if (linePoints.length === 0) return "";
    const closedHeight = svgHeight - chartPadding.bottom;
    return `${splinePath} L ${linePoints[linePoints.length - 1].x} ${closedHeight} L ${linePoints[0].x} ${closedHeight} Z`;
  }, [linePoints, splinePath]);

  return (
    <div className="flex flex-col">
      {/* Top Header */}
      <header className="h-16 flex items-center justify-between px-6 border-b border-border bg-card/85 backdrop-blur-md sticky top-0 z-30">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Reports & Analytics</h1>
          <p className="text-xs text-muted-foreground hidden sm:block">Real-time asset utilization and operational insights</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Date Range Selector */}
          <div className="relative">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="appearance-none bg-muted border border-border hover:border-accent-foreground/20 text-sm text-muted-foreground font-medium px-4 py-2 pr-10 rounded-lg cursor-pointer transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option>Last 30 Days</option>
              <option>This Quarter</option>
              <option>This Year</option>
            </select>
            <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/95 font-medium text-sm rounded-lg transition-all shadow active:scale-[0.98]"
            >
              <ArrowDownToLine size={16} />
              <span>Export report</span>
              <ChevronDown size={14} className="opacity-80" />
            </button>

            {isExportDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsExportDropdownOpen(false)} />
                <div className="absolute right-0 mt-2 w-48 rounded-lg bg-popover border border-border shadow-lg z-20 py-1 divide-y divide-border/50 animate-in fade-in slide-in-from-top-1 duration-100">
                  <button
                    onClick={() => handleExportCSV("all")}
                    className="w-full text-left px-4 py-2.5 text-xs text-popover-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    Export Full Report (.csv)
                  </button>
                  <button
                    onClick={() => handleExportCSV("utilization")}
                    className="w-full text-left px-4 py-2.5 text-xs text-popover-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    Export Utilization Summary
                  </button>
                  <button
                    onClick={() => handleExportCSV("maintenance")}
                    className="w-full text-left px-4 py-2.5 text-xs text-popover-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    Export Maintenance Frequency
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Dashboard Content Container */}
      <main className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">

        {/* Top KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between hover:border-accent-foreground/20 transition-all hover:bg-accent/5 group">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Assets</p>
              <h3 className="text-2xl font-bold text-card-foreground mt-1 group-hover:text-primary transition-colors">{totalAssets}</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Across {deptSummary.length} departments</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-accent text-accent-foreground flex items-center justify-center border border-border">
              <Package size={22} />
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between hover:border-accent-foreground/20 transition-all hover:bg-accent/5 group">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Allocation Rate</p>
              <h3 className="text-2xl font-bold text-card-foreground mt-1 group-hover:text-primary transition-colors">{allocationRate}%</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">{activeAllocations} currently active</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-accent text-accent-foreground flex items-center justify-center border border-border">
              <Activity size={22} />
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between hover:border-accent-foreground/20 transition-all hover:bg-accent/5 group">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">In Maintenance</p>
              <h3 className="text-2xl font-bold text-card-foreground mt-1 group-hover:text-primary transition-colors">{pendingMaintenance}</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Requires technician review</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-accent text-accent-foreground flex items-center justify-center border border-border">
              <Wrench size={22} />
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between hover:border-accent-foreground/20 transition-all hover:bg-accent/5 group">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Value</p>
              <h3 className="text-2xl font-bold text-card-foreground mt-1 group-hover:text-primary transition-colors">{formatCurrency(totalValue)}</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Estimated acquisition cost</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-accent text-accent-foreground flex items-center justify-center border border-border">
              <DollarSign size={22} />
            </div>
          </div>
        </div>

        {/* Interactive Charts Row (Utilization vs Maintenance) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* SVG Department Utilization Bar Chart */}
          <div className="bg-card border border-border rounded-xl p-6 flex flex-col relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-card-foreground flex items-center gap-2">
                  <BarChart3 size={16} className="text-violet-500" />
                  <span>Utilization by Department</span>
                </h3>
                <p className="text-xs text-muted-foreground">Active allocations vs total category count</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-2.5 h-2.5 rounded-sm bg-gradient-to-tr from-violet-600 to-indigo-500" />
                <span>Allocation %</span>
              </div>
            </div>

            {/* Chart Area */}
            <div className="h-60 flex items-end justify-between relative mt-4 pt-4 border-b border-border px-2">

              {/* Horizontal Guide lines */}
              <div className="absolute inset-x-0 top-0 border-t border-border/30 h-0" />
              <div className="absolute inset-x-0 top-1/4 border-t border-border/30 h-0" />
              <div className="absolute inset-x-0 top-2/4 border-t border-border/30 h-0" />
              <div className="absolute inset-x-0 top-3/4 border-t border-border/30 h-0" />

              {deptUtilization.map((dept, idx) => {
                const barHeight = `${Math.max(dept.utilizationRate, 5)}%`;
                const isHovered = hoveredBar === idx;

                return (
                  <div
                    key={dept.departmentId}
                    className="flex flex-col items-center flex-1 group cursor-pointer relative z-10"
                    onMouseEnter={() => setHoveredBar(idx)}
                    onMouseLeave={() => setHoveredBar(null)}
                  >
                    {/* Interactive Tooltip on hover */}
                    {isHovered && (
                      <div className="absolute bottom-full mb-2 bg-popover border border-border text-popover-foreground text-2xs p-2 rounded shadow-lg flex flex-col items-center z-20 pointer-events-none min-w-[120px] animate-in fade-in duration-75">
                        <p className="font-semibold text-foreground">{dept.departmentName}</p>
                        <div className="flex gap-4 mt-1 border-t border-border pt-1 w-full justify-between">
                          <span className="text-muted-foreground">Allocation:</span>
                          <span className="font-bold text-primary">{dept.utilizationRate}%</span>
                        </div>
                        <div className="flex gap-4 w-full justify-between">
                          <span className="text-muted-foreground">Allocated:</span>
                          <span className="text-foreground font-medium">{dept.allocatedAssets} / {dept.totalAssets}</span>
                        </div>
                      </div>
                    )}

                    {/* Bar Column */}
                    <div className="w-10 sm:w-12 bg-muted rounded-t-md overflow-hidden h-48 flex items-end">
                      <div
                        style={{ height: barHeight }}
                        className={`w-full rounded-t-sm transition-all duration-300 bg-gradient-to-t ${
                          isHovered
                            ? "from-violet-500 to-indigo-400 shadow-[0_0_12px_rgba(139,92,246,0.3)]"
                            : "from-violet-600 to-indigo-500"
                        }`}
                      />
                    </div>

                    {/* Bar Label */}
                    <span className="text-[10px] text-muted-foreground font-medium mt-2 truncate max-w-[65px] text-center">
                      {dept.departmentName}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SVG Maintenance Frequency Spline Chart */}
          <div className="bg-card border border-border rounded-xl p-6 flex flex-col relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-card-foreground flex items-center gap-2">
                  <TrendingUp size={16} className="text-pink-500" />
                  <span>Maintenance Frequency</span>
                </h3>
                <p className="text-xs text-muted-foreground">Monthly resolved maintenance requests trend</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-pink-500 to-rose-500 shadow-[0_0_6px_rgba(236,72,153,0.4)]" />
                <span>Completed tasks</span>
              </div>
            </div>

            {/* Chart Visualized with Custom SVG */}
            <div className="flex-1 min-h-[220px] flex items-center justify-center relative mt-2">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-full overflow-visible"
              >
                <defs>
                  {/* Rose spline glow gradient */}
                  <linearGradient id="splineAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
                  </linearGradient>
                  {/* Rose spline line gradient */}
                  <linearGradient id="splineLineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#ec4899" />
                    <stop offset="100%" stopColor="#f43f5e" />
                  </linearGradient>
                </defs>

                {/* Y-axis gridlines using utility border classes */}
                {Array.from({ length: 5 }).map((_, idx) => {
                  const yPos = chartPadding.top + (idx / 4) * (svgHeight - chartPadding.top - chartPadding.bottom);
                  return (
                    <line
                      key={idx}
                      x1={chartPadding.left}
                      y1={yPos}
                      x2={svgWidth - chartPadding.right}
                      y2={yPos}
                      stroke="currentColor"
                      className="text-border/40"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />
                  );
                })}

                {/* Gradient Area under Spline */}
                {splineAreaPath && (
                  <path d={splineAreaPath} fill="url(#splineAreaGrad)" className="transition-all duration-300" />
                )}

                {/* Curve Spline Path */}
                {splinePath && (
                  <path
                    d={splinePath}
                    fill="none"
                    stroke="url(#splineLineGrad)"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    className="transition-all duration-300"
                  />
                )}

                {/* Dynamic Nodes */}
                {linePoints.map((pt, idx) => {
                  const isHovered = hoveredPoint === idx;

                  return (
                    <g
                      key={idx}
                      className="cursor-pointer group"
                      onMouseEnter={() => setHoveredPoint(idx)}
                      onMouseLeave={() => setHoveredPoint(null)}
                    >
                      {/* Hover ring */}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isHovered ? 9 : 0}
                        fill="#f43f5e"
                        fillOpacity="0.15"
                        className="transition-all duration-150"
                      />
                      {/* Node point */}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isHovered ? 5.5 : 3.5}
                        fill={isHovered ? "hsl(var(--background))" : "#ec4899"}
                        stroke="#f43f5e"
                        strokeWidth="1.5"
                        className="transition-all duration-150"
                      />

                      {/* X-axis Month Label */}
                      <text
                        x={pt.x}
                        y={svgHeight - 15}
                        fill="currentColor"
                        className="text-muted-foreground/80"
                        fontSize="10"
                        textAnchor="middle"
                        fontWeight="500"
                      >
                        {pt.month}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Spline Tooltip overlay */}
              {hoveredPoint !== null && (
                <div
                  style={{
                    position: "absolute",
                    left: `${(linePoints[hoveredPoint].x / svgWidth) * 90}%`,
                    top: `${(linePoints[hoveredPoint].y / svgHeight) * 70}%`
                  }}
                  className="bg-popover border border-border text-popover-foreground text-2xs p-2 rounded shadow-lg flex flex-col pointer-events-none z-20 min-w-[100px] transform -translate-x-1/2 -translate-y-full mt-[-10px] animate-in fade-in zoom-in-95 duration-75"
                >
                  <p className="font-semibold text-foreground">{linePoints[hoveredPoint].month}</p>
                  <div className="flex gap-3 justify-between items-center mt-0.5">
                    <span className="text-muted-foreground">Service Tickets:</span>
                    <span className="font-bold text-pink-500">{linePoints[hoveredPoint].count}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Most Used vs Idle Assets row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Most Used Assets */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-sm font-bold text-card-foreground mb-4 flex items-center gap-2">
              <Award size={16} className="text-primary" />
              <span>Most used assets</span>
            </h3>
            <div className="divide-y divide-border/40">
              {mostUsed.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">No bookings recorded yet.</p>
              ) : (
                mostUsed.map((asset) => (
                  <div key={asset.assetId} className="py-3 flex items-center justify-between hover:bg-muted/30 px-2 rounded-lg transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center border border-border font-mono text-[10px] text-muted-foreground">
                        {asset.tagNumberFormatted}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-card-foreground group-hover:text-primary transition-colors">{asset.assetName}</h4>
                      </div>
                    </div>
                    <span className="px-3 py-1 text-xs rounded-full bg-secondary border border-border text-secondary-foreground font-semibold">
                      {asset.detail}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Idle Assets */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-sm font-bold text-card-foreground mb-4 flex items-center gap-2">
              <Clock size={16} className="text-primary" />
              <span>Idle assets</span>
            </h3>
            <div className="divide-y divide-border/40">
              {idleAssets.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">No idle assets detected.</p>
              ) : (
                idleAssets.map((asset) => (
                  <div key={asset.assetId} className="py-3 flex items-center justify-between hover:bg-muted/30 px-2 rounded-lg transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center border border-border font-mono text-[10px] text-muted-foreground">
                        {asset.tagNumberFormatted}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-card-foreground group-hover:text-primary transition-colors">{asset.assetName}</h4>
                      </div>
                    </div>
                    <span className="px-3 py-1 text-xs rounded-full bg-secondary border border-border text-secondary-foreground font-semibold">
                      {asset.detail}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Alerts & Heatmap row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Alerts Panel */}
          <div className="bg-card border border-border rounded-xl p-6 flex flex-col">
            <h3 className="text-sm font-bold text-card-foreground mb-4 flex items-center gap-2">
              <ShieldAlert size={16} className="text-destructive" />
              <span>Assets due for maintenance / nearing retirement</span>
            </h3>

            <div className="flex-1 space-y-4">
              {alerts.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">No active alerts.</p>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={`${alert.type}-${alert.assetId}`}
                    className={`p-4 rounded-xl border flex gap-4 ${
                      alert.type === "MAINTENANCE"
                        ? "bg-destructive/10 border-destructive/20 text-destructive-foreground"
                        : "bg-muted/50 border-border text-muted-foreground"
                    }`}
                  >
                    {/* Alert Icon */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      alert.type === "MAINTENANCE"
                        ? "bg-destructive/20 text-destructive border border-destructive/30"
                        : "bg-muted flex items-center justify-center border border-border"
                    }`}>
                      {alert.type === "MAINTENANCE" ? <Wrench size={18} /> : <Heart size={18} />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-2xs px-1.5 py-0.5 rounded bg-background border border-border text-muted-foreground font-medium">
                          {alert.tagNumberFormatted}
                        </span>
                        <h4 className="text-sm font-bold text-foreground truncate">{alert.assetName}</h4>
                      </div>

                      <p className="text-xs text-muted-foreground mt-1 capitalize">
                        {alert.message}
                      </p>

                      {/* Visual Indicators */}
                      {alert.type === "MAINTENANCE" ? (
                        <div className="flex items-center gap-3 mt-3">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/20 text-destructive font-bold border border-destructive/30">
                            {alert.priority}
                          </span>
                          <span className="text-[10px] text-muted-foreground">Service due soon</span>
                        </div>
                      ) : (
                        <div className="mt-3">
                          {/* Lifespan progress */}
                          <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-primary h-full rounded-full"
                              style={{ width: `${Math.min(100, Math.round((alert.daysRemainingOrAge / (NEARING_RETIREMENT_DISPLAY_YEARS)) * 100))}%` }}
                            />
                          </div>
                          <div className="flex justify-between items-center mt-1 text-[10px] text-muted-foreground">
                            <span>{alert.daysRemainingOrAge} years old</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Booking Heatmap */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-card-foreground flex items-center gap-2">
                  <Calendar size={16} className="text-teal-500" />
                  <span>Resource booking heatmap</span>
                </h3>
                <p className="text-xs text-muted-foreground">Peak usage windows across weekdays & time blocks</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="text-[10px] text-muted-foreground">Peak activity</span>
                <div className="flex h-2.5 w-12 rounded overflow-hidden border border-border">
                  <span className="flex-1 bg-teal-950/20" />
                  <span className="flex-1 bg-teal-500/40" />
                  <span className="flex-1 bg-teal-500" />
                </div>
              </div>
            </div>

            {/* Heatmap Grid bound directly to the global shadcn primary theme */}
            <div className="mt-4 overflow-x-auto">
              <div className="min-w-[480px]">
                {/* Grid Headers */}
                <div className="grid grid-cols-8 gap-1.5 text-[9px] text-muted-foreground font-bold uppercase tracking-wider text-center pb-2 border-b border-border/40">
                  <div>Slot</div>
                  <div>Mon</div>
                  <div>Tue</div>
                  <div>Wed</div>
                  <div>Thu</div>
                  <div>Fri</div>
                  <div>Sat</div>
                  <div>Sun</div>
                </div>

                {/* Grid Body */}
                <div className="space-y-1.5 pt-2">
                  {Array.from(new Set(heatmap.map((c) => c.timeSlot))).map((slot) => {
                    const shortSlot = slot.split(" (")[0];

                    return (
                      <div key={slot} className="grid grid-cols-8 gap-1.5 items-center">
                        {/* Y-axis Label */}
                        <div className="text-[10px] text-muted-foreground font-semibold truncate pr-1">
                          {shortSlot}
                        </div>

                        {/* Day Columns */}
                        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => {
                          const cell = heatmap.find((c) => c.day === day && c.timeSlot === slot);
                          const val = cell ? cell.density : 0;

                          // Dynamic theme class names linking to Teal palette
                          let cellClass = "bg-muted/40 border border-border/40 text-muted-foreground/60";
                          if (val > 80) cellClass = "bg-teal-500 border border-teal-400 text-white font-bold shadow-[0_0_8px_rgba(20,184,166,0.2)]";
                          else if (val > 60) cellClass = "bg-teal-500/60 border border-teal-500/50 text-teal-100";
                          else if (val > 30) cellClass = "bg-teal-950/20 border border-teal-900/30 text-teal-400";

                          const isHovered = hoveredCell?.day === day && hoveredCell?.timeSlot === slot;

                          return (
                            <div
                              key={day}
                              className={`h-8 rounded flex items-center justify-center text-[10px] font-bold cursor-pointer transition-all ${cellClass} ${
                                isHovered ? "scale-105 shadow z-10 font-black" : ""
                              }`}
                              onMouseEnter={() => setHoveredCell({ day, timeSlot: slot })}
                              onMouseLeave={() => setHoveredCell(null)}
                              title={`${day} ${shortSlot}: ${val}% booking density`}
                            >
                              {val}%

                              {/* Tooltip overlay */}
                              {isHovered && (
                                <div className="absolute bg-popover border border-border text-popover-foreground text-2xs p-2 rounded shadow-md z-30 pointer-events-none min-w-[120px] text-left transform translate-y-[-45px] animate-in fade-in duration-75">
                                  <p className="font-bold text-teal-500">{day} - {shortSlot}</p>
                                  <p className="text-muted-foreground mt-0.5">Booking Density: <span className="font-semibold text-foreground">{val}%</span></p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Department-Wise Summary Table */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-card-foreground">Department Allocation Summary</h3>
            <p className="text-xs text-muted-foreground">Consolidated overview of organizational asset deployment</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4 text-center">Total Assets</th>
                  <th className="py-3.5 px-4 text-center">Active Allocations</th>
                  <th className="py-3.5 px-4 text-center">Availability Rate</th>
                  <th className="py-3.5 px-4 text-right">Total Acquisition Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 text-sm">
                {deptSummary.map((row) => (
                  <tr key={row.departmentName} className="hover:bg-muted/30 transition-colors group">
                    <td className="py-3 px-4 font-semibold text-card-foreground group-hover:text-primary transition-colors">
                      {row.departmentName}
                    </td>
                    <td className="py-3 px-4 text-center text-muted-foreground">
                      {row.totalAssets}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 text-xs rounded bg-muted border border-border text-muted-foreground font-medium">
                        {row.activeAllocations}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          row.availabilityRate > 50 ? "bg-primary" : "bg-destructive"
                        }`} />
                        <span className="text-muted-foreground font-medium">{row.availabilityRate}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-muted-foreground font-mono font-medium">
                      {formatCurrency(row.totalCost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}
