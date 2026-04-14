const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { spawnSync } = require('child_process');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_in_production';
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
const GROQ_VISION_MODEL = process.env.GROQ_VISION_MODEL || 'llama-3.2-11b-vision-preview';
const PYTHON_BIN = process.env.PYTHON_BIN || 'python';
const IMAGE_MODEL_SCRIPT = path.join(__dirname, 'ml', 'disease_classifier.py');

app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(express.json({ limit: '25mb' }));

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    full_name: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ['villager', 'asha_worker', 'doctor', 'admin'],
      default: 'villager',
      required: true,
    },
    phone_number: { type: String, default: '' },
    village: { type: String, default: '' },
    blocked_until: { type: Date, default: null },
    blocked_reason: { type: String, default: null },
    blocked_at: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

const User = mongoose.model('User', userSchema);

const caseSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    emergency_score: { type: Number, default: 0, min: 0, max: 10 },
    status: {
      type: String,
      default: 'pending',
      enum: ['pending', 'in_review', 'diagnosed', 'treatment', 'resolved'],
    },
    severity: {
      type: String,
      enum: ['early', 'moderate', 'severe'],
      default: null,
    },
    image_url: { type: String, default: null },
    images: {
      type: [
        {
          image_url: { type: String, required: true },
          image_source: { type: String, enum: ['upload', 'camera'], default: 'upload' },
        },
      ],
      default: [],
    },
    assigned_to: { type: String, default: null, index: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

const symptomSchema = new mongoose.Schema({
  case_id: { type: String, required: true, index: true },
  symptom_name: { type: String, required: true, trim: true },
  severity: {
    type: String,
    enum: ['mild', 'moderate', 'severe'],
    default: 'mild',
  },
  duration_days: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
});

const alertSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true, index: true },
    case_id: { type: String, default: null, index: true },
    alert_type: { type: String, required: true },
    message: { type: String, required: true },
    is_read: { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

const predictionSchema = new mongoose.Schema(
  {
    case_id: { type: String, required: true, index: true },
    disease_name: { type: String, required: true, trim: true },
    confidence_score: { type: Number, required: true },
    recommended_action: { type: String, required: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

const emergencyAssessmentSchema = new mongoose.Schema(
  {
    case_id: { type: String, required: true, index: true },
    emergency_score: { type: Number, required: true, min: 0, max: 10 },
    source: { type: String, default: 'manual', enum: ['manual', 'review', 'system'] },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

const Case = mongoose.model('Case', caseSchema);
const Symptom = mongoose.model('Symptom', symptomSchema);
const Alert = mongoose.model('Alert', alertSchema);
const Prediction = mongoose.model('Prediction', predictionSchema);
const EmergencyAssessment = mongoose.model('EmergencyAssessment', emergencyAssessmentSchema);

function toAuthPayload(userDoc) {
  const user = {
    id: String(userDoc._id),
    email: userDoc.email,
  };

  const profile = {
    id: String(userDoc._id),
    full_name: userDoc.full_name,
    role: userDoc.role,
    phone_number: userDoc.phone_number || '',
    village: userDoc.village || '',
    created_at: userDoc.created_at?.toISOString?.() || new Date().toISOString(),
    updated_at: userDoc.updated_at?.toISOString?.() || new Date().toISOString(),
  };

  return { user, profile };
}

function isUserBlocked(userDoc) {
  if (!userDoc || !userDoc.blocked_until) {
    return false;
  }

  return new Date(userDoc.blocked_until).getTime() > Date.now();
}

function getBlockedMessage(userDoc) {
  if (!isUserBlocked(userDoc)) {
    return null;
  }

  return userDoc.blocked_reason || 'Your account is blocked by admin. Please contact the administrator.';
}

function serializeUser(userDoc) {
  return {
    id: String(userDoc._id),
    full_name: userDoc.full_name,
    role: userDoc.role,
    phone_number: userDoc.phone_number || '',
    village: userDoc.village || '',
    blocked_until: userDoc.blocked_until ? new Date(userDoc.blocked_until).toISOString() : null,
    blocked_reason: userDoc.blocked_reason || null,
    blocked_at: userDoc.blocked_at ? new Date(userDoc.blocked_at).toISOString() : null,
    is_blocked: isUserBlocked(userDoc),
    created_at: userDoc.created_at?.toISOString?.() || new Date().toISOString(),
    updated_at: userDoc.updated_at?.toISOString?.() || new Date().toISOString(),
  };
}

function createToken(userDoc) {
  return jwt.sign(
    {
      sub: String(userDoc._id),
      email: userDoc.email,
      role: userDoc.role,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function serializeCase(caseDoc) {
  const images = Array.isArray(caseDoc.images)
    ? caseDoc.images.map((image) => ({
        image_url: image.image_url,
        image_source: image.image_source || 'upload',
      }))
    : [];

  return {
    id: String(caseDoc._id),
    user_id: caseDoc.user_id,
    title: caseDoc.title,
    description: caseDoc.description,
    status: caseDoc.status,
    severity: caseDoc.severity,
    image_url: caseDoc.image_url || images[0]?.image_url || null,
    emergency_score: Number.isFinite(Number(caseDoc.emergency_score)) ? Number(caseDoc.emergency_score) : 0,
    images,
    assigned_to: caseDoc.assigned_to,
    created_at: caseDoc.created_at?.toISOString?.() || new Date().toISOString(),
    updated_at: caseDoc.updated_at?.toISOString?.() || new Date().toISOString(),
  };
}

async function getEmergencyScoreForCase(caseId, fallbackScore = 0) {
  const latestAssessment = await EmergencyAssessment.findOne({ case_id: String(caseId) })
    .sort({ created_at: -1 });

  if (latestAssessment && Number.isFinite(Number(latestAssessment.emergency_score))) {
    return Math.max(0, Math.min(10, Number(latestAssessment.emergency_score)));
  }

  return Math.max(0, Math.min(10, Number(fallbackScore ?? 0)));
}

async function serializeCaseWithEmergency(caseDoc) {
  return {
    ...serializeCase(caseDoc),
    emergency_score: await getEmergencyScoreForCase(caseDoc._id, caseDoc.emergency_score),
  };
}

function normalizeCaseImages(payload) {
  const images = [];

  if (payload.image_url) {
    images.push({
      image_url: String(payload.image_url).trim(),
      image_source: 'upload',
    });
  }

  if (Array.isArray(payload.images)) {
    for (const image of payload.images) {
      const imageUrl = typeof image === 'string' ? image : image?.image_url || image?.dataUrl || image?.url;
      if (!imageUrl) {
        continue;
      }

      const imageSource = typeof image === 'object' && image?.image_source === 'camera' ? 'camera' : 'upload';
      images.push({
        image_url: String(imageUrl).trim(),
        image_source: imageSource,
      });
    }
  }

  const uniqueImages = [];
  const seen = new Set();

  for (const image of images) {
    if (!image.image_url || seen.has(image.image_url)) {
      continue;
    }

    seen.add(image.image_url);
    uniqueImages.push(image);
  }

  return uniqueImages;
}

function serializeSymptom(symptomDoc) {
  return {
    id: String(symptomDoc._id),
    case_id: symptomDoc.case_id,
    symptom_name: symptomDoc.symptom_name,
    severity: symptomDoc.severity,
    duration_days: symptomDoc.duration_days,
    created_at: symptomDoc.created_at?.toISOString?.() || new Date().toISOString(),
  };
}

function serializePrediction(predictionDoc) {
  return {
    id: String(predictionDoc._id),
    case_id: predictionDoc.case_id,
    disease_name: predictionDoc.disease_name,
    confidence_score: predictionDoc.confidence_score,
    recommended_action: predictionDoc.recommended_action,
    created_at: predictionDoc.created_at?.toISOString?.() || new Date().toISOString(),
  };
}

function runImagePrediction(images) {
  const result = spawnSync(PYTHON_BIN, [IMAGE_MODEL_SCRIPT, 'predict'], {
    input: JSON.stringify({ images }),
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const stdout = String(result.stdout || '').trim();
    const stderr = String(result.stderr || '').trim();

    if (stdout) {
      try {
        const parsed = JSON.parse(stdout);
        if (parsed?.error) {
          throw new Error(String(parsed.error));
        }
      } catch {
        // Ignore parsing errors and fallback to stderr/default.
      }
    }

    throw new Error(stderr || 'Unable to run the image prediction model.');
  }

  const rawOutput = String(result.stdout || '').trim();
  if (!rawOutput) {
    throw new Error('The image prediction model returned an empty response.');
  }

  try {
    const parsed = JSON.parse(rawOutput);
    return parsed?.prediction ? parsed.prediction : parsed;
  } catch (parseError) {
    throw new Error(`Unable to parse the image prediction response: ${parseError.message}`);
  }
}

function serializeAlert(alertDoc) {
  return {
    id: String(alertDoc._id),
    user_id: alertDoc.user_id,
    case_id: alertDoc.case_id,
    alert_type: alertDoc.alert_type,
    message: alertDoc.message,
    is_read: alertDoc.is_read,
    created_at: alertDoc.created_at?.toISOString?.() || new Date().toISOString(),
  };
}

function extractJsonBlock(rawText) {
  if (!rawText) return null;

  const fenced = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced && fenced[1]) {
    return fenced[1].trim();
  }

  const start = rawText.indexOf('{');
  const end = rawText.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    return rawText.slice(start, end + 1).trim();
  }

  return null;
}

async function generatePredictionFromGroq(caseDoc, symptoms) {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured on the backend.');
  }

  const symptomLines = symptoms.length
    ? symptoms
        .map((s) => `- ${s.symptom_name} (severity: ${s.severity}, duration_days: ${s.duration_days})`)
        .join('\n')
    : '- No structured symptoms available';

  const prompt = [
    'You are a clinical triage assistant for educational decision support.',
    'Based on the provided case details, return exactly one JSON object with these keys only:',
    'disease_name (string), confidence_score (integer between 1 and 95), recommended_action (string).',
    'Do not include markdown, explanations, or extra keys.',
    '',
    `Case title: ${caseDoc.title}`,
    `Case description: ${caseDoc.description}`,
    'Symptoms:',
    symptomLines,
  ].join('\n');

  const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            'You are a medical decision support model. Reply with valid JSON only and avoid any markdown.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  });

  const groqPayload = await groqResponse.json().catch(() => ({}));
  if (!groqResponse.ok) {
    const errorMessage = groqPayload?.error?.message || 'Groq request failed.';
    throw new Error(errorMessage);
  }

  const rawContent = groqPayload?.choices?.[0]?.message?.content || '';
  const jsonBlock = extractJsonBlock(rawContent);
  if (!jsonBlock) {
    throw new Error('Groq returned an invalid prediction format.');
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonBlock);
  } catch {
    throw new Error('Unable to parse Groq prediction response.');
  }

  const diseaseName = String(parsed.disease_name || '').trim();
  const recommendedAction = String(parsed.recommended_action || '').trim();
  const confidenceRaw = Number(parsed.confidence_score);
  const confidenceScore = Math.max(1, Math.min(95, Math.round(Number.isFinite(confidenceRaw) ? confidenceRaw : 50)));

  if (!diseaseName || !recommendedAction) {
    throw new Error('Groq response missed required prediction fields.');
  }

  return {
    disease_name: diseaseName,
    confidence_score: confidenceScore,
    recommended_action: recommendedAction,
  };
}

function normalizeSymptomsList(rawSymptoms) {
  if (!Array.isArray(rawSymptoms)) {
    return [];
  }

  const result = [];
  const seen = new Set();

  for (const symptom of rawSymptoms) {
    const value = String(symptom || '').trim();
    if (!value) {
      continue;
    }

    const dedupeKey = value.toLowerCase();
    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    result.push(value);
  }

  return result.slice(0, 8);
}

async function analyzeCaseImageWithGroq(imageUrl, caseDoc) {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured on the backend.');
  }

  const prompt = [
    'You are a clinical image triage assistant for educational support only.',
    'Analyze the attached medical image and return exactly one valid JSON object with keys only:',
    'disease_name (string), symptoms (array of short strings), analysis_summary (string).',
    'Do not include markdown or any extra keys.',
    '',
    `Case title: ${caseDoc?.title || 'N/A'}`,
    `Case description: ${caseDoc?.description || 'N/A'}`,
  ].join('\n');

  const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_VISION_MODEL,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            'You are a medical image assistant. Reply with strict JSON only. Never include markdown.',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
    }),
  });

  const groqPayload = await groqResponse.json().catch(() => ({}));
  if (!groqResponse.ok) {
    const errorMessage = groqPayload?.error?.message || 'Groq image analysis request failed.';
    throw new Error(errorMessage);
  }

  const rawContent = groqPayload?.choices?.[0]?.message?.content || '';
  const jsonBlock = extractJsonBlock(rawContent);
  if (!jsonBlock) {
    throw new Error('Groq returned an invalid image analysis format.');
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonBlock);
  } catch {
    throw new Error('Unable to parse Groq image analysis response.');
  }

  const diseaseName = String(parsed.disease_name || '').trim();
  const symptoms = normalizeSymptomsList(parsed.symptoms);
  const analysisSummary = String(parsed.analysis_summary || '').trim();

  if (!diseaseName) {
    throw new Error('Groq response missed disease_name for image analysis.');
  }

  return {
    disease_name: diseaseName,
    symptoms,
    analysis_summary:
      analysisSummary || 'Please consult a qualified healthcare professional for confirmation and treatment.',
  };
}

function buildAccessibleCaseFilter(auth) {
  if (auth.role === 'villager') {
    return { user_id: String(auth.sub) };
  }

  if (auth.role === 'asha_worker' || auth.role === 'doctor') {
    return {
      $or: [{ assigned_to: String(auth.sub) }, { assigned_to: null }, { assigned_to: '' }],
    };
  }

  return {};
}

async function canAccessCase(caseDoc, auth) {
  if (!caseDoc) return false;
  if (auth.role === 'admin') return true;
  if (auth.role === 'villager') return caseDoc.user_id === String(auth.sub);
  return caseDoc.assigned_to === String(auth.sub) || !caseDoc.assigned_to;
}

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Missing authorization token.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userDoc = await User.findById(decoded.sub);

    if (!userDoc) {
      return res.status(401).json({ message: 'Session expired. Please login again.' });
    }

    const blockedMessage = getBlockedMessage(userDoc);
    if (blockedMessage) {
      return res.status(403).json({ message: blockedMessage });
    }

    req.auth = decoded;
    req.user = userDoc;
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/cases', authMiddleware, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = buildAccessibleCaseFilter(req.auth);

    if (status && status !== 'all') {
      filter.status = String(status);
    }

    const caseDocs = await Case.find(filter).sort({ created_at: -1 });
    const userIds = [...new Set(caseDocs.map((c) => c.user_id).filter(Boolean))];
    const users = await User.find({ _id: { $in: userIds } }).select('_id full_name role');
    const userMap = new Map(users.map((u) => [String(u._id), u]));

    const enriched = await Promise.all(caseDocs.map(async (c) => {
      const patient = userMap.get(c.user_id);
      return {
        ...(await serializeCaseWithEmergency(c)),
        profiles: {
          full_name: patient?.full_name || 'Unknown patient',
        },
      };
    }));

    enriched.sort((a, b) => {
      const scoreDiff = Number(b.emergency_score || 0) - Number(a.emergency_score || 0);
      if (scoreDiff !== 0) {
        return scoreDiff;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return res.json({ cases: enriched });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch cases.', error: error.message });
  }
});

app.patch('/api/cases/:id([0-9a-fA-F]{24})/assign', authMiddleware, async (req, res) => {
  try {
    if (req.auth.role === 'villager') {
      return res.status(403).json({ message: 'Villagers cannot assign cases.' });
    }

    const caseDoc = await Case.findById(req.params.id);
    if (!caseDoc) {
      return res.status(404).json({ message: 'Case not found.' });
    }

    caseDoc.assigned_to = String(req.auth.sub);
    caseDoc.status = 'in_review';
    await caseDoc.save();

    return res.json({ case: await serializeCaseWithEmergency(caseDoc) });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to assign case.', error: error.message });
  }
});

app.patch('/api/cases/:id([0-9a-fA-F]{24})/assign-doctor', authMiddleware, async (req, res) => {
  try {
    if (req.auth.role !== 'asha_worker' && req.auth.role !== 'admin') {
      return res.status(403).json({ message: 'Only ASHA workers or admins can assign cases to doctors.' });
    }

    const { doctor_id } = req.body;
    if (!doctor_id) {
      return res.status(400).json({ message: 'doctor_id is required.' });
    }

    const doctor = await User.findById(String(doctor_id));
    if (!doctor || String(doctor.role || '').toLowerCase() !== 'doctor') {
      return res.status(404).json({ message: 'Selected doctor not found.' });
    }

    const caseDoc = await Case.findById(req.params.id);
    if (!caseDoc) {
      return res.status(404).json({ message: 'Case not found.' });
    }

    const allowed = await canAccessCase(caseDoc, req.auth);
    if (!allowed && req.auth.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied for this case.' });
    }

    caseDoc.assigned_to = String(doctor._id);
    caseDoc.status = 'in_review';
    await caseDoc.save();

    await Alert.create({
      user_id: String(doctor._id),
      case_id: String(caseDoc._id),
      alert_type: 'new_case',
      message: `New case assigned: "${caseDoc.title}".`,
      is_read: false,
    });

    return res.json({ case: await serializeCaseWithEmergency(caseDoc) });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to assign case to doctor.', error: error.message });
  }
});

app.get('/api/cases/:id([0-9a-fA-F]{24})', authMiddleware, async (req, res) => {
  try {
    const caseDoc = await Case.findById(req.params.id);
    if (!caseDoc) {
      return res.status(404).json({ message: 'Case not found.' });
    }

    const allowed = await canAccessCase(caseDoc, req.auth);
    if (!allowed) {
      return res.status(403).json({ message: 'Access denied for this case.' });
    }

    const patient = await User.findById(caseDoc.user_id).select('_id full_name role');
    const symptoms = await Symptom.find({ case_id: String(caseDoc._id) }).sort({ created_at: 1 });
    const prediction = await Prediction.findOne({ case_id: String(caseDoc._id) }).sort({ created_at: -1 });

    return res.json({
      case: {
        ...(await serializeCaseWithEmergency(caseDoc)),
        profile: patient
          ? {
              full_name: patient.full_name,
              role: patient.role,
            }
          : null,
      },
      symptoms: symptoms.map(serializeSymptom),
      prediction: prediction ? serializePrediction(prediction) : null,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch case details.', error: error.message });
  }
});

app.get('/api/cases/:id([0-9a-fA-F]{24})/symptoms', authMiddleware, async (req, res) => {
  try {
    const caseDoc = await Case.findById(req.params.id);
    if (!caseDoc) {
      return res.status(404).json({ message: 'Case not found.' });
    }

    const allowed = await canAccessCase(caseDoc, req.auth);
    if (!allowed) {
      return res.status(403).json({ message: 'Access denied for this case.' });
    }

    const symptoms = await Symptom.find({ case_id: String(caseDoc._id) }).sort({ created_at: 1 });
    return res.json({ symptoms: symptoms.map(serializeSymptom) });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch symptoms.', error: error.message });
  }
});

app.post('/api/cases/:id([0-9a-fA-F]{24})/image-analysis', authMiddleware, async (req, res) => {
  try {
    const caseDoc = await Case.findById(req.params.id);
    if (!caseDoc) {
      return res.status(404).json({ message: 'Case not found.' });
    }

    const allowed = await canAccessCase(caseDoc, req.auth);
    if (!allowed) {
      return res.status(403).json({ message: 'Access denied for this case.' });
    }

    const caseImage = String(caseDoc.image_url || caseDoc.images?.[0]?.image_url || '').trim();
    if (!caseImage) {
      return res.status(400).json({ message: 'No uploaded image is available for this case.' });
    }

    const analysis = await analyzeCaseImageWithGroq(caseImage, caseDoc);
    return res.json({ image_analysis: analysis, image_url: caseImage });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to analyze case image.';
    return res.status(500).json({ message });
  }
});

app.get('/api/cases/selectable', authMiddleware, async (req, res) => {
  try {
    const filter = buildAccessibleCaseFilter(req.auth);

    const caseDocs = await Case.find(filter).sort({ created_at: -1 });
    return res.json({
      cases: caseDocs.map((c) => ({
        id: String(c._id),
        title: c.title,
        description: c.description,
        image_url: c.image_url || c.images?.[0]?.image_url || null,
      })),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch selectable cases.', error: error.message });
  }
});

app.get('/api/predictions/latest/:caseId', authMiddleware, async (req, res) => {
  try {
    const caseDoc = await Case.findById(req.params.caseId);
    if (!caseDoc) {
      return res.status(404).json({ message: 'Case not found.' });
    }

    const allowed = await canAccessCase(caseDoc, req.auth);
    if (!allowed) {
      return res.status(403).json({ message: 'Access denied for this case.' });
    }

    const prediction = await Prediction.findOne({ case_id: String(caseDoc._id) }).sort({ created_at: -1 });
    return res.json({ prediction: prediction ? serializePrediction(prediction) : null });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch prediction.', error: error.message });
  }
});

app.post('/api/predictions/generate', authMiddleware, async (req, res) => {
  try {
    const { case_id } = req.body;
    if (!case_id) {
      return res.status(400).json({ message: 'case_id is required.' });
    }

    const caseDoc = await Case.findById(case_id);
    if (!caseDoc) {
      return res.status(404).json({ message: 'Case not found.' });
    }

    const allowed = await canAccessCase(caseDoc, req.auth);
    if (!allowed) {
      return res.status(403).json({ message: 'Access denied for this case.' });
    }

    const symptoms = await Symptom.find({ case_id: String(caseDoc._id) }).sort({ created_at: 1 });
    const generated = await generatePredictionFromGroq(caseDoc, symptoms.map(serializeSymptom));

    const prediction = await Prediction.create({
      case_id: String(caseDoc._id),
      disease_name: generated.disease_name,
      confidence_score: generated.confidence_score,
      recommended_action: generated.recommended_action,
    });

    return res.status(201).json({ prediction: serializePrediction(prediction) });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to generate AI prediction.', error: error.message });
  }
});

app.post('/api/predictions', authMiddleware, async (req, res) => {
  try {
    const { case_id, disease_name, confidence_score, recommended_action } = req.body;
    if (!case_id || !disease_name || confidence_score == null || !recommended_action) {
      return res.status(400).json({ message: 'Incomplete prediction payload.' });
    }

    const caseDoc = await Case.findById(case_id);
    if (!caseDoc) {
      return res.status(404).json({ message: 'Case not found.' });
    }

    const allowed = await canAccessCase(caseDoc, req.auth);
    if (!allowed) {
      return res.status(403).json({ message: 'Access denied for this case.' });
    }

    const prediction = await Prediction.create({
      case_id: String(case_id),
      disease_name: String(disease_name).trim(),
      confidence_score: Number(confidence_score),
      recommended_action: String(recommended_action).trim(),
    });

    return res.status(201).json({ prediction: serializePrediction(prediction) });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to save prediction.', error: error.message });
  }
});

app.post('/api/ml/predict-image', authMiddleware, async (req, res) => {
  try {
    const { images, case_id } = req.body;

    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ message: 'At least one image is required.' });
    }

    if (!case_id) {
      return res.status(400).json({ message: 'case_id is required.' });
    }

    const caseDoc = await Case.findById(case_id);
    if (!caseDoc) {
      return res.status(404).json({ message: 'Case not found.' });
    }

    const allowed = await canAccessCase(caseDoc, req.auth);
    if (!allowed) {
      return res.status(403).json({ message: 'Access denied for this case.' });
    }

    const prediction = runImagePrediction(images);
    if (!prediction || !prediction.disease_name || prediction.confidence_score == null) {
      throw new Error('Invalid prediction response from ML model.');
    }

    const savedPrediction = await Prediction.create({
      case_id: String(case_id),
      disease_name: String(prediction.disease_name).trim(),
      confidence_score: Number(prediction.confidence_score),
      recommended_action: String(prediction.recommended_action || '').trim() || 'Please consult a qualified healthcare professional for confirmation and treatment.',
    });

    return res.json({
      prediction: {
        ...serializePrediction(savedPrediction),
        top_predictions: prediction.top_predictions || [],
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to analyze uploaded images.';
    const isValidationError =
      message.includes('Dataset must be labeled') ||
      message.includes('At least one image is required') ||
      message.includes('case_id is required') ||
      message.includes('Case not found');

    return res.status(isValidationError ? 400 : 500).json({ message: message });
  }
});

app.get('/api/cases/decision-queue', authMiddleware, async (req, res) => {
  try {
    if (req.auth.role === 'villager') {
      return res.status(403).json({ message: 'Villagers cannot access decision queue.' });
    }

    const filter = {
      ...buildAccessibleCaseFilter(req.auth),
      status: { $in: ['pending', 'in_review'] },
    };

    const caseDocs = await Case.find(filter).sort({ created_at: -1 });
    const userIds = [...new Set(caseDocs.map((c) => c.user_id).filter(Boolean))];
    const users = await User.find({ _id: { $in: userIds } }).select('_id full_name role');
    const userMap = new Map(users.map((u) => [String(u._id), u]));

    const payload = await Promise.all(
      caseDocs.map(async (caseDoc) => {
        const symptoms = await Symptom.find({ case_id: String(caseDoc._id) }).sort({ created_at: 1 });
        const predictions = await Prediction.find({ case_id: String(caseDoc._id) })
          .sort({ created_at: -1 })
          .limit(1);
        const patient = userMap.get(caseDoc.user_id);

        return {
          ...(await serializeCaseWithEmergency(caseDoc)),
          profiles: {
            full_name: patient?.full_name || 'Unknown patient',
          },
          symptoms: symptoms.map(serializeSymptom),
          predictions: predictions.map(serializePrediction).map((p) => ({
            confidence_score: p.confidence_score,
            disease_name: p.disease_name,
          })),
        };
      })
    );

    payload.sort((a, b) => {
      const scoreDiff = Number(b.emergency_score || 0) - Number(a.emergency_score || 0);
      if (scoreDiff !== 0) {
        return scoreDiff;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return res.json({ cases: payload });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch decision queue.', error: error.message });
  }
});

app.post('/api/cases/:id([0-9a-fA-F]{24})/classify', authMiddleware, async (req, res) => {
  try {
    if (req.auth.role === 'villager') {
      return res.status(403).json({ message: 'Villagers cannot classify cases.' });
    }

    const caseDoc = await Case.findById(req.params.id);
    if (!caseDoc) {
      return res.status(404).json({ message: 'Case not found.' });
    }

    const { severity, status } = req.body;
    if (!severity || !status) {
      return res.status(400).json({ message: 'Severity and status are required.' });
    }

    caseDoc.severity = severity;
    caseDoc.status = status;
    await caseDoc.save();

    const patientAlert = await Alert.create({
      user_id: caseDoc.user_id,
      case_id: String(caseDoc._id),
      alert_type: 'update',
      message: 'Your case has been classified and is being reviewed by medical staff.',
      is_read: false,
    });

    if (severity === 'severe' || severity === 'moderate') {
      const doctors = await User.find({ role: 'doctor' }).limit(1);
      if (doctors.length > 0) {
        await Alert.create({
          user_id: String(doctors[0]._id),
          case_id: String(caseDoc._id),
          alert_type: severity === 'severe' ? 'escalation' : 'new_case',
          message:
            severity === 'severe'
              ? `URGENT: Case "${caseDoc.title}" classified as SEVERE. Immediate attention required.`
              : `Case "${caseDoc.title}" classified as MODERATE. Review recommended.`,
          is_read: false,
        });
      }
    }

    return res.json({ case: await serializeCaseWithEmergency(caseDoc), patientAlert: serializeAlert(patientAlert) });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to classify case.', error: error.message });
  }
});

app.get('/api/alerts', authMiddleware, async (req, res) => {
  try {
    const filter = { user_id: String(req.auth.sub) };
    if (req.query.filter === 'unread') {
      filter.is_read = false;
    }

    const alerts = await Alert.find(filter).sort({ created_at: -1 });
    return res.json({ alerts: alerts.map(serializeAlert) });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch alerts.', error: error.message });
  }
});

app.patch('/api/alerts/:id/read', authMiddleware, async (req, res) => {
  try {
    const alert = await Alert.findOneAndUpdate(
      { _id: req.params.id, user_id: String(req.auth.sub) },
      { is_read: true },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({ message: 'Alert not found.' });
    }

    return res.json({ alert: serializeAlert(alert) });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to update alert.', error: error.message });
  }
});

app.patch('/api/alerts/read-all', authMiddleware, async (req, res) => {
  try {
    await Alert.updateMany({ user_id: String(req.auth.sub), is_read: false }, { is_read: true });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to update alerts.', error: error.message });
  }
});

app.get('/api/reports/summary', authMiddleware, async (req, res) => {
  try {
    if (req.auth.role !== 'doctor' && req.auth.role !== 'admin' && req.auth.role !== 'asha_worker') {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const totalCases = await Case.countDocuments();
    const pendingCases = await Case.countDocuments({ status: { $in: ['pending', 'in_review'] } });
    const resolvedCases = await Case.countDocuments({ status: 'resolved' });
    const severeCases = await Case.countDocuments({ severity: 'severe' });
    const totalPatients = await User.countDocuments({ role: 'villager' });

    return res.json({
      totalCases,
      pendingCases,
      resolvedCases,
      severeCases,
      totalPatients,
      avgResolutionTime: 3.5,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch report summary.', error: error.message });
  }
});

app.get('/api/users/doctors', authMiddleware, async (req, res) => {
  try {
    if (req.auth.role !== 'asha_worker' && req.auth.role !== 'admin') {
      return res.status(403).json({ message: 'Only ASHA workers or admins can view doctors.' });
    }

    const doctors = await User.find({ role: { $regex: /^doctor$/i } }).sort({ full_name: 1 });
    return res.json({
      users: doctors.map((doctorDoc) => ({
        id: String(doctorDoc._id),
        full_name: doctorDoc.full_name,
        role: doctorDoc.role,
      })),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch doctors.', error: error.message });
  }
});

app.get('/api/users', authMiddleware, async (req, res) => {
  try {
    if (req.auth.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can view users.' });
    }

    const allowedRoles = ['villager', 'asha_worker', 'doctor', 'admin'];
    const filter = {
      role: { $in: allowedRoles },
      full_name: { $exists: true, $type: 'string', $regex: /\S/ },
    };

    if (req.query.role && req.query.role !== 'all') {
      const requestedRole = String(req.query.role);
      if (!allowedRoles.includes(requestedRole)) {
        return res.json({ users: [] });
      }
      filter.role = requestedRole;
    }

    const users = await User.find(filter).sort({ created_at: -1 });
    return res.json({
      users: users.map(serializeUser),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch users.', error: error.message });
  }
});

app.get('/api/users/:id([0-9a-fA-F]{24})', authMiddleware, async (req, res) => {
  try {
    if (req.auth.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can view users.' });
    }

    const userDoc = await User.findById(req.params.id);
    if (!userDoc) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.json({ user: serializeUser(userDoc) });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch user.', error: error.message });
  }
});

app.patch('/api/users/:id([0-9a-fA-F]{24})', authMiddleware, async (req, res) => {
  try {
    if (req.auth.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can update users.' });
    }

    const { full_name, role, phone_number, village } = req.body;
    const allowedRoles = ['villager', 'asha_worker', 'doctor', 'admin'];
    if (role != null && !allowedRoles.includes(String(role).trim())) {
      return res.status(400).json({ message: 'Invalid role selected.' });
    }

    const updates = {
      ...(full_name != null ? { full_name: String(full_name).trim() } : {}),
      ...(role != null ? { role: String(role).trim() } : {}),
      ...(phone_number != null ? { phone_number: String(phone_number).trim() } : {}),
      ...(village != null ? { village: String(village).trim() } : {}),
    };

    const updated = await User.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!updated) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.json({ user: serializeUser(updated) });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to update user.', error: error.message });
  }
});

app.post('/api/users/:id([0-9a-fA-F]{24})/block', authMiddleware, async (req, res) => {
  try {
    if (req.auth.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can block users.' });
    }

    const blockDays = Number(req.body.days);
    if (!Number.isFinite(blockDays) || blockDays <= 0) {
      return res.status(400).json({ message: 'Block duration must be at least 1 day.' });
    }

    const reason = String(
      req.body.reason || 'Your access is blocked by admin. Please contact the administrator.'
    ).trim();
    const blockedUntil = new Date(Date.now() + blockDays * 24 * 60 * 60 * 1000);

    const updated = await User.findByIdAndUpdate(
      req.params.id,
      {
        blocked_until: blockedUntil,
        blocked_reason: reason,
        blocked_at: new Date(),
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.json({ user: serializeUser(updated), message: `User blocked for ${blockDays} day(s).` });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to block user.', error: error.message });
  }
});

app.post('/api/users/:id([0-9a-fA-F]{24})/unblock', authMiddleware, async (req, res) => {
  try {
    if (req.auth.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can unblock users.' });
    }

    const updated = await User.findByIdAndUpdate(
      req.params.id,
      {
        blocked_until: null,
        blocked_reason: null,
        blocked_at: null,
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.json({ user: serializeUser(updated), message: 'User unblocked successfully.' });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to unblock user.', error: error.message });
  }
});

app.patch('/api/profile/me', authMiddleware, async (req, res) => {
  try {
    const { full_name, phone_number, village } = req.body;

    const updated = await User.findByIdAndUpdate(
      req.auth.sub,
      {
        ...(full_name != null ? { full_name: String(full_name).trim() } : {}),
        ...(phone_number != null ? { phone_number: String(phone_number).trim() } : {}),
        ...(village != null ? { village: String(village).trim() } : {}),
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.json({
      profile: {
        id: String(updated._id),
        full_name: updated.full_name,
        role: updated.role,
        phone_number: updated.phone_number || '',
        village: updated.village || '',
        created_at: updated.created_at?.toISOString?.() || new Date().toISOString(),
        updated_at: updated.updated_at?.toISOString?.() || new Date().toISOString(),
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to update profile.', error: error.message });
  }
});

app.post('/api/cases', authMiddleware, async (req, res) => {
  try {
    const { title, description, image_url, images = [], symptoms = [], emergency_score } = req.body;

    if (!title || !description) {
      return res.status(400).json({ message: 'Case title and description are required.' });
    }

    if (req.auth.role !== 'villager') {
      return res.status(403).json({ message: 'Only villagers can create cases.' });
    }

    const caseDoc = await Case.create({
      user_id: String(req.auth.sub),
      title: String(title).trim(),
      description: String(description).trim(),
      emergency_score: Math.max(0, Math.min(10, Number(emergency_score ?? 0))) || 0,
      image_url: image_url ? String(image_url).trim() : null,
      images: normalizeCaseImages({ image_url, images }),
      status: 'pending',
    });

    await EmergencyAssessment.create({
      case_id: String(caseDoc._id),
      emergency_score: Math.max(0, Math.min(10, Number(emergency_score ?? 0))) || 0,
      source: 'manual',
    });

    const insertedSymptoms = [];
    if (Array.isArray(symptoms) && symptoms.length > 0) {
      const symptomDocs = await Symptom.insertMany(
        symptoms.map((symptom) => ({
          case_id: String(caseDoc._id),
          symptom_name: String(symptom.name || '').trim(),
          severity: symptom.severity || 'mild',
          duration_days: Number(symptom.duration || symptom.duration_days || 0),
        }))
      );
      insertedSymptoms.push(...symptomDocs.map(serializeSymptom));
    }

    return res.status(201).json({ case: await serializeCaseWithEmergency(caseDoc), symptoms: insertedSymptoms });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to create case.', error: error.message });
  }
});

app.get('/api/cases/me', authMiddleware, async (req, res) => {
  try {
    const cases = await Case.find({ user_id: String(req.auth.sub) }).sort({ created_at: -1 });
    const enriched = await Promise.all(cases.map(async (c) => serializeCaseWithEmergency(c)));
    return res.json({ cases: enriched });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch cases.', error: error.message });
  }
});

app.get('/api/dashboard/stats', authMiddleware, async (req, res) => {
  try {
    let totalCases = 0;
    let pendingCases = 0;
    let resolvedCases = 0;
    let alerts = 0;
    const accessibleCaseFilter = buildAccessibleCaseFilter(req.auth);

    if (req.auth.role === 'villager') {
      totalCases = await Case.countDocuments(accessibleCaseFilter);
      pendingCases = await Case.countDocuments({
        ...accessibleCaseFilter,
        status: { $in: ['pending', 'in_review'] },
      });
      resolvedCases = await Case.countDocuments({
        ...accessibleCaseFilter,
        status: 'resolved',
      });
      alerts = await Alert.countDocuments({ user_id: String(req.auth.sub), is_read: false });
    } else if (req.auth.role === 'admin') {
      totalCases = await Case.countDocuments();
      pendingCases = await Case.countDocuments({ status: { $in: ['pending', 'in_review'] } });
      resolvedCases = await Case.countDocuments({ status: 'resolved' });
      alerts = await Alert.countDocuments({ user_id: String(req.auth.sub), is_read: false });
    } else {
      totalCases = await Case.countDocuments(accessibleCaseFilter);
      pendingCases = await Case.countDocuments({
        ...accessibleCaseFilter,
        status: { $in: ['pending', 'in_review'] },
      });
      resolvedCases = await Case.countDocuments({
        ...accessibleCaseFilter,
        status: 'resolved',
      });
      alerts = await Alert.countDocuments({ user_id: String(req.auth.sub), is_read: false });
    }

    return res.json({ totalCases, pendingCases, resolvedCases, alerts });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch dashboard stats.', error: error.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, full_name, role, phone_number, village } = req.body;

    if (!email || !password || !full_name || !role) {
      return res.status(400).json({ message: 'Email, password, full name, and role are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const allowedRoles = ['villager', 'asha_worker', 'doctor', 'admin'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role selected.' });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered. Please login.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const userDoc = await User.create({
      email: normalizedEmail,
      passwordHash,
      full_name: String(full_name).trim(),
      role,
      phone_number: phone_number ? String(phone_number).trim() : '',
      village: village ? String(village).trim() : '',
    });

    const token = createToken(userDoc);
    const payload = toAuthPayload(userDoc);
    return res.status(201).json({ token, ...payload });
  } catch (error) {
    return res.status(500).json({ message: 'Registration failed. Please try again.', error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const userDoc = await User.findOne({ email: normalizedEmail });

    if (!userDoc) {
      return res.status(401).json({ message: 'Entered username and password are incorrect.' });
    }

    const passwordMatch = await bcrypt.compare(password, userDoc.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Entered username and password are incorrect.' });
    }

    const blockedMessage = getBlockedMessage(userDoc);
    if (blockedMessage) {
      return res.status(403).json({ message: blockedMessage });
    }

    const token = createToken(userDoc);
    const payload = toAuthPayload(userDoc);
    return res.json({ token, ...payload });
  } catch (error) {
    return res.status(500).json({ message: 'Login failed. Please try again.', error: error.message });
  }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const userDoc = await User.findById(req.auth.sub);
    if (!userDoc) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const payload = toAuthPayload(userDoc);
    return res.json(payload);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch profile.', error: error.message });
  }
});

async function startServer() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error('MONGODB_URI is missing in backend/.env');
  }

  await mongoose.connect(mongoUri);
  app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start backend:', error);
  process.exit(1);
});
