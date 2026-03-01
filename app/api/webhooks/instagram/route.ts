import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendInstagramDM, isInstagramConfigured } from '@/lib/instagram'

const VERIFY_TOKEN = process.env.INSTAGRAM_VERIFY_TOKEN || 'fbf_instagram_verify'

const AUTO_RESPONSE = process.env.INSTAGRAM_AUTO_RESPONSE ||
  `Hey! 👋 Thanks for reaching out to Forged By Freedom!

We help serious athletes build elite physiques with personalized coaching — training, nutrition, and supplementation protocols designed around YOUR goals.

🔥 What are you looking to accomplish?

A coach will follow up with you shortly!`

// Meta webhook verification (GET)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// Instagram webhook events (POST)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Instagram sends messaging events under entry[].messaging[]
    const entries = body.entry || []

    const adminSupabase = createAdminClient()

    // Get the org (for associating leads)
    const { data: org } = await adminSupabase
      .from('organizations')
      .select('id')
      .limit(1)
      .single()

    for (const entry of entries) {
      const messagingEvents = entry.messaging || []

      for (const event of messagingEvents) {
        // Only handle incoming messages (not echoes, not reactions)
        if (!event.message || event.message.is_echo) continue

        const senderId = event.sender?.id
        const messageText = event.message?.text
        const messageId = event.message?.mid

        if (!senderId || !messageText) continue

        // Check if this lead already exists
        const { data: existingLead } = await adminSupabase
          .from('instagram_leads')
          .select('id, auto_responded')
          .eq('instagram_user_id', senderId)
          .single()

        let leadId: string

        if (existingLead) {
          leadId = existingLead.id

          // Update the lead's updated_at
          await adminSupabase
            .from('instagram_leads')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', leadId)
        } else {
          // Create new lead
          const { data: newLead } = await adminSupabase
            .from('instagram_leads')
            .insert({
              instagram_user_id: senderId,
              first_message: messageText,
              status: 'new',
              auto_responded: false,
              organization_id: org?.id || null,
            })
            .select()
            .single()

          leadId = newLead!.id
        }

        // Log the inbound message
        await adminSupabase.from('instagram_messages').insert({
          lead_id: leadId,
          instagram_message_id: messageId,
          direction: 'inbound',
          message: messageText,
          sender_id: senderId,
        })

        // Auto-respond if first message and Instagram is configured
        if (!existingLead && isInstagramConfigured()) {
          try {
            await sendInstagramDM(senderId, AUTO_RESPONSE)

            // Log the auto-response
            await adminSupabase.from('instagram_messages').insert({
              lead_id: leadId,
              direction: 'outbound',
              message: AUTO_RESPONSE,
              sender_id: 'page',
            })

            await adminSupabase
              .from('instagram_leads')
              .update({ auto_responded: true })
              .eq('id', leadId)
          } catch (err) {
            console.error('Instagram auto-response failed:', err)
          }
        }
      }
    }

    // Must return 200 quickly to acknowledge receipt
    return NextResponse.json({ status: 'ok' })
  } catch (err) {
    console.error('Instagram webhook error:', err)
    return NextResponse.json({ status: 'ok' })
  }
}
