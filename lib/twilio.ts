const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID!
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN!
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER!

interface SendSMSOptions {
  to: string
  body: string
}

interface TwilioMessageResponse {
  sid: string
  status: string
  error_code: number | null
  error_message: string | null
}

export async function sendSMS({ to, body }: SendSMSOptions): Promise<TwilioMessageResponse> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`

  const params = new URLSearchParams({
    To: to,
    From: TWILIO_PHONE_NUMBER,
    Body: body,
  })

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')}`,
    },
    body: params.toString(),
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(`Twilio error: ${data.message || data.error_message || 'Unknown error'}`)
  }

  return data
}

export function getTwilioPhoneNumber(): string {
  return TWILIO_PHONE_NUMBER
}

export function isTwilioConfigured(): boolean {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  )
}
