import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BrandLogo } from '../components/common/BrandLogo';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { UserPlus, UserCheck, ShieldCheck } from 'lucide-react';

export function SignupPage() {
  const { signup } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Technician',
    clinicianCode: '',
    designation: '',
    department: 'Point-of-Care Testing (POCT)'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        designation: formData.designation,
        department: formData.department,
        ...(formData.role === 'Clinician' ? { clinicianCode: formData.clinicianCode } : {})
      };
      await signup(payload);
      addToast('Account created successfully!', 'success');
      navigate('/dashboard');
    } catch (err) {
      addToast(err.message || 'Registration failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-950 to-teal-950 text-white font-sans">
      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <BrandLogo size="xl" showText={true} />
          <p className="text-xs text-slate-400 max-w-xs mt-1">
            Register new laboratory personnel account
          </p>
        </div>

        {/* Role Selector */}
        <div className="bg-slate-800/80 p-1 rounded-2xl border border-slate-700/80 grid grid-cols-2 gap-1 text-xs">
          <button
            type="button"
            onClick={() => setFormData({ ...formData, role: 'Technician', clinicianCode: '' })}
            className={`py-2 rounded-xl font-semibold transition-all flex items-center justify-center gap-1.5 ${
              formData.role === 'Technician'
                ? 'bg-teal-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" /> Technician
          </button>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, role: 'Clinician' })}
            className={`py-2 rounded-xl font-semibold transition-all flex items-center justify-center gap-1.5 ${
              formData.role === 'Clinician'
                ? 'bg-teal-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Clinician
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Dr. Anaya Deshmukh"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800/90 text-sm text-white focus:ring-2 focus:ring-teal-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="ananya@cura.lab"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800/90 text-sm text-white focus:ring-2 focus:ring-teal-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800/90 text-sm text-white focus:ring-2 focus:ring-teal-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Designation / Role Title</label>
            <input
              type="text"
              value={formData.designation}
              onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              placeholder="e.g. Senior POCT Specialist"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800/90 text-sm text-white focus:ring-2 focus:ring-teal-500 outline-none"
            />
          </div>

          {formData.role === 'Clinician' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-teal-300">Authorization Code *</label>
                <span className="text-[10px] text-slate-400">Required for Clinician review role</span>
              </div>
              <input
                type="password"
                required
                value={formData.clinicianCode}
                onChange={(e) => setFormData({ ...formData, clinicianCode: e.target.value })}
                placeholder="Enter clinician authorization code"
                className="w-full px-3.5 py-2 rounded-xl border border-teal-600/70 bg-slate-800/90 text-sm text-white focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm shadow-lg shadow-teal-600/30 disabled:opacity-50 transition-all flex items-center justify-center gap-2 mt-2"
          >
            <UserPlus className="w-4 h-4" />
            {isSubmitting ? 'Creating Account...' : 'Register Account'}
          </button>
        </form>

        <div className="text-center pt-2">
          <p className="text-xs text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="text-teal-400 hover:underline font-semibold">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
