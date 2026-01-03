const { getDb, initFirebaseAdmin } = require('../config/firebaseAdmin');

function parseOptionalDate(value) {
  if (value === undefined) return undefined; // not provided
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

function normalizeNotice(doc) {
  const data = doc.data() || {};
  return { notice_id: doc.id, ...data };
}

function isNoticeActive(notice, nowMs) {
  if (!notice) return false;
  if (notice.enabled === false) return false;

  const startMs = notice.startAt?.toMillis ? notice.startAt.toMillis() : null;
  const endMs = notice.endAt?.toMillis ? notice.endAt.toMillis() : null;

  if (startMs && nowMs < startMs) return false;
  if (endMs && nowMs > endMs) return false;
  return true;
}

// Public: avisos activos
const listActiveNotices = async (req, res) => {
  try {
    const db = getDb();
    const snap = await db.collection('siteNotices').orderBy('createdAt', 'desc').limit(50).get();

    const nowMs = Date.now();
    const notices = snap.docs
      .map(normalizeNotice)
      .filter((n) => isNoticeActive(n, nowMs))
      .slice(0, 3);

    return res.json({ notices });
  } catch (error) {
    console.error('Error al listar avisos activos:', error);
    return res.status(500).json({ error: 'Error al obtener avisos' });
  }
};

// Admin: listar
const adminListNotices = async (req, res) => {
  try {
    const db = getDb();
    const snap = await db.collection('siteNotices').orderBy('createdAt', 'desc').limit(100).get();
    const notices = snap.docs.map(normalizeNotice);
    return res.json({ notices });
  } catch (error) {
    console.error('Error al listar avisos (admin):', error);
    return res.status(500).json({ error: 'Error al obtener avisos' });
  }
};

// Admin: crear
const adminCreateNotice = async (req, res) => {
  try {
    const { message, startsAt, endsAt, enabled } = req.body || {};
    const text = String(message || '').trim();
    if (!text) {
      return res.status(400).json({ error: 'Falta message' });
    }
    if (text.length > 400) {
      return res.status(400).json({ error: 'message demasiado largo (máx 400)' });
    }

    const startDate = parseOptionalDate(startsAt);
    const endDate = parseOptionalDate(endsAt);
    if (startDate && endDate && endDate.getTime() < startDate.getTime()) {
      return res.status(400).json({ error: 'endsAt no puede ser anterior a startsAt' });
    }

    const firebaseAdmin = initFirebaseAdmin();
    const db = getDb();
    const ref = db.collection('siteNotices').doc();

    const payload = {
      message: text,
      enabled: enabled === false ? false : true,
      startAt: toTimestampOrNull(firebaseAdmin, startDate ?? null),
      endAt: toTimestampOrNull(firebaseAdmin, endDate ?? null),
      createdAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp()
    };

    await ref.set(payload);

    const created = await ref.get();
    return res.status(201).json({ notice: normalizeNotice(created) });
  } catch (error) {
    console.error('Error al crear aviso (admin):', error);
    const msg = String(error?.message || 'Error al crear aviso');
    return res.status(500).json({ error: msg });
  }
};

// Admin: actualizar
const adminUpdateNotice = async (req, res) => {
  try {
    const { notice_id } = req.params;
    if (!notice_id) return res.status(400).json({ error: 'Falta notice_id' });

    const { message, startsAt, endsAt, enabled } = req.body || {};

    const firebaseAdmin = initFirebaseAdmin();
    const db = getDb();
    const ref = db.collection('siteNotices').doc(notice_id);
    const existing = await ref.get();
    if (!existing.exists) return res.status(404).json({ error: 'Aviso no encontrado' });

    const patch = {};

    if (message !== undefined) {
      const text = String(message || '').trim();
      if (!text) return res.status(400).json({ error: 'message vacío' });
      if (text.length > 400) return res.status(400).json({ error: 'message demasiado largo (máx 400)' });
      patch.message = text;
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

    // Validate range if both provided in this patch
    if ((patch.startAt !== undefined || patch.endAt !== undefined)) {
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
    return res.json({ notice: normalizeNotice(updated) });
  } catch (error) {
    console.error('Error al actualizar aviso (admin):', error);
    const msg = String(error?.message || 'Error al actualizar aviso');
    return res.status(500).json({ error: msg });
  }
};

// Admin: eliminar
const adminDeleteNotice = async (req, res) => {
  try {
    const { notice_id } = req.params;
    if (!notice_id) return res.status(400).json({ error: 'Falta notice_id' });

    const db = getDb();
    const ref = db.collection('siteNotices').doc(notice_id);
    const existing = await ref.get();
    if (!existing.exists) return res.status(404).json({ error: 'Aviso no encontrado' });

    await ref.delete();
    return res.json({ message: 'Aviso eliminado', notice_id });
  } catch (error) {
    console.error('Error al eliminar aviso (admin):', error);
    return res.status(500).json({ error: 'Error al eliminar aviso' });
  }
};

module.exports = {
  listActiveNotices,
  adminListNotices,
  adminCreateNotice,
  adminUpdateNotice,
  adminDeleteNotice
};
