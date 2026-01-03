const { getDb, initFirebaseAdmin } = require('../config/firebaseAdmin');

function normalizeCode(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return raw.toUpperCase().replace(/\s+/g, '');
}

function parseOptionalDate(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    throw new Error('Fecha inválida');
  }
  return d;
}

function toTimestampOrNull(firebaseAdmin, dateOrNull) {
  if (dateOrNull === undefined) return undefined;
  if (dateOrNull === null) return null;
  return firebaseAdmin.firestore.Timestamp.fromDate(dateOrNull);
}

function isCodeActive(codeDoc, nowMs) {
  if (!codeDoc) return false;
  if (codeDoc.enabled === false) return false;

  const startMs = codeDoc.startAt?.toMillis ? codeDoc.startAt.toMillis() : null;
  const endMs = codeDoc.endAt?.toMillis ? codeDoc.endAt.toMillis() : null;

  if (startMs && nowMs < startMs) return false;
  if (endMs && nowMs > endMs) return false;
  return true;
}

function normalizeDiscountCodeDoc(doc) {
  const data = doc.data() || {};
  return {
    code: data.code || doc.id,
    codeUpper: data.codeUpper || doc.id,
    percent: Number(data.percent) || 0,
    enabled: data.enabled !== false,
    startAt: data.startAt ?? null,
    endAt: data.endAt ?? null,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt
  };
}

// Public: validate
const validateDiscountCode = async (req, res) => {
  try {
    const codeRaw = req.query.code;
    const codeUpper = normalizeCode(codeRaw);

    if (!codeUpper) {
      return res.json({ valid: false, reason: 'missing_code' });
    }

    const db = getDb();
    const ref = db.collection('discountCodes').doc(codeUpper);
    const doc = await ref.get();
    if (!doc.exists) {
      return res.json({ valid: false, reason: 'not_found' });
    }

    const data = normalizeDiscountCodeDoc(doc);
    const nowMs = Date.now();

    const percent = Math.max(0, Math.min(100, Number(data.percent) || 0));
    if (!percent) {
      return res.json({ valid: false, reason: 'invalid_percent' });
    }

    if (!isCodeActive(data, nowMs)) {
      return res.json({ valid: false, reason: 'inactive' });
    }

    return res.json({ valid: true, code: data.codeUpper, percent });
  } catch (error) {
    console.error('Error al validar código de descuento:', error);
    return res.status(500).json({ error: 'Error al validar código' });
  }
};

// Admin: list
const adminListDiscountCodes = async (req, res) => {
  try {
    const db = getDb();
    const snap = await db.collection('discountCodes').orderBy('createdAt', 'desc').limit(200).get();
    const codes = snap.docs.map(normalizeDiscountCodeDoc);
    return res.json({ codes });
  } catch (error) {
    console.error('Error al listar códigos de descuento (admin):', error);
    return res.status(500).json({ error: 'Error al obtener códigos de descuento' });
  }
};

// Admin: create
const adminCreateDiscountCode = async (req, res) => {
  try {
    const { code, percent, startsAt, endsAt, enabled } = req.body || {};
    const codeUpper = normalizeCode(code);
    if (!codeUpper) return res.status(400).json({ error: 'Falta code' });

    const pct = Math.max(0, Math.min(100, Number(percent) || 0));
    if (!pct) return res.status(400).json({ error: 'percent inválido (debe ser > 0)' });

    const startDate = parseOptionalDate(startsAt);
    const endDate = parseOptionalDate(endsAt);
    if (startDate && endDate && endDate.getTime() < startDate.getTime()) {
      return res.status(400).json({ error: 'endsAt no puede ser anterior a startsAt' });
    }

    const firebaseAdmin = initFirebaseAdmin();
    const db = getDb();

    const ref = db.collection('discountCodes').doc(codeUpper);
    const existing = await ref.get();
    if (existing.exists) {
      return res.status(409).json({ error: 'El código ya existe' });
    }

    const payload = {
      code: codeUpper,
      codeUpper,
      percent: pct,
      enabled: enabled === false ? false : true,
      startAt: toTimestampOrNull(firebaseAdmin, startDate ?? null),
      endAt: toTimestampOrNull(firebaseAdmin, endDate ?? null),
      createdAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp()
    };

    await ref.set(payload);
    const created = await ref.get();
    return res.status(201).json({ code: normalizeDiscountCodeDoc(created) });
  } catch (error) {
    console.error('Error al crear código de descuento (admin):', error);
    const msg = String(error?.message || 'Error al crear código');
    return res.status(500).json({ error: msg });
  }
};

// Admin: update
const adminUpdateDiscountCode = async (req, res) => {
  try {
    const codeUpper = normalizeCode(req.params.code);
    if (!codeUpper) return res.status(400).json({ error: 'Falta code' });

    const { percent, startsAt, endsAt, enabled } = req.body || {};

    const firebaseAdmin = initFirebaseAdmin();
    const db = getDb();
    const ref = db.collection('discountCodes').doc(codeUpper);
    const existing = await ref.get();
    if (!existing.exists) return res.status(404).json({ error: 'Código no encontrado' });

    const patch = {};

    if (percent !== undefined) {
      const pct = Math.max(0, Math.min(100, Number(percent) || 0));
      if (!pct) return res.status(400).json({ error: 'percent inválido (debe ser > 0)' });
      patch.percent = pct;
    }

    if (enabled !== undefined) {
      patch.enabled = !!enabled;
    }

    if (startsAt !== undefined) {
      const startDate = parseOptionalDate(startsAt);
      patch.startAt = toTimestampOrNull(firebaseAdmin, startDate);
    }

    if (endsAt !== undefined) {
      const endDate = parseOptionalDate(endsAt);
      patch.endAt = toTimestampOrNull(firebaseAdmin, endDate);
    }

    if (patch.startAt !== undefined || patch.endAt !== undefined) {
      const current = existing.data() || {};
      const start = patch.startAt === undefined ? current.startAt : patch.startAt;
      const end = patch.endAt === undefined ? current.endAt : patch.endAt;
      const startMs = start?.toMillis ? start.toMillis() : null;
      const endMs = end?.toMillis ? end.toMillis() : null;
      if (startMs && endMs && endMs < startMs) {
        return res.status(400).json({ error: 'endsAt no puede ser anterior a startsAt' });
      }
    }

    patch.updatedAt = firebaseAdmin.firestore.FieldValue.serverTimestamp();

    await ref.set(patch, { merge: true });
    const updated = await ref.get();
    return res.json({ code: normalizeDiscountCodeDoc(updated) });
  } catch (error) {
    console.error('Error al actualizar código de descuento (admin):', error);
    const msg = String(error?.message || 'Error al actualizar código');
    return res.status(500).json({ error: msg });
  }
};

// Admin: delete
const adminDeleteDiscountCode = async (req, res) => {
  try {
    const codeUpper = normalizeCode(req.params.code);
    if (!codeUpper) return res.status(400).json({ error: 'Falta code' });

    const db = getDb();
    const ref = db.collection('discountCodes').doc(codeUpper);
    const existing = await ref.get();
    if (!existing.exists) return res.status(404).json({ error: 'Código no encontrado' });

    await ref.delete();
    return res.json({ message: 'Código eliminado', code: codeUpper });
  } catch (error) {
    console.error('Error al eliminar código de descuento (admin):', error);
    return res.status(500).json({ error: 'Error al eliminar código' });
  }
};

module.exports = {
  validateDiscountCode,
  adminListDiscountCodes,
  adminCreateDiscountCode,
  adminUpdateDiscountCode,
  adminDeleteDiscountCode
};
