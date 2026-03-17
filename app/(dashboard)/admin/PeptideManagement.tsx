'use client'

import { useState } from 'react'

interface PeptideSize {
  label: string
  price: number
}

interface Peptide {
  name: string
  category: string
  sizes: PeptideSize[]
  short: string
  full: string
}

const PEPTIDES: Peptide[] = [
  {
    name: 'RETATRUTIDE',
    category: 'GLP/Fat Loss',
    sizes: [
      { label: '30mg', price: 125 },
      { label: '40mg', price: 150 },
    ],
    short: 'Triple-agonist targeting GLP-1, GIP, and Glucagon receptors. Most powerful weight-loss peptide ever studied.',
    full: 'Retatrutide activates three receptor pathways simultaneously — GLP-1 (appetite suppression), GIP (nutrient partitioning), and Glucagon (energy expenditure). In Phase 2 trials, achieved up to 24.2% body weight loss at 48 weeks. 100% of participants on the highest dose lost at least 5% body weight. Administered as once-weekly subcutaneous injection. Protocol dosing: ~5mg/week (males) or ~2.5mg/week (females), titrated up over weeks 1-4.',
  },
  {
    name: 'TESOFENSINE',
    category: 'CNS/Fat Loss',
    sizes: [{ label: 'capsule', price: 90 }],
    short: 'Triple monoamine reuptake inhibitor. CNS appetite suppression + energy boost.',
    full: 'Blocks reuptake of serotonin, dopamine, and norepinephrine. Originally developed for neurological conditions, found to produce significant weight loss. Provides central appetite suppression independent of GLP-1, increased energy and motivation via dopamine/norepinephrine, and improved diet adherence. Works through completely different mechanism than Retatrutide. Oral capsule taken daily. Active for entire protocol including receptor reset phase.',
  },
  {
    name: 'CAGRILINTIDE',
    category: 'Satiety',
    sizes: [{ label: '10mg', price: 100 }],
    short: 'Long-acting amylin receptor agonist. Extends satiety between meals.',
    full: 'Targets the amylin system — responsible for fullness and satisfaction between meals. Same compound used in Novo Nordisk\'s CagriSema. Activates a fourth receptor system that Retatrutide does not reach. Extends satiety well beyond meals, slows gastric emptying, complementary mechanism that works alongside Reta without overlapping. Weekly subcutaneous injection introduced at Week 9 of protocol.',
  },
  {
    name: 'CJC-1295 (DAC)',
    category: 'Growth Hormone',
    sizes: [{ label: '10mg', price: 65 }],
    short: 'GHRH analog with extended half-life. Sustained GH elevation for days.',
    full: 'Growth hormone releasing hormone analog that provides steady, sustained elevation of GH levels over days rather than brief pulses. Extended GH elevation creates sustained anabolic environment. Improves deep sleep and recovery. Enhances fat metabolism especially visceral fat. Subcutaneous injection, typically before bed.',
  },
  {
    name: 'IPAMORELIN',
    category: 'Growth Hormone',
    sizes: [{ label: '10mg', price: 45 }],
    short: 'Selective GH secretagogue. Clean GH pulses without side effects.',
    full: 'Triggers clean GH pulses without spiking cortisol, hunger hormones, or prolactin. Targets visceral (belly) fat specifically. Accelerates injury and workout recovery. Cleanest side-effect profile of any secretagogue. Often stacked with CJC-1295 for synergistic effect. Subcutaneous injection before bed.',
  },
  {
    name: 'TESAMORELIN',
    category: 'Growth Hormone',
    sizes: [{ label: '10mg', price: 60 }],
    short: 'FDA-approved GHRH analog. Specifically targets visceral abdominal fat.',
    full: 'FDA-approved GHRH analog specifically shown to reduce visceral abdominal fat in clinical trials. Excellent choice for clients with stubborn midsection fat that won\'t respond to diet alone. Premium GH option with strongest clinical evidence for visceral fat reduction. Subcutaneous injection.',
  },
  {
    name: 'BPC-157',
    category: 'Recovery/Healing',
    sizes: [{ label: '10mg', price: 50 }],
    short: 'Body Protection Compound. Accelerates healing of gut, tendons, ligaments, muscles.',
    full: 'A pentadecapeptide (15 amino acids) derived from human gastric juice. Promotes healing of tendons, ligaments, muscles, and gut lining. Anti-inflammatory properties. Shown to promote angiogenesis (new blood vessel formation) accelerating tissue repair. Commonly used for injury recovery, joint health, and gut healing. Can be administered subcutaneously near injury site or systemically. Popular stack with TB-500 for enhanced recovery.',
  },
  {
    name: 'TB-500',
    category: 'Recovery/Healing',
    sizes: [{ label: '10mg', price: 50 }],
    short: 'Thymosin Beta-4 fragment. Tissue repair, reduced inflammation, improved flexibility.',
    full: 'A synthetic version of Thymosin Beta-4, a naturally occurring peptide involved in tissue repair and regeneration. Promotes cell migration and blood vessel growth. Reduces inflammation and fibrosis. Improves flexibility and range of motion. Accelerates wound healing and muscle repair. Often stacked with BPC-157 for comprehensive recovery protocol. Subcutaneous injection.',
  },
  {
    name: 'GHK-Cu',
    category: 'Skin/Anti-Aging',
    sizes: [{ label: '100mg', price: 40 }],
    short: 'Copper peptide. Skin regeneration, collagen synthesis, anti-aging.',
    full: 'A naturally occurring copper complex peptide that declines with age. Stimulates collagen and elastin production. Promotes skin remodeling and wound healing. Anti-inflammatory and antioxidant properties. Supports hair growth and thickness. Can be used topically or via subcutaneous injection. Popular for anti-aging protocols and post-procedure skin recovery.',
  },
  {
    name: 'MOTS-C',
    category: 'Metabolic/Longevity',
    sizes: [{ label: '40mg', price: 90 }],
    short: 'Mitochondrial peptide. Enhances metabolism, exercise capacity, insulin sensitivity.',
    full: 'A mitochondria-derived peptide that regulates metabolic homeostasis. Enhances glucose metabolism and insulin sensitivity. Improves exercise capacity and endurance. Promotes fat oxidation. Shown to have anti-aging and longevity benefits in research. Activates AMPK pathway. Subcutaneous injection, typically 5mg 3-5x per week.',
  },
  {
    name: 'PT-141',
    category: 'Sexual Health',
    sizes: [{ label: '10mg', price: 30 }],
    short: 'Bremelanotide. Treats sexual dysfunction in both men and women via CNS pathway.',
    full: 'A melanocortin receptor agonist that works through the central nervous system rather than the vascular system (unlike Viagra/Cialis). FDA-approved as Vyleesi for hypoactive sexual desire disorder in premenopausal women. Also effective for male erectile dysfunction. Works on desire/arousal at the brain level. Subcutaneous injection 45 min before activity. Dose: 1-2mg.',
  },
  {
    name: 'SLUPP332',
    category: 'Metabolic/Performance',
    sizes: [{ label: '5mg', price: 50 }],
    short: 'REV-ERB agonist. Enhances endurance, fat oxidation, and circadian rhythm.',
    full: 'A synthetic REV-ERB agonist that modulates circadian rhythm and metabolism. Enhances endurance capacity and exercise performance. Promotes fat oxidation and reduces fat storage. Improves mitochondrial function. May enhance sleep quality through circadian regulation. Research compound with promising metabolic benefits.',
  },
  {
    name: 'SS-31 (Elamipretide)',
    category: 'Mitochondrial/Anti-Aging',
    sizes: [
      { label: '10mg', price: 45 },
      { label: '50mg', price: 210 },
    ],
    short: 'Mitochondrial-targeted peptide. Protects and restores mitochondrial function.',
    full: 'Targets and concentrates in the inner mitochondrial membrane. Reduces oxidative stress at the cellular level. Improves mitochondrial energy production (ATP). Shown to improve cardiac function in heart failure patients. Neuroprotective properties. Being studied for age-related diseases, heart failure, and mitochondrial myopathies. Subcutaneous injection.',
  },
  {
    name: 'NAD+',
    category: 'Longevity/Energy',
    sizes: [
      { label: '500mg', price: 60 },
      { label: '1000mg', price: 100 },
    ],
    short: 'Nicotinamide adenine dinucleotide. Essential coenzyme for cellular energy and DNA repair.',
    full: 'A critical coenzyme found in every cell. Levels decline significantly with age. Supports cellular energy production, DNA repair, and sirtuin activation. Improves mental clarity, energy, and recovery. Anti-aging benefits through enhanced cellular function. Can be administered via subcutaneous injection or IV infusion. Higher doses (1000mg) provide more dramatic effects.',
  },
]

const CATEGORIES = [
  'All',
  'GLP/Fat Loss',
  'CNS/Fat Loss',
  'Growth Hormone',
  'Recovery/Healing',
  'Satiety',
  'Metabolic',
  'Longevity',
  'Other',
]

const CATEGORY_COLORS: Record<string, string> = {
  'GLP/Fat Loss': '#FF6A00',
  'CNS/Fat Loss': '#FF6A00',
  'Growth Hormone': '#22c55e',
  'Recovery/Healing': '#3b82f6',
  'Satiety': '#a855f7',
  'Skin/Anti-Aging': '#ec4899',
  'Metabolic/Longevity': '#14b8a6',
  'Metabolic/Performance': '#14b8a6',
  'Mitochondrial/Anti-Aging': '#ec4899',
  'Longevity/Energy': '#14b8a6',
  'Sexual Health': '#f43f5e',
}

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || '#6b7280'
}

function matchesFilter(peptide: Peptide, filter: string): boolean {
  if (filter === 'All') return true
  if (filter === 'Metabolic') {
    return peptide.category.startsWith('Metabolic')
  }
  if (filter === 'Longevity') {
    return peptide.category.includes('Longevity') || peptide.category.includes('Anti-Aging')
  }
  if (filter === 'Other') {
    const knownFilters = ['GLP/Fat Loss', 'CNS/Fat Loss', 'Growth Hormone', 'Recovery/Healing', 'Satiety']
    const metabolicOrLongevity = peptide.category.startsWith('Metabolic') || peptide.category.includes('Longevity') || peptide.category.includes('Anti-Aging')
    return !knownFilters.includes(peptide.category) && !metabolicOrLongevity
  }
  return peptide.category === filter
}

export default function PeptideManagement() {
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [expandedFull, setExpandedFull] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState('All')
  const [search, setSearch] = useState('')

  const filtered = PEPTIDES.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = matchesFilter(p, activeFilter)
    return matchSearch && matchCat
  })

  const toggleCard = (name: string) => {
    if (expandedCard === name) {
      setExpandedCard(null)
      setExpandedFull(null)
    } else {
      setExpandedCard(name)
      setExpandedFull(null)
    }
  }

  const toggleFull = (e: React.MouseEvent, name: string) => {
    e.stopPropagation()
    setExpandedFull(expandedFull === name ? null : name)
  }

  return (
    <div className="mt-12">
      {/* Confidential Banner */}
      <div className="bg-red-900/60 border border-red-500 rounded-lg px-4 py-3 mb-6 text-center">
        <span className="text-red-200 font-bold text-sm tracking-wide">
          ⚠️ CONFIDENTIAL — Internal Pricing Only — Do Not Share
        </span>
      </div>

      <h2 className="text-2xl font-bold text-white mb-6 tracking-wide">Peptide Catalog</h2>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search peptides..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md px-4 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#FF6A00] transition-colors"
        />
      </div>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveFilter(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              activeFilter === cat
                ? 'bg-[#FF6A00] text-white'
                : 'bg-[#1a1a1a] text-gray-400 border border-[#2a2a2a] hover:border-[#FF6A00] hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Peptide Cards */}
      <div className="space-y-3">
        {filtered.map((peptide) => {
          const isExpanded = expandedCard === peptide.name
          const isFullExpanded = expandedFull === peptide.name
          const catColor = getCategoryColor(peptide.category)

          return (
            <div
              key={peptide.name}
              onClick={() => toggleCard(peptide.name)}
              className={`bg-[#141414] border rounded-lg cursor-pointer transition-all duration-200 ${
                isExpanded ? 'border-[#FF6A00]/50' : 'border-[#2a2a2a] hover:border-[#3a3a3a]'
              }`}
            >
              {/* Collapsed Header - Always Visible */}
              <div className="px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <h3 className="text-white font-bold text-lg tracking-wide whitespace-nowrap">
                    {peptide.name}
                  </h3>
                  <span
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
                    style={{
                      backgroundColor: `${catColor}20`,
                      color: catColor,
                      border: `1px solid ${catColor}40`,
                    }}
                  >
                    {peptide.category}
                  </span>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-right">
                    {peptide.sizes.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 justify-end">
                        <span className="text-gray-500 text-xs">{s.label}</span>
                        <span className="text-[#FF6A00] font-bold text-sm">${s.price}</span>
                      </div>
                    ))}
                  </div>
                  <svg
                    className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-5 pb-5 border-t border-[#2a2a2a] pt-4">
                  <p className="text-gray-300 text-sm leading-relaxed">{peptide.short}</p>

                  {!isFullExpanded ? (
                    <button
                      onClick={(e) => toggleFull(e, peptide.name)}
                      className="mt-3 text-[#FF6A00] text-xs font-semibold hover:text-[#ff8533] transition-colors"
                    >
                      Read More →
                    </button>
                  ) : (
                    <div className="mt-3">
                      <p className="text-gray-400 text-sm leading-relaxed">{peptide.full}</p>
                      <button
                        onClick={(e) => toggleFull(e, peptide.name)}
                        className="mt-3 text-[#FF6A00] text-xs font-semibold hover:text-[#ff8533] transition-colors"
                      >
                        Show Less ←
                      </button>
                    </div>
                  )}

                  {/* Price summary in expanded view */}
                  <div className="mt-4 pt-3 border-t border-[#2a2a2a]">
                    <div className="flex flex-wrap gap-3">
                      {peptide.sizes.map((s, i) => (
                        <div
                          key={i}
                          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-4 py-2 flex items-center gap-2"
                        >
                          <span className="text-gray-400 text-sm">{s.label}</span>
                          <span className="text-[#FF6A00] font-bold text-lg">${s.price}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="mt-8 flex items-center justify-between text-sm">
        <span className="text-gray-500">
          {filtered.length} of {PEPTIDES.length} peptides
        </span>
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-lg px-4 py-2">
          <span className="text-gray-400">Flat rate shipping: </span>
          <span className="text-[#FF6A00] font-bold">$15</span>
        </div>
      </div>
    </div>
  )
}
