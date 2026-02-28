'use client'

import { useState } from 'react'

// Common compounds organized by category
const COMPOUND_LIST = {
  'Testosterone': [
    'Testosterone Cypionate',
    'Testosterone Enanthate',
    'Testosterone Propionate',
    'Testosterone Undecanoate',
    'Sustanon 250',
  ],
  'Anabolics': [
    'Nandrolone Decanoate (Deca)',
    'Nandrolone Phenylpropionate (NPP)',
    'Trenbolone Acetate',
    'Trenbolone Enanthate',
    'Boldenone Undecylenate (EQ)',
    'Drostanolone Propionate (Masteron)',
    'Drostanolone Enanthate',
    'Methenolone Enanthate (Primobolan)',
    'Oxandrolone (Anavar)',
    'Stanozolol (Winstrol)',
    'Methandienone (Dianabol)',
    'Oxymetholone (Anadrol)',
    'Turinabol',
  ],
  'Ancillaries': [
    'Anastrozole (Arimidex)',
    'Exemestane (Aromasin)',
    'Letrozole',
    'Tamoxifen (Nolvadex)',
    'Clomiphene (Clomid)',
    'HCG',
    'Cabergoline',
    'Pramipexole',
    'Finasteride',
    'Dutasteride',
  ],
  'GLP-1 / Weight Management': [
    'Semaglutide (Ozempic/Wegovy)',
    'Tirzepatide (Mounjaro/Zepbound)',
    'Retatrutide',
    'Cagrilintide',
    'Liraglutide (Saxenda)',
    'Survodutide',
  ],
  'Peptides': [
    'BPC-157',
    'TB-500 (Thymosin Beta-4)',
    'Ipamorelin',
    'CJC-1295 (with DAC)',
    'CJC-1295 (no DAC / Mod GRF)',
    'Tesamorelin',
    'Sermorelin',
    'MK-677 (Ibutamoren)',
    'IGF-1 LR3',
    'GHK-Cu',
    'Melanotan II',
    'PT-141 (Bremelanotide)',
    'Kisspeptin',
    'AOD-9604',
    'DSIP',
  ],
  'Growth Hormone': [
    'HGH (Somatropin)',
    'HGH Fragment 176-191',
  ],
  'Other': [
    'T3 (Cytomel)',
    'T4 (Synthroid)',
    'Clenbuterol',
    'Salbutamol',
    'Ephedrine',
    'Modafinil',
    'Sildenafil (Viagra)',
    'Tadalafil (Cialis)',
  ],
}

interface LogEntry {
  compound: string
  dose: string
  route: string
}

interface CompoundLoggerProps {
  entries: LogEntry[]
  onChange: (entries: LogEntry[]) => void
  assignedPeds?: Array<{ compound: string; dose: string; frequency: string; route: string }>
  assignedPeptides?: Array<{ name: string; dose: string; frequency: string; timing: string }>
  assignedMedical?: Array<{ name: string; dose: string; frequency: string; notes: string }>
}

const ROUTE_OPTIONS = ['IM injection', 'SubQ injection', 'Oral', 'Topical', 'Nasal', 'Sublingual']

export default function CompoundLogger({ entries, onChange, assignedPeds, assignedPeptides, assignedMedical }: CompoundLoggerProps) {
  const [showPicker, setShowPicker] = useState(false)
  const [search, setSearch] = useState('')
  const [customName, setCustomName] = useState('')

  // Build "assigned" quick-add list from client's protocols
  const assignedCompounds: Array<{ name: string; defaultDose: string; defaultRoute: string }> = []
  assignedPeds?.forEach(p => assignedCompounds.push({ name: p.compound, defaultDose: p.dose, defaultRoute: p.route }))
  assignedPeptides?.forEach(p => assignedCompounds.push({ name: p.name, defaultDose: p.dose, defaultRoute: 'SubQ injection' }))
  assignedMedical?.forEach(m => assignedCompounds.push({ name: m.name, defaultDose: m.dose, defaultRoute: 'SubQ injection' }))

  const addEntry = (compound: string, defaultDose = '', defaultRoute = '') => {
    onChange([...entries, { compound, dose: defaultDose, route: defaultRoute || 'IM injection' }])
    setShowPicker(false)
    setSearch('')
    setCustomName('')
  }

  const updateEntry = (idx: number, field: keyof LogEntry, value: string) => {
    const updated = [...entries]
    updated[idx] = { ...updated[idx], [field]: value }
    onChange(updated)
  }

  const removeEntry = (idx: number) => {
    onChange(entries.filter((_, i) => i !== idx))
  }

  // Filter compounds by search
  const filteredCategories: Record<string, string[]> = {}
  const searchLower = search.toLowerCase()
  for (const [category, compounds] of Object.entries(COMPOUND_LIST)) {
    const filtered = compounds.filter(c => c.toLowerCase().includes(searchLower))
    if (filtered.length > 0) filteredCategories[category] = filtered
  }

  const inputClass = 'px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm placeholder-[#555] focus:border-[#FF6A00] focus:outline-none'

  return (
    <div className="space-y-3">
      {/* Logged entries */}
      {entries.map((entry, idx) => (
        <div key={idx} className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white text-sm font-medium">{entry.compound}</span>
            <button onClick={() => removeEntry(idx)} className="text-red-400 hover:text-red-300 text-xs">Remove</button>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="decimal"
              value={entry.dose}
              onChange={e => updateEntry(idx, 'dose', e.target.value)}
              className={`${inputClass} flex-1`}
              placeholder="Dose (e.g. 250mg)"
            />
            <select
              value={entry.route}
              onChange={e => updateEntry(idx, 'route', e.target.value)}
              className={`${inputClass} w-32`}
            >
              {ROUTE_OPTIONS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>
      ))}

      {/* Add compound button */}
      {!showPicker ? (
        <button
          type="button"
          onClick={() => setShowPicker(true)}
          className="w-full py-3 rounded-xl text-sm font-medium bg-[#141414] text-[#FF6A00] border border-[#2a2a2a] hover:border-[#FF6A00]/50 transition-colors"
        >
          + Log a Compound
        </button>
      ) : (
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-4 space-y-3">
          {/* Search */}
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={`${inputClass} w-full`}
            placeholder="Search compounds..."
            autoFocus
          />

          {/* Quick-add from assigned protocol */}
          {assignedCompounds.length > 0 && !search && (
            <div>
              <p className="text-xs text-[#D4A017] font-semibold mb-2">Your Assigned Protocol</p>
              <div className="flex flex-wrap gap-2">
                {assignedCompounds.map((ac, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => addEntry(ac.name, ac.defaultDose, ac.defaultRoute)}
                    className="px-3 py-2 rounded-lg text-xs font-medium bg-[#FF6A00]/10 text-[#FF6A00] border border-[#FF6A00]/20 hover:bg-[#FF6A00]/20 transition-colors"
                  >
                    {ac.name} ({ac.defaultDose})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Compound list */}
          <div className="max-h-64 overflow-y-auto space-y-3">
            {Object.entries(filteredCategories).map(([category, compounds]) => (
              <div key={category}>
                <p className="text-xs text-[#888] font-semibold mb-1 sticky top-0 bg-[#141414]">{category}</p>
                <div className="flex flex-wrap gap-1.5">
                  {compounds.map(compound => (
                    <button
                      key={compound}
                      type="button"
                      onClick={() => addEntry(compound)}
                      className="px-2.5 py-1.5 rounded-lg text-xs text-[#ccc] bg-[#0a0a0a] border border-[#2a2a2a] hover:border-[#FF6A00]/50 hover:text-white transition-colors"
                    >
                      {compound}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Custom compound */}
          <div className="flex gap-2 pt-2 border-t border-[#2a2a2a]">
            <input
              type="text"
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              className={`${inputClass} flex-1`}
              placeholder="Other compound not listed..."
            />
            <button
              type="button"
              onClick={() => { if (customName.trim()) addEntry(customName.trim()) }}
              disabled={!customName.trim()}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-[#FF6A00] text-white disabled:opacity-30 transition-colors"
            >
              Add
            </button>
          </div>

          <button
            type="button"
            onClick={() => { setShowPicker(false); setSearch('') }}
            className="w-full py-2 text-xs text-[#555] hover:text-[#888] transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
