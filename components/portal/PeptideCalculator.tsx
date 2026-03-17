'use client'

import { useState } from 'react'

interface PeptideReference {
  name: string
  typicalDoseRange: string
  typicalDoseMg: number
  frequency: string
  notes: string
}

const COMMON_PEPTIDES: PeptideReference[] = [
  { name: 'Retatrutide', typicalDoseRange: '2-5 mg', typicalDoseMg: 2.5, frequency: 'Once weekly', notes: 'Titrate up over 4 weeks. Start low.' },
  { name: 'BPC-157', typicalDoseRange: '0.25-0.5 mg', typicalDoseMg: 0.3, frequency: '1-2x daily', notes: 'Inject near injury site for best results.' },
  { name: 'TB-500', typicalDoseRange: '2.5-5 mg', typicalDoseMg: 5, frequency: '2x/week (loading), 1x/week (maintenance)', notes: 'Loading phase for first 4 weeks.' },
  { name: 'Ipamorelin', typicalDoseRange: '0.2-0.3 mg', typicalDoseMg: 0.2, frequency: '1-3x daily', notes: 'Best on empty stomach before bed.' },
  { name: 'CJC-1295 (DAC)', typicalDoseRange: '1-2 mg', typicalDoseMg: 1, frequency: '1-2x weekly', notes: 'Long half-life supports weekly dosing.' },
  { name: 'Tesamorelin', typicalDoseRange: '1-2 mg', typicalDoseMg: 2, frequency: 'Daily', notes: 'FDA-approved for visceral fat reduction.' },
  { name: 'GHK-Cu', typicalDoseRange: '1-2 mg', typicalDoseMg: 1, frequency: 'Daily', notes: 'Can also be used topically.' },
  { name: 'MOTS-C', typicalDoseRange: '5-10 mg', typicalDoseMg: 5, frequency: '3-5x per week', notes: 'Best in morning or pre-workout.' },
  { name: 'PT-141', typicalDoseRange: '1-2 mg', typicalDoseMg: 1.5, frequency: 'As needed, 45 min before activity', notes: 'Max 8 doses/month. May cause nausea.' },
  { name: 'SS-31 (Elamipretide)', typicalDoseRange: '5-20 mg', typicalDoseMg: 10, frequency: 'Daily', notes: 'Mitochondrial support. No fasting needed.' },
  { name: 'NAD+', typicalDoseRange: '100-250 mg', typicalDoseMg: 100, frequency: 'Daily or 2-3x/week', notes: 'May sting at injection site — normal.' },
  { name: 'Cagrilintide', typicalDoseRange: '0.25-2.4 mg', typicalDoseMg: 1, frequency: 'Once weekly', notes: 'Titrate up every 4 weeks.' },
  { name: 'SLUPP332', typicalDoseRange: '5-10 mg', typicalDoseMg: 5, frequency: 'Daily (morning)', notes: 'Research compound. Circadian rhythm effects.' },
]

/* ───────────────────────────────────────────
   Syringe Scale Visual
   ─────────────────────────────────────────── */
function SyringeScale({ concentration, fillUnits = 0 }: { concentration: number; fillUnits?: number }) {
  const markings = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
  const fillPct = Math.min(Math.max((fillUnits / 100) * 100, 0), 100)
  const fillMg = (fillUnits / 100) * concentration

  return (
    <div className="mt-4">
      <h4 className="text-sm font-bold text-white mb-3">Syringe Scale</h4>
      <div className="relative bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
        <div className="relative mx-auto" style={{ maxWidth: 420 }}>
          <div className="relative mx-10">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-10 w-10 h-3 bg-[#3a3a3a] border border-[#4a4a4a] rounded-l-md" />
            <div className="relative h-10 bg-[#1e1e1e] border-2 border-[#444] rounded-full overflow-hidden">
              {fillPct > 0 && (
                <div
                  className="absolute top-0 bottom-0 left-0 rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${fillPct}%`,
                    background: 'linear-gradient(180deg, #FF8533 0%, #FF6A00 40%, #CC5500 100%)',
                    boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.2), inset 0 -2px 4px rgba(0,0,0,0.3)',
                  }}
                />
              )}
              {fillPct > 0 && fillPct < 100 && (
                <div className="absolute top-0 bottom-0 w-0.5 bg-white/60 z-10" style={{ left: `${fillPct}%` }} />
              )}
              {fillPct > 0 && (
                <div
                  className="absolute top-1/2 -translate-y-1/2 z-20 px-2 py-0.5 rounded text-xs font-black"
                  style={{
                    left: `${Math.max(fillPct / 2, 8)}%`,
                    transform: 'translate(-50%, -50%)',
                    color: fillPct > 15 ? '#000' : '#FF6A00',
                  }}
                >
                  {fillMg.toFixed(1)}mg ({fillUnits.toFixed(0)}u)
                </div>
              )}
            </div>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1">
              <div className="w-10 h-0.5 bg-gradient-to-r from-gray-400 to-gray-300" />
            </div>
          </div>
          <div className="relative mt-1 mx-10">
            {markings.map((units) => {
              const pct = (units / 100) * 100
              const mg = (units / 100) * concentration
              const isAtFill = Math.abs(units - fillUnits) < 3
              return (
                <div key={units} className="absolute flex flex-col items-center" style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}>
                  <div className={`w-px h-3 ${isAtFill ? 'bg-[#FF6A00]' : 'bg-gray-600'}`} />
                  <span className={`text-[10px] mt-0.5 whitespace-nowrap font-semibold ${isAtFill ? 'text-[#FF6A00]' : 'text-gray-500'}`}>{units}</span>
                  <span className={`text-[10px] whitespace-nowrap font-bold ${isAtFill ? 'text-white' : 'text-gray-600'}`}>{mg.toFixed(1)}mg</span>
                </div>
              )
            })}
          </div>
        </div>
        <div className="h-12" />
        {fillUnits > 0 && (
          <div className="text-center mt-2">
            <span className="text-[#FF6A00] font-bold text-lg">{fillMg.toFixed(2)}mg</span>
            <span className="text-gray-500 text-sm ml-2">= {fillUnits.toFixed(1)} units on syringe</span>
          </div>
        )}
      </div>
    </div>
  )
}

/* ───────────────────────────────────────────
   Reconstitution Instructions Card
   ─────────────────────────────────────────── */
function ReconstitutionInstructions({ concentration }: { concentration: number }) {
  const ratio = concentration > 0 ? concentration : 10
  const syringeReadings = [
    { units: 10, mg: (10 / 100) * ratio },
    { units: 15, mg: (15 / 100) * ratio },
    { units: 20, mg: (20 / 100) * ratio },
    { units: 24, mg: (24 / 100) * ratio },
    { units: 25, mg: (25 / 100) * ratio },
    { units: 30, mg: (30 / 100) * ratio },
    { units: 50, mg: (50 / 100) * ratio },
    { units: 100, mg: (100 / 100) * ratio },
  ]

  return (
    <div className="bg-[#0f1a0f] border border-[#22c55e]/30 rounded-lg p-5">
      <div className="flex items-center gap-2 mb-4">
        <svg className="w-5 h-5 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h4 className="text-[#22c55e] font-bold text-sm tracking-wide uppercase">
          Recommended Reconstitution — 1mL per 10mg (10:1 Ratio)
        </h4>
      </div>

      <ol className="space-y-2 text-sm text-gray-300 mb-5">
        <li className="flex gap-2"><span className="text-[#22c55e] font-bold min-w-[24px]">1.</span> Remove flip-off cap from peptide vial</li>
        <li className="flex gap-2"><span className="text-[#22c55e] font-bold min-w-[24px]">2.</span> Wipe rubber stopper with alcohol swab</li>
        <li className="flex gap-2"><span className="text-[#22c55e] font-bold min-w-[24px]">3.</span> Draw 1mL (100 units) of bacteriostatic water into insulin syringe</li>
        <li className="flex gap-2"><span className="text-[#22c55e] font-bold min-w-[24px]">4.</span> Insert needle into vial at an angle, let water run down the side (do NOT spray directly onto powder)</li>
        <li className="flex gap-2"><span className="text-[#22c55e] font-bold min-w-[24px]">5.</span> Gently swirl vial — do NOT shake</li>
        <li className="flex gap-2"><span className="text-[#22c55e] font-bold min-w-[24px]">6.</span> Allow to fully dissolve (1-2 minutes)</li>
        <li className="flex gap-2"><span className="text-[#22c55e] font-bold min-w-[24px]">7.</span> Store reconstituted peptide in refrigerator (36-46°F / 2-8°C)</li>
        <li className="flex gap-2"><span className="text-[#22c55e] font-bold min-w-[24px]">8.</span> Use within 30 days of reconstitution</li>
      </ol>

      <div className="border-t border-[#22c55e]/20 pt-4">
        <h5 className="text-[#22c55e] font-bold text-xs tracking-wide uppercase mb-3">
          Reading Your Syringe (at {ratio.toFixed(0)}mg/mL concentration)
        </h5>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {syringeReadings.map((r) => (
            <div key={r.units} className="bg-[#141414] border border-[#2a2a2a] rounded px-3 py-2 text-center">
              <span className="text-gray-400 text-xs">{r.units} units</span>
              <span className="text-white font-bold text-sm block">{r.mg.toFixed(1)} mg</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ───────────────────────────────────────────
   Main Client Peptide Calculator
   ─────────────────────────────────────────── */
export default function PeptideCalculator() {
  const [peptideMg, setPeptideMg] = useState(10)
  const [waterMl, setWaterMl] = useState(1)
  const [desiredDose, setDesiredDose] = useState(1)
  const [selectedPeptide, setSelectedPeptide] = useState('')

  const concentration = waterMl > 0 ? peptideMg / waterMl : 0
  const unitsToDraw = concentration > 0 ? (desiredDose / concentration) * 100 : 0
  const mlToDraw = concentration > 0 ? desiredDose / concentration : 0

  const selectedRef = COMMON_PEPTIDES.find((p) => p.name === selectedPeptide)

  const handlePeptideSelect = (name: string) => {
    setSelectedPeptide(name)
    const ref = COMMON_PEPTIDES.find((p) => p.name === name)
    if (ref) {
      setDesiredDose(ref.typicalDoseMg)
    }
  }

  return (
    <div>
      {/* Disclaimer */}
      <div className="bg-[#1a1a0f] border border-yellow-600/30 rounded-lg px-4 py-3 mb-6">
        <p className="text-yellow-200/80 text-sm">
          This calculator is for educational purposes only. Always follow your coach&apos;s specific dosing instructions.
        </p>
      </div>

      {/* Peptide Quick Select */}
      <div className="mb-6">
        <label className="block text-sm text-gray-400 mb-2">Quick Select — Common Peptides</label>
        <select
          value={selectedPeptide}
          onChange={(e) => handlePeptideSelect(e.target.value)}
          className="w-full max-w-md px-4 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-[#FF6A00] transition-colors appearance-none"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
        >
          <option value="">Select a peptide for reference...</option>
          {COMMON_PEPTIDES.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name} — {p.typicalDoseRange}
            </option>
          ))}
        </select>
      </div>

      {/* Selected Peptide Reference Card */}
      {selectedRef && (
        <div className="bg-[#141414] border border-[#FF6A00]/30 rounded-lg p-4 mb-6">
          <h4 className="text-[#FF6A00] font-bold text-sm mb-2">{selectedRef.name} — Reference Info</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <span className="text-gray-500">Typical Dose:</span>
              <span className="text-white ml-2 font-medium">{selectedRef.typicalDoseRange}</span>
            </div>
            <div>
              <span className="text-gray-500">Frequency:</span>
              <span className="text-white ml-2 font-medium">{selectedRef.frequency}</span>
            </div>
            <div>
              <span className="text-gray-500">Note:</span>
              <span className="text-gray-300 ml-2">{selectedRef.notes}</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Reconstitution Calculator */}
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-lg p-5">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-[#FF6A00]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            Reconstitution Calculator
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Peptide Amount in Vial (mg)</label>
              <input
                type="number"
                value={peptideMg}
                onChange={(e) => setPeptideMg(Number(e.target.value) || 0)}
                min={0}
                step={1}
                className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-[#FF6A00] transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Bacteriostatic Water to Add (mL)</label>
              <input
                type="number"
                value={waterMl}
                onChange={(e) => setWaterMl(Number(e.target.value) || 0)}
                min={0}
                step={0.5}
                className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-[#FF6A00] transition-colors"
              />
            </div>

            <div className="bg-[#FF6A00]/10 border border-[#FF6A00]/30 rounded-lg p-4">
              <div className="text-sm text-gray-400">Concentration</div>
              <div className="text-3xl font-black text-[#FF6A00]">
                {concentration.toFixed(2)} <span className="text-lg">mg/mL</span>
              </div>
              {concentration > 0 && (
                <p className="text-xs text-gray-400 mt-2">
                  At {waterMl}mL per {peptideMg}mg: 10 units on syringe = {(10 / 100 * concentration).toFixed(2)}mg, 20 units = {(20 / 100 * concentration).toFixed(2)}mg, etc.
                </p>
              )}
            </div>
          </div>

          <SyringeScale concentration={concentration} fillUnits={unitsToDraw} />
        </div>

        {/* Dosing Calculator */}
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-lg p-5">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-[#FF6A00]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Dosing Calculator
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Desired Dose (mg)</label>
              <input
                type="number"
                value={desiredDose}
                onChange={(e) => setDesiredDose(Number(e.target.value) || 0)}
                min={0}
                step={0.1}
                className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-[#FF6A00] transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Concentration (mg/mL) — auto-filled from reconstitution</label>
              <input
                type="number"
                value={concentration}
                readOnly
                className="w-full px-4 py-2.5 bg-[#111] border border-[#2a2a2a] rounded-lg text-gray-400 text-sm cursor-not-allowed"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#FF6A00]/10 border border-[#FF6A00]/30 rounded-lg p-4">
                <div className="text-sm text-gray-400">Units to Draw</div>
                <div className="text-3xl font-black text-[#FF6A00]">
                  {concentration > 0 ? unitsToDraw.toFixed(1) : '—'}
                  <span className="text-lg ml-1">units</span>
                </div>
              </div>
              <div className="bg-[#FF6A00]/10 border border-[#FF6A00]/30 rounded-lg p-4">
                <div className="text-sm text-gray-400">mL to Draw</div>
                <div className="text-3xl font-black text-[#FF6A00]">
                  {concentration > 0 ? mlToDraw.toFixed(3) : '—'}
                  <span className="text-lg ml-1">mL</span>
                </div>
              </div>
            </div>

            {concentration > 0 && unitsToDraw > 100 && (
              <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-3">
                <p className="text-red-300 text-sm font-medium">
                  Warning: {unitsToDraw.toFixed(1)} units exceeds a standard 100-unit insulin syringe. Consider using a higher concentration or splitting into multiple injections.
                </p>
              </div>
            )}

            {concentration > 0 && (
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
                <h4 className="text-sm font-bold text-white mb-2">Quick Reference — Doses per Vial</h4>
                <div className="text-xs text-gray-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Total in vial:</span>
                    <span className="text-white">{peptideMg}mg</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Doses at {desiredDose}mg each:</span>
                    <span className="text-white">{desiredDose > 0 ? Math.floor(peptideMg / desiredDose) : '—'} doses</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Days supply (1x daily):</span>
                    <span className="text-white">{desiredDose > 0 ? Math.floor(peptideMg / desiredDose) : '—'} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Weeks supply (1x weekly):</span>
                    <span className="text-white">{desiredDose > 0 ? Math.floor(peptideMg / desiredDose) : '—'} weeks</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reconstitution Instructions — always visible */}
      <ReconstitutionInstructions concentration={concentration} />

      {/* Bottom disclaimer */}
      <div className="mt-6 text-center">
        <p className="text-gray-500 text-xs">
          This tool is provided for educational reference only. Peptide protocols should be prescribed and supervised by your FBF coach.
          Do not adjust your dosing without consulting your coach first.
        </p>
      </div>
    </div>
  )
}
