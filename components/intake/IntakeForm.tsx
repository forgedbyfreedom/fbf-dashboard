'use client'

import { useState } from 'react'

interface IntakeFormProps {
  client: {
    id: string
    first_name: string
    last_name: string
    email: string | null
  }
  token: string
}

type Step = 'personal' | 'health' | 'training' | 'goals' | 'waiver'

const STEPS: { id: Step; label: string }[] = [
  { id: 'personal', label: 'Personal Info' },
  { id: 'health', label: 'Health & Medical' },
  { id: 'training', label: 'Training Background' },
  { id: 'goals', label: 'Goals' },
  { id: 'waiver', label: 'Waiver' },
]

export default function IntakeForm({ client, token }: IntakeFormProps) {
  const [currentStep, setCurrentStep] = useState<Step>('personal')
  const [submitting, setSubmitting] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)

  const [form, setForm] = useState({
    phone: '',
    date_of_birth: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    height_feet: '',
    height_inches: '',
    current_weight_lbs: '',
    goal_weight_lbs: '',
    primary_goals: [] as string[],
    training_experience: '',
    injuries_or_limitations: '',
    medical_conditions: '',
    current_medications: '',
    allergies: '',
    dietary_restrictions: '',
    previous_coaches: '',
    how_did_you_hear: '',
    waiver_accepted: false,
  })

  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep)

  const updateField = (field: string, value: string | boolean | string[]) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const toggleGoal = (goal: string) => {
    setForm(prev => ({
      ...prev,
      primary_goals: prev.primary_goals.includes(goal)
        ? prev.primary_goals.filter(g => g !== goal)
        : [...prev.primary_goals, goal],
    }))
  }

  const autoSave = async () => {
    setSaving(true)
    try {
      const totalInches = (form.height_feet ? parseInt(form.height_feet) * 12 : 0) + (form.height_inches ? parseInt(form.height_inches) : 0)
      await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          phone: form.phone,
          date_of_birth: form.date_of_birth || null,
          emergency_contact_name: form.emergency_contact_name,
          emergency_contact_phone: form.emergency_contact_phone,
          height_inches: totalInches || null,
          current_weight_lbs: form.current_weight_lbs,
          goal_weight_lbs: form.goal_weight_lbs,
          primary_goals: form.primary_goals.join(', '),
          training_experience: form.training_experience,
          injuries_or_limitations: form.injuries_or_limitations,
          medical_conditions: form.medical_conditions,
          current_medications: form.current_medications,
          allergies: form.allergies,
          dietary_restrictions: form.dietary_restrictions,
          previous_coaches: form.previous_coaches,
          how_did_you_hear: form.how_did_you_hear,
          waiver_accepted: false,
        }),
      })
      setLastSaved(new Date().toLocaleTimeString())
    } catch {
      // Silent fail on auto-save
    } finally {
      setSaving(false)
    }
  }

  const goNext = () => {
    const idx = currentStepIndex
    if (idx < STEPS.length - 1) {
      setCurrentStep(STEPS[idx + 1].id)
      autoSave()
      window.scrollTo(0, 0)
    }
  }

  const goBack = () => {
    const idx = currentStepIndex
    if (idx > 0) {
      setCurrentStep(STEPS[idx - 1].id)
      window.scrollTo(0, 0)
    }
  }

  const handleSubmit = async () => {
    if (!form.waiver_accepted) {
      setError('You must accept the waiver to continue.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const totalInches = (form.height_feet ? parseInt(form.height_feet) * 12 : 0) + (form.height_inches ? parseInt(form.height_inches) : 0)

      const res = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          phone: form.phone,
          date_of_birth: form.date_of_birth || null,
          emergency_contact_name: form.emergency_contact_name,
          emergency_contact_phone: form.emergency_contact_phone,
          height_inches: totalInches || null,
          current_weight_lbs: form.current_weight_lbs,
          goal_weight_lbs: form.goal_weight_lbs,
          primary_goals: form.primary_goals.join(', '),
          training_experience: form.training_experience,
          injuries_or_limitations: form.injuries_or_limitations,
          medical_conditions: form.medical_conditions,
          current_medications: form.current_medications,
          allergies: form.allergies,
          dietary_restrictions: form.dietary_restrictions,
          previous_coaches: form.previous_coaches,
          how_did_you_hear: form.how_did_you_hear,
          waiver_accepted: true,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit')
      }

      setCompleted(true)
      window.scrollTo(0, 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit form')
    } finally {
      setSubmitting(false)
    }
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3" style={{ fontFamily: "'Oswald', sans-serif", textTransform: 'uppercase', letterSpacing: '0.02em' }}>
            Welcome to the Team
          </h2>
          <p className="text-[#888] mb-2">
            Your intake form has been submitted successfully, {client.first_name}.
          </p>
          <p className="text-[#555] text-sm">
            Your coach will review your information and reach out to you shortly to get started on your fitness journey.
          </p>
          <div className="mt-8 p-4 bg-[#141414] border border-[#2a2a2a] rounded-xl">
            <p className="text-xs text-[#555] uppercase tracking-wider mb-2" style={{ fontFamily: "'Oswald', sans-serif" }}>Forged by Freedom</p>
            <p className="text-[#888] text-sm">Strength. Discipline. Freedom.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="bg-[#141414] border-b border-[#2a2a2a]">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="text-center mb-4">
            <h1 className="text-2xl font-bold text-white tracking-widest" style={{ fontFamily: "'Oswald', sans-serif", textTransform: 'uppercase' }}>
              Forged by Freedom
            </h1>
            <p className="text-xs text-[#D4A017] font-semibold tracking-[0.3em] uppercase mt-1">Client Intake Form</p>
          </div>
          <p className="text-sm text-[#888] text-center">
            Welcome, <span className="text-white font-medium">{client.first_name} {client.last_name}</span>. Please complete the form below to get started.
          </p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((step, i) => (
            <button
              key={step.id}
              onClick={() => { setCurrentStep(step.id); window.scrollTo(0, 0) }}
              className={`flex-1 text-center text-xs font-medium py-2 transition-colors ${
                i === currentStepIndex
                  ? 'text-[#FF6A00]'
                  : i < currentStepIndex
                  ? 'text-green-500'
                  : 'text-[#555]'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-1 text-sm font-bold ${
                i === currentStepIndex
                  ? 'bg-[#FF6A00] text-white'
                  : i < currentStepIndex
                  ? 'bg-green-500/20 text-green-500 border border-green-500/50'
                  : 'bg-[#1a1a1a] text-[#555] border border-[#2a2a2a]'
              }`}>
                {i < currentStepIndex ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span className="hidden sm:inline">{step.label}</span>
            </button>
          ))}
        </div>
        <div className="w-full bg-[#1a1a1a] rounded-full h-1.5">
          <div
            className="bg-[#FF6A00] h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${((currentStepIndex + 1) / STEPS.length) * 100}%` }}
          />
        </div>
        {lastSaved && (
          <p className="text-xs text-[#555] text-right mt-1">
            {saving ? 'Saving...' : `Auto-saved at ${lastSaved}`}
          </p>
        )}
      </div>

      {/* Form Content */}
      <div className="max-w-2xl mx-auto px-4 pb-32">
        {/* Personal Info */}
        {currentStep === 'personal' && (
          <div className="space-y-4">
            <SectionHeader title="Personal Information" description="Basic contact and personal details." />

            <FormField label="Phone Number" required>
              <input
                type="tel"
                value={form.phone}
                onChange={e => updateField('phone', e.target.value)}
                placeholder="(555) 123-4567"
                className="form-input"
              />
            </FormField>

            <FormField label="Date of Birth">
              <input
                type="date"
                value={form.date_of_birth}
                onChange={e => updateField('date_of_birth', e.target.value)}
                className="form-input"
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Height (feet)">
                <select
                  value={form.height_feet}
                  onChange={e => updateField('height_feet', e.target.value)}
                  className="form-input"
                >
                  <option value="">Select</option>
                  {[4, 5, 6, 7].map(f => (
                    <option key={f} value={f}>{f} ft</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Height (inches)">
                <select
                  value={form.height_inches}
                  onChange={e => updateField('height_inches', e.target.value)}
                  className="form-input"
                >
                  <option value="">Select</option>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i} value={i}>{i} in</option>
                  ))}
                </select>
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Current Weight (lbs)">
                <input
                  type="number"
                  value={form.current_weight_lbs}
                  onChange={e => updateField('current_weight_lbs', e.target.value)}
                  placeholder="185"
                  className="form-input"
                />
              </FormField>
              <FormField label="Goal Weight (lbs)">
                <input
                  type="number"
                  value={form.goal_weight_lbs}
                  onChange={e => updateField('goal_weight_lbs', e.target.value)}
                  placeholder="175"
                  className="form-input"
                />
              </FormField>
            </div>

            <div className="pt-4 border-t border-[#2a2a2a]">
              <h3 className="text-sm font-semibold text-[#888] mb-3" style={{ fontFamily: "'Oswald', sans-serif", textTransform: 'uppercase' }}>Emergency Contact</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Contact Name">
                  <input
                    type="text"
                    value={form.emergency_contact_name}
                    onChange={e => updateField('emergency_contact_name', e.target.value)}
                    placeholder="Jane Doe"
                    className="form-input"
                  />
                </FormField>
                <FormField label="Contact Phone">
                  <input
                    type="tel"
                    value={form.emergency_contact_phone}
                    onChange={e => updateField('emergency_contact_phone', e.target.value)}
                    placeholder="(555) 987-6543"
                    className="form-input"
                  />
                </FormField>
              </div>
            </div>
          </div>
        )}

        {/* Health & Medical */}
        {currentStep === 'health' && (
          <div className="space-y-4">
            <SectionHeader title="Health & Medical" description="Help us understand your health background so we can coach you safely." />

            <FormField label="Medical Conditions" hint="e.g., diabetes, high blood pressure, thyroid issues">
              <textarea
                value={form.medical_conditions}
                onChange={e => updateField('medical_conditions', e.target.value)}
                placeholder="List any current medical conditions, or type 'None'"
                rows={3}
                className="form-input"
              />
            </FormField>

            <FormField label="Current Medications" hint="Include dosage if known">
              <textarea
                value={form.current_medications}
                onChange={e => updateField('current_medications', e.target.value)}
                placeholder="List any medications you are currently taking, or type 'None'"
                rows={3}
                className="form-input"
              />
            </FormField>

            <FormField label="Injuries or Physical Limitations" hint="Past or present injuries that may affect training">
              <textarea
                value={form.injuries_or_limitations}
                onChange={e => updateField('injuries_or_limitations', e.target.value)}
                placeholder="e.g., torn ACL (2022), lower back pain, shoulder impingement"
                rows={3}
                className="form-input"
              />
            </FormField>

            <FormField label="Allergies">
              <textarea
                value={form.allergies}
                onChange={e => updateField('allergies', e.target.value)}
                placeholder="Food allergies, medication allergies, or type 'None'"
                rows={2}
                className="form-input"
              />
            </FormField>

            <FormField label="Dietary Restrictions">
              <textarea
                value={form.dietary_restrictions}
                onChange={e => updateField('dietary_restrictions', e.target.value)}
                placeholder="e.g., vegetarian, gluten-free, lactose intolerant, or type 'None'"
                rows={2}
                className="form-input"
              />
            </FormField>
          </div>
        )}

        {/* Training Background */}
        {currentStep === 'training' && (
          <div className="space-y-4">
            <SectionHeader title="Training Background" description="Tell us about your fitness experience." />

            <FormField label="Training Experience Level" required>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { value: 'beginner', label: 'Beginner', desc: 'New to structured training' },
                  { value: 'intermediate', label: 'Intermediate', desc: '1-3 years consistent' },
                  { value: 'advanced', label: 'Advanced', desc: '3+ years consistent' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateField('training_experience', opt.value)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      form.training_experience === opt.value
                        ? 'border-[#FF6A00] bg-[#FF6A00]/10'
                        : 'border-[#2a2a2a] bg-[#141414] hover:border-[#333]'
                    }`}
                  >
                    <p className={`text-sm font-semibold ${form.training_experience === opt.value ? 'text-[#FF6A00]' : 'text-white'}`}>
                      {opt.label}
                    </p>
                    <p className="text-xs text-[#888] mt-1">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </FormField>

            <FormField label="Previous Coaches or Programs" hint="Any past coaching, personal training, or programs">
              <textarea
                value={form.previous_coaches}
                onChange={e => updateField('previous_coaches', e.target.value)}
                placeholder="e.g., Had a personal trainer for 6 months in 2024, followed a bodybuilding program online"
                rows={3}
                className="form-input"
              />
            </FormField>

            <FormField label="How Did You Hear About Us?">
              <select
                value={form.how_did_you_hear}
                onChange={e => updateField('how_did_you_hear', e.target.value)}
                className="form-input"
              >
                <option value="">Select one</option>
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
                <option value="tiktok">TikTok</option>
                <option value="youtube">YouTube</option>
                <option value="referral">Friend / Referral</option>
                <option value="google">Google Search</option>
                <option value="gym">At the Gym</option>
                <option value="other">Other</option>
              </select>
            </FormField>
          </div>
        )}

        {/* Goals */}
        {currentStep === 'goals' && (
          <div className="space-y-4">
            <SectionHeader title="Your Goals" description="What are you looking to achieve? Select all that apply." />

            <FormField label="Primary Goals" required>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  'Fat Loss',
                  'Muscle Gain',
                  'Strength',
                  'General Health',
                  'Athletic Performance',
                  'Body Recomposition',
                  'Contest Prep',
                  'Improve Energy',
                  'Better Sleep',
                  'Stress Management',
                  'Injury Recovery',
                  'Flexibility',
                ].map(goal => (
                  <button
                    key={goal}
                    type="button"
                    onClick={() => toggleGoal(goal)}
                    className={`p-3 rounded-xl border text-sm font-medium text-center transition-all ${
                      form.primary_goals.includes(goal)
                        ? 'border-[#FF6A00] bg-[#FF6A00]/10 text-[#FF6A00]'
                        : 'border-[#2a2a2a] bg-[#141414] text-[#888] hover:border-[#333] hover:text-white'
                    }`}
                  >
                    {goal}
                  </button>
                ))}
              </div>
            </FormField>
          </div>
        )}

        {/* Waiver */}
        {currentStep === 'waiver' && (
          <div className="space-y-4">
            <SectionHeader title="Liability Waiver & Informed Consent" description="Please read carefully and accept to complete your intake." />

            <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-4 sm:p-6 max-h-96 overflow-y-auto text-sm text-[#ccc] leading-relaxed space-y-4">
              <p className="font-semibold text-white">ASSUMPTION OF RISK, WAIVER OF LIABILITY, AND INFORMED CONSENT</p>

              <p>
                I, <span className="text-[#FF6A00] font-medium">{client.first_name} {client.last_name}</span>, acknowledge
                that I am voluntarily participating in fitness coaching, training programming, and/or nutrition guidance
                services provided by Forged by Freedom (&ldquo;the Company&rdquo;).
              </p>

              <p className="font-semibold text-white mt-4">ASSUMPTION OF RISK</p>
              <p>
                I understand that physical exercise and fitness training involve inherent risks, including but not limited
                to: physical injury, muscle soreness, sprains, strains, fractures, heart attack, stroke, or even death.
                I voluntarily assume all risks associated with my participation in any fitness program, exercise routine,
                or nutritional plan recommended or prescribed by Forged by Freedom.
              </p>

              <p className="font-semibold text-white mt-4">WAIVER OF LIABILITY</p>
              <p>
                In consideration of being permitted to participate in coaching services, I hereby waive, release, and
                discharge Forged by Freedom, its owners, coaches, employees, agents, and affiliates from any and all
                liability, claims, demands, and causes of action arising from or related to any injury, illness, damage,
                or loss that I may sustain as a result of my participation in any fitness or nutrition program.
              </p>

              <p className="font-semibold text-white mt-4">MEDICAL DISCLAIMER</p>
              <p>
                I understand that Forged by Freedom coaches are not licensed medical professionals, registered dietitians,
                or physical therapists unless otherwise stated. The coaching services provided are for general fitness and
                wellness purposes only and are not intended to diagnose, treat, cure, or prevent any disease or medical
                condition. I have been advised to consult with my physician before beginning any exercise or nutrition
                program, and I take full responsibility for doing so.
              </p>

              <p className="font-semibold text-white mt-4">NUTRITION GUIDANCE</p>
              <p>
                I acknowledge that any meal plans, macronutrient targets, supplement recommendations, or dietary guidance
                provided are general recommendations based on my stated goals and are not medical nutrition therapy. I am
                responsible for informing my coach of any food allergies, intolerances, or dietary restrictions.
              </p>

              <p className="font-semibold text-white mt-4">SUPPLEMENT & PED ACKNOWLEDGMENT</p>
              <p>
                If performance-enhancing drugs (PEDs), peptides, or supplements are discussed as part of my coaching
                relationship, I understand that my coach is providing information based on experience and general knowledge,
                not medical advice. Any decision to use such substances is made entirely at my own risk and discretion.
                I will consult with a licensed medical professional before using any such substances.
              </p>

              <p className="font-semibold text-white mt-4">PHOTO & DATA CONSENT</p>
              <p>
                I consent to the collection and storage of progress photos, body measurements, and health-related data
                submitted through the coaching platform. This data will be used solely for tracking my progress and will
                not be shared publicly without my explicit written consent.
              </p>

              <p className="font-semibold text-white mt-4">CANCELLATION & REFUND POLICY</p>
              <p>
                I understand that coaching services are provided on a month-to-month basis unless otherwise agreed upon.
                Cancellation requests must be submitted at least 7 days before the next billing cycle. Refunds are not
                provided for partial months of service.
              </p>

              <p className="font-semibold text-white mt-4">ACKNOWLEDGMENT</p>
              <p>
                By checking the box below and submitting this form, I acknowledge that I have read, understood, and agree
                to the terms outlined above. I confirm that all information provided in this intake form is accurate and
                complete to the best of my knowledge. I understand that withholding relevant health information may affect
                the safety and effectiveness of my coaching program.
              </p>
            </div>

            <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-4 sm:p-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.waiver_accepted}
                  onChange={e => updateField('waiver_accepted', e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-[#2a2a2a] bg-[#0a0a0a] accent-[#FF6A00] cursor-pointer"
                />
                <span className="text-sm text-[#ccc]">
                  I, <span className="text-white font-medium">{client.first_name} {client.last_name}</span>, have read
                  and agree to the Assumption of Risk, Waiver of Liability, and Informed Consent above. I confirm that
                  all information provided is accurate and complete.
                </span>
              </label>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#141414] border-t border-[#2a2a2a] p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={goBack}
            disabled={currentStepIndex === 0}
            className={`px-6 py-3 rounded-lg text-sm font-medium transition-colors ${
              currentStepIndex === 0
                ? 'text-[#333] cursor-not-allowed'
                : 'text-[#888] hover:text-white bg-[#0a0a0a] border border-[#2a2a2a] hover:border-[#333]'
            }`}
          >
            Back
          </button>

          <span className="text-xs text-[#555]">
            {currentStepIndex + 1} of {STEPS.length}
          </span>

          {currentStep === 'waiver' ? (
            <button
              onClick={handleSubmit}
              disabled={submitting || !form.waiver_accepted}
              className={`px-8 py-3 rounded-lg text-sm font-bold transition-colors ${
                form.waiver_accepted
                  ? 'bg-[#FF6A00] hover:bg-[#FF8533] text-white'
                  : 'bg-[#333] text-[#555] cursor-not-allowed'
              }`}
            >
              {submitting ? 'Submitting...' : 'Submit Intake Form'}
            </button>
          ) : (
            <button
              onClick={goNext}
              className="px-8 py-3 rounded-lg text-sm font-bold bg-[#FF6A00] hover:bg-[#FF8533] text-white transition-colors"
            >
              Continue
            </button>
          )}
        </div>
      </div>

      {/* Inline styles for form inputs */}
      <style jsx global>{`
        .form-input {
          width: 100%;
          padding: 12px 16px;
          background: #0a0a0a;
          border: 1px solid #2a2a2a;
          border-radius: 12px;
          color: white;
          font-size: 14px;
          transition: border-color 0.2s;
        }
        .form-input::placeholder {
          color: #555;
        }
        .form-input:focus {
          outline: none;
          border-color: #FF6A00;
          box-shadow: 0 0 0 2px rgba(255, 106, 0, 0.15);
        }
        select.form-input {
          appearance: none;
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23555' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
          background-position: right 12px center;
          background-repeat: no-repeat;
          background-size: 20px;
        }
        textarea.form-input {
          resize: vertical;
          min-height: 80px;
        }
        select.form-input option {
          background: #0a0a0a;
          color: white;
        }
      `}</style>
    </div>
  )
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold text-white" style={{ fontFamily: "'Oswald', sans-serif", textTransform: 'uppercase', letterSpacing: '0.02em' }}>
        {title}
      </h2>
      <p className="text-sm text-[#888] mt-1">{description}</p>
    </div>
  )
}

function FormField({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm text-[#888] mb-1.5">
        {label}
        {required && <span className="text-[#FF6A00] ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-[#555] mt-1">{hint}</p>}
    </div>
  )
}
