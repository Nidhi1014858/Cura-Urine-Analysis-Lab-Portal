import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mockApi } from '../services/mockApi';
import { StatusBadge, PanelBadge } from '../components/common/Badge';
import { formatDate, formatShortDate } from '../utils/formatters';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, 
  RotateCcw, 
  FlaskConical, 
  TrendingUp, 
  Building2, 
  User, 
  Phone, 
  Mail, 
  MapPin,
  AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

export function PatientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isTechnician } = useAuth();

  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAnalyte, setSelectedAnalyte] = useState('protein');

  const loadPatientData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await mockApi.getPatientById(id);
      setPatient(data);
    } catch (err) {
      console.error('Failed to load patient detail', err);
      setError(err?.message || 'Failed to load patient profile.');
      setPatient(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadPatientData();
    }
  }, [id]);

  if (loading) return <LoadingSpinner text="Loading patient profile & test history..." />;

  if (error && !patient) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white dark:bg-slate-900 rounded-3xl border border-rose-200 dark:border-rose-900 shadow-sm text-center space-y-4 animate-fade-in">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Failed to Load Patient
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
          {error}
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => navigate('/patients')}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            ← Back to Patient List
          </button>
          <button
            onClick={loadPatientData}
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-md shadow-teal-600/20 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-4 animate-fade-in">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
          <User className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Patient Not Found
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          The requested patient record could not be found or may have been removed.
        </p>
        <button
          onClick={() => navigate('/patients')}
          className="mt-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-md shadow-teal-600/20 transition-colors"
        >
          ← Return to Patient Registry
        </button>
      </div>
    );
  }

  const tests = Array.isArray(patient.tests) ? patient.tests : [];

  // Build trend chart data across historical tests
  const chartData = tests.map((t, idx) => {
    const entry = {
      date: formatShortDate(t.submittedAt) || `Test #${idx + 1}`,
      testCode: t.testCode
    };

    t.analytes?.forEach((a) => {
      entry[a.id] = a.numeric !== undefined ? a.numeric : 0;
    });

    return entry;
  });

  const handleRetestPatient = () => {
    navigate('/new-test', {
      state: { prefilledPatientId: patient.id }
    });
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={() => navigate('/patients')}
          className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Patients List
        </button>

        {/* Re-test Shortcut Button (Technicians only) */}
        {isTechnician && (
          <button
            onClick={handleRetestPatient}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/20 transition-all self-start sm:self-auto"
          >
            <RotateCcw className="w-4 h-4" /> Re-Test This Patient
          </button>
        )}
      </div>

      {/* Patient Profile Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold text-lg border border-teal-500/30">
              {patient.name ? patient.name.charAt(0).toUpperCase() : 'P'}
            </div>
            <div>
              <h1 className="font-display font-extrabold text-xl text-slate-900 dark:text-white">
                {patient.name}
              </h1>
              <span className="text-xs font-mono font-bold text-teal-600 dark:text-teal-400">
                Medical ID: {patient.patientId}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
              {patient.gender || 'Other'}, {patient.age} Yrs
            </span>
            {patient.bloodGroup && (
              <span className="px-3 py-1 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 font-bold">
                Blood: {patient.bloodGroup}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono text-slate-600 dark:text-slate-400 pt-1">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
            <span>{patient.phone || 'No phone recorded'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
            <span className="truncate">{patient.email || 'No email recorded'}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
            <span className="truncate">{patient.address || 'No address recorded'}</span>
          </div>
        </div>
      </div>

      {/* Trend Analysis Section (Recharts) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              Analyte Longitudinal Trend Chart
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tracking concentration variation over historical test dates ({tests.length} tests recorded)
            </p>
          </div>

          {/* Analyte Switcher */}
          <select
            value={selectedAnalyte}
            onChange={(e) => setSelectedAnalyte(e.target.value)}
            className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="protein">Protein (mg/dL)</option>
            <option value="glucose">Glucose (mg/dL)</option>
            <option value="microalbumin">Microalbumin (mg/L)</option>
            <option value="creatinine">Creatinine (mg/dL)</option>
            <option value="ph">pH level</option>
            <option value="leucocytes">Leucocytes (cells/µL)</option>
          </select>
        </div>

        {/* Recharts Container */}
        <div className="h-64 w-full pt-2">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey={selectedAnalyte}
                  stroke="#0d9488"
                  strokeWidth={3}
                  activeDot={{ r: 8 }}
                  name={`${selectedAnalyte.toUpperCase()} Concentration`}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              No historical data points available yet for trend analysis.
            </div>
          )}
        </div>
      </div>

      {/* Patient's Grouped Tests Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              Historical Test Records ({tests.length})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              All point-of-care tests conducted for {patient.name}
            </p>
          </div>

          {isTechnician && (
            <button
              onClick={handleRetestPatient}
              className="flex items-center gap-1.5 text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Conduct New Test
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          {tests.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 font-mono">
              No tests recorded for this patient yet.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-mono uppercase text-slate-400 bg-slate-50/50 dark:bg-slate-900/50">
                  <th className="py-3 px-4">Test Code</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Panel Type</th>
                  <th className="py-3 px-4">Strip batch</th>
                  <th className="py-3 px-4">Report Destination</th>
                  <th className="py-3 px-4">Finding Flag</th>
                  <th className="py-3 px-4">Review Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs font-mono">
                {tests.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => navigate(`/reports/${t.id}`)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4 font-bold text-teal-600 dark:text-teal-400">
                      {t.testCode}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {formatDate(t.submittedAt)}
                    </td>
                    <td className="py-3.5 px-4">
                      <PanelBadge type={t.panelType} />
                    </td>
                    <td className="py-3.5 px-4 text-[10px] text-slate-500">
                      <strong className="text-slate-700 dark:text-slate-300">
                        {t.stripBatch || 'Not recorded'}
                      </strong>
                      <br />
                      Mfg {t.manufactureDate || '—'} · Exp {t.expiryDate || '—'}
                    </td>
                    <td className="py-3.5 px-4 font-sans text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[160px]">{t.reportDestination}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={t.overallStatus} />
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={t.clinicianReview?.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/reports/${t.id}`);
                        }}
                        className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950 text-slate-700 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-300 font-semibold transition-colors"
                      >
                        View Report
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
