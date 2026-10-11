import React, { useState, useEffect } from 'react';
import { Search, Plus, Building2, UserCheck, Phone, Mail, MapPin } from 'lucide-react';
import { mockApi } from '../../services/mockApi';
import { PATHOLOGY_DESTINATIONS } from '../../services/seedData';
import { Modal } from '../common/Modal';

export function StepPatientDestination({ formData, updateFormData, onNext }) {
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [newPatient, setNewPatient] = useState({
    name: '',
    age: '',
    gender: 'Male',
    phone: '',
    email: '',
    bloodGroup: 'B+',
    address: ''
  });

  useEffect(() => {
    async function loadPatients() {
      const list = await mockApi.getPatients();
      setPatients(list);
    }
    loadPatients();
  }, []);

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.patientId.toLowerCase().includes(search.toLowerCase()) ||
    p.phone.includes(search)
  );

  const handleSelectPatient = (patient) => {
    updateFormData({
      patientId: patient.id,
      patientName: patient.name,
      patientCode: patient.patientId
    });
  };

  const handleCreatePatient = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setCreateError(null);

    const name = newPatient.name?.trim();
    if (!name) {
      setCreateError('Patient full name is required.');
      return;
    }

    const age = Number(newPatient.age);
    if (!newPatient.age || isNaN(age) || age < 0) {
      setCreateError('A valid age is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await mockApi.createPatient({
        ...newPatient,
        name,
        age
      });

      const refreshedList = await mockApi.getPatients();
      setPatients(refreshedList);

      handleSelectPatient(created);
      setIsAddModalOpen(false);
      setNewPatient({
        name: '',
        age: '',
        gender: 'Male',
        phone: '',
        email: '',
        bloodGroup: 'B+',
        address: ''
      });
    } catch (err) {
      setCreateError(err.message || 'Failed to save patient.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white">
          Step 1: Patient & Report Destination
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Select or add the target patient and specify the pathology diagnostics company for report dispatch.
        </p>
      </div>

      {/* Pathology Report Destination Selection */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
        <label className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
          <Building2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          Pathology Company / Report Destination
        </label>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Select which diagnostics provider or laboratory this POCT report should be issued to:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
          {PATHOLOGY_DESTINATIONS.map((dest) => (
            <button
              key={dest}
              type="button"
              onClick={() => updateFormData({ reportDestination: dest })}
              className={`p-3.5 rounded-xl border text-left text-xs font-semibold transition-all flex items-center justify-between ${
                formData.reportDestination === dest
                  ? 'bg-teal-50 dark:bg-teal-950/80 border-teal-500 text-teal-900 dark:text-teal-200 ring-2 ring-teal-500/20'
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:border-slate-300'
              }`}
            >
              <span>{dest}</span>
              {formData.reportDestination === dest && (
                <UserCheck className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Patient Selection */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <label className="text-sm font-bold text-slate-900 dark:text-white">
            Patient Selection
          </label>
          <button
            type="button"
            onClick={() => {
              setCreateError(null);
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 text-xs font-semibold border border-teal-200 dark:border-teal-800 hover:bg-teal-100 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add New Patient
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient by name, ID (e.g. PAT-2026), or phone..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* Selected Patient Banner if chosen */}
        {formData.patientId && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">
                ✓
              </div>
              <div>
                <p className="font-bold text-emerald-950 dark:text-emerald-200">
                  {formData.patientName} <span className="font-mono text-emerald-700 dark:text-emerald-400">({formData.patientCode})</span>
                </p>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                  Selected for urinalysis report
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Patients Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
          {filteredPatients.map((p) => {
            const isSelected = formData.patientId === p.id;
            return (
              <div
                key={p.id}
                onClick={() => handleSelectPatient(p)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-teal-50 dark:bg-teal-950/80 border-teal-500 shadow-sm'
                    : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                      {p.name}
                    </h4>
                    <span className="text-[11px] font-mono text-teal-600 dark:text-teal-400 font-semibold">
                      {p.patientId}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    {p.gender}, {p.age}y
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{p.phone}</span>
                  <span>Blood: {p.bloodGroup}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          disabled={!formData.patientId || !formData.reportDestination}
          onClick={onNext}
          className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm shadow-md shadow-teal-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          Next: Strip Selection →
        </button>
      </div>

      {/* Add New Patient Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setCreateError(null);
        }}
        title="Register New Patient"
      >
        <form onSubmit={handleCreatePatient} className="space-y-4">
          {createError && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400 font-medium">
              {createError}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={newPatient.name}
                onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                placeholder="e.g. Priya Sharma"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Age</label>
              <input
                type="number"
                required
                value={newPatient.age}
                onChange={(e) => setNewPatient({ ...newPatient, age: e.target.value })}
                placeholder="e.g. 34"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Gender</label>
              <select
                value={newPatient.gender}
                onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Phone</label>
              <input
                type="text"
                value={newPatient.phone}
                onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                placeholder="+91 98200..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Blood Group</label>
              <select
                value={newPatient.bloodGroup}
                onChange={(e) => setNewPatient({ ...newPatient, bloodGroup: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              >
                <option value="A+">A+</option>
                <option value="B+">B+</option>
                <option value="O+">O+</option>
                <option value="AB+">AB+</option>
                <option value="O-">O-</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs shadow-md shadow-teal-600/20 transition-all"
            >
              {isSubmitting ? 'Saving...' : 'Save Patient & Select'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
