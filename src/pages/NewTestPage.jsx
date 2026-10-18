import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { StepPatientDestination } from '../components/wizard/StepPatientDestination';
import { StepStripSelection } from '../components/wizard/StepStripSelection';
import { StepPadReading } from '../components/wizard/StepPadReading';
import { StepReviewSubmit } from '../components/wizard/StepReviewSubmit';
import { mockApi } from '../services/mockApi';

export function NewTestPage() {
  const location = useLocation();
  const prefilledPatientId = location.state?.prefilledPatientId;

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    patientId: '',
    patientName: '',
    patientCode: '',
    reportDestination: 'Metropolis Healthcare',
    panelType: '10-panel',
    inventoryId: '',
    stripBrand: '',
    stripBatch: '',
    manufactureDate: '',
    expiryDate: '',
    stripImageUrl: '',
    rgbReadings: {},
    technicianNotes: ''
  });

  // Handle prefilled patient shortcut if triggered from Patient detail page
  useEffect(() => {
    if (prefilledPatientId) {
      async function loadPrefilledPatient() {
        try {
          const patient = await mockApi.getPatientById(prefilledPatientId);
          if (patient) {
            setFormData(prev => ({
              ...prev,
              patientId: patient.id,
              patientName: patient.name,
              patientCode: patient.patientId
            }));
          }
        } catch (e) {
          console.error(e);
        }
      }
      loadPrefilledPatient();
    }
  }, [prefilledPatientId]);

  const updateFormData = useCallback((fields) => {
    setFormData(prev => ({ ...prev, ...fields }));
  }, []);

  const steps = [
    { num: 1, title: 'Patient & Destination' },
    { num: 2, title: 'Panel & Brand' },
    { num: 3, title: 'RGB Values' },
    { num: 4, title: 'Prediction & Submit' }
  ];

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Step Indicator Header */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between">
          {steps.map((s) => (
            <div key={s.num} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs font-bold transition-all ${
                  step === s.num
                    ? 'bg-teal-600 text-white ring-4 ring-teal-500/20'
                    : step > s.num
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}
              >
                {step > s.num ? '✓' : s.num}
              </div>
              <span className={`text-xs font-semibold hidden sm:inline ${
                step === s.num ? 'text-slate-900 dark:text-white' : 'text-slate-400'
              }`}>
                {s.title}
              </span>
              {s.num < 4 && <div className="w-8 sm:w-12 h-0.5 bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>}
            </div>
          ))}
        </div>
      </div>

      {/* Step View */}
      {step === 1 && (
        <StepPatientDestination
          formData={formData}
          updateFormData={updateFormData}
          onNext={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <StepStripSelection
          formData={formData}
          updateFormData={updateFormData}
          onNext={() => setStep(3)}
          onPrev={() => setStep(1)}
        />
      )}

      {step === 3 && (
        <StepPadReading
          formData={formData}
          updateFormData={updateFormData}
          onNext={() => setStep(4)}
          onPrev={() => setStep(2)}
        />
      )}

      {step === 4 && (
        <StepReviewSubmit
          formData={formData}
          updateFormData={updateFormData}
          onPrev={() => setStep(3)}
          onGoToStep={setStep}
        />
      )}
    </div>
  );
}
