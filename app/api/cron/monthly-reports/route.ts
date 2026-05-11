import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateReportData } from '@/lib/reports/generate'
import { renderToBuffer } from '@react-pdf/renderer'
import { ReportPDF } from '@/lib/reports/pdf-template'
import { sendEmail, buildReportEmail } from '@/lib/email'
import { uploadAndArchive } from '@/lib/upload-and-archive'
import React from 'react'

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminSupabase = createAdminClient()

  // Get all active clients
  const { data: clients } = await adminSupabase
    .from('clients')
    .select('id, email, first_name, last_name')
    .eq('is_active', true)

  if (!clients || clients.length === 0) {
    return NextResponse.json({ message: 'No active clients', processed: 0 })
  }

  const results = []

  for (const client of clients) {
    try {
      const reportData = await generateReportData(client.id, 'monthly')

      // Render PDF
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfBuffer = await renderToBuffer(React.createElement(ReportPDF, { data: reportData }) as any)

      // Upload + record in archive_objects per phase_2B Priority 3.
      const fileName = `${client.id}/monthly-${reportData.endDate}.pdf`
      await uploadAndArchive({
        supabase: adminSupabase,
        bucket: 'reports',
        path: fileName,
        fileBuffer: Buffer.from(pdfBuffer),
        contentType: 'application/pdf',
        sizeBytes: pdfBuffer.byteLength,
        originalName: `monthly-${reportData.endDate}.pdf`,
        stage: 'other',
        clientId: client.id,
        upsert: true,
      })

      const { data: signedData } = await adminSupabase.storage
        .from('reports')
        .createSignedUrl(fileName, 60 * 60 * 24 * 30)

      const pdfUrl = signedData?.signedUrl || null

      // Insert report record
      const { data: report } = await adminSupabase
        .from('client_reports')
        .upsert({
          client_id: client.id,
          report_type: 'monthly',
          report_date: reportData.endDate,
          pdf_url: pdfUrl,
          report_data: reportData.metrics,
          coach_name: reportData.coachName,
        }, {
          onConflict: 'client_id,report_type,report_date',
        })
        .select()
        .single()

      // Email if client has email
      let emailed = false
      if (client.email && pdfBuffer) {
        try {
          await sendEmail({
            to: client.email,
            subject: 'Your Monthly Progress Report — Forged by Freedom',
            html: buildReportEmail(
              `${client.first_name} ${client.last_name}`,
              reportData.coachName,
              'monthly',
              reportData.dateRange
            ),
            attachments: [{
              filename: `FBF-monthly-report-${reportData.endDate}.pdf`,
              content: Buffer.from(pdfBuffer),
            }],
          })
          emailed = true

          if (report?.id) {
            await adminSupabase
              .from('client_reports')
              .update({ emailed_at: new Date().toISOString() })
              .eq('id', report.id)
          }
        } catch (emailErr) {
          console.error(`Email failed for ${client.id}:`, emailErr)
        }
      }

      results.push({ client_id: client.id, success: true, emailed })
    } catch (err) {
      console.error(`Report failed for ${client.id}:`, err)
      results.push({ client_id: client.id, success: false, error: (err as Error).message })
    }
  }

  return NextResponse.json({
    message: 'Monthly reports processed',
    processed: results.length,
    results,
  })
}
