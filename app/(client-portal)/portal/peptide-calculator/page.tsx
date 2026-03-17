import PeptideCalculator from '@/components/portal/PeptideCalculator'

export default function PeptideCalculatorPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">Peptide Calculator</h1>
      <p className="text-gray-400 text-sm mb-6">Reconstitution and dosing calculator for your peptide protocol.</p>
      <PeptideCalculator />
    </div>
  )
}
