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

  const workingDayN1 = toPositiveNumber(body.workingDayN1);
  const workingDayN2 = toPositiveNumber(body.workingDayN2);
  const workingDayN3 = toPositiveNumber(body.workingDayN3);

  if (workingDayN1 === null) {
    errors.push('workingDayN1 is required and must be a positive number');
  }

  if (workingDayN2 === null) {
    errors.push('workingDayN2 is required and must be a positive number');
  }

  if (workingDayN3 === null) {
    errors.push('workingDayN3 is required and must be a positive number');
  }

  return {
    errors,
    config: {
      targetMonth: body.targetMonth,
      workingDayN1,
      workingDayN2,
      workingDayN3,
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
