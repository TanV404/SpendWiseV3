import React, { useState } from 'react';
import { Transaction } from '../types';

interface RecentTransactionsProps {
  transactions: Transaction[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  categories: string[];
  onAddTransaction: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onDeleteSelected: (ids: string[]) => void;
  onExportCSV: () => void;
  onOpenEditCategories: () => void;
}

export const RecentTransactions: React.FC<RecentTransactionsProps> = ({
  transactions,
  searchQuery,
  setSearchQuery,
  categories,
  onAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
  onDeleteSelected,
  onExportCSV,
  onOpenEditCategories,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Filter transactions
  const filtered = transactions.filter((tx) => {
    const matchesSearch =
      tx.merchant.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.date.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'All' || tx.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const allSelected = filtered.length > 0 && filtered.every((tx) => selectedIds.includes(tx.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((tx) => tx.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    onDeleteSelected(selectedIds);
    setSelectedIds([]);
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'Groceries':
        return 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20';
      case 'Entertainment':
        return 'bg-[#3b82f6]/15 text-[#bfdbfe] border-[#3b82f6]/30';
      case 'Income':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'Dining Out':
        return 'bg-amber-400/10 text-amber-300 border-amber-400/20';
      case 'Travel':
        return 'bg-sky-400/10 text-sky-300 border-sky-400/20';
      case 'Utilities':
        return 'bg-purple-400/10 text-purple-300 border-purple-400/20';
      default:
        return 'bg-[#273647]/50 text-[#c7c4d8] border-[#464555]/20';
    }
  };

  const [visibleCount, setVisibleCount] = useState<number>(5);

  const getCategoryIcon = (category: string, defaultIcon?: string) => {
    if (defaultIcon && defaultIcon !== 'shopping_cart' && defaultIcon !== 'cloud_upload') {
      return defaultIcon;
    }
    const catLower = category.toLowerCase();
    if (catLower.includes('grocer')) return 'shopping_cart';
    if (catLower.includes('entertain') || catLower.includes('subscr')) return 'subscriptions';
    if (catLower.includes('fit') || catLower.includes('health') || catLower.includes('gym')) return 'fitness_center';
    if (catLower.includes('travel') || catLower.includes('flight') || catLower.includes('ride') || catLower.includes('uber')) return 'flight';
    if (catLower.includes('din') || catLower.includes('restaur') || catLower.includes('food')) return 'restaurant';
    if (catLower.includes('util') || catLower.includes('bill') || catLower.includes('home')) return 'home';
    if (catLower.includes('incom') || catLower.includes('pay') || catLower.includes('salary')) return 'payments';
    if (catLower.includes('shop') || catLower.includes('store') || catLower.includes('amaz')) return 'store';
    return defaultIcon || 'shopping_cart';
  };

  const visibleTransactions = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  return (
    <div className="col-span-12 bento-card bg-[#0d1c2d] p-4 sm:p-6 mb-8 animate-fade" style={{ animationDelay: '0.35s' }}>
      {/* Header Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-[#d4e4fa] tracking-tight">Recent Transactions</h3>
          <p className="text-xs text-[#c7c4d8]/70 mt-0.5">
            Showing {visibleTransactions.length} of {filtered.length} transactions
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full lg:w-auto">
          {/* Search Input Bar */}
          <div className="relative grow sm:grow-0 w-full sm:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#c7c4d8]/50 text-base">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setVisibleCount(5);
              }}
              className="w-full bg-[#1c2b3c] rounded-xl border border-[#464555]/30 pl-9 pr-7 py-2 text-xs text-[#d4e4fa] placeholder:text-[#c7c4d8]/40 focus:outline-none focus:ring-1 focus:ring-[#93c5fd]"
              placeholder="Search merchant, category..."
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setVisibleCount(5);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#c7c4d8]/60 hover:text-[#d4e4fa]"
              >
                <span className="material-symbols-outlined text-xs">close</span>
              </button>
            )}
          </div>

          {/* Category Dropdown Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setVisibleCount(5);
            }}
            className="px-3 py-2 bg-[#1c2b3c] text-[#d4e4fa] border border-[#464555]/30 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#93c5fd] grow sm:grow-0"
          >
            <option value="All">Filter Category: All</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Edit Categories Button */}
          <button
            onClick={onOpenEditCategories}
            className="px-3.5 py-2 bg-[#1c2b3c] text-[#d4e4fa] hover:bg-[#2c3a4c] border border-[#464555]/30 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm grow sm:grow-0"
            title="Edit and manage transaction categories"
          >
            <span className="material-symbols-outlined text-sm text-[#bfdbfe]">edit_note</span>
            <span>Edit Categories</span>
          </button>

          {/* Bulk Delete Action */}
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="px-3 py-2 bg-[#ffb4ab]/15 text-[#ffb4ab] hover:bg-[#ffb4ab]/25 rounded-xl text-xs font-bold transition-all border border-[#ffb4ab]/30 flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">delete</span>
              Delete ({selectedIds.length})
            </button>
          )}

          {/* Export Button */}
          <button
            onClick={onExportCSV}
            className="px-3 py-2 bg-[#1c2b3c] text-[#d4e4fa] hover:bg-[#2c3a4c] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-[#464555]/20 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">download</span> Export
          </button>

          {/* Add Transaction Button */}
          <button
            onClick={onAddTransaction}
            className="px-3.5 py-2 bg-[#3b82f6] text-white hover:bg-[#3b82f6]/90 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(77,68,227,0.3)] cursor-pointer ml-auto lg:ml-0"
          >
            <span className="material-symbols-outlined text-sm">add</span> Add New
          </button>
        </div>
      </div>

      {/* Responsive Table Wrapper with Vertical & Horizontal Custom Scrollbars */}
      <div className="w-full max-h-[460px] overflow-auto custom-scrollbar border border-[#464555]/15 rounded-xl bg-[#091624]">
        <table className="w-full min-w-[640px] text-left border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-[#464555]/25 bg-[#122131] shadow-sm">
              <th className="py-3.5 px-3 w-10 text-center">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="rounded bg-[#0d1c2d] border-[#464555] text-[#3b82f6] focus:ring-[#3b82f6] focus:ring-offset-[#0d1c2d] cursor-pointer"
                />
              </th>
              <th className="py-3.5 px-4 font-mono-data text-[11px] text-[#c7c4d8] uppercase tracking-wider font-semibold text-left">
                Merchant
              </th>
              <th className="py-3.5 px-4 font-mono-data text-[11px] text-[#c7c4d8] uppercase tracking-wider font-semibold text-left">
                Category
              </th>
              <th className="py-3.5 px-4 font-mono-data text-[11px] text-[#c7c4d8] uppercase tracking-wider font-semibold text-left">
                Date
              </th>
              <th className="py-3.5 px-4 font-mono-data text-[11px] text-[#c7c4d8] uppercase tracking-wider font-semibold text-right">
                Amount
              </th>
              <th className="py-3.5 px-4 font-mono-data text-[11px] text-[#c7c4d8] uppercase tracking-wider font-semibold text-right">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#464555]/15 text-xs">
            {visibleTransactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm text-[#c7c4d8]/60">
                  No transactions found. Click "Add New" or import expenses to populate.
                </td>
              </tr>
            ) : (
              visibleTransactions.map((tx) => {
                const isSelected = selectedIds.includes(tx.id);
                const isPositive = tx.amount > 0;
                const mappedIcon = getCategoryIcon(tx.category, tx.icon);

                return (
                  <tr
                    key={tx.id}
                    className={`hover:bg-[#1c2b3c]/70 transition-colors group ${
                      isSelected ? 'bg-[#1c2b3c]/90' : ''
                    }`}
                  >
                    <td className="py-3.5 px-3 text-center align-middle">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOne(tx.id)}
                        className="rounded bg-[#0d1c2d] border-[#464555] text-[#3b82f6] focus:ring-[#3b82f6] focus:ring-offset-[#0d1c2d] cursor-pointer"
                      />
                    </td>
                    <td className="py-3.5 px-4 align-middle text-left">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-[#1c2b3c] flex items-center justify-center border border-white/5 shrink-0 text-[#bfdbfe]">
                          <span className="material-symbols-outlined text-sm">
                            {mappedIcon}
                          </span>
                        </div>
                        <span className="text-xs sm:text-sm font-semibold text-[#d4e4fa] whitespace-nowrap">
                          {tx.merchant}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 align-middle text-left">
                      <button
                        onClick={onOpenEditCategories}
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-mono-data font-bold uppercase tracking-wider border hover:opacity-80 transition-opacity cursor-pointer ${getCategoryBadgeClass(
                          tx.category
                        )}`}
                        title="Manage categories"
                      >
                        {tx.category}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 align-middle text-left font-mono-data text-[#c7c4d8] whitespace-nowrap">
                      {tx.date}
                    </td>
                    <td
                      className={`py-3.5 px-4 align-middle text-right text-xs sm:text-sm font-bold font-mono-data whitespace-nowrap ${
                        isPositive ? 'text-emerald-400' : 'text-[#ffb4ab]'
                      }`}
                    >
                      {isPositive ? `+$${tx.amount.toFixed(2)}` : `-$${Math.abs(tx.amount).toFixed(2)}`}
                    </td>
                    <td className="py-3.5 px-4 align-middle text-right">
                      <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onEditTransaction(tx)}
                          className="p-1.5 text-[#c7c4d8] hover:text-[#93c5fd] hover:bg-[#273647] rounded-lg transition-colors cursor-pointer"
                          title="Edit Transaction"
                        >
                          <span className="material-symbols-outlined text-sm">edit</span>
                        </button>
                        <button
                          onClick={() => onDeleteTransaction(tx.id)}
                          className="p-1.5 text-[#c7c4d8] hover:text-[#ffb4ab] hover:bg-[#273647] rounded-lg transition-colors cursor-pointer"
                          title="Delete Transaction"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* View More Pagination Button */}
      {hasMore && (
        <div className="flex justify-center mt-4">
          <button
            onClick={() => setVisibleCount((prev) => prev + 10)}
            className="px-6 py-2.5 bg-[#1c2b3c] hover:bg-[#2c3a4c] text-[#bfdbfe] border border-[#3b82f6]/30 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <span>View More ({filtered.length - visibleCount} remaining)</span>
            <span className="material-symbols-outlined text-sm">expand_more</span>
          </button>
        </div>
      )}
    </div>
  );
};
