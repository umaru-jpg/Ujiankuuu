"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler
);

const activityData = {
  labels: ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"],
  datasets: [
    {
      label: "Login Harian",
      data: [150, 230, 180, 290, 200, 50, 40],
      borderColor: "#2563eb",
      backgroundColor: "rgba(37, 99, 235, 0.1)",
      borderWidth: 2,
      fill: true,
      tension: 0.4,
      pointBackgroundColor: "#2563eb",
      pointRadius: 3,
    },
  ],
};

const activityOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    y: { beginAtZero: true, grid: { color: "#f1f5f9" } },
    x: { grid: { display: false } },
  },
};

const scoreData = {
  labels: ["RPL", "TKJ", "MM", "AK", "AP"],
  datasets: [
    {
      label: "Rata-rata Nilai",
      data: [82, 78, 85, 80, 75],
      backgroundColor: "#2563eb",
      borderRadius: 4,
      maxBarThickness: 42,
    },
  ],
};

const scoreOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    y: { beginAtZero: true, max: 100, grid: { color: "#f1f5f9" } },
    x: { grid: { display: false } },
  },
};

/** Dua kartu chart pada bento grid dashboard admin. */
export default function Charts() {
  return (
    <>
      <div className="col-span-1 md:col-span-2 lg:col-span-2 bg-surface rounded-xl p-6 shadow-sm border border-outline-variant/30 flex flex-col">
        <h2 className="font-title-sm text-title-sm text-on-surface mb-4">
          Aktivitas Sistem (7 Hari Terakhir)
        </h2>
        <div className="flex-grow w-full relative min-h-[200px]">
          <Line data={activityData} options={activityOptions} />
        </div>
      </div>
      <div className="col-span-1 md:col-span-2 lg:col-span-2 bg-surface rounded-xl p-6 shadow-sm border border-outline-variant/30 flex flex-col">
        <h2 className="font-title-sm text-title-sm text-on-surface mb-4">
          Rata-rata Nilai per Jurusan
        </h2>
        <div className="flex-grow w-full relative min-h-[200px]">
          <Bar data={scoreData} options={scoreOptions} />
        </div>
      </div>
    </>
  );
}
