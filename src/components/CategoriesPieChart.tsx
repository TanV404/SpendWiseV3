import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Transaction } from '../types';

interface CategoriesPieChartProps {
  transactions: Transaction[];
}

export const CategoriesPieChart: React.FC<CategoriesPieChartProps> = ({ transactions }) => {
  // Aggregate expenses by category for current month
  const now = new Date();
  const currentMonthYear = now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }); // e.g. "May 2024" or "Aug 2026"

  const expenses = transactions.filter((tx) => {
    if (tx.amount >= 0) return false;

    // Check if tx date matches current month/year or recent cycle
    if (!tx.date) return true;
    try {
      const txD = new Date(tx.date);
      if (!isNaN(txD.getTime())) {
        return (
          txD.getMonth() === now.getMonth() &&
          txD.getFullYear() === now.getFullYear()
        );
      }
    } catch {}

    // Fallback match string e.g. "May 2024"
    return tx.date.toLowerCase().includes(currentMonthYear.toLowerCase());
  });

  // If no transactions match current calendar month, fallback to overall recent expenses so chart is always useful
  const activeExpenses = expenses.length > 0 ? expenses : transactions.filter((tx) => tx.amount < 0);

  const dataMap = activeExpenses.reduce((acc, tx) => {
    const val = Math.abs(tx.amount);
    acc[tx.category] = (acc[tx.category] || 0) + val;
    return acc;
  }, {} as Record<string, number>);

  const data = Object.entries(dataMap)
    .map(([name, value]) => ({ name, value: Number(value) }))
    .sort((a, b) => b.value - a.value);

  const COLORS = ['#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe'];
  const totalExpenseSum = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="col-span-12 lg:col-span-4 bento-card bg-[#122131] p-6 animate-fade flex flex-col justify-start">
      <div className="mb-3">
        <h3 className="text-xl font-bold text-[#d4e4fa] tracking-tight">Top Categories</h3>
        <p className="text-sm text-[#c7c4d8]/80 font-normal mt-0.5">Monthly expense breakdown</p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 mt-1">
        <div className="h-48 w-full sm:w-1/2">
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => `$${value.toFixed(2)}`}
                  contentStyle={{ backgroundColor: '#0d1c2d', borderColor: '#464555', borderRadius: '0.5rem', color: '#d4e4fa' }}
                  itemStyle={{ color: '#d4e4fa' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-[#c7c4d8]">
              No expenses found.
            </div>
          )}
        </div>

        {/* Side-by-side Percentage & Ranking List */}
        <div className="w-full sm:w-1/2 space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
          {data.slice(0, 5).map((item, index) => {
            const pct = totalExpenseSum > 0 ? Math.round((item.value / totalExpenseSum) * 100) : 0;
            return (
              <div key={item.name} className="flex items-center justify-between p-2 rounded-lg bg-[#0d1c2d]/70 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                  <span className="font-semibold text-[#d4e4fa] truncate max-w-[90px]">{item.name}</span>
                </div>
                <span className="font-mono-data font-bold text-[#bfdbfe]">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
