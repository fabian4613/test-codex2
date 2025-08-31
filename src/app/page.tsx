"use client";

import { useDashboard } from "@/components/DashboardContext";
import { Dashboard } from "@/components/Dashboard";

export default function Page() {
  const { state } = useDashboard();
  return (
    <div className={`app theme-${state.theme}`}>
      <Dashboard />
    </div>
  );
}
