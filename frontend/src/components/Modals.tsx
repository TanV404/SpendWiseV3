import React, { useState } from 'react';
import { ModalType, Transaction, RecurringItem, BudgetConfig } from '../types';
import { apiFetch } from '../api';
import { useAuth } from '../context/AuthContext';

interface ModalsProps {
  activeModal: ModalType | 'notifications';
  onClose: () => void;
  budget: BudgetConfig;
  onSaveBudget: (newBudget: BudgetConfig) => void;
  savingsGoal: number;
  onSaveSavingsGoal: (newGoal: number) => void;
  transactions: Transaction[];
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => void;
  onImportSuccess?: () => void;
  editingTransaction: Transaction | null;
  onUpdateTransaction: (tx: Transaction) => void;
  recurringItems: RecurringItem[];
  onSaveRecurring: (items: RecurringItem[]) => void;
  onAddRecurring?: (item: Omit<RecurringItem, 'id'>) => void;
  onDeleteRecurring?: (id: string) => void;
  onShowToast?: (message: string, type?: 'success' | 'info' | 'warning') => void;
  categories: string[];
  onAddCategory: (categoryName: string, icon?: string) => void;
  onRenameCategory: (oldName: string, newName: string) => void;
  onDeleteCategory: (categoryName: string) => void;
}

export const Modals: React.FC<ModalsProps> = ({
  activeModal,
  onClose,
  budget,
  onSaveBudget,
  savingsGoal,
  onSaveSavingsGoal,
  transactions,
  onAddTransaction,
  onImportSuccess,
  editingTransaction,
  onUpdateTransaction,
  recurringItems,
  onSaveRecurring,
  onAddRecurring,
  onDeleteRecurring,
  onShowToast,
  categories,
  onAddCategory,
  onRenameCategory,
  onDeleteCategory,
}) => {
  if (!activeModal) return null;

  // --- Modal 1: Edit Budget ---
  const [totalLimit, setTotalLimit] = useState(budget.totalLimit);
  const [essential, setEssential] = useState(budget.essential);
  const [discretionary, setDiscretionary] = useState(budget.discretionary);
  const [aiSmartAdjust, setAiSmartAdjust] = useState(budget.aiSmartAdjust);

  // --- Modal 1b: Edit Savings Goal ---
  const [goalAmount, setGoalAmount] = useState(savingsGoal);

  React.useEffect(() => {
    setGoalAmount(savingsGoal);
  }, [savingsGoal, activeModal]);

  // Icon options list for categories
  const CATEGORY_ICONS = [
    'shopping_cart', 'subscriptions', 'payments', 'local_cafe',
    'local_gas_station', 'fitness_center', 'shopping_bag', 'wifi',
    'flight', 'restaurant', 'medical_services', 'school', 'home',
    'sports_esports', 'movie', 'directions_car', 'more_horiz'
  ];
  const [selectedCatIcon, setSelectedCatIcon] = useState('shopping_cart');

  // --- Modal 2: Add / Edit Transaction Form ---
  const [merchant, setMerchant] = useState(editingTransaction?.merchant || '');
  const [category, setCategory] = useState<string>(editingTransaction?.category || 'Groceries');
  const [amount, setAmount] = useState<string>(editingTransaction ? Math.abs(editingTransaction.amount).toString() : '');
  const [isIncome, setIsIncome] = useState<boolean>(editingTransaction ? editingTransaction.amount > 0 : false);
  const parseDateForInput = (dStr: string) => {
    try {
      const d = new Date(dStr);
      if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
      const offset = d.getTimezoneOffset();
      const localD = new Date(d.getTime() - (offset*60*1000));
      return localD.toISOString().split('T')[0];
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  };

  const [date, setDate] = useState<string>(
    editingTransaction?.date 
      ? parseDateForInput(editingTransaction.date) 
      : new Date().toISOString().split('T')[0]
  );

  React.useEffect(() => {
    if (editingTransaction) {
      setMerchant(editingTransaction.merchant);
      setCategory(editingTransaction.category || 'Groceries');
      setAmount(Math.abs(editingTransaction.amount).toString());
      setIsIncome(editingTransaction.amount > 0);
      setDate(parseDateForInput(editingTransaction.date));
    } else if (activeModal === 'add-transaction') {
      setMerchant('');
      setCategory(categories[0] || 'Groceries');
      setAmount('');
      setIsIncome(false);
      setDate(new Date().toISOString().split('T')[0]);
      setIsRecurring(false);
    }
  }, [editingTransaction, activeModal, categories]);

  // --- Modal 4: Upload CSV State ---
  // --- Modal 4: Upload CSV State ---
  const [csvText, setCsvText] = useState('');
  const [csvStatus, setCsvStatus] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvValidation, setCsvValidation] = useState<{
    valid: boolean;
    headerError?: string;
    readyRows: {
      merchant: string;
      category: string;
      date: string;
      amount: number;
      icon?: string;
    }[];
    skippedRows: {
      row: number;
      raw: string;
      reason: string;
    }[];
  } | null>(null);

  // --- Modal 5: Recurring Subscriptions ---
  const [newRecName, setNewRecName] = useState('');
  const [newRecAmount, setNewRecAmount] = useState('');
  const [newRecDate, setNewRecDate] = useState(new Date().toISOString().split('T')[0]);
  const [newRecIcon, setNewRecIcon] = useState('subscriptions');
  const [newRecFrequency, setNewRecFrequency] = useState<'monthly' | 'weekly' | 'biweekly' | 'yearly' | 'custom'>('monthly');
  const [newRecInterval, setNewRecInterval] = useState('30');

  // --- Modal 6: Email Alert Settings inside Notifications ---
  const { currentUser } = useAuth();
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(true);
  const [emailAddress, setEmailAddress] = useState(currentUser?.email || '');
  const [emailAlertToast, setEmailAlertToast] = useState<string | null>(null);

  React.useEffect(() => {
    if (currentUser?.email) {
      setEmailAddress(currentUser.email);
    }
  }, [currentUser]);

  // --- Modal 7: Edit Categories State ---
  const [newCatInput, setNewCatInput] = useState('');
  const [editingCatIndex, setEditingCatIndex] = useState<number | null>(null);
  const [editCatValue, setEditCatValue] = useState('');

  const handleSaveBudgetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveBudget({
      totalLimit: Number(totalLimit),
      essential: Number(essential),
      discretionary: Number(discretionary),
      aiSmartAdjust,
    });
    onClose();
  };

  const [isRecurring, setIsRecurring] = useState<boolean>(false);

  const [isSubmittingTx, setIsSubmittingTx] = useState(false);

  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingTx) return;

    const numAmt = Number(amount);
    if (isNaN(numAmt) || numAmt <= 0) {
      if (onShowToast) {
        onShowToast('Please enter a valid amount greater than $0.00', 'warning');
      }
      return;
    }
    const finalAmount = isIncome ? Math.abs(numAmt) : -Math.abs(numAmt);

    let formattedDate = date;
    if (date.includes('-')) {
      const parts = date.split('-');
      if (parts.length === 3) {
        const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
      }
    }

    setIsSubmittingTx(true);

    try {
      if (editingTransaction) {
        await onUpdateTransaction({
          ...editingTransaction,
          merchant,
          category,
          amount: finalAmount,
          date: formattedDate,
        });
      } else {
        await onAddTransaction({
          merchant,
          category,
          amount: finalAmount,
          date: formattedDate,
          icon: category === 'Income' ? 'payments' : category === 'Entertainment' ? 'subscriptions' : 'shopping_cart',
        });
      }

      if (isRecurring && merchant.trim()) {
        const startDateObj = date && date.includes('-') ? new Date(date + 'T00:00:00') : new Date();
        const dueDateObj = new Date(startDateObj.getTime() + 30 * 24 * 60 * 60 * 1000);
        const calculatedDueDate = dueDateObj.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });

        if (onAddRecurring) {
          onAddRecurring({
            name: merchant.trim(),
            amount: Math.abs(finalAmount),
            date: formattedDate,
            next_expected_date: calculatedDueDate,
            dueDate: calculatedDueDate,
            icon: category === 'Income' ? 'payments' : category === 'Entertainment' ? 'subscriptions' : 'shopping_cart',
            category,
            frequency: 'monthly',
            interval_days: 30,
          });
        } else {
          const newRecItem: RecurringItem = {
            id: `rec-${Date.now()}`,
            name: merchant.trim(),
            amount: Math.abs(finalAmount),
            date: formattedDate,
            next_expected_date: calculatedDueDate,
            dueDate: calculatedDueDate,
            icon: category === 'Income' ? 'payments' : category === 'Entertainment' ? 'subscriptions' : 'shopping_cart',
            category,
            frequency: 'monthly',
            interval_days: 30,
          };
          onSaveRecurring([...recurringItems, newRecItem]);
        }
      }

      setIsRecurring(false);
      onClose();
    } catch (err) {
      console.warn('Transaction submission failed:', err);
    } finally {
      setIsSubmittingTx(false);
    }
  };

  const isValidDateString = (dateStr: string): { valid: boolean; formatted: string } => {
    if (!dateStr || !dateStr.trim()) return { valid: false, formatted: '' };
    const clean = dateStr.trim().replace(/^["']|["']$/g, '').trim();
    if (!clean || clean.toLowerCase() === 'not-a-date' || clean.toLowerCase() === 'invalid date' || clean.toLowerCase() === 'nan') {
      return { valid: false, formatted: '' };
    }

    // Must contain at least one digit
    if (!/\d/.test(clean)) {
      return { valid: false, formatted: '' };
    }

    // Try standard ISO / hyphen / slash patterns: YYYY-MM-DD, MM/DD/YYYY, etc.
    const isoMatch = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (isoMatch) {
      const year = parseInt(isoMatch[1], 10);
      const month = parseInt(isoMatch[2], 10) - 1;
      const day = parseInt(isoMatch[3], 10);
      const d = new Date(year, month, day);
      if (d.getFullYear() === year && d.getMonth() === month && d.getDate() === day) {
        return {
          valid: true,
          formatted: d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        };
      }
      return { valid: false, formatted: '' };
    }

    const timestamp = Date.parse(clean);
    if (!isNaN(timestamp)) {
      const d = new Date(timestamp);
      if (!isNaN(d.getTime()) && d.getFullYear() >= 1900 && d.getFullYear() <= 2100) {
        const formatted = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
        return { valid: true, formatted };
      }
    }

    return { valid: false, formatted: '' };
  };

  const runCSVValidation = () => {
    if (!csvText.trim()) {
      setCsvValidation({
        valid: false,
        headerError: 'CSV content is empty. Please paste CSV text or select a file.',
        readyRows: [],
        skippedRows: [],
      });
      return;
    }

    const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length === 0) {
      setCsvValidation({
        valid: false,
        headerError: 'CSV content is empty.',
        readyRows: [],
        skippedRows: [],
      });
      return;
    }

    // Parse header row
    const headerParts = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/^["']|["']$/g, ''));
    const merchantIdx = headerParts.findIndex((h) => h.includes('merchant') || h.includes('description') || h.includes('name') || h.includes('title'));
    const categoryIdx = headerParts.findIndex((h) => h.includes('category') || h.includes('type') || h.includes('tag'));
    const dateIdx = headerParts.findIndex((h) => h.includes('date') || h.includes('time') || h.includes('day'));
    const amountIdx = headerParts.findIndex((h) => h.includes('amount') || h.includes('price') || h.includes('cost') || h.includes('total'));

    const missingHeaders: string[] = [];
    if (merchantIdx === -1) missingHeaders.push('Merchant');
    if (categoryIdx === -1) missingHeaders.push('Category');
    if (dateIdx === -1) missingHeaders.push('Date');
    if (amountIdx === -1) missingHeaders.push('Amount');

    if (missingHeaders.length > 0) {
      setCsvValidation({
        valid: false,
        headerError: `Missing required header column(s): ${missingHeaders.join(', ')}. Required headers are: Merchant, Category, Amount, Date.`,
        readyRows: [],
        skippedRows: [],
      });
      return;
    }

    const readyRows: { merchant: string; category: string; date: string; amount: number; icon?: string }[] = [];
    const skippedRows: { row: number; raw: string; reason: string }[] = [];

    for (let i = 1; i < lines.length; i++) {
      const rawLine = lines[i];
      if (!rawLine) continue;

      const cells = rawLine.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
      const rowNum = i + 1;

      const rawMerchant = cells[merchantIdx]?.trim() || '';
      const rawCategory = cells[categoryIdx]?.trim() || '';
      const rawDate = cells[dateIdx]?.trim() || '';
      const rawAmount = cells[amountIdx]?.trim() || '';

      // 1. Merchant non-empty validation
      if (!rawMerchant) {
        skippedRows.push({ row: rowNum, raw: rawLine, reason: 'Missing or empty merchant name' });
        continue;
      }

      // 2. Amount numeric validation
      const cleanAmountStr = rawAmount.replace(/[$,]/g, '').trim();
      if (!cleanAmountStr) {
        skippedRows.push({ row: rowNum, raw: rawLine, reason: 'Missing transaction amount' });
        continue;
      }
      const parsedAmount = Number(cleanAmountStr);
      if (isNaN(parsedAmount)) {
        skippedRows.push({ row: rowNum, raw: rawLine, reason: `Invalid numeric amount: "${rawAmount}"` });
        continue;
      }
      if (parsedAmount === 0) {
        skippedRows.push({ row: rowNum, raw: rawLine, reason: `Invalid transaction amount: $0.00 is not allowed` });
        continue;
      }
      if (Math.abs(parsedAmount) >= 1_000_000) {
        skippedRows.push({ row: rowNum, raw: rawLine, reason: `Amount ${parsedAmount} exceeds allowed boundary (-1,000,000 to 1,000,000)` });
        continue;
      }

      // 3. Date validation
      const dateCheck = isValidDateString(rawDate);
      if (!dateCheck.valid) {
        skippedRows.push({ row: rowNum, raw: rawLine, reason: `Invalid date format: "${rawDate}"` });
        continue;
      }

      // 4. Category mapping (if doesn't match existing, map to Other)
      let matchedCategory = 'Other';
      if (rawCategory) {
        const match = categories.find((c) => c.toLowerCase() === rawCategory.toLowerCase());
        matchedCategory = match || 'Other';
      }

      readyRows.push({
        merchant: rawMerchant,
        category: matchedCategory,
        date: dateCheck.formatted,
        amount: parsedAmount,
        icon: matchedCategory === 'Income' ? 'payments' : matchedCategory === 'Entertainment' ? 'subscriptions' : 'shopping_cart',
      });
    }

    setCsvValidation({
      valid: true,
      readyRows,
      skippedRows,
    });
  };

  const handleCSVImport = async () => {
    let currentValidation = csvValidation;
    if (!currentValidation || !currentValidation.valid) {
      runCSVValidation();
      return;
    }

    if (currentValidation.readyRows.length === 0) {
      setCsvStatus('No valid rows found to import.');
      return;
    }

    try {
      // Build cleaned CSV content containing only valid rows to ensure 100% data integrity
      const validCsvLines = [
        'Merchant,Category,Amount,Date',
        ...currentValidation.readyRows.map(
          (r) => `"${r.merchant}","${r.category}",${r.amount},"${r.date}"`
        ),
      ].join('\n');

      const res = await apiFetch<{ created: Transaction[]; errors: { row: number; reason: string }[] }>(
        '/transactions/import',
        {
          method: 'POST',
          body: JSON.stringify({ raw_csv: validCsvLines }),
        }
      );

      const createdCount = res?.created ? res.created.length : currentValidation.readyRows.length;
      const errorCount = currentValidation.skippedRows.length + (res?.errors ? res.errors.length : 0);

      if (res?.created && res.created.length > 0) {
        if (onImportSuccess) {
          onImportSuccess();
        } else {
          res.created.forEach((tx) => onAddTransaction(tx));
        }
      } else if (currentValidation.readyRows.length > 0) {
        currentValidation.readyRows.forEach((row) => {
          onAddTransaction({
            merchant: row.merchant,
            category: row.category,
            date: row.date,
            amount: row.amount,
            icon: row.icon,
          });
        });
      }

      setCsvStatus(`Successfully imported ${createdCount} transaction(s). ${errorCount > 0 ? `${errorCount} bad row(s) skipped.` : ''}`);
      if (onShowToast) {
        onShowToast(
          `Imported ${createdCount} transaction(s)${errorCount > 0 ? ` (${errorCount} skipped)` : ''}!`,
          'success'
        );
      }
      setTimeout(() => {
        onClose();
        setCsvStatus(null);
        setCsvText('');
        setSelectedFile(null);
        setCsvValidation(null);
      }, 1400);
    } catch (err: any) {
      setCsvStatus(err.message || 'Import failed');
      if (onShowToast) {
        onShowToast('CSV import failed — check your file format', 'warning');
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          const text = evt.target.result as string;
          setCsvText(text);
          setCsvValidation(null);
        }
      };
      reader.readAsText(file);
    }
  };

  // Add Recurring item
  const handleAddRecurring = () => {
    if (!newRecName || !newRecAmount) return;

    // Calculate due date based on start date + frequency / custom interval
    let daysToAdd = 30;
    if (newRecFrequency === 'weekly') daysToAdd = 7;
    else if (newRecFrequency === 'biweekly') daysToAdd = 14;
    else if (newRecFrequency === 'monthly') daysToAdd = 30;
    else if (newRecFrequency === 'yearly') daysToAdd = 365;
    else if (newRecFrequency === 'custom' && newRecInterval) {
      daysToAdd = Math.max(1, parseInt(newRecInterval) || 30);
    }

    const startDateObj = newRecDate ? new Date(newRecDate + 'T00:00:00') : new Date();
    const dueDateObj = new Date(startDateObj.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

    const formattedDueDate = dueDateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    if (onAddRecurring) {
      onAddRecurring({
        name: newRecName,
        amount: parseFloat(newRecAmount),
        date: newRecDate,
        next_expected_date: formattedDueDate,
        dueDate: formattedDueDate,
        icon: newRecIcon || 'subscriptions',
        frequency: newRecFrequency,
        interval_days: daysToAdd,
      });
    } else {
      const newItem: RecurringItem = {
        id: `rec-${Date.now()}`,
        name: newRecName,
        amount: parseFloat(newRecAmount),
        date: newRecDate,
        next_expected_date: formattedDueDate,
        dueDate: formattedDueDate,
        icon: newRecIcon || 'subscriptions',
        frequency: newRecFrequency,
        interval_days: daysToAdd,
      };
      onSaveRecurring([...recurringItems, newItem]);
      if (onShowToast) {
        onShowToast(`Recurring subscription "${newRecName}" added!`, 'success');
      }
    }
    setNewRecName('');
    setNewRecAmount('');
    setNewRecDate(new Date().toISOString().split('T')[0]);
  };

  const handleDeleteRecurring = (id: string) => {
    if (onDeleteRecurring) {
      onDeleteRecurring(id);
    } else {
      const itemToDelete = recurringItems.find((i) => i.id === id);
      onSaveRecurring(recurringItems.filter((i) => i.id !== id));
      if (onShowToast) {
        onShowToast(
          itemToDelete ? `Recurring item "${itemToDelete.name}" deleted` : 'Recurring transaction deleted',
          'warning'
        );
      }
    }
  };

  return (
    <div className="modal-overlay active" onClick={onClose}>
      <div className="modal-content max-h-[90vh] overflow-y-auto custom-scrollbar" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="flex justify-between items-center mb-6 pb-2 border-b border-[#464555]/20">
          <h2 className="font-bold text-lg text-[#bfdbfe] tracking-tight flex items-center gap-2">
            {activeModal === 'edit-budget' && 'Edit Monthly Budget'}
            {activeModal === 'edit-savings-goal' && 'Edit Savings Goal'}
            {activeModal === 'summary' && 'Weekly Spending Summary'}
            {activeModal === 'upload' && 'Upload CSV Statement'}
            {activeModal === 'recurring' && 'Manage Recurring Subscriptions'}
            {activeModal === 'add-transaction' && 'Add New Transaction'}
            {activeModal === 'edit-transaction' && 'Edit Transaction'}
            {activeModal === 'edit-categories' && 'Manage Transaction Categories'}
            {activeModal === 'notifications' && 'Email Alerts'}
          </h2>
          <button
            onClick={onClose}
            className="text-[#c7c4d8] hover:text-white p-1 rounded-lg hover:bg-[#1c2b3c] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* --- 1. Edit Budget Modal --- */}
        {activeModal === 'edit-budget' && (
          <form onSubmit={handleSaveBudgetSubmit} className="flex flex-col gap-5">
            <div>
              <label className="block text-xs font-mono-data text-[#c7c4d8] mb-2 uppercase font-semibold">
                Total Monthly Budget Limit ($)
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTotalLimit((prev) => Math.max(0, (Number(prev) || 0) - 50))}
                  className="w-11 h-11 flex items-center justify-center bg-[#122131] hover:bg-[#1c2b3c] active:scale-95 text-[#93c5fd] rounded-xl border border-[#464555]/30 font-bold text-lg cursor-pointer transition-all shadow-sm"
                  title="Decrease by $50"
                >
                  -
                </button>
                <div className="relative flex-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-mono-data text-[#93c5fd] font-bold">
                    $
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={totalLimit}
                    onChange={(e) => setTotalLimit(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-[#122131] rounded-xl border border-[#464555]/30 focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6] pl-8 pr-4 py-2.5 text-sm text-white font-mono-data"
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setTotalLimit((prev) => (Number(prev) || 0) + 50)}
                  className="w-11 h-11 flex items-center justify-center bg-[#122131] hover:bg-[#1c2b3c] active:scale-95 text-[#93c5fd] rounded-xl border border-[#464555]/30 font-bold text-lg cursor-pointer transition-all shadow-sm"
                  title="Increase by $50"
                >
                  +
                </button>
              </div>
              <p className="text-[11px] text-[#c7c4d8]/70 mt-1.5 font-mono-data">
                Type an exact amount or use +/- to adjust in $50 steps.
              </p>
            </div>

            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-[#464555]/20">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-[#c7c4d8] hover:bg-[#1c2b3c] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#3b82f6] text-white rounded-xl text-xs font-bold hover:bg-[#3b82f6]/90 shadow-md cursor-pointer"
              >
                Save Budget
              </button>
            </div>
          </form>
        )}

        {/* --- 1b. Edit Savings Goal Modal --- */}
        {activeModal === 'edit-savings-goal' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSaveSavingsGoal(Number(goalAmount));
              onClose();
            }}
            className="flex flex-col gap-5"
          >
            <div>
              <label className="block text-xs font-mono-data text-[#c7c4d8] mb-2 uppercase font-semibold">
                Target Savings Goal ($)
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setGoalAmount((prev) => Math.max(0, (Number(prev) || 0) - 100))}
                  className="w-11 h-11 flex items-center justify-center bg-[#122131] hover:bg-[#1c2b3c] active:scale-95 text-[#93c5fd] rounded-xl border border-[#464555]/30 font-bold text-lg cursor-pointer transition-all shadow-sm"
                  title="Decrease by $100"
                >
                  -
                </button>
                <div className="relative flex-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-mono-data text-[#93c5fd] font-bold">
                    $
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={goalAmount}
                    onChange={(e) => setGoalAmount(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-[#122131] rounded-xl border border-[#464555]/30 focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6] pl-8 pr-4 py-2.5 text-sm text-white font-mono-data"
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setGoalAmount((prev) => (Number(prev) || 0) + 100)}
                  className="w-11 h-11 flex items-center justify-center bg-[#122131] hover:bg-[#1c2b3c] active:scale-95 text-[#93c5fd] rounded-xl border border-[#464555]/30 font-bold text-lg cursor-pointer transition-all shadow-sm"
                  title="Increase by $100"
                >
                  +
                </button>
              </div>
              <p className="text-[11px] text-[#c7c4d8]/70 mt-1.5 font-mono-data">
                Type an exact amount or use +/- to adjust in $100 steps.
              </p>
            </div>

            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-[#464555]/20">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-[#c7c4d8] hover:bg-[#1c2b3c] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#3b82f6] text-white rounded-xl text-xs font-bold hover:bg-[#3b82f6]/90 shadow-md cursor-pointer"
              >
                Save Savings Goal
              </button>
            </div>
          </form>
        )}

        {/* --- 2. Weekly Summary Modal --- */}
        {activeModal === 'summary' && (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-[#122131] rounded-2xl border border-[#464555]/20">
                <p className="text-[10px] uppercase font-mono-data text-[#c7c4d8] mb-1 font-semibold">
                  Spent this week
                </p>
                <p className="text-2xl font-bold text-[#d4e4fa]">$450.20</p>
                <p className="text-[10px] text-emerald-400 mt-1 font-mono-data">↓ 12% vs last week</p>
              </div>
              <div className="p-4 bg-[#122131] rounded-2xl border border-[#464555]/20">
                <p className="text-[10px] uppercase font-mono-data text-[#c7c4d8] mb-1 font-semibold">
                  Top Category
                </p>
                <p className="text-2xl font-bold text-[#d4e4fa]">Groceries</p>
                <p className="text-[10px] text-[#c7c4d8] mt-1 font-mono-data">$142.50 total</p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-bold text-[#d4e4fa]">Key Weekly Insights</h4>
              <div className="p-3 bg-[#010f1f] rounded-xl border border-[#464555]/10 flex gap-3 items-start">
                <span className="material-symbols-outlined text-emerald-400 text-lg">check_circle</span>
                <p className="text-xs text-[#c7c4d8]">
                  You've successfully stayed under your "Dining Out" daily cap for 5 days straight.
                </p>
              </div>
              <div className="p-3 bg-[#010f1f] rounded-xl border border-[#464555]/10 flex gap-3 items-start">
                <span className="material-symbols-outlined text-[#ffb4ab] text-lg">warning</span>
                <p className="text-xs text-[#c7c4d8]">
                  Entertainment spending is up 15%. This is mainly due to the new Netflix billing cycle.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                alert('Weekly SpendWise PDF Report downloaded to your device!');
              }}
              className="w-full mt-2 py-3 border border-[#3b82f6]/50 text-[#bfdbfe] rounded-xl font-bold hover:bg-[#3b82f6]/10 transition-colors text-sm cursor-pointer"
            >
              Download Full Report (PDF)
            </button>
          </div>
        )}

        {/* --- 4. Upload CSV Modal --- */}
        {activeModal === 'upload' && (
          <div className="flex flex-col gap-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-mono-data text-[#c7c4d8] font-semibold">
                  Paste CSV Lines or Choose File
                </label>
                <label className="text-xs text-[#bfdbfe] hover:underline cursor-pointer flex items-center gap-1 font-semibold">
                  <span className="material-symbols-outlined text-sm">attach_file</span>
                  <span>Browse .csv File</span>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <textarea
                value={csvText}
                onChange={(e) => {
                  setCsvText(e.target.value);
                  setCsvValidation(null);
                }}
                rows={6}
                placeholder={`CSV Format Header (Required: Merchant, Category, Amount, Date):
Merchant, Category, Amount, Date

Example Data Rows:
Target Store, Groceries, -85.20, May 14 2024
Employer Corp, Income, 3500.00, May 15 2024
Netflix Premium, Entertainment, -15.99, May 01 2024`}
                className="w-full bg-[#010f1f] rounded-xl border border-[#464555]/30 p-3 text-xs text-white font-mono-data focus:outline-none focus:border-[#3b82f6] leading-relaxed"
              />
            </div>

            {/* Validation Trigger Button */}
            {!csvValidation && csvText.trim() && (
              <button
                type="button"
                onClick={runCSVValidation}
                className="w-full py-2.5 bg-[#1c2b3c] hover:bg-[#2c3a4c] text-[#93c5fd] rounded-xl text-xs font-bold font-mono-data border border-[#3b82f6]/40 cursor-pointer transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">fact_check</span>
                <span>Validate & Preview CSV</span>
              </button>
            )}

            {/* Validation Error Banner (Missing Headers / Empty) */}
            {csvValidation && !csvValidation.valid && (
              <div className="p-3.5 bg-[#ffb4ab]/10 border border-[#ffb4ab]/30 rounded-xl text-xs text-[#ffb4ab]">
                <div className="flex items-center gap-2 font-bold mb-1">
                  <span className="material-symbols-outlined text-sm">error</span>
                  <span>CSV Header Error</span>
                </div>
                <p>{csvValidation.headerError}</p>
              </div>
            )}

            {/* Pre-Import Summary Banner */}
            {csvValidation && csvValidation.valid && (
              <div className="space-y-3">
                <div className="p-3 bg-[#122131] border border-[#464555]/30 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 bg-[#3b82f6]/15 text-[#93c5fd] border border-[#3b82f6]/30 rounded-lg text-xs font-mono-data font-bold">
                      {csvValidation.readyRows.length} Ready to Import
                    </span>
                    {csvValidation.skippedRows.length > 0 && (
                      <span className="px-2.5 py-1 bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-mono-data font-bold">
                        {csvValidation.skippedRows.length} Skipped (Errors)
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={runCSVValidation}
                    className="text-[11px] font-mono-data text-[#93c5fd] hover:underline cursor-pointer"
                  >
                    Re-check
                  </button>
                </div>

                {/* Skipped Rows List */}
                {csvValidation.skippedRows.length > 0 && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl max-h-32 overflow-y-auto custom-scrollbar">
                    <p className="text-[11px] font-bold text-amber-300 font-mono-data uppercase mb-1.5">
                      Skipped Rows Details:
                    </p>
                    <div className="space-y-1">
                      {csvValidation.skippedRows.map((err, idx) => (
                        <div key={idx} className="text-xs text-[#c7c4d8] font-mono-data flex items-start gap-2">
                          <span className="text-amber-300 font-bold">Row {err.row}:</span>
                          <span>{err.reason}</span>
                          <span className="text-[#c7c4d8]/40 truncate text-[10px]">({err.raw})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Valid Rows Preview Table */}
                {csvValidation.readyRows.length > 0 && (
                  <div className="max-h-40 overflow-y-auto custom-scrollbar rounded-xl border border-[#464555]/20 bg-[#010f1f]">
                    <table className="w-full text-left text-xs font-mono-data">
                      <thead className="bg-[#122131] text-[#93c5fd] text-[10px] uppercase sticky top-0">
                        <tr>
                          <th className="p-2">Merchant</th>
                          <th className="p-2">Category</th>
                          <th className="p-2">Date</th>
                          <th className="p-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-[#c7c4d8]">
                        {csvValidation.readyRows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-white/5">
                            <td className="p-2 text-white font-semibold">{row.merchant}</td>
                            <td className="p-2">
                              <span className="px-1.5 py-0.5 rounded bg-white/5 text-[11px]">{row.category}</span>
                            </td>
                            <td className="p-2 text-[11px]">{row.date}</td>
                            <td className={`p-2 text-right font-bold ${row.amount > 0 ? 'text-emerald-400' : 'text-white'}`}>
                              {row.amount > 0 ? `+$${row.amount.toFixed(2)}` : `-$${Math.abs(row.amount).toFixed(2)}`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {csvStatus && (
              <p className="text-xs text-emerald-400 font-semibold font-mono-data">{csvStatus}</p>
            )}

            <div className="flex justify-end gap-3 pt-3 border-t border-[#464555]/20">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#c7c4d8] hover:bg-[#1c2b3c] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCSVImport}
                disabled={csvValidation ? (!csvValidation.valid || csvValidation.readyRows.length === 0) : !csvText.trim()}
                className={`px-5 py-2 rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all ${
                  csvValidation && (!csvValidation.valid || csvValidation.readyRows.length === 0)
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed opacity-50'
                    : 'bg-[#3b82f6] text-white hover:bg-[#3b82f6]/90'
                }`}
              >
                {csvValidation && csvValidation.valid
                  ? `Import ${csvValidation.readyRows.length} Valid Row(s)`
                  : 'Validate & Import'}
              </button>
            </div>
          </div>
        )}

        {/* --- 5. Manage Recurring Modal --- */}
        {activeModal === 'recurring' && (
          <div className="flex flex-col gap-5">
            <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar">
              {recurringItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-[#122131] rounded-xl border border-[#464555]/20"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#bfdbfe]">{item.icon}</span>
                    <div>
                      <span className="text-xs font-semibold text-[#d4e4fa] block">{item.name}</span>
                      {(item.next_expected_date || item.dueDate) ? (
                        <span className="text-[10px] text-[#c7c4d8]/70 font-mono-data">
                          Due: {item.next_expected_date || item.dueDate}
                        </span>
                      ) : item.date ? (
                        <span className="text-[10px] text-[#c7c4d8]/70 font-mono-data">
                          Started: {item.date}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold font-mono-data text-[#d4e4fa]">
                      ${item.amount.toFixed(2)}/mo
                    </span>
                    <button
                      onClick={() => handleDeleteRecurring(item.id)}
                      className="text-[#ffb4ab] hover:text-red-400 p-1"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-[#464555]/20 space-y-3">
              <h4 className="text-xs font-bold text-[#bfdbfe]">Add New Recurring Payment</h4>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Service Name (e.g. Spotify)"
                  value={newRecName}
                  onChange={(e) => setNewRecName(e.target.value)}
                  className="bg-[#010f1f] rounded-xl border border-[#464555]/30 px-3 py-2 text-xs text-white"
                />
                <input
                  type="number"
                  placeholder="Amount ($)"
                  value={newRecAmount}
                  onChange={(e) => setNewRecAmount(e.target.value)}
                  className="bg-[#010f1f] rounded-xl border border-[#464555]/30 px-3 py-2 text-xs text-white"
                />
                <input
                  type="date"
                  value={newRecDate}
                  onChange={(e) => setNewRecDate(e.target.value)}
                  className="bg-[#010f1f] rounded-xl border border-[#464555]/30 px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-mono-data text-[#c7c4d8] mb-1 font-semibold">
                    Billing Frequency
                  </label>
                  <select
                    value={newRecFrequency}
                    onChange={(e) => setNewRecFrequency(e.target.value as any)}
                    className="w-full bg-[#010f1f] rounded-xl border border-[#464555]/30 px-3 py-2 text-xs text-white"
                  >
                    <option value="monthly">Monthly (30 Days)</option>
                    <option value="weekly">Weekly (7 Days)</option>
                    <option value="biweekly">Bi-weekly (14 Days)</option>
                    <option value="yearly">Yearly (365 Days)</option>
                    <option value="custom">Custom Duration...</option>
                  </select>
                </div>

                {newRecFrequency === 'custom' ? (
                  <div>
                    <label className="block text-[10px] font-mono-data text-[#c7c4d8] mb-1 font-semibold">
                      Interval (Days)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 45"
                      value={newRecInterval}
                      onChange={(e) => setNewRecInterval(e.target.value)}
                      className="w-full bg-[#010f1f] rounded-xl border border-[#464555]/30 px-3 py-2 text-xs text-white"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-[10px] font-mono-data text-[#c7c4d8] mb-1 font-semibold">
                      Auto Due Date
                    </label>
                    <div className="px-3 py-2 bg-[#010f1f]/50 border border-[#464555]/20 rounded-xl text-xs text-[#93c5fd] font-mono-data font-semibold">
                      {(() => {
                        let days = 30;
                        if (newRecFrequency === 'weekly') days = 7;
                        else if (newRecFrequency === 'biweekly') days = 14;
                        else if (newRecFrequency === 'yearly') days = 365;
                        const st = newRecDate ? new Date(newRecDate + 'T00:00:00') : new Date();
                        const nextDue = new Date(st.getTime() + days * 24 * 60 * 60 * 1000);
                        return nextDue.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                      })()}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleAddRecurring}
                className="w-full py-2.5 bg-[#3b82f6] text-white rounded-xl text-xs font-bold hover:bg-[#3b82f6]/90 cursor-pointer"
              >
                Add Subscription
              </button>
            </div>
          </div>
        )}

        {/* --- 6. Add / Edit Transaction Modal --- */}
        {(activeModal === 'add-transaction' || activeModal === 'edit-transaction') && (
          <form onSubmit={handleTransactionSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-mono-data text-[#c7c4d8] mb-1 font-semibold">
                Merchant / Description
              </label>
              <input
                type="text"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                placeholder="e.g. Target, Uber, Salary"
                className="w-full bg-[#122131] rounded-xl border border-[#464555]/30 px-3 py-2 text-xs text-white"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono-data text-[#c7c4d8] mb-1 font-semibold">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[#122131] rounded-xl border border-[#464555]/30 px-3 py-2 text-xs text-white"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono-data text-[#c7c4d8] mb-1 font-semibold">
                  Amount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-[#122131] rounded-xl border border-[#464555]/30 px-3 py-2 text-xs text-white"
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-4 py-1">
              <label className="flex items-center gap-2 text-xs text-[#d4e4fa] cursor-pointer">
                <input
                  type="radio"
                  name="txType"
                  checked={!isIncome}
                  onChange={() => setIsIncome(false)}
                  className="text-[#3b82f6]"
                />
                Expense (-)
              </label>
              <label className="flex items-center gap-2 text-xs text-emerald-400 cursor-pointer">
                <input
                  type="radio"
                  name="txType"
                  checked={isIncome}
                  onChange={() => setIsIncome(true)}
                  className="text-emerald-400"
                />
                Income (+)
              </label>
            </div>

            <div>
              <label className="block text-xs font-mono-data text-[#c7c4d8] mb-1 font-semibold">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-[#122131] rounded-xl border border-[#464555]/30 px-3 py-2 text-xs text-white font-mono-data cursor-pointer"
              />
            </div>

            <div className="pt-2 border-t border-[#464555]/20">
              <label className="flex items-center gap-2 text-xs text-[#d4e4fa] cursor-pointer font-semibold">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="rounded bg-[#010f1f] border-[#464555] text-[#3b82f6] focus:ring-[#3b82f6]"
                />
                <span>Set as Recurring Payment (Subscribed Monthly)</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[#464555]/20">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmittingTx}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#c7c4d8] hover:bg-[#1c2b3c] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingTx}
                className="px-5 py-2 bg-[#3b82f6] text-white rounded-xl text-xs font-bold hover:bg-[#3b82f6]/90 shadow-md disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {isSubmittingTx && (
                  <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                )}
                <span>{editingTransaction ? 'Save Transaction' : isSubmittingTx ? 'Adding...' : 'Add Transaction'}</span>
              </button>
            </div>
          </form>
        )}

        {/* --- 7. Edit Categories Modal --- */}
        {activeModal === 'edit-categories' && (
          <div className="flex flex-col gap-5">
            <p className="text-xs text-[#c7c4d8]">
              Manage your spending categories. Add new categories with a custom icon or rename existing ones.
            </p>

            {/* Add New Category Input & Icon Picker */}
            <div className="space-y-3 p-3 bg-[#010f1f] rounded-xl border border-[#464555]/20">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="New Category Name (e.g., Healthcare, Investments)"
                  value={newCatInput}
                  onChange={(e) => setNewCatInput(e.target.value)}
                  className="flex-1 bg-[#122131] rounded-xl border border-[#464555]/30 px-3.5 py-2 text-xs text-white placeholder:text-[#c7c4d8]/40 focus:outline-none focus:border-[#3b82f6]"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newCatInput.trim()) {
                      onAddCategory(newCatInput.trim(), selectedCatIcon);
                      setNewCatInput('');
                    }
                  }}
                  disabled={!newCatInput.trim()}
                  className="px-4 py-2 bg-[#3b82f6] hover:bg-[#3b82f6]/90 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">add</span> Add
                </button>
              </div>

              {/* Icon Selector Grid */}
              <div>
                <label className="block text-[10px] font-mono-data text-[#c7c4d8] uppercase mb-1.5 font-semibold">
                  Select Category Icon:
                </label>
                <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto custom-scrollbar p-1 bg-[#122131] rounded-lg border border-white/5">
                  {CATEGORY_ICONS.map((iconName) => (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setSelectedCatIcon(iconName)}
                      className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                        selectedCatIcon === iconName
                          ? 'bg-[#3b82f6] border-[#3b82f6] text-white'
                          : 'bg-[#1c2b3c] border-transparent text-[#c7c4d8] hover:text-white'
                      }`}
                      title={iconName}
                    >
                      <span className="material-symbols-outlined text-base block">{iconName}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Category List */}
            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
              {categories.map((cat, idx) => {
                const isEditing = editingCatIndex === idx;

                return (
                  <div
                    key={cat}
                    className="flex items-center justify-between p-3 bg-[#122131] rounded-xl border border-[#464555]/20 hover:border-[#464555]/40 transition-colors"
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-2 w-full">
                        <input
                          type="text"
                          value={editCatValue}
                          onChange={(e) => setEditCatValue(e.target.value)}
                          className="flex-1 bg-[#010f1f] rounded-lg border border-[#3b82f6] px-2.5 py-1 text-xs text-white"
                          autoFocus
                        />
                        <button
                          onClick={() => {
                            if (editCatValue.trim() && editCatValue.trim() !== cat) {
                              onRenameCategory(cat, editCatValue.trim());
                            }
                            setEditingCatIndex(null);
                          }}
                          className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 rounded-lg text-xs font-bold hover:bg-emerald-500/30"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingCatIndex(null)}
                          className="px-2.5 py-1 bg-[#2c3a4c] text-[#c7c4d8] rounded-lg text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#3b82f6]"></span>
                          <span className="text-xs font-semibold text-[#d4e4fa]">{cat}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingCatIndex(idx);
                              setEditCatValue(cat);
                            }}
                            className="p-1.5 text-[#c7c4d8] hover:text-[#bfdbfe] hover:bg-[#1c2b3c] rounded-lg transition-colors cursor-pointer"
                            title="Rename Category"
                          >
                            <span className="material-symbols-outlined text-sm">edit</span>
                          </button>
                          <button
                            onClick={() => onDeleteCategory(cat)}
                            className="p-1.5 text-[#c7c4d8] hover:text-[#ffb4ab] hover:bg-[#1c2b3c] rounded-lg transition-colors cursor-pointer"
                            title="Delete Category"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2 border-t border-[#464555]/20">
              <button
                onClick={onClose}
                className="px-5 py-2 bg-[#1c2b3c] text-[#d4e4fa] hover:bg-[#2c3a4c] rounded-xl text-xs font-bold"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* --- 8. Notifications & Email Alerts Modal --- */}
        {activeModal === 'notifications' && (
          <div className="space-y-5">
            {/* Email Alerts & Preferences Configuration */}
            <div className="p-4 bg-[#0d1c2d] rounded-xl border border-[#3b82f6]/30 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[#3b82f6]">mail</span>
                  <div>
                    <h4 className="text-xs font-bold text-[#d4e4fa]">Email Alerts & Digest</h4>
                    <p className="text-[10px] text-[#c7c4d8]">Instant notifications for budget events & summary reports</p>
                  </div>
                </div>

                {/* Email Alert Switch Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    const nextState = !emailAlertsEnabled;
                    setEmailAlertsEnabled(nextState);
                    setEmailAlertToast(
                      nextState ? 'Email alerts enabled!' : 'Email alerts paused.'
                    );
                    setTimeout(() => setEmailAlertToast(null), 2500);
                  }}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    emailAlertsEnabled ? 'bg-[#3b82f6]' : 'bg-[#273647]'
                  }`}
                  title="Toggle Email Alerts"
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      emailAlertsEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {emailAlertsEnabled && (
                <div className="space-y-3 pt-3 border-t border-[#464555]/20 animate-fade">
                  <div>
                    <label className="block text-[11px] font-mono-data text-[#c7c4d8] mb-1 font-semibold">
                      Destination Email Address
                    </label>
                    <input
                      type="email"
                      value={emailAddress}
                      onChange={(e) => setEmailAddress(e.target.value)}
                      className="w-full bg-[#122131] rounded-xl border border-[#464555]/30 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#3b82f6]"
                      placeholder="user@example.com"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-mono-data text-[#c7c4d8] mb-1">
                        Digest Frequency
                      </label>
                      <select className="w-full bg-[#122131] border border-[#464555]/30 rounded-lg px-2 py-1.5 text-xs text-white">
                        <option value="weekly">Weekly Summary (Every Mon)</option>
                        <option value="monthly">Monthly Report</option>
                        <option value="realtime">Real-time (Instant)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono-data text-[#c7c4d8] mb-1">
                        Threshold Trigger
                      </label>
                      <select className="w-full bg-[#122131] border border-[#464555]/30 rounded-lg px-2 py-1.5 text-xs text-white">
                        <option value="80">At 80% of limit</option>
                        <option value="90">At 90% of limit</option>
                        <option value="100">At 100% (Breach only)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <p className="text-[11px] font-mono-data text-[#c7c4d8] font-semibold">
                      Notification Triggers
                    </p>
                    <label className="flex items-center gap-2 text-xs text-[#d4e4fa] cursor-pointer">
                      <input type="checkbox" defaultChecked className="rounded text-[#3b82f6]" />
                      Overspending & budget threshold warnings
                    </label>
                    <label className="flex items-center gap-2 text-xs text-[#d4e4fa] cursor-pointer">
                      <input type="checkbox" defaultChecked className="rounded text-[#3b82f6]" />
                      Unusual activity & recurring subscription changes
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setEmailAlertToast('Notification settings saved!');
                      if (onShowToast) onShowToast('Notification preferences saved!', 'success');
                      setTimeout(() => setEmailAlertToast(null), 2500);
                    }}
                    className="w-full py-2 bg-[#3b82f6] text-white rounded-xl text-xs font-bold hover:bg-[#3b82f6]/90 transition-colors shadow-md cursor-pointer mt-2"
                  >
                    Save Preferences
                  </button>
                </div>
              )}

              {emailAlertToast && (
                <div className="p-2 bg-emerald-500/20 text-emerald-300 rounded-lg text-xs font-semibold text-center animate-fade">
                  {emailAlertToast}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
