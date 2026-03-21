import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest, authorizeClientAccess } from '@/lib/auth-check'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateReportData } from '@/lib/reports/generate'
import { renderToBuffer } from '@react-pdf/renderer'
import { ReportPDF } from '@/lib/reports/pdf-template'
import { sendEmail, buildReportEmail } from '@/lib/email'
import React from 'react'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const clientId = request.nextUrl.searchParams.get('client_id')
    if (!clientId) {
      return NextResponse.json({ error: 'client_id is required' }, { status: 400 })
    }

    const access = await authorizeClientAccess(user.id, clientId)
    if (!access.authorized) {
      return NextResponse.json({ error: access.reason }, { status: 403 })
    }

    const adminSupabase = createAdminClient()
    const { data: reports } = await adminSupabase
      .from('client_reports')
      .select('*')
      .eq('client_id', clientId)
      .order('report_date', { ascending: false })
      .limit(20)

    return NextResponse.json({ reports: reports || [] })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Handle resend action
    if (body.action === 'resend' && body.report_id) {
      return handleResend(body.report_id)
    }

    const { client_id, days } = body
    const report_type = days && days > 14 ? 'monthly' : 'weekly'

    if (!client_id) {
      return NextResponse.json({ error: 'client_id is required' }, { status: 400 })
    }

    const access = await authorizeClientAccess(user.id, client_id)
    if (!access.authorized) {
      return NextResponse.json({ error: access.reason }, { status: 403 })
    }

    // Generate report data
    const reportData = await generateReportData(client_id, report_type)

    // Render PDF
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(React.createElement(ReportPDF, { data: reportData }) as any)

    // Upload PDF to storage
    const adminSupabase = createAdminClient()
    const fileName = `${client_id}/${report_type}-${reportData.endDate}.pdf`

    const { error: uploadError } = await adminSupabase.storage
      .from('reports')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    let pdfUrl: string | null = null
    if (!uploadError) {
      const { data: signedData } = await adminSupabase.storage
        .from('reports')
        .createSignedUrl(fileName, 60 * 60 * 24 * 30) // 30 days

      pdfUrl = signedData?.signedUrl || null
    }

    // Insert report record
    const { data: report, error: insertError } = await adminSupabase
      .from('client_reports')
      .upsert({
        client_id,
        report_type,
        report_date: reportData.endDate,
        pdf_url: pdfUrl,
        report_data: reportData.metrics,
        coach_name: reportData.coachName,
      }, {
        onConflict: 'client_id,report_type,report_date',
      })
      .select()
      .single()

    if (insertError) {
      console.error('Report insert error:', insertError)
    }

    // Email the report if client has email
    let emailedAt = null
    if (reportData.clientEmail && pdfBuffer) {
      try {
        await sendEmail({
          to: reportData.clientEmail,
          subject: `Your ${report_type === 'weekly' ? 'Weekly' : 'Monthly'} Progress Report — Forged by Freedom`,
          html: buildReportEmail(
            reportData.clientName,
            reportData.coachName,
            report_type,
            reportData.dateRange
          ),
          attachments: [{
            filename: `FBF-${report_type}-report-${reportData.endDate}.pdf`,
            content: Buffer.from(pdfBuffer),
          }],
        })
        emailedAt = new Date().toISOString()

        // Update emailed_at
        if (report?.id) {
          await adminSupabase
            .from('client_reports')
            .update({ emailed_at: emailedAt })
            .eq('id', report.id)
        }
      } catch (emailErr) {
        console.error('Email send failed:', emailErr)
      }
    }

    return NextResponse.json({
      report: report || { client_id, report_type, report_date: reportData.endDate },
      pdf_url: pdfUrl,
      emailed: !!emailedAt,
    })
  } catch (err) {
    console.error('Report generation error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

async function handleResend(reportId: string) {
  const adminSupabase = createAdminClient()

  const { data: report } = await adminSupabase
    .from('client_reports')
    .select('*, clients(first_name, last_name, email)')
    .eq('id', reportId)
    .single()

  if (!report || !report.pdf_url) {
    return NextResponse.json({ error: 'Report not found or no PDF' }, { status: 404 })
  }

  const client = report.clients as { first_name: string; last_name: string; email: string | null }
  if (!client?.email) {
    return NextResponse.json({ error: 'Client has no email' }, { status: 400 })
  }

  // Download existing PDF
  const pdfRes = await fetch(report.pdf_url)
  const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer())

  await sendEmail({
    to: client.email,
    subject: `Your ${report.report_type === 'weekly' ? 'Weekly' : 'Monthly'} Progress Report — Forged by Freedom`,
    html: buildReportEmail(
      `${client.first_name} ${client.last_name}`,
      report.coach_name || 'Your Coach',
      report.report_type,
      new Date(report.report_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    ),
    attachments: [{
      filename: `FBF-${report.report_type}-report-${report.report_date}.pdf`,
      content: pdfBuffer,
    }],
  })

  await adminSupabase
    .from('client_reports')
    .update({ emailed_at: new Date().toISOString() })
    .eq('id', reportId)

  return NextResponse.json({ success: true })
}
