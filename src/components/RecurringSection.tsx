import React from 'react';
import { RecurringItem } from '../types';

interface RecurringSectionProps {
  recurringItems: RecurringItem[];
  onManageRecurring: () => void;
}

export const RecurringSection: React.FC<RecurringSectionProps> = ({
  recurringItems,
  onManageRecurring,
}) => {
  const totalMonthly = recurringItems.reduce((acc, item) => acc + item.amount, 0);

  return (
    <div
      className="col-span-12 lg:col-span-3 bento-card bg-[#122131] p-6 animate-fade flex flex-col justify-between"
      style={{ animationDelay: '0.3s' }}
    >
      <div>
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-bold text-[#d4e4fa] tracking-tight">Recurring</h3>
          <button
            onClick={onManageRecurring}
            className="text-[#c7c4d8] hover:text-[#bfdbfe] transition-colors p-1 rounded-lg hover:bg-[#1c2b3c]"
            title="Manage Recurring"
          >
            <span className="material-symbols-outlined text-xl">settings</span>
          </button>
        </div>

        <div className="space-y-2 max-h-[175px] overflow-y-auto pr-1 custom-scrollbar">
          {recurringItems.map((item, idx) => {
            const isDueSoon = idx % 2 === 0;
            const statusLabel = isDueSoon ? 'Upcoming' : 'Paid';
            const statusColor = isDueSoon ? 'text-amber-300 bg-amber-400/10 border-amber-400/20' : 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';

            return (
              <div
                key={item.id}
                className="flex items-center justify-between p-2.5 hover:bg-[#1c2b3c] rounded-xl transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#1c2b3c] flex items-center justify-center border border-white/5 text-[#bfdbfe] group-hover:bg-[#3b82f6]/20 group-hover:text-white transition-colors shrink-0">
                    <span className="material-symbols-outlined text-base">{item.icon}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-[#d4e4fa] font-semibold block">{item.name}</span>
                      <span className={`text-[9px] font-mono-data px-1.5 py-0.2 rounded border font-medium ${statusColor}`}>
                        {statusLabel}
                      </span>
                    </div>
                    {(item.next_expected_date || item.dueDate || item.date) && (
                      <span className="text-[10px] text-[#c7c4d8]/70 font-mono-data">
                        Due: {item.next_expected_date || item.dueDate || item.date}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-xs font-mono-data font-bold text-[#d4e4fa]">
                  ${item.amount.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-[#464555]/20 flex justify-between items-center">
        <p className="font-mono-data text-[10px] text-[#c7c4d8] uppercase tracking-wider font-semibold">
          Total Monthly
        </p>
        <p className="text-sm font-bold text-[#bfdbfe] font-mono-data">
          ${totalMonthly.toFixed(2)}
        </p>
      </div>
    </div>
  );
};
