import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { ReportData } from './generate'

const colors = {
  black: '#0a0a0a',
  darkGray: '#141414',
  border: '#2a2a2a',
  textMuted: '#888888',
  textLight: '#cccccc',
  white: '#ffffff',
  orange: '#FF6A00',
  gold: '#D4A017',
  green: '#22c55e',
  red: '#ef4444',
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.black,
    padding: 40,
    fontFamily: 'Helvetica',
  },
  // Cover page
  coverContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.orange,
    letterSpacing: 4,
    marginBottom: 8,
  },
  logoSubtext: {
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 6,
    marginBottom: 60,
  },
  coverTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.white,
    textAlign: 'center',
    marginBottom: 12,
  },
  coverSubtitle: {
    fontSize: 14,
    color: colors.gold,
    textAlign: 'center',
    marginBottom: 40,
  },
  coverDetail: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 6,
  },
  // Section headers
  sectionHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.orange,
    marginBottom: 16,
    paddingBottom: 8,
    borderBottom: `1px solid ${colors.border}`,
  },
  // Metric cards
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  metricCard: {
    width: '30%',
    backgroundColor: colors.darkGray,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricLabel: {
    fontSize: 8,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.white,
  },
  metricTarget: {
    fontSize: 8,
    color: colors.textMuted,
    marginTop: 2,
  },
  metricPercent: {
    fontSize: 9,
    marginTop: 2,
  },
  // Compliance bar
  complianceContainer: {
    marginBottom: 24,
  },
  complianceLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginBottom: 6,
  },
  complianceBarBg: {
    height: 12,
    backgroundColor: colors.darkGray,
    borderRadius: 6,
    overflow: 'hidden',
  },
  complianceBarFill: {
    height: 12,
    borderRadius: 6,
  },
  compliancePercent: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.white,
    marginTop: 4,
  },
  // Progress section
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottom: `1px solid ${colors.border}`,
  },
  progressLabel: {
    fontSize: 10,
    color: colors.textMuted,
  },
  progressValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.white,
  },
  // Coach message
  messageContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  messageTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.gold,
    textAlign: 'center',
    marginBottom: 30,
  },
  messageText: {
    fontSize: 12,
    color: colors.textLight,
    lineHeight: 1.8,
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  messageFooter: {
    marginTop: 40,
    textAlign: 'center',
  },
  aiCoachLink: {
    fontSize: 10,
    color: colors.gold,
    textAlign: 'center',
    marginTop: 30,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 7,
    color: colors.textMuted,
  },
})

function pctOf(actual: number | null, target: number | null): string {
  if (actual == null || target == null || target === 0) return ''
  return `${Math.round((actual / target) * 100)}%`
}

function pctColor(actual: number | null, target: number | null): string {
  if (actual == null || target == null || target === 0) return colors.textMuted
  const pct = (actual / target) * 100
  if (pct >= 90 && pct <= 110) return colors.green
  if (pct >= 75) return colors.gold
  return colors.red
}

export function ReportPDF({ data }: { data: ReportData }) {
  const { metrics } = data

  return (
    <Document>
      {/* Page 1: Cover */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.coverContainer}>
          <Text style={styles.logoText}>FORGED BY FREEDOM</Text>
          <Text style={styles.logoSubtext}>COACHING</Text>
          <Text style={styles.coverTitle}>
            {data.reportType === 'weekly' ? 'WEEKLY' : 'MONTHLY'} PROGRESS REPORT
          </Text>
          <Text style={styles.coverSubtitle}>{data.dateRange}</Text>
          <Text style={styles.coverDetail}>{data.clientName}</Text>
          <Text style={styles.coverDetail}>Coach {data.coachName}</Text>
          {data.programName && (
            <Text style={{ ...styles.coverDetail, marginTop: 12, color: colors.gold }}>
              {data.programName}
            </Text>
          )}
        </View>
        <View style={styles.footer}>
          <Text style={styles.footerText}>Forged by Freedom</Text>
          <Text style={styles.footerText}>forgedbyfreedom.org</Text>
        </View>
      </Page>

      {/* Page 2: Metrics */}
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.sectionHeader}>Compliance & Metrics</Text>

        {/* Adherence bar */}
        <View style={styles.complianceContainer}>
          <Text style={styles.complianceLabel}>CHECK-IN ADHERENCE</Text>
          <View style={styles.complianceBarBg}>
            <View
              style={{
                ...styles.complianceBarFill,
                width: `${Math.min(metrics.adherence, 100)}%`,
                backgroundColor: metrics.adherence >= 80 ? colors.green : metrics.adherence >= 50 ? colors.gold : colors.red,
              }}
            />
          </View>
          <Text style={styles.compliancePercent}>{metrics.adherence}%</Text>
        </View>

        {/* Metric cards */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Avg Calories</Text>
            <Text style={styles.metricValue}>{metrics.avgCalories?.toFixed(0) || '—'}</Text>
            {metrics.targetCalories && (
              <Text style={styles.metricTarget}>Target: {metrics.targetCalories}</Text>
            )}
            <Text style={{ ...styles.metricPercent, color: pctColor(metrics.avgCalories, metrics.targetCalories) }}>
              {pctOf(metrics.avgCalories, metrics.targetCalories)}
            </Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Avg Protein</Text>
            <Text style={styles.metricValue}>{metrics.avgProtein?.toFixed(0) || '—'}g</Text>
            {metrics.targetProtein && (
              <Text style={styles.metricTarget}>Target: {metrics.targetProtein}g</Text>
            )}
            <Text style={{ ...styles.metricPercent, color: pctColor(metrics.avgProtein, metrics.targetProtein) }}>
              {pctOf(metrics.avgProtein, metrics.targetProtein)}
            </Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Avg Steps</Text>
            <Text style={styles.metricValue}>{metrics.avgSteps?.toFixed(0) || '—'}</Text>
            {metrics.targetSteps && (
              <Text style={styles.metricTarget}>Target: {metrics.targetSteps?.toLocaleString()}</Text>
            )}
            <Text style={{ ...styles.metricPercent, color: pctColor(metrics.avgSteps, metrics.targetSteps) }}>
              {pctOf(metrics.avgSteps, metrics.targetSteps)}
            </Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Avg Sleep</Text>
            <Text style={styles.metricValue}>{metrics.avgSleep?.toFixed(1) || '—'}h</Text>
            <Text style={styles.metricTarget}>Target: 7-9h</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Avg Water</Text>
            <Text style={styles.metricValue}>{metrics.avgWater?.toFixed(0) || '—'}oz</Text>
            {metrics.targetWaterOz && (
              <Text style={styles.metricTarget}>Target: {metrics.targetWaterOz}oz</Text>
            )}
            <Text style={{ ...styles.metricPercent, color: pctColor(metrics.avgWater, metrics.targetWaterOz) }}>
              {pctOf(metrics.avgWater, metrics.targetWaterOz)}
            </Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Avg Mood</Text>
            <Text style={styles.metricValue}>{metrics.avgMood?.toFixed(1) || '—'}/10</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Avg Stress</Text>
            <Text style={styles.metricValue}>{metrics.avgStress?.toFixed(1) || '—'}/10</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Supplement Compliance</Text>
            <Text style={styles.metricValue}>{metrics.supplementCompliance ?? '—'}%</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Forged by Freedom</Text>
          <Text style={styles.footerText}>Page 2</Text>
        </View>
      </Page>

      {/* Page 3: Progress */}
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.sectionHeader}>Progress Overview</Text>

        <View style={{ marginBottom: 20 }}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Weight Change</Text>
            <Text style={{
              ...styles.progressValue,
              color: metrics.weightChange != null
                ? (metrics.weightChange > 0 ? colors.red : metrics.weightChange < 0 ? colors.green : colors.white)
                : colors.textMuted,
            }}>
              {metrics.weightChange != null
                ? `${metrics.weightChange > 0 ? '+' : ''}${metrics.weightChange} lbs`
                : 'N/A'}
            </Text>
          </View>

          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Starting Weight</Text>
            <Text style={styles.progressValue}>{metrics.weightStart ? `${metrics.weightStart} lbs` : 'N/A'}</Text>
          </View>

          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Current Weight</Text>
            <Text style={styles.progressValue}>{metrics.weightEnd ? `${metrics.weightEnd} lbs` : 'N/A'}</Text>
          </View>

          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Latest Body Fat</Text>
            <Text style={styles.progressValue}>{metrics.bodyFatLatest ? `${metrics.bodyFatLatest}%` : 'N/A'}</Text>
          </View>

          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Latest Lean Mass</Text>
            <Text style={styles.progressValue}>{metrics.leanMassLatest ? `${metrics.leanMassLatest} lbs` : 'N/A'}</Text>
          </View>

          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Training Frequency</Text>
            <Text style={styles.progressValue}>{metrics.trainingDays}/{metrics.totalDays} days</Text>
          </View>

          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Check-in Adherence</Text>
            <Text style={styles.progressValue}>{metrics.adherence}%</Text>
          </View>

          <View style={{ ...styles.progressRow, borderBottom: 'none' }}>
            <Text style={styles.progressLabel}>Supplement Compliance</Text>
            <Text style={styles.progressValue}>{metrics.supplementCompliance ?? 'N/A'}%</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Forged by Freedom</Text>
          <Text style={styles.footerText}>Page 3</Text>
        </View>
      </Page>

      {/* Page 4: Coach Message */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.messageContainer}>
          <Text style={styles.messageTitle}>A Message from Coach {data.coachName}</Text>
          <Text style={styles.messageText}>{data.coachMessage}</Text>
          <View style={styles.messageFooter}>
            <Text style={styles.aiCoachLink}>
              For personalized AI-powered guidance: forgedbyfreedom.org/ai-coach
            </Text>
          </View>
        </View>
        <View style={styles.footer}>
          <Text style={styles.footerText}>Forged by Freedom</Text>
          <Text style={styles.footerText}>Page 4</Text>
        </View>
      </Page>
    </Document>
  )
}
