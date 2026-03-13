export interface ScrubRule {
  id: string
  name: string
  field: string
  operator: string
  value: string | null
  action: 'approve' | 'deny'
  priority: number
  is_active: boolean
  // Optional compound condition: both must match for rule to fire
  condition_field?: string | null
  condition_operator?: string | null
  condition_value?: string | null
}

export interface DenialReason {
  rule_id: string
  rule_name: string
  field: string
  detail: string
}

export interface EvaluationResult {
  result: 'approved' | 'denied' | 'manual_review'
  denial_reasons: DenialReason[]
  matched_rule_id?: string
  matched_rule_name?: string
}

/**
 * Get a field value from the row, using column mapping if provided.
 * columnMapping maps rule field names -> actual CSV column names.
 */
function getFieldValue(
  row: Record<string, string>,
  ruleField: string,
  columnMapping?: Record<string, string>
): string {
  const csvColumn = columnMapping?.[ruleField] || ruleField
  const val = row[csvColumn]
  return val !== undefined && val !== null ? String(val).trim() : ''
}

function checkFieldCondition(
  fieldValue: string,
  operator: string,
  ruleValue: string
): boolean {
  switch (operator) {
    case 'equals':
      return fieldValue.toLowerCase() === ruleValue.toLowerCase()

    case 'not_equals':
      if (fieldValue === '') return true
      return fieldValue.toLowerCase() !== ruleValue.toLowerCase()

    case 'contains':
      return fieldValue.toLowerCase().includes(ruleValue.toLowerCase())

    case 'not_contains':
      return !fieldValue.toLowerCase().includes(ruleValue.toLowerCase())

    case 'is_empty':
      return fieldValue === ''

    case 'is_not_empty':
      return fieldValue !== ''

    case 'in_list': {
      const listValues = ruleValue.split(',').map(v => v.trim().toLowerCase())
      return listValues.includes(fieldValue.toLowerCase())
    }

    case 'regex': {
      try {
        const re = new RegExp(ruleValue, 'i')
        return re.test(fieldValue)
      } catch {
        return false
      }
    }

    default:
      return false
  }
}

function matchesRule(
  row: Record<string, string>,
  rule: ScrubRule,
  columnMapping?: Record<string, string>
): boolean {
  // Special "all_pass" operator: always matches (used as catch-all approve)
  if (rule.operator === 'all_pass') return true

  const fieldValue = getFieldValue(row, rule.field, columnMapping)
  const ruleValue = rule.value?.trim() || ''

  const primaryMatch = checkFieldCondition(fieldValue, rule.operator, ruleValue)

  // If there's a compound condition, both must match
  if (primaryMatch && rule.condition_field && rule.condition_operator) {
    const condFieldValue = getFieldValue(row, rule.condition_field, columnMapping)
    const condValue = rule.condition_value?.trim() || ''
    return checkFieldCondition(condFieldValue, rule.condition_operator, condValue)
  }

  return primaryMatch
}

function buildDetail(rule: ScrubRule, row: Record<string, string>, columnMapping?: Record<string, string>): string {
  const fieldValue = getFieldValue(row, rule.field, columnMapping)
  const csvColumn = columnMapping?.[rule.field] || rule.field

  if (rule.operator === 'is_empty') {
    return `${csvColumn} is empty`
  }
  if (rule.operator === 'not_equals') {
    return `${csvColumn} = "${fieldValue}" (expected "${rule.value}")`
  }
  if (rule.operator === 'equals') {
    return `${csvColumn} = "${fieldValue}"`
  }
  return `${csvColumn} = "${fieldValue}"`
}

/**
 * Evaluate a single visitor row against all active rules.
 * Deny rules are checked first (all of them, to collect multiple reasons).
 * Then approve rules. If nothing matches, manual_review.
 */
export function evaluateVisitor(
  row: Record<string, string>,
  rules: ScrubRule[],
  columnMapping?: Record<string, string>
): EvaluationResult {
  const activeRules = rules.filter(r => r.is_active)
  const denyRules = activeRules
    .filter(r => r.action === 'deny')
    .sort((a, b) => b.priority - a.priority)
  const approveRules = activeRules
    .filter(r => r.action === 'approve')
    .sort((a, b) => b.priority - a.priority)

  // Phase 1: Check ALL deny rules, collect all reasons
  const denialReasons: DenialReason[] = []
  for (const rule of denyRules) {
    if (matchesRule(row, rule, columnMapping)) {
      denialReasons.push({
        rule_id: rule.id,
        rule_name: rule.name,
        field: rule.field,
        detail: buildDetail(rule, row, columnMapping),
      })
    }
  }

  if (denialReasons.length > 0) {
    return {
      result: 'denied',
      denial_reasons: denialReasons,
      matched_rule_id: denialReasons[0].rule_id,
      matched_rule_name: denialReasons[0].rule_name,
    }
  }

  // Phase 2: Check approve rules
  for (const rule of approveRules) {
    if (matchesRule(row, rule, columnMapping)) {
      return {
        result: 'approved',
        denial_reasons: [],
        matched_rule_id: rule.id,
        matched_rule_name: rule.name,
      }
    }
  }

  // Phase 3: No rule matched
  return { result: 'manual_review', denial_reasons: [] }
}

/**
 * Process a batch of visitor rows. Returns results keyed by row index.
 */
export function processVisitorBatch(
  rows: Record<string, string>[],
  rules: ScrubRule[],
  columnMapping?: Record<string, string>
): EvaluationResult[] {
  return rows.map(row => evaluateVisitor(row, rules, columnMapping))
}
