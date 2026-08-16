import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Transaction } from '../types';
import { isCurrentMonthAndYear } from '../utils/formatters';

interface CategoriesPieChartProps {
  transactions: Transaction[];
}

export const CategoriesPieChart: React.FC<CategoriesPieChartProps> = ({ transactions }) => {
  // Aggregate expenses strictly for the current month
  const activeExpenses = transactions.filter(
    (tx) => tx.amount < 0 && Math.abs(tx.amount) < 1_000_000 && isCurrentMonthAndYear(tx.date)
  );

  const dataMap = activeExpenses.reduce((acc, tx) => {
    const val = Math.abs(tx.amount);
    const cat = tx.category || 'Other';
    acc[cat] = (acc[cat] || 0) + val;
    return acc;
  }, {} as Record<string, number>);

  const rawData = Object.entries(dataMap)
    .map(([name, value]) => ({ name, value: Number(value) }))
    .sort((a, b) => b.value - a.value);

  // Group into Top 5 categories + "Other" for clean visualization
  let data = rawData;
  if (rawData.length > 5) {
    const top5 = rawData.slice(0, 5);
    const otherSum = rawData.slice(5).reduce((sum, item) => sum + item.value, 0);
    if (otherSum > 0) {
      top5.push({ name: 'Other', value: otherSum });
    }
    data = top5;
  }

  // Blue Monochrome Theme: Distinct tonal steps with alternating contrast
  const BLUE_MONOCHROME_COLORS = [
    '#60a5fa', // Bright Blue (Primary)
    '#1e40af', // Deep Royal Blue
    '#93c5fd', // Light Sky Blue
    '#1d4ed8', // Medium Classic Blue
    '#3b82f6', // Vivid Blue Accent
    '#64748b', // Slate Gray for 'Other'
  ];

  const getColor = (_categoryName: string, index: number) => {
    return BLUE_MONOCHROME_COLORS[index % BLUE_MONOCHROME_COLORS.length];
  };

  const totalExpenseSum = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="col-span-12 lg:col-span-4 bento-card bg-[#122131] p-6 animate-fade flex flex-col justify-between">
      <div className="mb-2">
        <h3 className="text-xl font-bold text-[#d4e4fa] tracking-tight">Top Categories</h3>
        <p className="text-sm text-[#c7c4d8]/80 font-normal mt-0.5">Current month breakdown</p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 my-auto">
        <div className="h-56 w-full sm:w-1/2">
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={72}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getColor(entry.name, index)} />
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
        <div className="w-full sm:w-1/2 space-y-1.5 flex flex-col justify-center">
          {data.map((item, index) => {
            const pct = totalExpenseSum > 0 ? Math.round((item.value / totalExpenseSum) * 100) : 0;
            return (
              <div key={item.name} className="flex items-center justify-between p-1.5 rounded-lg bg-[#0d1c2d]/70 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: getColor(item.name, index) }}></span>
                  <span className="font-semibold text-[#d4e4fa] truncate" title={item.name}>{item.name}</span>
                </div>
                <span className="font-mono-data font-bold text-[#bfdbfe] shrink-0 pl-2">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
