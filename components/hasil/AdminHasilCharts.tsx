"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const PRIMARY = "#004ac6";
const GRID = "#e1e2ed";

interface AdminHasilChartsProps {
  classLabels: string[];
  classValues: number[];
  distributionLabels: string[];
  distributionValues: number[];
}

export default function AdminHasilCharts({
  classLabels,
  classValues,
  distributionLabels,
  distributionValues,
}: AdminHasilChartsProps) {
  const perClassData = {
    labels: classLabels,
    datasets: [
      {
        label: "Rata-rata Nilai",
        data: classValues,
        backgroundColor: "#b4c5ff",
        hoverBackgroundColor: PRIMARY,
        borderRadius: 6,
        maxBarThickness: 42,
      },
    ],
  };

  const perClassOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, max: 100, grid: { color: GRID }, ticks: { stepSize: 20 } },
      x: { grid: { display: false } },
    },
  };

  const distributionData = {
    labels: distributionLabels,
    datasets: [
      {
        label: "Jumlah Siswa",
        data: distributionValues,
        backgroundColor: "#d0e1fb",
        hoverBackgroundColor: PRIMARY,
        borderRadius: 6,
        maxBarThickness: 42,
      },
    ],
  };

  const distributionOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, grid: { color: GRID } },
      x: { grid: { display: false } },
    },
  };

  return (
    <>
      <div className="lg:col-span-6 bg-surface rounded-xl shadow-sm border border-outline-variant p-stack-md flex flex-col">
        <h3 className="font-title-sm text-title-sm text-on-surface mb-4">
          Rata-rata Nilai per Kelas
        </h3>
        <div className="flex-grow w-full relative min-h-[220px]">
          <Bar data={perClassData} options={perClassOptions} />
        </div>
      </div>
      <div className="lg:col-span-6 bg-surface rounded-xl shadow-sm border border-outline-variant p-stack-md flex flex-col">
        <h3 className="font-title-sm text-title-sm text-on-surface mb-4">Distribusi Nilai</h3>
        <div className="flex-grow w-full relative min-h-[220px]">
          <Bar data={distributionData} options={distributionOptions} />
        </div>
      </div>
    </>
  );
}
