import express from 'express';
import session from 'express-session';
import passport from './src/config/passport';
import { ensureGoogleStrategyConfigured } from './src/config/passport';
import { getGoogleConfigStatus } from './src/config/passport';
import dotenv from 'dotenv';
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { TextractClient, AnalyzeDocumentCommand, DetectDocumentTextCommand } from "@aws-sdk/client-textract";
import { ComprehendMedicalClient, DetectEntitiesV2Command } from "@aws-sdk/client-comprehendmedical";
import crypto from 'crypto';
import path from 'path';

dotenv.config({ path: '.env.local' });
dotenv.config();

// Initialize AWS Clients
const awsRegion = process.env.AWS_REGION || "us-east-1";
const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const awsSessionToken = process.env.AWS_SESSION_TOKEN;
const awsProfile = process.env.AWS_PROFILE?.trim();

function isPlaceholderCredential(value?: string): boolean {
  if (!value) return true;
  const normalized = value.trim().toLowerCase();
  return (
    normalized.length === 0 ||
    normalized.includes("your_") ||
    normalized.includes("placeholder") ||
    normalized === "changeme"
  );
}

const awsConfig: {
  region: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  };
} = {
  region: awsRegion,
};

if (awsProfile) {
  console.warn(`AWS_PROFILE is set to '${awsProfile}'. Ignoring static AWS_* key environment variables and using shared profile/default credential chain.`);
} else if (!isPlaceholderCredential(awsAccessKeyId) && !isPlaceholderCredential(awsSecretAccessKey)) {
  awsConfig.credentials = {
    accessKeyId: awsAccessKeyId!,
    secretAccessKey: awsSecretAccessKey!,
    ...(awsSessionToken ? { sessionToken: awsSessionToken } : {}),
  };
} else {
  console.warn("AWS static credentials not fully set. Using default AWS credential provider chain.");
}

const bedrockClient = new BedrockRuntimeClient(awsConfig);
const s3Client = new S3Client(awsConfig);
const textractClient = new TextractClient(awsConfig);
const comprehendMedicalClient = new ComprehendMedicalClient(awsConfig);

const BEDROCK_MODEL_ID = process.env.BEDROCK_MODEL_ID || "anthropic.claude-3-haiku-20240307-v1:0";
const S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || "ai-health-navigator-uploads";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL_ID = process.env.GEMINI_MODEL_ID || "gemini-2.5-flash";
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.GEMINI_API_KEY;
const ALLOW_GEMINI_FALLBACK = (process.env.ALLOW_GEMINI_FALLBACK || 'true').toLowerCase() === 'true';
const BEDROCK_RECHECK_INTERVAL_MS = Math.max(Number(process.env.BEDROCK_RECHECK_INTERVAL_MS || 120000), 30000);
const SUPPORTED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/tiff',
  'image/tif',
];

async function normalizeDocumentForTextract(buffer: Buffer, mimeType: string): Promise<{ buffer: Buffer; mimeType: string }> {
  if (SUPPORTED_DOCUMENT_MIME_TYPES.includes(mimeType)) {
    return { buffer, mimeType };
  }

  if (mimeType.startsWith('image/')) {
    const { default: sharp } = await import('sharp');
    const converted = await sharp(buffer).png().toBuffer();
    return { buffer: converted, mimeType: 'image/png' };
  }

  throw new Error('Unable to read this document type. Please upload a clear medical report as PDF or image.');
}

let bedrockTemporarilyUnavailableUntil = 0;
let bedrockUnavailableReason = '';
let bedrockProbeInFlight = false;

// Medical Validation Keywords
const MEDICAL_KEYWORDS = [
  "Hemoglobin", "RBC", "WBC", "Platelet", "mg/dL", "Prescription", 
  "Tablet", "Dosage", "BP", "Blood Test", "Diagnosis", "Dr.", "Patient",
  "Glucose", "Cholesterol", "Thyroid", "Creatinine", "Liver Function",
  "CBC", "Lipid Profile", "Urine Analysis", "X-Ray", "MRI", "CT Scan"
];

function validateMedicalContent(text: string): boolean {
  const lowerText = text.toLowerCase();
  return MEDICAL_KEYWORDS.some(keyword => lowerText.includes(keyword.toLowerCase()));
}

async function extractMedicalEntities(text: string) {
  try {
    const command = new DetectEntitiesV2Command({ Text: text });
    const response = await comprehendMedicalClient.send(command);
    
    const entities = response.Entities || [];
    const extractedData = {
      tests: entities.filter(e => e.Category === "TEST_TREATMENT_PROCEDURE").map(e => e.Text),
      medications: entities.filter(e => e.Category === "MEDICATION").map(e => e.Text),
      conditions: entities.filter(e => e.Category === "MEDICAL_CONDITION").map(e => e.Text),
      anatomy: entities.filter(e => e.Category === "ANATOMY").map(e => e.Text),
      phi: entities.filter(e => e.Category === "PROTECTED_HEALTH_INFORMATION").map(e => e.Text), // To be redacted or noted
    };
    return extractedData;
  } catch (error) {
    console.error("Comprehend Medical Error:", error);
    return null;
  }
}

function parseModelResponseText(textResponse: string, isDocumentAnalysis = false) {
  const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
  const jsonString = jsonMatch ? jsonMatch[0] : textResponse;

  let parsedResponse: any;
  try {
    parsedResponse = JSON.parse(jsonString);
    parsedResponse.response = parsedResponse.response || parsedResponse.explanation;

    if (isDocumentAnalysis) {
      parsedResponse.urgency_level = parsedResponse.urgency_level || "Low";
      parsedResponse.confidence_score = parsedResponse.confidence_score || "High";
      parsedResponse.reasoning = parsedResponse.reasoning || "Based on document analysis";
      parsedResponse.disclaimer = parsedResponse.disclaimer || "This is educational guidance only.";
      parsedResponse.abnormal_values = Array.isArray(parsedResponse.abnormal_values) ? parsedResponse.abnormal_values : [];
      parsedResponse.normal_findings = Array.isArray(parsedResponse.normal_findings) ? parsedResponse.normal_findings : [];
      parsedResponse.suggestions = Array.isArray(parsedResponse.suggestions) ? parsedResponse.suggestions : [];
      parsedResponse.safety_advisory = parsedResponse.safety_advisory || "Consult a healthcare professional for medical concerns.";

      if (!parsedResponse.response) {
        const abnormalSection = parsedResponse.abnormal_values.length
          ? parsedResponse.abnormal_values.map((value: string) => `- ${value}`).join('\n')
          : '- No clearly abnormal values detected from extracted content.';
        const normalSection = parsedResponse.normal_findings.length
          ? parsedResponse.normal_findings.map((value: string) => `- ${value}`).join('\n')
          : '- Normal findings were not explicitly listed.';
        const suggestionsSection = parsedResponse.suggestions.length
          ? parsedResponse.suggestions.map((value: string) => `- ${value}`).join('\n')
          : '- Follow up with your physician for detailed interpretation.';

        parsedResponse.response = `### Report Summary 🩺\n${parsedResponse.explanation || 'Detailed interpretation is limited by extracted content.'}\n\n### Abnormal Findings 😔\n${abnormalSection}\n\n### Normal Findings 😊\n${normalSection}\n\n### Recommendations ✅\n${suggestionsSection}\n\n### Safety Advisory 🏥\n${parsedResponse.safety_advisory}`;
      }
    }
  } catch (e) {
    parsedResponse = {
      response: textResponse,
    };

    if (isDocumentAnalysis) {
      parsedResponse.urgency_level = "Unknown";
      parsedResponse.confidence_score = "Low";
      parsedResponse.reasoning = "Could not parse structured response";
      parsedResponse.disclaimer = "Please consult a doctor.";
      parsedResponse.abnormal_values = [];
      parsedResponse.safety_advisory = "Consult a professional.";
    }
  }

  return parsedResponse;
}

function isUnsupportedTextractError(error: any): boolean {
  const name = String(error?.name || '').toUpperCase();
  const message = String(error?.message || '').toUpperCase();
  return (
    name.includes('UNSUPPORTEDDOCUMENT') ||
    message.includes('UNSUPPORTED DOCUMENT FORMAT') ||
    message.includes('UNSUPPORTEDDOCUMENT')
  );
}

function shouldFallbackToGemini(error: any): boolean {
  if (!ALLOW_GEMINI_FALLBACK) return false;

  const code = String(error?.name || error?.code || '');
  const message = String(error?.message || '').toUpperCase();

  const isBillingBlocked =
    message.includes('INVALID_PAYMENT_INSTRUMENT') ||
    message.includes('AWS MARKETPLACE SUBSCRIPTION');

  if (isBillingBlocked) {
    return true;
  }

  const isAuthzError =
    code.includes('AccessDenied') ||
    message.includes('NOT AUTHORIZED TO PERFORM') ||
    message.includes('BEDROCK:INVOKEMODEL') ||
    message.includes('NO IDENTITY-BASED POLICY ALLOWS');

  if (isAuthzError) {
    return true;
  }

  if (
    code.includes('ValidationException') ||
    code.includes('ResourceNotFound') ||
    message.includes('MODEL ACCESS IS DENIED')
  ) {
    return false;
  }

  return true;
}

function isBillingBlockedError(error: any): boolean {
  const message = String(error?.message || '').toUpperCase();
  return (
    message.includes('INVALID_PAYMENT_INSTRUMENT') ||
    message.includes('AWS MARKETPLACE SUBSCRIPTION')
  );
}

function buildFallbackHospitals(lat: number, lng: number) {
  const offsets = [
    { latOffset: 0.008, lngOffset: 0.006, name: 'City Care Hospital' },
    { latOffset: -0.011, lngOffset: 0.01, name: 'Metro General Hospital' },
    { latOffset: 0.013, lngOffset: -0.009, name: 'Community Health Center' },
    { latOffset: -0.007, lngOffset: -0.012, name: 'Emergency Medical Center' },
    { latOffset: 0.016, lngOffset: 0.004, name: 'Regional Multi-speciality Hospital' },
  ];

  return offsets.map((item, index) => ({
    id: `fallback-${index}`,
    name: item.name,
    type: item.name.toLowerCase().includes('emergency') ? 'Emergency Center' : 'Hospital',
    latitude: Number((lat + item.latOffset).toFixed(6)),
    longitude: Number((lng + item.lngOffset).toFixed(6)),
    address: 'Nearby healthcare provider (fallback listing)',
    phone: 'Not available',
    rating: 4.1,
    isOpen: true,
    isEmergency: item.name.toLowerCase().includes('emergency'),
  }));
}

function markBedrockTemporarilyUnavailable(reason: string) {
  bedrockTemporarilyUnavailableUntil = Date.now() + BEDROCK_RECHECK_INTERVAL_MS;
  bedrockUnavailableReason = reason;
}

function clearBedrockTemporaryBlock() {
  if (bedrockTemporarilyUnavailableUntil > 0) {
    console.log('Bedrock recovered. Switching primary provider back to Claude.');
  }
  bedrockTemporarilyUnavailableUntil = 0;
  bedrockUnavailableReason = '';
}

async function probeBedrockRecovery() {
  if (bedrockProbeInFlight) return;
  if (bedrockTemporarilyUnavailableUntil <= 0) return;
  if (Date.now() < bedrockTemporarilyUnavailableUntil) return;

  bedrockProbeInFlight = true;
  try {
    const probePayload = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 8,
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: 'Reply with OK' }],
        },
      ],
    };

    await bedrockClient.send(
      new InvokeModelCommand({
        modelId: BEDROCK_MODEL_ID,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(probePayload),
      })
    );

    clearBedrockTemporaryBlock();
  } catch (error: any) {
    if (isBillingBlockedError(error)) {
      markBedrockTemporarilyUnavailable(error?.message || 'Billing blocked');
    }
  } finally {
    bedrockProbeInFlight = false;
  }
}

async function invokeGeminiFallback(systemPrompt: string, userText: string, isDocumentAnalysis = false) {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured for fallback.");
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_ID}:generateContent?key=${GEMINI_API_KEY}`;
  const payload = {
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: userText }],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
    },
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`Gemini fallback failed: ${response.status} ${responseText}`);
  }

  const body = await response.json() as any;
  const textResponse = body?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textResponse) {
    throw new Error("Gemini fallback returned empty response.");
  }

  return parseModelResponseText(textResponse, isDocumentAnalysis);
}

async function invokeGeminiDocumentAnalysis(userText: string, fileDataBase64: string, mimeType: string) {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured for document analysis.");
  }

  const systemPrompt = `You are AI Health Navigator, a professional and accurate health assistant.
Analyze the uploaded medical document and provide clear, practical guidance.

CRITICAL HEALTHCARE GUARDRAILS:
1. NEVER provide a definitive diagnosis.
2. NEVER prescribe prescription-only medication.
3. ALWAYS include a medical disclaimer.
4. If severe red-flag symptoms are present, advise immediate medical attention.

OUTPUT FORMAT:
Return valid JSON only:
{
  "document_type": "Lab Report | Prescription | Medical Document | Uploaded Document",
  "extracted_entities": ["key values/findings/medicines"],
  "abnormal_values": ["abnormal values if present"],
  "normal_findings": ["parameters explicitly within normal limits"],
  "explanation": "Detailed interpretation of findings in plain language.",
  "response": "A detailed, sectioned markdown report with emojis, including: Report Summary, Abnormal Findings, Normal Findings, Recommendations, Follow-up timeline, and Safety Advisory.",
  "reasoning": "How you interpreted the uploaded report.",
  "safety_advisory": "Clear safety advice.",
  "suggestions": ["specific next best steps", "follow-up guidance with timelines"],
  "disclaimer": "This is educational guidance only."
}

STRICT OUTPUT REQUIREMENTS:
- Always provide a detailed output for every readable document.
- Include both abnormal findings and normal findings when available.
- Include a concrete follow-up plan (e.g., 6 weeks / 3 months) when relevant.
- Use calm medical tone with relevant emojis in the response field.
- Never fabricate values that are not visible in the document.`;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_ID}:generateContent?key=${GEMINI_API_KEY}`;
  const payload = {
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: [
      {
        role: "user",
        parts: [
          { text: userText || "Analyze this uploaded medical report and provide clear suggestions." },
          {
            inlineData: {
              mimeType,
              data: fileDataBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
    },
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`Gemini document analysis failed: ${response.status} ${responseText}`);
  }

  const body = await response.json() as any;
  const textResponse = body?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textResponse) {
    throw new Error("Gemini document analysis returned empty response.");
  }

  return parseModelResponseText(textResponse, true);
}

type UploadedDocumentCategory = 'prescription' | 'lab_report' | 'other';

function inferDocumentCategoryFromName(fileName: string): UploadedDocumentCategory {
  const normalized = String(fileName || '').toLowerCase();

  if (/(rx|prescription|medicine|medication|doctor[-_ ]?note|clinical[-_ ]?note)/.test(normalized)) {
    return 'prescription';
  }

  if (/(lab|report|cbc|hba1c|lft|lipid|thyroid|glucose|blood[-_ ]?test)/.test(normalized)) {
    return 'lab_report';
  }

  return 'other';
}

async function classifyUploadedDocumentCategory(fileName: string, mimeType: string, fileDataBase64: string): Promise<UploadedDocumentCategory> {
  if (!GEMINI_API_KEY) {
    return inferDocumentCategoryFromName(fileName);
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_ID}:generateContent?key=${GEMINI_API_KEY}`;
  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `Classify this uploaded medical document into one category only: prescription, lab_report, or other. Return JSON only as {"type":"prescription|lab_report|other"}.`,
          },
          {
            inlineData: {
              mimeType,
              data: fileDataBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      responseMimeType: 'application/json',
    },
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return inferDocumentCategoryFromName(fileName);
    }

    const body = await response.json() as any;
    const textResponse = String(body?.candidates?.[0]?.content?.parts?.[0]?.text || '');
    const parsed = JSON.parse(textResponse);
    const detectedType = String(parsed?.type || '').toLowerCase();

    if (detectedType === 'prescription' || detectedType === 'lab_report' || detectedType === 'other') {
      return detectedType;
    }
  } catch {
    return inferDocumentCategoryFromName(fileName);
  }

  return inferDocumentCategoryFromName(fileName);
}

type AppBootstrapOptions = {
  serveFrontend?: boolean;
  isServerless?: boolean;
};

async function createApp(options: AppBootstrapOptions = {}) {
  const app = express();
  app.set('trust proxy', 1);
  const PORT = Number(process.env.PORT || 3000);
  const isProduction = process.env.NODE_ENV === 'production';
  const distPath = path.join(process.cwd(), 'dist');
  const googleConfigStatus = getGoogleConfigStatus();

  if (googleConfigStatus.missing.length > 0) {
    console.warn(`Google OAuth is not fully configured. Missing env vars: ${googleConfigStatus.missing.join(', ')}`);
  } else {
    console.log(`Google OAuth env vars detected. Callback URL: ${googleConfigStatus.callbackURL}`);
  }

  app.get('/healthz', (_req, res) => {
    res.status(200).json({ ok: true });
  });

  const getGoogleCallbackURL = (req: express.Request) => {
    if (process.env.GOOGLE_CALLBACK_URL) {
      return process.env.GOOGLE_CALLBACK_URL;
    }

    const forwardedProtoHeader = req.headers['x-forwarded-proto'];
    const forwardedProto = Array.isArray(forwardedProtoHeader)
      ? forwardedProtoHeader[0]
      : forwardedProtoHeader?.split(',')[0]?.trim();
    const protocol = forwardedProto || req.protocol || 'http';
    const host = req.get('host') || `localhost:${PORT}`;

    return `${protocol}://${host}/auth/google/callback`;
  };

  type StoredLabReport = {
    id: string;
    fileName: string;
    mimeType: string;
    data: string;
    uploadedAt: string;
  };

  const labReportsByUser: Record<string, StoredLabReport[]> = {};
  const prescriptionsByUser: Record<string, StoredLabReport[]> = {};

  if (!options.isServerless) {
    setInterval(() => {
      probeBedrockRecovery().catch((error) => {
        console.warn('Bedrock recovery probe failed:', error);
      });
    }, BEDROCK_RECHECK_INTERVAL_MS);
  }

  app.use(express.json({ limit: '10mb' })); // Increased limit for base64 images

  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'a-very-secret-fallback-key',
      resave: false,
      saveUninitialized: false,
      cookie: { 
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        httpOnly: true,
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  app.get('/api/hospitals/nearby', async (req, res) => {
    try {
      const lat = Number(req.query.lat);
      const lng = Number(req.query.lng);
      const radiusKm = Math.min(Math.max(Number(req.query.radiusKm) || 30, 1), 50);

      if (Number.isNaN(lat) || Number.isNaN(lng)) {
        return res.status(400).json({ error: 'lat and lng query params are required.' });
      }

      if (!GOOGLE_MAPS_API_KEY) {
        return res.json({
          hospitals: buildFallbackHospitals(lat, lng),
          source: 'fallback',
          warning: 'GOOGLE_MAPS_API_KEY is not configured. Returning fallback hospitals.',
        });
      }

      const radiusMeters = Math.round(radiusKm * 1000);
      const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radiusMeters}&type=hospital&key=${GOOGLE_MAPS_API_KEY}`;
      const placesResponse = await fetch(placesUrl);
      const placesData = await placesResponse.json() as any;

      if (!placesResponse.ok || (placesData.status && placesData.status !== 'OK' && placesData.status !== 'ZERO_RESULTS')) {
        return res.json({
          hospitals: buildFallbackHospitals(lat, lng),
          source: 'fallback',
          warning: 'Google Places API error. Returning fallback hospitals.',
          details: placesData.error_message || placesData.status || 'Unknown error',
        });
      }

      const hospitals = (placesData.results || []).map((place: any, index: number) => {
        const placeTypes: string[] = place.types || [];
        const isEmergency = placeTypes.includes('hospital') || placeTypes.includes('emergency_room');

        return {
          id: place.place_id || `place-${index}`,
          name: place.name || 'Unknown Hospital',
          type: isEmergency ? 'Emergency Center' : 'Hospital',
          latitude: place.geometry?.location?.lat,
          longitude: place.geometry?.location?.lng,
          address: place.vicinity || place.formatted_address || 'Address unavailable',
          phone: 'Not available',
          rating: place.rating || 0,
          isOpen: place.opening_hours?.open_now ?? false,
          isEmergency,
        };
      });

      res.json({ hospitals });
    } catch (error: any) {
      console.error('Nearby hospitals API error:', error);
      res.status(500).json({ error: 'Failed to fetch nearby hospitals', details: error.message });
    }
  });

  // Bedrock Chat Endpoint
  app.post('/api/chat', async (req, res) => {
    try {
      const { message, history, fileData } = req.body;
      const hasFileAttachment = Boolean(fileData);

      // Handle File Upload & Analysis using Gemini directly
      if (fileData) {
        try {
          const mimeType = String(fileData.mimeType || '').toLowerCase();
          const userId = (req.user as any)?.id || 'guest';
          const incomingFileName = String(fileData.fileName || '').trim();
          const derivedExtension = mimeType === 'application/pdf' ? 'pdf' : (mimeType.split('/')[1] || 'bin');
          const fileName = incomingFileName || `lab-report-${Date.now()}.${derivedExtension}`;

          if (mimeType !== 'application/pdf' && !mimeType.startsWith('image/')) {
            return res.json({
              document_type: "Uploaded Document",
              extracted_entities: [],
              response: "I could not process this file type, but here are safe next steps.",
              explanation: "Please upload the medical document as a PDF or image file so I can analyze it deeply.",
              urgency_level: "Low",
              confidence_score: "Low",
              reasoning: "Unsupported file type for document analysis.",
              disclaimer: "Please upload a PDF or image file.",
              abnormal_values: [],
              safety_advisory: "If you have severe symptoms, seek urgent medical care immediately.",
              suggestions: [
                "Upload the original hospital/lab PDF if possible.",
                "If image, capture in bright light with full page visible.",
              ],
            });
          }

          if (!labReportsByUser[userId]) {
            labReportsByUser[userId] = [];
          }

          labReportsByUser[userId].unshift({
            id: `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
            fileName,
            mimeType,
            data: String(fileData.data || ''),
            uploadedAt: new Date().toISOString(),
          });

          labReportsByUser[userId] = labReportsByUser[userId].slice(0, 100);

          const geminiDocumentResponse = await invokeGeminiDocumentAnalysis(
            message || "Analyze this uploaded medical report deeply and provide suggestions.",
            String(fileData.data || ''),
            mimeType,
          );

          geminiDocumentResponse.provider = 'gemini-document';
          geminiDocumentResponse.model = GEMINI_MODEL_ID;
          return res.json(geminiDocumentResponse);

        } catch (err: any) {
          console.error("Document processing error:", err);
          const message = String(err?.message || 'Document processing failed.');
          return res.json({
            document_type: "Uploaded Document",
            extracted_entities: [],
            response: "I could not fully read this uploaded report, but here are safe next steps.",
            explanation: "The uploaded file could not be analyzed deeply this time. Please upload a clearer report (good lighting, full page visible, no blur) for value-by-value interpretation.",
            urgency_level: "Low",
            confidence_score: "Low",
            reasoning: "Document analysis was incomplete.",
            disclaimer: "Please try uploading a clearer image or PDF.",
            abnormal_values: [],
            safety_advisory: "If you have symptoms like chest pain, severe breathlessness, heavy bleeding, confusion, or high fever, seek urgent medical care immediately.",
            suggestions: [
              "Retake the photo in bright light with the full page visible.",
              "Upload the original PDF from lab/hospital app if available.",
              "Share key report values (e.g., Hemoglobin, WBC, Platelets, Glucose) in text for immediate guidance.",
            ],
            details: message,
          });
        }
      }

      const systemPrompt = `You are AI Health Navigator, a professional and accurate health assistant.
Your primary goal is to provide clear, concise, and direct answers to health-related questions.

CRITICAL HEALTHCARE GUARDRAILS:
1. NEVER provide a definitive medical diagnosis.
2. NEVER prescribe prescription-only medication.
3. ALWAYS include a medical disclaimer.
4. Suggest OTC medications ONLY for mild symptoms with a clear disclaimer.
5. If symptoms are severe (chest pain, stroke signs, difficulty breathing), advise IMMEDIATE medical attention.
6. If the query is NOT health-related, politely refuse to answer.

OUTPUT FORMAT:
You must respond in valid JSON format with the following structure:
{
  "response": "Clear and concise answer to the user's health question.",
  "safety_advisory": "Relevant safety advice based on the query",
  "disclaimer": "This is educational guidance only."
}
Do not include any text outside the JSON object.`;

      const messages = [];
      const content: any[] = [];
      
      content.push({
        type: "text",
        text: message
      });

      messages.push({
        role: "user",
        content: content
      });

      const payload = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 2000,
        system: systemPrompt,
        messages: messages,
      };

      if (ALLOW_GEMINI_FALLBACK && bedrockTemporarilyUnavailableUntil > Date.now()) {
        console.warn(`Bedrock temporarily blocked (${bedrockUnavailableReason || 'unknown reason'}). Using Gemini fallback until next recheck.`);
        const fallbackPrompt = content[0]?.text || message;
        const geminiResponse = await invokeGeminiFallback(systemPrompt, fallbackPrompt, hasFileAttachment);
        geminiResponse.provider = 'gemini-fallback';
        geminiResponse.model = GEMINI_MODEL_ID;
        geminiResponse.primary_model_status = 'temporarily_blocked';
        geminiResponse.primary_model = BEDROCK_MODEL_ID;
        return res.json(geminiResponse);
      }

      const command = new InvokeModelCommand({
        modelId: BEDROCK_MODEL_ID,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify(payload),
      });

      try {
        const response = await bedrockClient.send(command);
        clearBedrockTemporaryBlock();
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        const textResponse = responseBody.content[0].text;
        const parsedResponse = parseModelResponseText(textResponse, hasFileAttachment);
        parsedResponse.provider = 'bedrock';
        parsedResponse.model = BEDROCK_MODEL_ID;
        return res.json(parsedResponse);
      } catch (bedrockError: any) {
        console.error("Bedrock API Error:", bedrockError);

        if (isBillingBlockedError(bedrockError)) {
          markBedrockTemporarilyUnavailable(bedrockError?.message || 'Billing blocked');
        }

        const shouldUseGeminiFallback = hasFileAttachment
          ? ALLOW_GEMINI_FALLBACK
          : shouldFallbackToGemini(bedrockError);

        if (!shouldUseGeminiFallback) {
          return res.status(502).json({
            error: "Bedrock request failed",
            details: bedrockError?.message || 'Unknown Bedrock error',
            provider: 'bedrock',
            model: BEDROCK_MODEL_ID,
          });
        }

        console.warn("Falling back to Gemini API for /api/chat.");

        const fallbackPrompt = content[0]?.text || message;
        const geminiResponse = await invokeGeminiFallback(systemPrompt, fallbackPrompt, hasFileAttachment);
        geminiResponse.provider = 'gemini-fallback';
        geminiResponse.model = GEMINI_MODEL_ID;
        return res.json(geminiResponse);
      }

    } catch (error: any) {
      console.error("/api/chat Error:", error);
      res.status(500).json({ 
        error: "Failed to process request", 
        details: error.message 
      });
    }
  });

  // API routes will go here
  app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    // In a real app, you would validate against a database
    if (username && password) {
      // Mock success response
      res.json({ success: true, message: 'Login successful' });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  });

  app.get('/auth/google', (req, res, next) => {
    if (!ensureGoogleStrategyConfigured()) {
      return res.redirect('/login?authError=google_not_configured');
    }
    const callbackURL = getGoogleCallbackURL(req);
    passport.authenticate('google', { scope: ['profile', 'email'], callbackURL })(req, res, next);
  });

  app.get(
    '/auth/google/callback',
    (req, res, next) => {
      if (!ensureGoogleStrategyConfigured()) {
        return res.redirect('/login?authError=google_not_configured');
      }
      const callbackURL = getGoogleCallbackURL(req);
      passport.authenticate('google', { failureRedirect: '/login', callbackURL })(req, res, next);
    },
    (req, res) => {
      // Successful authentication: persist session first, then route to chat.
      req.session.save(() => {
        res.redirect('/chat');
      });
    }
  );

  app.get('/api/user', (req, res) => {
    res.json(req.user || null);
  });

  app.get('/api/auth/providers', (req, res) => {
    const googleConfig = getGoogleConfigStatus();
    res.json({
      google: ensureGoogleStrategyConfigured(),
      googleMissingEnv: googleConfig.missing,
      googleCallbackURL: googleConfig.callbackURL,
      guest: true,
    });
  });

  // Medical History Store (In-memory for demo)
  const medicalHistories: Record<string, any[]> = {};

  app.get('/api/medical-history', (req, res) => {
    const userId = (req.user as any)?.id || 'guest';
    res.json(medicalHistories[userId] || []);
  });

  app.post('/api/medical-history', (req, res) => {
    const userId = (req.user as any)?.id || 'guest';
    const entry = { id: Date.now().toString(), ...req.body, date: new Date().toISOString() };
    if (!medicalHistories[userId]) medicalHistories[userId] = [];
    medicalHistories[userId].push(entry);
    res.json({ success: true, entry });
  });

  app.delete('/api/medical-history/:id', (req, res) => {
    const userId = (req.user as any)?.id || 'guest';
    const { id } = req.params;
    if (medicalHistories[userId]) {
      medicalHistories[userId] = medicalHistories[userId].filter(e => e.id !== id);
    }
    res.json({ success: true });
  });

  app.post('/api/logout', (req, res, next) => {
    req.logout((err) => {
      if (err) { return next(err); }
      res.redirect('/');
    });
  });

  app.delete('/api/chats/:id', (req, res) => {
    const { id } = req.params;
    // In a real app, you would delete from a database
    console.log(`Deleting chat with id: ${id}`);
    res.json({ success: true, message: `Chat ${id} deleted` });
  });

  app.get('/api/lab-reports', (req, res) => {
    const userId = (req.user as any)?.id || 'guest';
    const reports = labReportsByUser[userId] || [];
    const metadata = reports.map(({ id, fileName, mimeType, uploadedAt }) => ({
      id,
      fileName,
      mimeType,
      uploadedAt,
    }));
    res.json(metadata);
  });

  app.get('/api/lab-reports/:id', (req, res) => {
    const userId = (req.user as any)?.id || 'guest';
    const report = (labReportsByUser[userId] || []).find(item => item.id === req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Lab report not found' });
    }

    res.json({
      id: report.id,
      fileName: report.fileName,
      mimeType: report.mimeType,
      data: report.data,
      uploadedAt: report.uploadedAt,
    });
  });

  app.post('/api/lab-reports', (req, res) => {
    const userId = (req.user as any)?.id || 'guest';
    const { fileName, mimeType, data } = req.body || {};
    const normalizedMimeType = String(mimeType || '').toLowerCase();

    if (!data || !normalizedMimeType) {
      return res.status(400).json({ error: 'fileName, mimeType, and data are required.' });
    }

    if (normalizedMimeType !== 'application/pdf' && !normalizedMimeType.startsWith('image/')) {
      return res.status(400).json({ error: 'Only PDF and image lab reports are supported.' });
    }

    const extension = normalizedMimeType === 'application/pdf' ? 'pdf' : (normalizedMimeType.split('/')[1] || 'bin');
    const safeFileName = String(fileName || '').trim() || `lab-report-${Date.now()}.${extension}`;

    if (!labReportsByUser[userId]) {
      labReportsByUser[userId] = [];
    }

    const record: StoredLabReport = {
      id: `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      fileName: safeFileName,
      mimeType: normalizedMimeType,
      data: String(data),
      uploadedAt: new Date().toISOString(),
    };

    labReportsByUser[userId].unshift(record);
    labReportsByUser[userId] = labReportsByUser[userId].slice(0, 100);

    res.json({
      success: true,
      report: {
        id: record.id,
        fileName: record.fileName,
        mimeType: record.mimeType,
        uploadedAt: record.uploadedAt,
      },
    });
  });

  app.delete('/api/lab-reports/:id', (req, res) => {
    const userId = (req.user as any)?.id || 'guest';
    const current = labReportsByUser[userId] || [];
    labReportsByUser[userId] = current.filter(item => item.id !== req.params.id);
    res.json({ success: true });
  });

  app.get('/api/prescriptions', (req, res) => {
    const userId = (req.user as any)?.id || 'guest';
    const prescriptions = prescriptionsByUser[userId] || [];
    const metadata = prescriptions.map(({ id, fileName, mimeType, uploadedAt }) => ({
      id,
      fileName,
      mimeType,
      uploadedAt,
    }));
    res.json(metadata);
  });

  app.get('/api/prescriptions/:id', (req, res) => {
    const userId = (req.user as any)?.id || 'guest';
    const item = (prescriptionsByUser[userId] || []).find(entry => entry.id === req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    res.json(item);
  });

  app.post('/api/prescriptions', async (req, res) => {
    const userId = (req.user as any)?.id || 'guest';
    const { fileName, mimeType, data } = req.body || {};
    const normalizedMimeType = String(mimeType || '').toLowerCase();
    const safeFileName = String(fileName || '').trim();

    if (!data || !normalizedMimeType) {
      return res.status(400).json({ error: 'fileName, mimeType, and data are required.' });
    }

    if (normalizedMimeType !== 'application/pdf' && !normalizedMimeType.startsWith('image/')) {
      return res.status(400).json({ error: 'Only PDF and image prescriptions are supported.' });
    }

    const detectedType = await classifyUploadedDocumentCategory(safeFileName, normalizedMimeType, String(data));
    if (detectedType === 'lab_report') {
      return res.status(400).json({
        error: 'This appears to be a lab report. Please upload it under Lab Reports.',
        detectedType,
      });
    }

    if (!prescriptionsByUser[userId]) {
      prescriptionsByUser[userId] = [];
    }

    const extension = normalizedMimeType === 'application/pdf' ? 'pdf' : (normalizedMimeType.split('/')[1] || 'bin');
    const record: StoredLabReport = {
      id: `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      fileName: safeFileName || `prescription-${Date.now()}.${extension}`,
      mimeType: normalizedMimeType,
      data: String(data),
      uploadedAt: new Date().toISOString(),
    };

    prescriptionsByUser[userId].unshift(record);
    prescriptionsByUser[userId] = prescriptionsByUser[userId].slice(0, 100);

    res.json({
      success: true,
      prescription: {
        id: record.id,
        fileName: record.fileName,
        mimeType: record.mimeType,
        uploadedAt: record.uploadedAt,
      },
    });
  });

  app.delete('/api/prescriptions/:id', (req, res) => {
    const userId = (req.user as any)?.id || 'guest';
    const current = prescriptionsByUser[userId] || [];
    prescriptionsByUser[userId] = current.filter(item => item.id !== req.params.id);
    res.json({ success: true });
  });

  if (options.serveFrontend) {
    if (!isProduction) {
      const viteModuleName = 'vite';
      const { createServer: createViteServer } = await import(viteModuleName);
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      app.use(express.static(distPath));
      app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/auth')) {
          return next();
        }
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  return app;
}

async function startServer() {
  const app = await createApp({ serveFrontend: true, isServerless: false });
  const PORT = Number(process.env.PORT || 3000);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export { createApp, startServer };

const entryArg = process.argv[1] || '';
if (/server(\.ts|\.mjs|\.js)$/i.test(entryArg) && process.env.NETLIFY !== 'true') {
  startServer();
}
