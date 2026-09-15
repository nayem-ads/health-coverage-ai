import cors from 'cors';
import crypto from 'node:crypto';
import 'dotenv/config';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resend } from 'resend';
import { initSchema, query as dbQuery } from './src/lib/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.set('trust proxy', 1);
const port = process.env.PORT || 3000;
const apiBase = 'https://marketplace.api.healthcare.gov/api/v1';
const cmsApiKey = process.env.MARKETPLACE_API_KEY || process.env.VITE_MARKETPLACE_API_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const NOTIFICATION_TO = process.env.NOTIFICATION_TO || 'jayedbinkawsar797@gmail.com';
const NOTIFICATION_FROM = process.env.NOTIFICATION_FROM || 'Health Coverage AI Leads <noreply@healthcoveragequote.com>';
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

// Zoho CRM integration disabled (leads dispatched exclusively to email & local store)

// SMS verification disabled - Direct instant unlock active

const otpCache = new Map();
const autoCaptureTimers = new Map();

// Label mapping helpers for lead fields
function getSituationLabel(value) {
  const mapping = {
    'lost-job': 'Lost job / COBRA ending',
    'turning-26': 'Turning 26 / aging off parents',
    'moved': 'Recently moved',
    'life-event': 'Marriage / baby',
    'self-employed': 'Self-employed',
    'exploring': 'Just exploring options'
  };
  return mapping[value] || value || '—';
}

function getPlanPreferenceLabel(value) {
  const mapping = {
    'ppo': 'PPO',
    'hmo': 'HMO',
    'not-sure': 'Not sure'
  };
  return mapping[value] || value || '—';
}

function getUrgencyLabel(value) {
  const mapping = {
    'asap': 'ASAP',
    '30-60': 'Within 30-60 days',
    'researching': 'Just researching'
  };
  return mapping[value] || value || '—';
}

// Offline ZIP-to-state lookup helper
function getStateFromZipPrefix(zipCode) {
  const zip = parseInt(zipCode, 10);
  if (isNaN(zip)) return 'CA';
  const prefix3 = Math.floor(zip / 100);
  
  if (prefix3 >= 900 && prefix3 <= 961) return 'CA';
  if (prefix3 >= 750 && prefix3 <= 799) return 'TX';
  if (prefix3 >= 100 && prefix3 <= 149) return 'NY';
  if (prefix3 >= 320 && prefix3 <= 349) return 'FL';
  if (prefix3 >= 150 && prefix3 <= 196) return 'PA';
  if (prefix3 >= 600 && prefix3 <= 629) return 'IL';
  if (prefix3 >= 430 && prefix3 <= 459) return 'OH';
  if (prefix3 >= 480 && prefix3 <= 499) return 'MI';
  if (prefix3 >= 300 && prefix3 <= 319) return 'GA';
  if (prefix3 >= 270 && prefix3 <= 289) return 'NC';
  if (prefix3 >= 850 && prefix3 <= 865) return 'AZ';
  if (prefix3 >= 220 && prefix3 <= 246) return 'VA';
  if (prefix3 >= 980 && prefix3 <= 994) return 'WA';
  if (prefix3 >= 370 && prefix3 <= 385) return 'TN';
  if (prefix3 >= 460 && prefix3 <= 479) return 'IN';
  if (prefix3 >= 630 && prefix3 <= 658) return 'MO';
  if (prefix3 >= 206 && prefix3 <= 219) return 'MD';
  if (prefix3 >= 530 && prefix3 <= 549) return 'WI';
  if (prefix3 >= 800 && prefix3 <= 816) return 'CO';
  if (prefix3 >= 550 && prefix3 <= 567) return 'MN';
  if (prefix3 >= 350 && prefix3 <= 369) return 'AL';
  if (prefix3 >= 290 && prefix3 <= 299) return 'SC';
  if (prefix3 >= 400 && prefix3 <= 427) return 'KY';
  if (prefix3 >= 970 && prefix3 <= 979) return 'OR';
  if (prefix3 >= 730 && prefix3 <= 749) return 'OK';
  if (prefix3 >= 660 && prefix3 <= 679) return 'KS';
  if (prefix3 >= 716 && prefix3 <= 729) return 'AR';
  if (prefix3 >= 840 && prefix3 <= 847) return 'UT';
  if (prefix3 >= 500 && prefix3 <= 528) return 'IA';
  if (prefix3 >= 890 && prefix3 <= 898) return 'NV';
  if (prefix3 >= 386 && prefix3 <= 397) return 'MS';
  if (prefix3 >= 700 && prefix3 <= 714) return 'LA';
  if (prefix3 >= 247 && prefix3 <= 268) return 'WV';
  if (prefix3 >= 820 && prefix3 <= 831) return 'WY';
  if (prefix3 >= 832 && prefix3 <= 838) return 'ID';
  if (prefix3 >= 590 && prefix3 <= 599) return 'MT';
  if (prefix3 >= 570 && prefix3 <= 577) return 'SD';
  if (prefix3 >= 580 && prefix3 <= 588) return 'ND';
  if (prefix3 >= 870 && prefix3 <= 884) return 'NM';
  if (prefix3 >= 680 && prefix3 <= 693) return 'NE';
  if (prefix3 >= 967 && prefix3 <= 968) return 'HI';
  if (prefix3 >= 995 && prefix3 <= 999) return 'AK';
  
  const firstDigit = zipCode[0];
  if (firstDigit === '0') return 'MA';
  if (firstDigit === '1') return 'NY';
  if (firstDigit === '2') return 'VA';
  if (firstDigit === '3') return 'FL';
  if (firstDigit === '4') return 'OH';
  if (firstDigit === '5') return 'MN';
  if (firstDigit === '6') return 'IL';
  if (firstDigit === '7') return 'TX';
  if (firstDigit === '8') return 'CO';
  if (firstDigit === '9') return 'CA';
  
  return 'CA';
}




async function getLeadById(id) {
  try {
    const dbResult = await dbQuery(`SELECT * FROM leads WHERE id = $1`, [id]);
    if (dbResult && dbResult.rows?.[0]) {
      const row = dbResult.rows[0];
      return {
        id: row.id,
        runId: row.run_id,
        fullName: row.full_name,
        phone: row.phone,
        email: row.email,
        smsConsent: row.sms_consent,
        callConsent: row.call_consent,
        zipCode: row.zip_code,
        state: row.state,
        incomeRange: row.income_range,
        householdSize: row.household_size,
        situation: row.situation,
        planPreference: row.plan_preference,
        urgency: row.urgency,
        agentName: row.agent_name,
        verified: row.verified,
        status: row.status,
        zohoLeadId: row.zoho_lead_id,
        utmSource: row.utm_source,
        utmMedium: row.utm_medium,
        utmCampaign: row.utm_campaign,
        utmContent: row.utm_content,
        utmTerm: row.utm_term,
        createdAt: row.created_at,
      };
    }
  } catch (dbErr) {
    console.error('[Database] getLeadById failed:', dbErr.message);
  }

  // JSON fallback
  const file = path.join(__dirname, 'leads.json');
  try {
    const leads = JSON.parse(await fs.readFile(file, 'utf8'));
    return leads.find((l) => l.id === id) || null;
  } catch {
    return null;
  }
}

async function saveOrUpdateLead(lead) {
  let dbResult = null;
  try {
    dbResult = await dbQuery(
      `INSERT INTO leads
         (id, run_id, full_name, phone, email, sms_consent, call_consent,
          zip_code, state, income_range, household_size, situation, plan_preference, urgency, agent_name, verified, status, zoho_lead_id,
          utm_source, utm_medium, utm_campaign, utm_content, utm_term)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
       ON CONFLICT (id) DO UPDATE SET
         full_name = COALESCE(EXCLUDED.full_name, leads.full_name),
         phone = COALESCE(EXCLUDED.phone, leads.phone),
         email = COALESCE(EXCLUDED.email, leads.email),
         sms_consent = COALESCE(EXCLUDED.sms_consent, leads.sms_consent),
         call_consent = COALESCE(EXCLUDED.call_consent, leads.call_consent),
         zip_code = COALESCE(EXCLUDED.zip_code, leads.zip_code),
         state = COALESCE(EXCLUDED.state, leads.state),
         income_range = COALESCE(EXCLUDED.income_range, leads.income_range),
         household_size = COALESCE(EXCLUDED.household_size, leads.household_size),
         situation = COALESCE(EXCLUDED.situation, leads.situation),
         plan_preference = COALESCE(EXCLUDED.plan_preference, leads.plan_preference),
         urgency = COALESCE(EXCLUDED.urgency, leads.urgency),
         agent_name = COALESCE(EXCLUDED.agent_name, leads.agent_name),
         verified = COALESCE(EXCLUDED.verified, leads.verified),
         status = COALESCE(EXCLUDED.status, leads.status),
         zoho_lead_id = COALESCE(EXCLUDED.zoho_lead_id, leads.zoho_lead_id),
         utm_source = COALESCE(EXCLUDED.utm_source, leads.utm_source),
         utm_medium = COALESCE(EXCLUDED.utm_medium, leads.utm_medium),
         utm_campaign = COALESCE(EXCLUDED.utm_campaign, leads.utm_campaign),
         utm_content = COALESCE(EXCLUDED.utm_content, leads.utm_content),
         utm_term = COALESCE(EXCLUDED.utm_term, leads.utm_term)
       RETURNING *`,
      [
        lead.id,
        lead.runId ?? null,
        lead.fullName ?? lead.name ?? null,
        lead.phone ?? null,
        lead.email ?? null,
        lead.smsConsent ?? false,
        lead.callConsent ?? false,
        lead.zipCode ?? null,
        lead.state ?? null,
        lead.incomeRange ?? null,
        lead.householdSize ? Number(lead.householdSize) : null,
        lead.situation ?? null,
        lead.planPreference ?? null,
        lead.urgency ?? null,
        lead.agentName ?? lead.agent?.name ?? null,
        lead.verified ?? false,
        lead.status ?? 'draft',
        lead.zohoLeadId ?? null,
        lead.utmSource ?? null,
        lead.utmMedium ?? null,
        lead.utmCampaign ?? null,
        lead.utmContent ?? null,
        lead.utmTerm ?? null,
      ]
    );
  } catch (dbErr) {
    console.error('[Database] saveOrUpdateLead failed:', dbErr.message);
  }

  if (dbResult && dbResult.rows?.[0]) {
    const row = dbResult.rows[0];
    return {
      id: row.id,
      runId: row.run_id,
      fullName: row.full_name,
      phone: row.phone,
      email: row.email,
      smsConsent: row.sms_consent,
      callConsent: row.call_consent,
      zipCode: row.zip_code,
      state: row.state,
      incomeRange: row.income_range,
      householdSize: row.household_size,
      situation: row.situation,
      planPreference: row.plan_preference,
      urgency: row.urgency,
      agentName: row.agent_name,
      verified: row.verified,
      status: row.status,
      zohoLeadId: row.zoho_lead_id,
      utmSource: row.utm_source,
      utmMedium: row.utm_medium,
      utmCampaign: row.utm_campaign,
      utmContent: row.utm_content,
      utmTerm: row.utm_term,
      createdAt: row.created_at,
    };
  }

  // Fallback to JSON file
  const file = path.join(__dirname, 'leads.json');
  let leads = [];
  try {
    leads = JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    leads = [];
  }

  const existingIndex = leads.findIndex((l) => l.id === lead.id);
  let updatedLead;
  if (existingIndex !== -1) {
    updatedLead = {
      ...leads[existingIndex],
      ...lead,
      fullName: lead.fullName ?? lead.name ?? leads[existingIndex].fullName ?? leads[existingIndex].name,
      phone: lead.phone ?? leads[existingIndex].phone,
      email: lead.email ?? leads[existingIndex].email,
      smsConsent: lead.smsConsent ?? leads[existingIndex].smsConsent,
      callConsent: lead.callConsent ?? leads[existingIndex].callConsent,
      status: lead.status ?? leads[existingIndex].status,
      verified: lead.verified ?? leads[existingIndex].verified,
      zohoLeadId: lead.zohoLeadId ?? leads[existingIndex].zohoLeadId,
    };
    leads[existingIndex] = updatedLead;
  } else {
    updatedLead = {
      createdAt: new Date().toISOString(),
      ...lead,
      fullName: lead.fullName ?? lead.name ?? '',
      status: lead.status ?? 'draft',
      verified: lead.verified ?? false,
    };
    leads.unshift(updatedLead);
  }

  await fs.writeFile(file, JSON.stringify(leads.slice(0, 500), null, 2));
  return updatedLead;
}

// zohoCreateLead removed

// zohoUpdateLead removed

async function sendLeadNotification(lead, body) {
  const agentName = body.agentName || body.agent?.name || 'None selected (unlocked results page)';
  let statusLabel = 'Captured';
  let color = '#2563eb';

  if (lead.status === 'draft' || lead.status === 'captured') {
    statusLabel = 'Pending Consent / Auto-Captured';
    color = '#f59e0b';
  } else if (lead.status === 'submitted') {
    statusLabel = 'Submitted (OTP Verification Sent)';
    color = '#3b82f6';
  } else if (lead.status === 'verified') {
    statusLabel = 'Verified (SMS Code Confirmed)';
    color = '#16a34a';
  }

  if (!resend) {
    console.warn(`[Resend] RESEND_API_KEY is not configured; skipping email dispatch for "${body.fullName || body.name || 'Unknown'}".`);
    return;
  }

  try {
    const plans = await getPlansForLead(body);
    console.log(`[Resend] Attempting to send lead email for "${body.fullName || body.name || 'Unknown'}" (Status: ${lead.status}) to ${NOTIFICATION_TO}...`);
    const data = await resend.emails.send({
      from: NOTIFICATION_FROM,
      to: [NOTIFICATION_TO],
      subject: `🔔 [${statusLabel}] New Lead: ${body.fullName || body.name || 'Unknown'} — Health Coverage AI`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
          <h2 style="color:${color};margin-bottom:4px;margin-top:0;">Lead Status: ${statusLabel}</h2>
          <p style="color:#6b7280;margin-top:0;">Health Coverage AI Calculator</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;">
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px 0;color:#374151;font-weight:600;width:35%;">Name</td><td style="padding:8px 0;color:#111827;">${body.fullName || body.name || '—'}</td></tr>
            <tr><td style="padding:8px 0;color:#374151;font-weight:600;">Phone</td><td style="padding:8px 0;color:#111827;">${body.phone || '—'}</td></tr>
            <tr><td style="padding:8px 0;color:#374151;font-weight:600;">Email</td><td style="padding:8px 0;color:#111827;">${body.email || '—'}</td></tr>
            <tr><td style="padding:8px 0;color:#374151;font-weight:600;">Assigned Agent</td><td style="padding:8px 0;color:#2563eb;font-weight:600;">${agentName}</td></tr>
            <tr><td style="padding:8px 0;color:#374151;font-weight:600;">ZIP Code</td><td style="padding:8px 0;color:#111827;">${body.zipCode || '—'}</td></tr>
            <tr><td style="padding:8px 0;color:#374151;font-weight:600;">State</td><td style="padding:8px 0;color:#111827;">${body.state || '—'}</td></tr>
            <tr><td style="padding:8px 0;color:#374151;font-weight:600;">Income Range</td><td style="padding:8px 0;color:#111827;">${body.incomeRange || '—'}</td></tr>
            <tr><td style="padding:8px 0;color:#374151;font-weight:600;">Household Size</td><td style="padding:8px 0;color:#111827;">${body.householdSize || '—'}</td></tr>
            <tr><td style="padding:8px 0;color:#374151;font-weight:600;">Situation</td><td style="padding:8px 0;color:#111827;">${getSituationLabel(body.situation)}</td></tr>
            <tr><td style="padding:8px 0;color:#374151;font-weight:600;">Plan Preference</td><td style="padding:8px 0;color:#111827;">${getPlanPreferenceLabel(body.planPreference)}</td></tr>
            <tr><td style="padding:8px 0;color:#374151;font-weight:600;">Urgency</td><td style="padding:8px 0;color:#111827;">${getUrgencyLabel(body.urgency)}</td></tr>
            <tr><td style="padding:8px 0;color:#374151;font-weight:600;">SMS Consent</td><td style="padding:8px 0;color:#111827;">${body.smsConsent ? 'Yes' : 'No'}</td></tr>
            <tr><td style="padding:8px 0;color:#374151;font-weight:600;">Call Consent</td><td style="padding:8px 0;color:#111827;">${body.callConsent ? 'Yes' : 'No'}</td></tr>
            <tr><td style="padding:8px 0;color:#374151;font-weight:600;">Lead ID</td><td style="padding:8px 0;color:#6b7280;font-size:12px;">${lead.id}</td></tr>
            
            ${body.utmCampaign ? `<tr><td style="padding:8px 0;color:#374151;font-weight:600;">UTM Campaign</td><td style="padding:8px 0;color:#e11d48;font-weight:600;">${body.utmCampaign}</td></tr>` : ''}
            ${body.utmContent ? `<tr><td style="padding:8px 0;color:#374151;font-weight:600;">UTM Ad Name</td><td style="padding:8px 0;color:#e11d48;font-weight:600;">${body.utmContent}</td></tr>` : ''}
            ${body.utmSource ? `<tr><td style="padding:8px 0;color:#374151;font-weight:600;">UTM Source</td><td style="padding:8px 0;color:#111827;">${body.utmSource}</td></tr>` : ''}
            ${body.utmMedium ? `<tr><td style="padding:8px 0;color:#374151;font-weight:600;">UTM Medium</td><td style="padding:8px 0;color:#111827;">${body.utmMedium}</td></tr>` : ''}
            ${body.utmTerm ? `<tr><td style="padding:8px 0;color:#374151;font-weight:600;">UTM Adset Name</td><td style="padding:8px 0;color:#111827;">${body.utmTerm}</td></tr>` : ''}
            <tr><td style="padding:8px 0;color:#374151;font-weight:600;">Created At</td><td style="padding:8px 0;color:#6b7280;">${new Date(lead.createdAt || new Date()).toLocaleString('en-US', { timeZone: 'America/New_York' })} ET</td></tr>
          </table>

          <h3 style="color:#1e3a8a;margin-top:24px;margin-bottom:8px;">Rates & Coverage Options Seen (Top 7 Plans):</h3>
          <table style="width:100%;border-collapse:collapse;margin-top:8px;border:1px solid #e5e7eb;">
            <thead>
              <tr style="background-color:#f9fafb;text-align:left;border-bottom:1px solid #e5e7eb;">
                <th style="padding:8px;font-size:12px;color:#4b5563;font-weight:600;border:1px solid #e5e7eb;">Issuer</th>
                <th style="padding:8px;font-size:12px;color:#4b5563;font-weight:600;border:1px solid #e5e7eb;">Plan Name</th>
                <th style="padding:8px;font-size:12px;color:#4b5563;font-weight:600;border:1px solid #e5e7eb;">Metal Level</th>
                <th style="padding:8px;font-size:12px;color:#4b5563;font-weight:600;border:1px solid #e5e7eb;">Type</th>
                <th style="padding:8px;font-size:12px;color:#4b5563;font-weight:600;border:1px solid #e5e7eb;text-align:right;">Premium</th>
                <th style="padding:8px;font-size:12px;color:#4b5563;font-weight:600;border:1px solid #e5e7eb;text-align:right;">Deductible</th>
              </tr>
            </thead>
            <tbody>
              ${plans.map(p => {
                const displayPremium = p.premiumWithCredit !== undefined ? p.premiumWithCredit : p.premium;
                const note = p.premiumWithCredit !== undefined ? ' <span style="font-size:10px;color:#6b7280;font-weight:normal;">(w/ credit)</span>' : '';
                return `
                  <tr style="border-bottom:1px solid #e5e7eb;">
                    <td style="padding:8px;font-size:13px;color:#1f2937;border:1px solid #e5e7eb;">${p.issuer}</td>
                    <td style="padding:8px;font-size:13px;color:#1f2937;border:1px solid #e5e7eb;">${p.name}</td>
                    <td style="padding:8px;font-size:13px;color:#4b5563;border:1px solid #e5e7eb;">${p.metalLevel}</td>
                    <td style="padding:8px;font-size:13px;color:#4b5563;border:1px solid #e5e7eb;">${p.type}</td>
                    <td style="padding:8px;font-size:13px;color:#16a34a;font-weight:bold;text-align:right;border:1px solid #e5e7eb;">$${displayPremium}/mo${note}</td>
                    <td style="padding:8px;font-size:13px;color:#4b5563;text-align:right;border:1px solid #e5e7eb;">$${p.deductible}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;">
          <p style="color:#9ca3af;font-size:12px;">Sent by Health Coverage AI &mdash; Do not reply to this email.</p>
        </div>
      `,
    });
    console.log('[Resend] Email sent successfully. Response:', JSON.stringify(data));
  } catch (err) {
    console.error('[Resend] Lead notification email failed:', err.message);
  }
}

// Twilio Lookup v2 Helper
async function lookupPhoneNumber(phone) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    console.warn('[Twilio Lookup] Credentials missing. Returning mock success.');
    return { valid: true, lineType: 'mobile', carrier: 'Mock Mobile' };
  }

  let formattedPhone = phone.trim().replace(/\D/g, '');
  if (formattedPhone.length === 11 && formattedPhone.startsWith('1')) {
    formattedPhone = formattedPhone.slice(1);
  }
  const e164 = `+1${formattedPhone}`;

  try {
    const url = `https://lookups.twilio.com/v2/PhoneNumbers/${e164}?fields=line_type_intelligence`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64'),
      },
    });

    if (!response.ok) {
      const errData = await response.json();
      console.warn('[Twilio Lookup Error]', errData);
      return { valid: false, error: errData.message || 'Invalid phone number.' };
    }

    const data = await response.json();
    return {
      valid: data.valid ?? false,
      lineType: data.line_type_intelligence?.line_type || 'unknown',
      carrier: data.line_type_intelligence?.carrier_name || 'unknown',
    };
  } catch (err) {
    console.error('[Twilio Lookup Exception]', err.message);
    // Don't block users if Twilio API is temporarily offline
    return { valid: true, lineType: 'unknown', carrier: 'unknown' };
  }
}

// Twilio Verification Helper Functions
async function sendVerificationOtp(phone) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    console.warn('[Twilio] Credentials missing. Logging code in console.');
    const code = '123456';
    console.log(`[DEV OTP] Verification code for ${phone} is: ${code}`);
    return { success: true, method: 'dev', code };
  }

  // Format to E.164: must start with '+'
  let formattedPhone = phone.trim().replace(/\D/g, '');
  if (!formattedPhone.startsWith('+')) {
    if (formattedPhone.length === 10) {
      formattedPhone = '+1' + formattedPhone;
    } else if (formattedPhone.length === 11 && formattedPhone.startsWith('1')) {
      formattedPhone = '+' + formattedPhone;
    } else {
      formattedPhone = '+' + formattedPhone;
    }
  }

  if (TWILIO_VERIFY_SERVICE_SID) {
    // Method A: Twilio Verify API
    const url = `https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SERVICE_SID}/Verifications`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64'),
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: formattedPhone,
        Channel: 'sms',
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('[Twilio Verify Send Error]', data);
      throw new Error(data.message || 'Failed to send verification code.');
    }
    return { success: true, method: 'verify', sid: data.sid };
  } else {
    // Method B: Standard Twilio SMS fallback (manual OTP)
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60_000; // 5 mins
    otpCache.set(formattedPhone, { code, expiresAt });

    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER?.trim().replace(/['"]/g, '');
    if (!twilioPhoneNumber) {
      throw new Error('TWILIO_PHONE_NUMBER is required when TWILIO_VERIFY_SERVICE_SID is not set.');
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64'),
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: formattedPhone,
        From: twilioPhoneNumber,
        Body: `Your Health Coverage AI verification code is: ${code}. Valid for 5 minutes.`,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('[Twilio SMS Send Error]', data);
      throw new Error(data.message || 'Failed to send SMS code.');
    }
    return { success: true, method: 'sms', sid: data.sid };
  }
}

async function checkVerificationOtp(phone, code) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    // Dev Mode bypass
    return code === '123456';
  }

  let formattedPhone = phone.trim().replace(/\D/g, '');
  if (!formattedPhone.startsWith('+')) {
    if (formattedPhone.length === 10) {
      formattedPhone = '+1' + formattedPhone;
    } else if (formattedPhone.length === 11 && formattedPhone.startsWith('1')) {
      formattedPhone = '+' + formattedPhone;
    } else {
      formattedPhone = '+' + formattedPhone;
    }
  }

  if (TWILIO_VERIFY_SERVICE_SID) {
    // Method A: Twilio Verify API check
    const url = `https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SERVICE_SID}/VerificationCheck`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64'),
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: formattedPhone,
        Code: code,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('[Twilio Verify Check Error]', data);
      return false;
    }
    return data.status === 'approved';
  } else {
    // Method B: Manual OTP cache check
    const record = otpCache.get(formattedPhone);
    if (!record) return false;
    if (Date.now() > record.expiresAt) {
      otpCache.delete(formattedPhone);
      return false;
    }
    const isCorrect = record.code === code.trim();
    if (isCorrect) {
      otpCache.delete(formattedPhone);
    }
    return isCorrect;
  }
}

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(rateLimit({ windowMs: 60_000, limit: 120 }));

function parseAgeFromBirthYear(birthYear) {
  const year = Number(birthYear);
  const currentYear = new Date().getFullYear();
  if (!Number.isFinite(year) || year < 1900 || year > currentYear) return 35;
  return Math.max(0, currentYear - year);
}

function parseIncome(incomeRange, householdSize = 1) {
  if (!incomeRange || incomeRange === 'Prefer not to say') return 42000 + (householdSize - 1) * 9000;
  if (incomeRange.startsWith('Under')) return 20000;
  if (incomeRange.endsWith('+')) return 110000;
  const numbers = incomeRange.match(/\d[\d,]*/g)?.map((value) => Number(value.replace(/,/g, ''))) ?? [];
  if (numbers.length >= 2) return Math.max(numbers[0], numbers[1]);
  return numbers[0] || 42000;
}

async function marketplaceFetch(pathname, options = {}) {
  if (!cmsApiKey) throw new Error('Missing MARKETPLACE_API_KEY');
  const joiner = pathname.includes('?') ? '&' : '?';
  const response = await fetch(`${apiBase}${pathname}${joiner}apikey=${cmsApiKey}`, options);
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!response.ok) {
    const error = new Error(`CMS Marketplace API ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

function normalizePlan(plan, index) {
  const premium = Number(plan.premium ?? plan.premium_w_credit ?? 0);
  const deductible = Number(
    plan.deductibles?.[0]?.amount ??
    plan.deductible ??
    plan.medical_deductible ??
    0
  );
  const rawPremiumWithCredit = plan.premium_w_credit !== undefined ? Number(plan.premium_w_credit) : undefined;
  return {
    id: plan.id || plan.plan_id || `plan-${index}`,
    name: plan.name || plan.marketing_name || 'Marketplace Plan',
    issuer: plan.issuer?.name || plan.issuer_name || 'CMS Marketplace',
    metalLevel: plan.metal_level || plan.metalLevel || 'Marketplace',
    type: plan.type || plan.plan_type || 'Plan',
    premium: Number.isFinite(premium) ? Math.round(premium) : 0,
    deductible: Number.isFinite(deductible) ? Math.round(deductible) : 0,
    ...(rawPremiumWithCredit !== undefined && Number.isFinite(rawPremiumWithCredit)
      ? { premiumWithCredit: Math.max(0, Math.round(rawPremiumWithCredit)) }
      : {}),
  };
}

function fallbackPlans() {
  return [
    { id: 'fallback-1', issuer: 'Aetna', metalLevel: 'Bronze', name: 'Bronze HMO Saver', premium: 347, deductible: 6000, type: 'HMO' },
    { id: 'fallback-2', issuer: 'Blue Cross', metalLevel: 'Bronze', name: 'Bronze Standard PPO', premium: 396, deductible: 5500, type: 'PPO' },
    { id: 'fallback-3', issuer: 'UnitedHealth', metalLevel: 'Silver', name: 'Silver HMO Value', premium: 470, deductible: 3500, type: 'HMO' },
    { id: 'fallback-4', issuer: 'Blue Cross', metalLevel: 'Silver', name: 'Silver PPO Choice', premium: 495, deductible: 2500, type: 'PPO' },
    { id: 'fallback-5', issuer: 'Kaiser Permanente', metalLevel: 'Gold', name: 'Gold HMO Premier', premium: 594, deductible: 1000, type: 'HMO' },
    { id: 'fallback-6', issuer: 'Cigna', metalLevel: 'Gold', name: 'Gold PPO Advantage', premium: 668, deductible: 750, type: 'PPO' },
    { id: 'fallback-7', issuer: 'UnitedHealth', metalLevel: 'Platinum', name: 'Platinum HMO Elite', premium: 767, deductible: 250, type: 'HMO' },
  ];
}

async function getPlansForLead(lead) {
  try {
    const zipCode = String(lead.zipCode || lead.zip_code || '').slice(0, 5);
    const householdSize = Number(lead.householdSize || lead.household_size || 1);
    if (!zipCode) return fallbackPlans();

    const countyData = await marketplaceFetch(`/counties/by/zip/${zipCode}`);
    const county = (Array.isArray(countyData?.counties) ? countyData.counties : countyData)?.[0];
    if (!county?.fips) return fallbackPlans();

    const people = Array.from({ length: householdSize }, (_, index) => ({
      age: index === 0 ? parseAgeFromBirthYear(lead.birthYear || lead.birth_year) : 35,
      aptc_eligible: true,
      gender: 'Female',
      uses_tobacco: false,
    }));

    const planData = await marketplaceFetch('/plans/search', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        household: { income: parseIncome(lead.incomeRange || lead.income_range, householdSize), people },
        market: 'Individual',
        place: { countyfips: county.fips, state: county.state || lead.state, zipcode: zipCode },
        year: new Date().getFullYear(),
      }),
    });

    const plans = (planData.plans || [])
      .map(normalizePlan)
      .filter((plan) => plan.premium > 0)
      .sort((a, b) => a.premium - b.premium)
      .slice(0, 7);

    return plans.length ? plans : fallbackPlans();
  } catch (err) {
    console.error('[Marketplace fetch for email failed]', err.message);
    return fallbackPlans();
  }
}

app.post('/api/phone/lookup', async (req, res) => {
  const { phone } = req.body || {};
  if (!phone) {
    return res.status(400).json({ ok: false, error: 'Phone number is required.' });
  }

  const lookupResult = await lookupPhoneNumber(phone);
  return res.json({ ok: true, ...lookupResult });
});

app.get('/api/zip-lookup/:zipCode', async (req, res) => {
  const { zipCode } = req.params;
  if (!zipCode || zipCode.length !== 5) {
    return res.status(400).json({ ok: false, error: 'Invalid ZIP code format' });
  }

  try {
    const countyData = await marketplaceFetch(`/counties/by/zip/${zipCode}`);
    const county = (Array.isArray(countyData?.counties) ? countyData.counties : countyData)?.[0];
    if (county && county.state) {
      return res.json({ ok: true, state: county.state, countyName: county.name });
    }
  } catch (err) {
    console.error(`[ZIP Lookup API Error] CMS fetch failed for ${zipCode}:`, err.message);
  }

  // Fallback to prefix-based lookup if CMS API fails or has no match
  const state = getStateFromZipPrefix(zipCode);
  return res.json({ ok: true, state, source: 'fallback' });
});

app.post('/api/marketplace/results', async (req, res) => {
  const inputs = req.body || {};
  const householdSize = Number(inputs.householdSize || 1);
  const zipCode = String(inputs.zipCode || '').slice(0, 5);

  try {
    const countyData = await marketplaceFetch(`/counties/by/zip/${zipCode}`);
    const county = (Array.isArray(countyData?.counties) ? countyData.counties : countyData)?.[0];
    if (!county?.fips) throw new Error('No county found');

    const people = Array.from({ length: householdSize }, (_, index) => ({
      age: index === 0 ? parseAgeFromBirthYear(inputs.birthYear) : 35,
      aptc_eligible: true,
      gender: 'Female',
      uses_tobacco: false,
    }));

    const planData = await marketplaceFetch('/plans/search', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        household: { income: parseIncome(inputs.incomeRange, householdSize), people },
        market: 'Individual',
        place: { countyfips: county.fips, state: county.state || inputs.state, zipcode: zipCode },
        year: new Date().getFullYear(),
      }),
    });

    const plans = (planData.plans || [])
      .map(normalizePlan)
      .filter((plan) => plan.premium > 0)
      .sort((a, b) => a.premium - b.premium)
      .slice(0, 7);

    res.json({
      source: plans.length ? 'cms-marketplace' : 'fallback',
      zipCode,
      countyName: county.name,
      validThrough: new Date().getFullYear(),
      plans: plans.length ? plans : fallbackPlans(),
    });
  } catch (error) {
    res.json({
      source: 'fallback',
      zipCode,
      validThrough: new Date().getFullYear(),
      plans: fallbackPlans(),
    });
  }
});

app.post('/api/leads', async (req, res) => {
  const body = req.body || {};

  // 1. Honeypot check for bots
  if (body.url_website_verification) {
    console.warn(`[Spam Blocked] Honeypot field was filled by bot. Payload: ${JSON.stringify(body)}`);
    return res.status(400).json({ ok: false, error: 'Spam detected.' });
  }

  // 2. Email Validation (Blocklist & Character Repeating patterns)
  const email = (body.email || '').trim().toLowerCase();
  const emailDomain = email.split('@')[1];
  const blocklistedDomains = [
    'test.com', 'example.com', 'mailinator.com', 'yopmail.com', 
    'tempmail.com', 'temp-mail.org', 'guerrillamail.com', 
    'dispostable.com', '10minutemail.com', 'trashmail.com'
  ];
  if (emailDomain && blocklistedDomains.includes(emailDomain)) {
    console.warn(`[Spam Blocked] Disposable or blocklisted email domain: ${email}`);
    return res.status(400).json({ ok: false, error: 'Disposable or invalid email domains are not allowed.' });
  }
  
  const localPart = email.split('@')[0];
  if (localPart && /^(.)\1{3,}$/.test(localPart)) {
    console.warn(`[Spam Blocked] Repeating characters in local email part: ${email}`);
    return res.status(400).json({ ok: false, error: 'Please enter a valid personal email address.' });
  }

  // 3. Phone Validation (Length, NANP prefixes, repeating/sequential sequences)
  const rawPhone = body.phone || '';
  const digits = rawPhone.replace(/\D/g, '');
  const phoneDigits = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;

  if (phoneDigits) {
    if (phoneDigits.length !== 10) {
      console.warn(`[Spam Blocked] Phone length is not 10 digits: ${phoneDigits}`);
      return res.status(400).json({ ok: false, error: 'Please enter a valid 10-digit phone number.' });
    }

    const areaCodeFirst = phoneDigits[0];
    const prefixFirst = phoneDigits[3];
    if (areaCodeFirst === '0' || areaCodeFirst === '1' || prefixFirst === '0' || prefixFirst === '1') {
      console.warn(`[Spam Blocked] Invalid area code/prefix digit starting with 0/1: ${phoneDigits}`);
      return res.status(400).json({ ok: false, error: 'Please enter a valid phone number (area code and prefix cannot start with 0 or 1).' });
    }

    const allSame = /^(.)\1+$/.test(phoneDigits);
    const isSequential = '01234567890123456789'.includes(phoneDigits) || '98765432109876543210'.includes(phoneDigits);
    if (allSame || isSequential) {
      console.warn(`[Spam Blocked] Repeating or sequential fake phone number: ${phoneDigits}`);
      return res.status(400).json({ ok: false, error: 'Please enter a valid, active phone number.' });
    }
  }

  // Determine lead ID (use existing one if provided, or generate new one)
  const leadId = body.id || crypto.randomUUID();

  // Clear any existing timer for this lead
  if (autoCaptureTimers.has(leadId)) {
    clearTimeout(autoCaptureTimers.get(leadId));
    autoCaptureTimers.delete(leadId);
  }

  // Retrieve existing lead (if any) to check status and zohoLeadId
  const existingLead = await getLeadById(leadId);
  const currentStatus = existingLead?.status || 'draft';
  const zohoLeadId = existingLead?.zohoLeadId || null;

  // Determine target status
  let targetStatus = 'draft';
  if (body.autoCapture) {
    if (currentStatus === 'captured' || currentStatus === 'submitted' || currentStatus === 'verified' || currentStatus === 'captured_notified') {
      targetStatus = currentStatus;
    } else {
      targetStatus = 'captured';
    }
  } else {
    targetStatus = 'submitted';
  }

  const leadToSave = {
    id: leadId,
    runId: body.runId,
    fullName: body.fullName || body.name,
    phone: body.phone,
    email: body.email,
    smsConsent: body.smsConsent,
    callConsent: body.callConsent,
    zipCode: body.zipCode,
    state: body.state,
    incomeRange: body.incomeRange,
    householdSize: body.householdSize,
    situation: body.situation,
    planPreference: body.planPreference,
    urgency: body.urgency,
    agentName: body.agentName,
    verified: existingLead?.verified || false,
    status: targetStatus,
    zohoLeadId: zohoLeadId,
    utmSource: body.utmSource,
    utmMedium: body.utmMedium,
    utmCampaign: body.utmCampaign,
    utmContent: body.utmContent,
    utmTerm: body.utmTerm,
  };

  // Save/Update lead
  const savedLead = await saveOrUpdateLead(leadToSave);

  // Map fields for Zoho & Email
  const mappedLead = {
    fullName: savedLead.fullName || '',
    phone: savedLead.phone || '',
    email: savedLead.email || '',
    zipCode: savedLead.zipCode || '',
    state: savedLead.state || '',
    incomeRange: savedLead.incomeRange || '',
    householdSize: savedLead.householdSize || 1,
    situation: savedLead.situation || '',
    planPreference: savedLead.planPreference || '',
    urgency: savedLead.urgency || '',
    smsConsent: savedLead.smsConsent || false,
    callConsent: savedLead.callConsent || false,
    agentName: savedLead.agentName || '',
    verified: savedLead.verified || false,
    status: savedLead.status || 'draft',
    utmSource: savedLead.utmSource || '',
    utmMedium: savedLead.utmMedium || '',
    utmCampaign: savedLead.utmCampaign || '',
    utmContent: savedLead.utmContent || '',
    utmTerm: savedLead.utmTerm || '',
  };

  // State Transition Actions
  if (body.autoCapture) {
    if (currentStatus === 'draft' || currentStatus === 'captured') {
      console.log(`[Auto-Capture Window] Starting 60s timer for lead ${leadId}`);
      const timer = setTimeout(async () => {
        autoCaptureTimers.delete(leadId);
        try {
          const latestLead = await getLeadById(leadId);
          if (latestLead && (latestLead.status === 'captured' || latestLead.status === 'draft')) {
            const mapped = {
              fullName: latestLead.fullName || '',
              phone: latestLead.phone || '',
              email: latestLead.email || '',
              zipCode: latestLead.zipCode || '',
              state: latestLead.state || '',
              incomeRange: latestLead.incomeRange || '',
              householdSize: latestLead.householdSize || 1,
              situation: latestLead.situation || '',
              planPreference: latestLead.planPreference || '',
              urgency: latestLead.urgency || '',
              smsConsent: latestLead.smsConsent || false,
              callConsent: latestLead.callConsent || false,
              agentName: latestLead.agentName || '',
              verified: latestLead.verified || false,
              status: 'captured_notified',
              utmSource: latestLead.utmSource || '',
              utmMedium: latestLead.utmMedium || '',
              utmCampaign: latestLead.utmCampaign || '',
              utmContent: latestLead.utmContent || '',
              utmTerm: latestLead.utmTerm || '',
            };

            latestLead.status = 'captured_notified';
            const finalSavedLead = await saveOrUpdateLead(latestLead);

            await sendLeadNotification(finalSavedLead, mapped);
            console.log(`[Auto-Capture Window] Window expired. Sent deferred email notification to ${NOTIFICATION_TO} for ${leadId}`);
          }
        } catch (err) {
          console.error('[Auto-Capture Window Error]', err.message);
        }
      }, 60000);
      autoCaptureTimers.set(leadId, timer);
    return res.status(201).json({ ok: true, leadId: savedLead.id });
  } else {
    // Final Form Submission
    if (currentStatus !== 'submitted' && currentStatus !== 'verified') {
      sendLeadNotification(savedLead, mappedLead);
    }

    // Direct Instant Unlock (Twilio SMS OTP removed)
    return res.status(201).json({ ok: true, leadId: savedLead.id, directUnlock: true });
  }
});

// Verification Endpoint (Legacy fallback)
app.post('/api/otp/verify', async (req, res) => {
  return res.json({ ok: true });
});

// Resend Endpoint (Legacy fallback)
app.post('/api/otp/resend', async (req, res) => {
  return res.json({ ok: true });
});

// Generic user-input submission endpoint
app.post('/api/submit', async (req, res) => {
  const body = req.body || {};
  const content = body.content ?? body.data ?? JSON.stringify(body);

  if (!content || String(content).trim().length === 0) {
    return res.status(400).json({ ok: false, error: 'content is required' });
  }

  const id = crypto.randomUUID();
  const submission = { id, content: String(content).trim(), source: body.source ?? 'web', createdAt: new Date().toISOString() };

  const dbResult = await dbQuery(
    `INSERT INTO submissions (id, content, source) VALUES ($1, $2, $3)`,
    [submission.id, submission.content, submission.source]
  );

  if (!dbResult) {
    // No database — acknowledge without persisting (or extend JSON fallback here if needed)
    console.warn('Submission received but DATABASE_URL is not set; data not persisted.');
  }

  res.status(201).json({ ok: true, submission });
});

app.use(express.static(path.join(__dirname, 'dist')));
app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Initialise DB schema then start listening
initSchema().catch((err) => console.error('Schema init error:', err.message));

app.listen(port, () => {
  console.log(`Health coverage calculator running on port ${port}`);
});
