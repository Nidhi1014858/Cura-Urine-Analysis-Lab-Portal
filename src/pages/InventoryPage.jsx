import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  AlertTriangle, 
  AlertCircle, 
  Trash2, 
  Edit2, 
  RefreshCw, 
  Boxes,
  CheckCircle2,
  Calendar,
  Layers,
  ShieldCheck,
  Building2,
  Filter
} from 'lucide-react';
import { mockApi } from '../services/mockApi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Modal } from '../components/common/Modal';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { STRIP_BRANDS } from '../services/seedData';
import { getTodayIST } from '../utils/formatters';

const INITIAL_FORM_STATE = {
  brandId: 'brand_cura14',
  brandName: 'CuraStrip Pro 14',
  manufacturer: 'Cura Diagnostics',
  panels: ['10-panel', '14-panel'],
  batchNumber: '',
  manufactureDate: '',
  expiryDate: '',
  quantity: ''
};

export function InventoryPage() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [panelFilter, setPanelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);

  // Form State
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [isCustomBrand, setIsCustomBrand] = useState(false);
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const today = useMemo(() => getTodayIST(), []);

  const loadInventory = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await mockApi.getInventory();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load inventory:', err);
      setError(err?.message || 'Failed to load strip batch inventory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  // Compute status for an item
  const getItemStatus = (item) => {
    if (!item.expiryDate || item.expiryDate < today) {
      return { 
        code: 'expired', 
        label: 'Expired', 
        badgeStyle: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800' 
      };
    }
    if (Number(item.quantity) <= 0) {
      return { 
        code: 'out_of_stock', 
        label: 'Out of stock', 
        badgeStyle: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800' 
      };
    }
    return { 
      code: 'in_stock', 
      label: 'In stock', 
      badgeStyle: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' 
    };
  };

  // Filtered Inventory List
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Panel filter
      if (panelFilter !== 'all' && !item.panels?.includes(panelFilter)) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        const itemStatus = getItemStatus(item).code;
        if (itemStatus !== statusFilter) return false;
      }

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesBatch = item.batchNumber?.toLowerCase().includes(q);
        const matchesBrand = item.brandName?.toLowerCase().includes(q);
        const matchesMfg = item.manufacturer?.toLowerCase().includes(q);
        if (!matchesBatch && !matchesBrand && !matchesMfg) return false;
      }

      return true;
    });
  }, [items, panelFilter, statusFilter, search, today]);

  // Inventory Metrics
  const metrics = useMemo(() => {
    let totalStrips = 0;
    let inStockBatches = 0;
    let outOfStockBatches = 0;
    let expiredBatches = 0;

    for (const it of items) {
      const status = getItemStatus(it).code;
      if (status === 'expired') {
        expiredBatches++;
      } else if (status === 'out_of_stock') {
        outOfStockBatches++;
      } else {
        inStockBatches++;
        totalStrips += Number(it.quantity) || 0;
      }
    }

    return {
      totalBatches: items.length,
      totalStrips,
      inStockBatches,
      outOfStockBatches,
      expiredBatches
    };
  }, [items, today]);

  // Brand dropdown handler
  const handleBrandSelect = (brandId) => {
    if (brandId === 'custom') {
      setIsCustomBrand(true);
      setFormData((prev) => ({
        ...prev,
        brandId: 'brand_custom',
        brandName: '',
        manufacturer: '',
        panels: ['10-panel']
      }));
      return;
    }

    setIsCustomBrand(false);
    const catalogBrand = STRIP_BRANDS.find((b) => b.id === brandId);
    if (catalogBrand) {
      setFormData((prev) => ({
        ...prev,
        brandId: catalogBrand.id,
        brandName: catalogBrand.name,
        manufacturer: catalogBrand.manufacturer,
        panels: [...catalogBrand.panels]
      }));
    }
  };

  const handlePanelToggle = (panelType) => {
    setFormData((prev) => {
      const current = prev.panels || [];
      const next = current.includes(panelType)
        ? current.filter((p) => p !== panelType)
        : [...current, panelType];
      return { ...prev, panels: next };
    });
  };

  const openAddModal = () => {
    setFormError(null);
    setIsCustomBrand(false);
    setFormData({
      ...INITIAL_FORM_STATE,
      manufactureDate: today,
      expiryDate: ''
    });
    setIsAddModalOpen(true);
  };

  const openEditModal = (item) => {
    setFormError(null);
    setEditingItem(item);
    setIsCustomBrand(!STRIP_BRANDS.some((b) => b.id === item.brandId));
    setFormData({
      brandId: item.brandId || 'brand_custom',
      brandName: item.brandName || '',
      manufacturer: item.manufacturer || '',
      panels: Array.isArray(item.panels) ? [...item.panels] : ['10-panel'],
      batchNumber: item.batchNumber || '',
      manufactureDate: item.manufactureDate || '',
      expiryDate: item.expiryDate || '',
      quantity: item.quantity !== undefined ? String(item.quantity) : '0'
    });
  };

  const validateForm = () => {
    const trimmedBatch = formData.batchNumber?.trim();
    if (!trimmedBatch) {
      return 'Batch number is required.';
    }
    if (!formData.brandName?.trim()) {
      return 'Brand name is required.';
    }
    if (!formData.manufacturer?.trim()) {
      return 'Manufacturer is required.';
    }
    if (!formData.panels || formData.panels.length === 0) {
      return 'At least one compatible panel type must be selected.';
    }
    if (!formData.manufactureDate) {
      return 'Manufacture date is required.';
    }
    if (formData.manufactureDate > today) {
      return 'Manufacture date cannot be in the future.';
    }
    if (!formData.expiryDate) {
      return 'Expiry date is required.';
    }
    if (formData.expiryDate < formData.manufactureDate) {
      return 'Expiry date cannot precede the manufacture date.';
    }
    const qtyNum = Number(formData.quantity);
    if (isNaN(qtyNum) || !Number.isInteger(qtyNum) || qtyNum < 0) {
      return 'Quantity must be a valid non-negative integer.';
    }
    return null;
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const errorMsg = validateForm();
    if (errorMsg) {
      setFormError(errorMsg);
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      await mockApi.createInventoryBatch({
        brandId: formData.brandId || 'brand_custom',
        brandName: formData.brandName.trim(),
        manufacturer: formData.manufacturer.trim(),
        panels: formData.panels,
        batchNumber: formData.batchNumber.trim(),
        manufactureDate: formData.manufactureDate,
        expiryDate: formData.expiryDate,
        quantity: Number(formData.quantity)
      });
      addToast(`Batch ${formData.batchNumber.trim()} added to inventory.`, 'success');
      setIsAddModalOpen(false);
      await loadInventory();
    } catch (err) {
      const message = err?.message || 'Failed to create inventory batch.';
      setFormError(message);
      addToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingItem) return;

    const errorMsg = validateForm();
    if (errorMsg) {
      setFormError(errorMsg);
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      await mockApi.updateInventoryBatch(editingItem.id, {
        brandId: formData.brandId || editingItem.brandId,
        brandName: formData.brandName.trim(),
        manufacturer: formData.manufacturer.trim(),
        panels: formData.panels,
        batchNumber: formData.batchNumber.trim(),
        manufactureDate: formData.manufactureDate,
        expiryDate: formData.expiryDate,
        quantity: Number(formData.quantity)
      });
      addToast(`Batch ${formData.batchNumber.trim()} updated successfully.`, 'success');
      setEditingItem(null);
      await loadInventory();
    } catch (err) {
      const message = err?.message || 'Failed to update inventory batch.';
      setFormError(message);
      addToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;
    setIsSubmitting(true);
    try {
      await mockApi.deleteInventoryBatch(deletingItem.id);
      addToast(`Batch ${deletingItem.batchNumber} removed from inventory.`, 'success');
      setDeletingItem(null);
      await loadInventory();
    } catch (err) {
      addToast(err?.message || 'Failed to delete inventory batch.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 dark:text-white tracking-tight">
              Strip Batch Inventory
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Admin Portal
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Centralized laboratory reagent strip lot registration, quantity management, and expiration control.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md shadow-teal-600/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Strip Batch
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Batches */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">Total Batches</span>
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-mono mt-2">
            {metrics.totalBatches}
          </p>
          <p className="text-[11px] text-slate-400 mt-1 font-mono">
            {metrics.inStockBatches} currently active
          </p>
        </div>

        {/* Total Usable Strips */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">Available Strips</span>
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-teal-700 dark:text-teal-400 font-mono mt-2">
            {metrics.totalStrips}
          </p>
          <p className="text-[11px] text-slate-400 mt-1 font-mono">
            Across unexpired lots
          </p>
        </div>

        {/* Depleted / Out of Stock */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">Depleted Batches</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-amber-700 dark:text-amber-400 font-mono mt-2">
            {metrics.outOfStockBatches}
          </p>
          <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-semibold">
            0 strips remaining
          </p>
        </div>

        {/* Expired Batches */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">Expired Batches</span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-rose-700 dark:text-rose-400 font-mono mt-2">
            {metrics.expiredBatches}
          </p>
          <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 font-semibold">
            Locked from wizard testing
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by batch number, brand, or manufacturer..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Panel Filter */}
          <select
            value={panelFilter}
            onChange={(e) => setPanelFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 outline-none"
          >
            <option value="all">All Panels</option>
            <option value="10-panel">10-panel</option>
            <option value="14-panel">14-panel</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="in_stock">In Stock</option>
            <option value="out_of_stock">Out of Stock</option>
            <option value="expired">Expired</option>
          </select>

          <button
            onClick={loadInventory}
            title="Refresh inventory"
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Error State Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadInventory}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold transition-colors shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <LoadingSpinner text="Loading strip batch inventory..." />
      ) : filteredItems.length === 0 ? (
        /* Empty State */
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            No strip batches found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {search || panelFilter !== 'all' || statusFilter !== 'all'
              ? 'No batches match your active search and filter criteria.'
              : 'No strip batches have been registered in the laboratory inventory yet.'}
          </p>
          {(search || panelFilter !== 'all' || statusFilter !== 'all') ? (
            <button
              onClick={() => { setSearch(''); setPanelFilter('all'); setStatusFilter('all'); }}
              className="text-xs text-teal-600 dark:text-teal-400 font-semibold hover:underline"
            >
              Reset all filters
            </button>
          ) : (
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition-colors"
            >
              <Plus className="w-4 h-4" /> Add First Batch
            </button>
          )}
        </div>
      ) : (
        /* Inventory Table */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-mono text-[10px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 font-bold">Batch Number</th>
                  <th className="py-3.5 px-4 font-bold">Brand &amp; Manufacturer</th>
                  <th className="py-3.5 px-4 font-bold">Compatible Panels</th>
                  <th className="py-3.5 px-4 font-bold">Mfg Date</th>
                  <th className="py-3.5 px-4 font-bold">Expiry Date</th>
                  <th className="py-3.5 px-4 font-bold text-right">Available Strips</th>
                  <th className="py-3.5 px-4 font-bold text-center">Status</th>
                  <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredItems.map((item) => {
                  const statusInfo = getItemStatus(item);
                  return (
                    <tr
                      key={item.id || item._id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Batch Number */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {item.batchNumber}
                      </td>

                      {/* Brand & Manufacturer */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {item.brandName}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3 shrink-0" />
                          {item.manufacturer}
                        </div>
                      </td>

                      {/* Panels */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {item.panels?.map((p) => (
                            <span
                              key={p}
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                                p === '14-panel'
                                  ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                  : 'bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
                              }`}
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Manufacture Date */}
                      <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {item.manufactureDate}
                      </td>

                      {/* Expiry Date */}
                      <td className="py-3.5 px-4 font-mono whitespace-nowrap">
                        <span className={item.expiryDate < today ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-600 dark:text-slate-300'}>
                          {item.expiryDate}
                        </span>
                      </td>

                      {/* Quantity */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold">
                        <span className={Number(item.quantity) === 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}>
                          {item.quantity}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusInfo.badgeStyle}`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                            statusInfo.code === 'expired' ? 'bg-rose-500' :
                            statusInfo.code === 'out_of_stock' ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}></span>
                          {statusInfo.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => openEditModal(item)}
                            title="Edit batch"
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingItem(item)}
                            title="Delete batch"
                            className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-500 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD / EDIT BATCH MODAL */}
      <Modal
        isOpen={isAddModalOpen || Boolean(editingItem)}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingItem(null);
          setFormError(null);
        }}
        title={editingItem ? `Edit Batch: ${editingItem.batchNumber}` : 'Register New Strip Batch'}
        maxWidth="max-w-lg"
      >
        <form onSubmit={editingItem ? handleEditSubmit : handleCreateSubmit} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          {/* Brand Selection */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Reagent Strip Brand
            </label>
            <select
              value={isCustomBrand ? 'custom' : formData.brandId}
              onChange={(e) => handleBrandSelect(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
            >
              {STRIP_BRANDS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.manufacturer})
                </option>
              ))}
              <option value="custom">+ Other / Custom Brand</option>
            </select>
          </div>

          {/* Custom Brand / Manufacturer Inputs */}
          {isCustomBrand && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Brand Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.brandName}
                  onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                  placeholder="e.g. Siemens Multistix"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Manufacturer
                </label>
                <input
                  type="text"
                  required
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  placeholder="e.g. Siemens Healthcare"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          )}

          {/* Batch Number & Quantity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Batch Number (Lot ID)
              </label>
              <input
                type="text"
                required
                value={formData.batchNumber}
                onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                placeholder="e.g. CUR-14-2405"
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Initial Strips Quantity
              </label>
              <input
                type="number"
                min="0"
                step="1"
                required
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="e.g. 100"
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Compatible Panel Type Checkboxes */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Compatible Parameter Panels (at least one required)
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={formData.panels?.includes('10-panel')}
                  onChange={() => handlePanelToggle('10-panel')}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span className="font-mono">10-panel</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={formData.panels?.includes('14-panel')}
                  onChange={() => handlePanelToggle('14-panel')}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span className="font-mono">14-panel</span>
              </label>
            </div>
          </div>

          {/* Manufacture & Expiry Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Manufacture Date
              </label>
              <input
                type="date"
                max={today}
                required
                value={formData.manufactureDate}
                onChange={(e) => setFormData({ ...formData, manufactureDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono outline-none focus:ring-2 focus:ring-teal-500"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">Cannot be in the future.</p>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Expiry Date
              </label>
              <input
                type="date"
                min={formData.manufactureDate || undefined}
                required
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono outline-none focus:ring-2 focus:ring-teal-500"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">Cannot precede manufacture date.</p>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                setIsAddModalOpen(false);
                setEditingItem(null);
              }}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold transition-all shadow-md shadow-teal-600/20 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : editingItem ? 'Update Batch' : 'Register Batch'}
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={Boolean(deletingItem)}
        onClose={() => setDeletingItem(null)}
        title="Confirm Batch Deletion"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Permanent Deletion Warning</p>
              <p className="text-[11px] leading-relaxed">
                Are you sure you want to delete batch <strong className="font-mono">{deletingItem?.batchNumber}</strong> ({deletingItem?.brandName})?
              </p>
              <p className="text-[11px] text-rose-600 dark:text-rose-400">
                Historical test records will retain their batch snapshot, but this lot will no longer be available for testing.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setDeletingItem(null)}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleDeleteConfirm}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md shadow-rose-600/20 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Deleting...' : 'Confirm Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default InventoryPage;
