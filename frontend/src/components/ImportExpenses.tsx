import React from 'react';

interface ImportExpensesProps {
  onUploadCSV: () => void;
}

export const ImportExpenses: React.FC<ImportExpensesProps> = ({ onUploadCSV }) => {
  return (
    <div className="col-span-12 lg:col-span-3 bento-card bg-[#122131] p-6 animate-fade flex flex-col justify-between" style={{ animationDelay: '0.2s' }}>
      <div>
        <h3 className="text-xl font-bold text-[#d4e4fa] mb-1 tracking-tight">Import Expenses</h3>
        <p className="text-sm text-[#c7c4d8]/80 font-normal mb-6">
          Instantly sync your transactions
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* CSV Format Guide */}
        <div className="p-3 bg-[#010f1f]/80 rounded-xl border border-[#464555]/30">
          <p className="text-[10px] font-mono-data uppercase text-[#bfdbfe] font-bold mb-1">
            CSV Upload Format:
          </p>
          <code className="text-[10px] font-mono-data text-[#c7c4d8] block bg-[#051424] p-1.5 rounded border border-white/5">
            Merchant, Category, Amount, Date
          </code>
          <p className="text-[9px] text-[#c7c4d8]/60 mt-1">
            Example: Target, Groceries, -45.50, May 15 2024
          </p>
        </div>

        {/* Upload CSV button */}
        <button
          onClick={onUploadCSV}
          className="flex flex-col items-center justify-center p-3.5 bg-[#1c2b3c] rounded-2xl hover:bg-[#2c3a4c] transition-all border border-[#464555]/20 group cursor-pointer hover:border-[#bfdbfe]/40 shadow-sm"
        >
          <span className="material-symbols-outlined text-2xl mb-1 text-[#bfdbfe] group-hover:scale-110 transition-transform">
            cloud_upload
          </span>
          <span className="font-mono-data text-xs font-semibold text-[#d4e4fa]">Upload CSV</span>
        </button>
      </div>
    </div>
  );
};
