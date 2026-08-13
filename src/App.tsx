import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { KPICards } from './components/KPICards';
import { SpendingAnalysis } from './components/SpendingAnalysis';
import { CategoriesPieChart } from './components/CategoriesPieChart';
import { ImportExpenses } from './components/ImportExpenses';
import { BudgetForecast } from './components/BudgetForecast';
import { RecurringSection } from './components/RecurringSection';
import { RecentTransactions } from './components/RecentTransactions';
import { Modals } from './components/Modals';
import { LoginPage } from './components/LoginPage';
import { useAuth } from './context/AuthContext';
import { apiFetch } from './api';

import {
  INITIAL_TRANSACTIONS,
  INITIAL_RECURRING,
  INITIAL_BUDGET,
} from './mockData';
import { Transaction, RecurringItem, ModalType, BudgetConfig, CategoryItem, BudgetStatusItem } from './types';

export default function App() {
  const { currentUser, logout, continueAsGuest } = useAuth();
  const [showLoginPage, setShowLoginPage] = useState(false);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recurring, setRecurring] = useState<RecurringItem[]>([]);
  const [budget, setBudget] = useState<BudgetConfig>(INITIAL_BUDGET);
  const [savingsGoal, setSavingsGoal] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');

  const [activeModal, setActiveModal] = useState<ModalType | 'notifications'>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(true);

  // Loading and Error state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Category deletion confirmation modal state
  const [deleteCategoryConfirm, setDeleteCategoryConfirm] = useState<{ name: string; count: number } | null>(null);

  // Toast Notification System
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'warning' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Dynamic Categories state & Category objects
  const [categoryItems, setCategoryItems] = useState<CategoryItem[]>([]);
  const [categories, setCategories] = useState<string[]>([
    'Groceries',
    'Entertainment',
    'Income',
    'Dining Out',
    'Travel',
    'Utilities',
    'Fitness',
    'Shopping',
    'Other',
  ]);

  // Fetch initial data from backend if authenticated
  const fetchAllData = async () => {
    if (!currentUser) return;

    setIsLoading(true);
    setError(null);

    try {
      const results = await Promise.allSettled([
        apiFetch<Transaction[]>('/transactions'),
        apiFetch<CategoryItem[]>('/categories'),
        apiFetch<RecurringItem[]>('/recurring'),
        apiFetch<BudgetStatusItem[]>('/budgets/status'),
      ]);

      const [txRes, catRes, recRes, budRes] = results;
      let successCount = 0;

      if (txRes.status === 'fulfilled') {
        setTransactions(txRes.value);
        successCount++;
      } else {
        console.warn('Failed to fetch transactions:', txRes.reason);
      }

      if (catRes.status === 'fulfilled') {
        const data = catRes.value;
        if (data && data.length > 0) {
          setCategoryItems(data);
          setCategories(data.map((c) => c.name));
        }
        successCount++;
      } else {
        console.warn('Failed to fetch categories:', catRes.reason);
      }

      if (recRes.status === 'fulfilled') {
        setRecurring(recRes.value);
        successCount++;
      } else {
        console.warn('Failed to fetch recurring:', recRes.reason);
      }

      if (budRes.status === 'fulfilled') {
        const data = budRes.value;
        if (data && data.length > 0) {
          const totalLim = data.reduce((acc, curr) => acc + curr.monthly_limit, 0);
          const firstWithDetails = data.find(
            (item: any) => item.essential !== undefined || item.discretionary !== undefined || item.aiSmartAdjust !== undefined
          ) as any;

          const essential = firstWithDetails?.essential !== undefined ? firstWithDetails.essential : Math.round(totalLim * 0.5);
          const discretionary = firstWithDetails?.discretionary !== undefined ? firstWithDetails.discretionary : Math.round(totalLim * 0.3);
          const aiSmartAdjust = firstWithDetails?.aiSmartAdjust !== undefined ? Boolean(firstWithDetails.aiSmartAdjust) : true;

          setBudget({
            totalLimit: totalLim,
            essential,
            discretionary,
            aiSmartAdjust,
          });
        } else {
          setBudget({
            totalLimit: 0,
            essential: 0,
            discretionary: 0,
            aiSmartAdjust: true,
          });
        }
        successCount++;
      } else {
        console.warn('Failed to fetch budgets:', budRes.reason);
      }

      if (successCount === 0) {
        const firstError = [txRes, catRes, recRes, budRes].find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
        const errMsg = firstError?.reason?.message || 'Failed to load data from server. Please check your connection or log in again.';
        setError(errMsg);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load data from server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchAllData();
    } else {
      setTransactions(INITIAL_TRANSACTIONS);
      setRecurring(INITIAL_RECURRING);
      setBudget(INITIAL_BUDGET);
      setSavingsGoal(0);
      setIsLoading(false);
      setError(null);
    }
  }, [currentUser]);

  const handleAddCategory = async (newCat: string, icon: string = 'category') => {
    if (!categories.includes(newCat)) {
      if (currentUser) {
        try {
          const created = await apiFetch<CategoryItem>('/categories', {
            method: 'POST',
            body: JSON.stringify({ name: newCat, type: 'expense', icon }),
          });
          if (created && created.id) {
            setCategoryItems((prev) => [...prev, created]);
          }
          setCategories((prev) => [...prev, newCat]);
          showToast(`Category "${newCat}" added!`, 'success');
        } catch (err) {
          console.warn('Failed to save category:', err);
          showToast('Failed to save — check your connection', 'warning');
        }
      } else {
        setCategories((prev) => [...prev, newCat]);
        showToast(`Category "${newCat}" added!`, 'success');
      }
    }
  };

  const handleRenameCategory = async (oldName: string, newName: string) => {
    if (currentUser) {
      try {
        const catItem = categoryItems.find((c) => c.name === oldName);
        if (catItem) {
          await apiFetch(`/categories/${catItem.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ name: newName }),
          });
          setCategoryItems((prev) =>
            prev.map((c) => (c.id === catItem.id ? { ...c, name: newName } : c))
          );
        }
        setCategories((prev) => prev.map((c) => (c === oldName ? newName : c)));
        setTransactions((prev) =>
          prev.map((tx) => (tx.category === oldName ? { ...tx, category: newName } : tx))
        );
        showToast(`Category renamed to "${newName}"`, 'info');
      } catch (err) {
        console.warn('Failed to rename category:', err);
        showToast('Failed to save — check your connection', 'warning');
      }
    } else {
      setCategories((prev) => prev.map((c) => (c === oldName ? newName : c)));
      setTransactions((prev) =>
        prev.map((tx) => (tx.category === oldName ? { ...tx, category: newName } : tx))
      );
      showToast(`Category renamed to "${newName}"`, 'info');
    }
  };

  const confirmDeleteCategory = async (categoryName: string, reassignToOther: boolean) => {
    const count = transactions.filter((tx) => tx.category === categoryName).length;

    if (currentUser) {
      try {
        const catItem = categoryItems.find((c) => c.name === categoryName);
        if (catItem) {
          await apiFetch(`/categories/${catItem.id}`, { method: 'DELETE' });
          setCategoryItems((prev) => prev.filter((c) => c.id !== catItem.id));
        }

        if (count > 0 && reassignToOther) {
          setTransactions((prev) =>
            prev.map((tx) => (tx.category === categoryName ? { ...tx, category: 'Other' } : tx))
          );
        }

        setCategories((prev) => {
          const filtered = prev.filter((c) => c !== categoryName);
          if (count > 0 && !filtered.includes('Other')) {
            return [...filtered, 'Other'];
          }
          return filtered;
        });

        if (count > 0) {
          showToast(`Category "${categoryName}" removed, ${count} transaction(s) reassigned to "Other"`, 'warning');
        } else {
          showToast(`Category "${categoryName}" removed`, 'warning');
        }
      } catch (err) {
        console.warn('Failed to delete category:', err);
        showToast('Failed to save — check your connection', 'warning');
      }
    } else {
      if (count > 0 && reassignToOther) {
        setTransactions((prev) =>
          prev.map((tx) => (tx.category === categoryName ? { ...tx, category: 'Other' } : tx))
        );
      }

      setCategories((prev) => {
        const filtered = prev.filter((c) => c !== categoryName);
        if (count > 0 && !filtered.includes('Other')) {
          return [...filtered, 'Other'];
        }
        return filtered;
      });

      if (count > 0) {
        showToast(`Category "${categoryName}" removed, ${count} transaction(s) reassigned to "Other"`, 'warning');
      } else {
        showToast(`Category "${categoryName}" removed`, 'warning');
      }
    }
    setDeleteCategoryConfirm(null);
  };

  const handleDeleteCategory = (categoryName: string) => {
    if (categories.length <= 1) return;
    const count = transactions.filter((tx) => tx.category === categoryName).length;
    setDeleteCategoryConfirm({ name: categoryName, count });
  };

  // Dynamic calculations
  const extraExpenseSum = transactions
    .filter((tx) => tx.amount < 0)
    .reduce((acc, tx) => acc + Math.abs(tx.amount), 0);

  const extraIncomeSum = transactions
    .filter((tx) => tx.amount > 0)
    .reduce((acc, tx) => acc + tx.amount, 0);

  const monthlySpending = extraExpenseSum;
  const totalBalance = Math.max(0, extraIncomeSum - extraExpenseSum);
  const budgetRemaining = Math.max(0, budget.totalLimit - monthlySpending);

  // Handlers
  const handleAddTransaction = async (newTxData: Omit<Transaction, 'id'>) => {
    if (currentUser) {
      try {
        const createdTx = await apiFetch<Transaction>('/transactions', {
          method: 'POST',
          body: JSON.stringify({
            merchant: newTxData.merchant,
            category: newTxData.category,
            date: newTxData.date,
            amount: newTxData.amount,
            icon: newTxData.icon,
          }),
        });
        setTransactions((prev) => [createdTx, ...prev]);
        showToast(`Transaction "${newTxData.merchant}" added!`, 'success');
        return;
      } catch (err) {
        console.warn('Failed to post transaction:', err);
        showToast('Failed to save — check your connection', 'warning');
        return;
      }
    }

    const newTx: Transaction = {
      ...newTxData,
      id: `tx-${Date.now()}`,
    };
    setTransactions((prev) => [newTx, ...prev]);
    showToast(`Transaction "${newTxData.merchant}" added!`, 'success');
  };

  const handleUpdateTransaction = async (updatedTx: Transaction) => {
    if (currentUser && !updatedTx.id.startsWith('tx-')) {
      try {
        const serverTx = await apiFetch<Transaction>(`/transactions/${updatedTx.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            merchant: updatedTx.merchant,
            category: updatedTx.category,
            date: updatedTx.date,
            amount: updatedTx.amount,
            icon: updatedTx.icon,
          }),
        });
        setTransactions((prev) =>
          prev.map((tx) => (tx.id === updatedTx.id ? (serverTx || updatedTx) : tx))
        );
        showToast(`Transaction "${updatedTx.merchant}" updated!`, 'info');
      } catch (err) {
        console.warn('Failed to patch transaction:', err);
        showToast('Failed to save — check your connection', 'warning');
      }
    } else {
      setTransactions((prev) => prev.map((tx) => (tx.id === updatedTx.id ? updatedTx : tx)));
      showToast(`Transaction "${updatedTx.merchant}" updated!`, 'info');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (currentUser && !id.startsWith('tx-')) {
      try {
        await apiFetch(`/transactions/${id}`, { method: 'DELETE' });
        setTransactions((prev) => prev.filter((tx) => tx.id !== id));
        showToast('Transaction deleted', 'warning');
      } catch (err) {
        console.warn('Failed to delete transaction:', err);
        showToast('Failed to save — check your connection', 'warning');
      }
    } else {
      setTransactions((prev) => prev.filter((tx) => tx.id !== id));
      showToast('Transaction deleted', 'warning');
    }
  };

  const handleDeleteSelected = async (ids: string[]) => {
    if (currentUser) {
      const failedIds = new Set<string>();
      for (const id of ids) {
        if (!id.startsWith('tx-')) {
          try {
            await apiFetch(`/transactions/${id}`, { method: 'DELETE' });
          } catch (err) {
            console.warn('Failed to delete transaction:', err);
            failedIds.add(id);
          }
        }
      }
      setTransactions((prev) => prev.filter((tx) => !ids.includes(tx.id) || failedIds.has(tx.id)));
      if (failedIds.size > 0) {
        showToast('Failed to delete some transactions — check your connection', 'warning');
      } else {
        showToast(`${ids.length} transactions deleted`, 'warning');
      }
    } else {
      setTransactions((prev) => prev.filter((tx) => !ids.includes(tx.id)));
      showToast(`${ids.length} transactions deleted`, 'warning');
    }
  };

  const handleExportCSV = () => {
    const escapeCSV = (str: string | undefined | null) => {
      if (str === undefined || str === null) return '""';
      return `"${String(str).replace(/"/g, '""')}"`;
    };

    const headers = 'ID,Merchant,Category,Date,Amount\n';
    const rows = transactions
      .map(
        (tx) =>
          `${escapeCSV(tx.id)},${escapeCSV(tx.merchant)},${escapeCSV(
            tx.category
          )},${escapeCSV(tx.date)},${tx.amount}`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SpendWise_Export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showToast('Exported CSV file!', 'success');
    URL.revokeObjectURL(url);
  };

  const handleSaveBudget = async (newBudget: BudgetConfig) => {
    setBudget(newBudget);
    showToast(`Monthly budget updated to $${newBudget.totalLimit.toFixed(2)}`, 'success');

    if (currentUser) {
      try {
        await apiFetch('/budgets', {
          method: 'POST',
          body: JSON.stringify({
            monthly_limit: newBudget.totalLimit,
          }),
        });
        const updatedStatus = await apiFetch<BudgetStatusItem[]>('/budgets/status');
        if (updatedStatus && updatedStatus.length > 0) {
          const totalLim = updatedStatus.reduce((acc, curr) => acc + curr.monthly_limit, 0);
          setBudget((prev) => ({ ...prev, totalLimit: totalLim }));
        }
      } catch (err) {
        console.warn('Failed to persist budget:', err);
      }
    }
  };

  if (showLoginPage) {
    return (
      <LoginPage
        onLoginSuccess={() => {
          setShowLoginPage(false);
        }}
        onContinueAsGuest={() => {
          continueAsGuest();
          setShowLoginPage(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#051424] text-[#d4e4fa] flex flex-col font-sans selection:bg-[#3b82f6]/40">
      {/* Header */}
      <Header
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenNotifications={() => {
          setActiveModal('notifications');
          setUnreadNotifications(false);
        }}
        unreadNotifications={unreadNotifications}
        currentUser={currentUser}
        onOpenLogin={() => setShowLoginPage(true)}
        onLogout={() => {
          logout();
          setShowLoginPage(true);
        }}
      />

      {/* Main Content Grid */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6 max-w-[1440px] mx-auto w-full hide-scrollbar">
        {error && (
          <div className="bg-[#1c1823] border border-[#ffb4ab]/40 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 text-xs text-[#ffb4ab]">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-xl text-[#ffb4ab]">error</span>
              <div>
                <p className="font-bold text-[#ffb4ab]">Data Loading Error</p>
                <p className="text-[#ffb4ab]/80">{error}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchAllData()}
                className="px-3.5 py-1.5 bg-[#3b82f6] text-white font-semibold rounded-xl hover:bg-[#3b82f6]/90 transition-all text-xs cursor-pointer"
              >
                Retry Loading
              </button>
              <button
                onClick={() => {
                  logout();
                  setShowLoginPage(true);
                }}
                className="px-3.5 py-1.5 bg-[#2c3a4c] text-white font-semibold rounded-xl hover:bg-[#3c4a5c] transition-all text-xs cursor-pointer"
              >
                Log In Again
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-4 bg-[#0a1827] rounded-3xl border border-[#3b82f6]/20 animate-pulse my-6">
            <div className="w-10 h-10 border-4 border-[#3b82f6] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-semibold text-[#93c5fd] font-mono-data">Loading SpendWise dashboard...</p>
          </div>
        ) : (
          <>
            {/* Row 1: KPI Stat Cards */}
            <KPICards
              totalBalance={totalBalance}
              monthlySpending={monthlySpending}
              savingsGoal={savingsGoal}
              currentSaved={extraIncomeSum}
              savingsProgress={Math.round(Math.min(100, (extraIncomeSum / Math.max(savingsGoal, 1)) * 100))}
              budgetRemaining={budgetRemaining}
              totalBudgetLimit={budget.totalLimit}
              onEditBudget={() => setActiveModal('edit-budget')}
              onEditSavingsGoal={() => setActiveModal('edit-savings-goal')}
            />

            {/* Row 2: Spending Analysis & Pie Chart */}
            <div className="grid grid-cols-12 gap-6">
              <SpendingAnalysis transactions={transactions} />
              <CategoriesPieChart transactions={transactions} />
            </div>

            {/* Row 3: Import Expenses, Budget Forecast & Recurring */}
            <div className="grid grid-cols-12 gap-6">
              <ImportExpenses
                onUploadCSV={() => setActiveModal('upload')}
              />
              <BudgetForecast
                transactions={transactions}
                totalBudgetLimit={budget.totalLimit}
              />
              <RecurringSection
                recurringItems={recurring}
                onManageRecurring={() => setActiveModal('recurring')}
              />
            </div>

            {/* Row 4: Recent Transactions Table */}
            <div className="grid grid-cols-12 gap-6">
              <RecentTransactions
                transactions={transactions}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                categories={categories}
                onOpenEditCategories={() => setActiveModal('edit-categories')}
                onAddTransaction={() => {
                  setEditingTransaction(null);
                  setActiveModal('add-transaction');
                }}
                onEditTransaction={(tx) => {
                  setEditingTransaction(tx);
                  setActiveModal('edit-transaction');
                }}
                onDeleteTransaction={handleDeleteTransaction}
                onDeleteSelected={handleDeleteSelected}
                onExportCSV={handleExportCSV}
              />
            </div>
          </>
        )}
      </main>

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade">
          <div
            className={`px-4 py-3 rounded-xl shadow-2xl border flex items-center gap-3 text-xs font-semibold ${
              toastMessage.type === 'warning'
                ? 'bg-[#1c1823] text-[#ffb4ab] border-[#ffb4ab]/30'
                : toastMessage.type === 'info'
                ? 'bg-[#0d1c2d] text-[#bfdbfe] border-[#3b82f6]/30'
                : 'bg-[#0b1d19] text-emerald-300 border-emerald-500/30'
            }`}
          >
            <span className="material-symbols-outlined text-base">
              {toastMessage.type === 'warning' ? 'warning' : toastMessage.type === 'info' ? 'info' : 'check_circle'}
            </span>
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Category Delete Confirmation Modal */}
      {deleteCategoryConfirm && (
        <div className="modal-overlay active" onClick={() => setDeleteCategoryConfirm(null)}>
          <div
            className="modal-content max-w-md p-6 bg-[#0a1827] border border-[#464555]/30 rounded-2xl space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-[#ffb4ab]">
              <span className="material-symbols-outlined text-2xl">warning</span>
              <h3 className="text-base font-bold text-white">Delete Category</h3>
            </div>

            {deleteCategoryConfirm.count > 0 ? (
              <p className="text-xs text-[#c7c4d8] leading-relaxed">
                Category <strong className="text-white">"{deleteCategoryConfirm.name}"</strong> is currently assigned to{' '}
                <strong className="text-[#3b82f6]">{deleteCategoryConfirm.count}</strong> transaction(s).
                <br /><br />
                Deleting this category will reassign those transactions to <strong className="text-white">"Other"</strong>. Are you sure you want to proceed?
              </p>
            ) : (
              <p className="text-xs text-[#c7c4d8] leading-relaxed">
                Are you sure you want to delete category <strong className="text-white">"{deleteCategoryConfirm.name}"</strong>?
              </p>
            )}

            <div className="flex justify-end gap-3 pt-3 border-t border-[#464555]/20">
              <button
                onClick={() => setDeleteCategoryConfirm(null)}
                className="px-4 py-2 bg-[#1c2b3c] hover:bg-[#2c3a4c] text-[#c7c4d8] rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmDeleteCategory(deleteCategoryConfirm.name, true)}
                className="px-4 py-2 bg-[#ffb4ab]/20 hover:bg-[#ffb4ab]/30 text-[#ffb4ab] border border-[#ffb4ab]/30 rounded-xl text-xs font-bold cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Modals Overlay */}
      <Modals
        activeModal={activeModal}
        onClose={() => {
          setActiveModal(null);
          setEditingTransaction(null);
        }}
        budget={budget}
        onSaveBudget={handleSaveBudget}
        savingsGoal={savingsGoal}
        onSaveSavingsGoal={(newGoal) => {
          setSavingsGoal(newGoal);
          showToast(`Savings target updated to $${newGoal.toFixed(2)}`, 'success');
        }}
        transactions={transactions}
        onAddTransaction={handleAddTransaction}
        editingTransaction={editingTransaction}
        onUpdateTransaction={handleUpdateTransaction}
        recurringItems={recurring}
        onSaveRecurring={setRecurring}
        categories={categories}
        onAddCategory={handleAddCategory}
        onRenameCategory={handleRenameCategory}
        onDeleteCategory={handleDeleteCategory}
      />
    </div>
  );
}

