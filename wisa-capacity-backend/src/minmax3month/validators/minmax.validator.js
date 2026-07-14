const REQUIRED_FILE_FIELDS = [
  'addressMaster',
  'partMaster',
  'nqc',
  'freqLp',
  'orderSummary',
  'setPart',
];

const DEFAULT_TARGET_DOCKS = ['S1', 'S4', 'SH'];

const toPositiveNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const normalizeTargetDocks = (targetDocks) => {
  if (!targetDocks) return DEFAULT_TARGET_DOCKS;

  if (Array.isArray(targetDocks)) {
    const normalized = targetDocks.map((dock) => String(dock).trim()).filter(Boolean);
    return normalized.length ? normalized : DEFAULT_TARGET_DOCKS;
  }

  const normalized = String(targetDocks)
    .split(',')
    .map((dock) => dock.trim())
    .filter(Boolean);

  return normalized.length ? normalized : DEFAULT_TARGET_DOCKS;
};

export const validateMinmaxUpload = ({ files = {}, body = {} }) => {
  const errors = [];

  REQUIRED_FILE_FIELDS.forEach((field) => {
    if (!files[field]?.[0]) {
      errors.push(`${field} file is required`);
    }
  });

  if (!body.targetMonth) {
    errors.push('targetMonth is required');
  }

  const unitPerDay = toPositiveNumber(body.unitPerDay);
  const tackTime = toPositiveNumber(body.tackTime);

  // unitPerDay/tackTime are optional: they're no longer used to derive PcSafetyTime/LsSafetyTime
  // (now sourced directly from PartMaster.txt), but are still accepted and kept in config in case
  // a future feature needs them.

  // workingDayN1/N2/N3 are no longer accepted from the request body at all - they're resolved
  // from working_day_settings (see workingDaySettings.service.js#resolveWorkingDaysForTarget)
  // based on targetMonth instead, so there's nothing to validate or return here.

  return {
    errors,
    config: {
      targetMonth: body.targetMonth,
      unitPerDay,
      tackTime,
      targetDocks: normalizeTargetDocks(body.targetDocks),
    },
  };
};

export const getUploadFileSummary = (files = {}) => {
  return REQUIRED_FILE_FIELDS.reduce((summary, field) => {
    const file = files[field]?.[0];
    summary[field] = {
      originalName: file.originalname,
      size: file.size,
    };
    return summary;
  }, {});
};

export { DEFAULT_TARGET_DOCKS, REQUIRED_FILE_FIELDS };
