import { parseAddressMaster, processAddressMaster } from './services/addressMaster.service.js';
import { parseFreqLp, processFreqLp } from './services/freqLp.service.js';
import { parseNqcMinmax, processNqc } from './services/nqcMinmax.service.js';
import { parseOrderSummary, processOrderSummary } from './services/orderSummary.service.js';
import { parsePartMaster, processPartMaster } from './services/partMaster.service.js';
import { parseSetPart, processSetPart } from './services/setPart.service.js';
import { calculateMinMax, processCalBase } from './services/minmax.service.js';
import { getUploadFileSummary, validateMinmaxUpload } from './validators/minmax.validator.js';

export const healthCheck = (_req, res) => {
  res.json({ success: true, module: 'minmax3month' });
};

export const validateUpload = (req, res) => {
  const { errors, config } = validateMinmaxUpload({ files: req.files, body: req.body });

  if (errors.length) {
    return res.status(400).json({
      success: false,
      message: 'Upload validation failed',
      errors,
    });
  }

  return res.json({
    success: true,
    message: 'Upload validation passed',
    files: getUploadFileSummary(req.files),
    config,
  });
};

const addMissingColumnWarnings = (warnings, label, missingColumns = []) => {
  missingColumns.forEach((column) => {
    warnings.push(`${label} missing required column: ${column}`);
  });
};

export const previewUpload = (req, res) => {
  const { errors, config } = validateMinmaxUpload({ files: req.files, body: req.body });

  if (errors.length) {
    return res.status(400).json({
      success: false,
      message: 'Upload validation failed',
      errors,
    });
  }

  try {
    const files = {
      addressMaster: parseAddressMaster(req.files.addressMaster[0]),
      partMaster: parsePartMaster(req.files.partMaster[0]),
      nqc: parseNqcMinmax(req.files.nqc[0]),
      freqLp: parseFreqLp(req.files.freqLp[0]),
      orderSummary: parseOrderSummary(req.files.orderSummary[0]),
      setPart: parseSetPart(req.files.setPart[0]),
    };
    const warnings = [];

    addMissingColumnWarnings(warnings, 'AddressMaster', files.addressMaster.missingColumns);
    addMissingColumnWarnings(warnings, 'PartMaster', files.partMaster.missingColumns);
    addMissingColumnWarnings(warnings, 'Order Summary', files.orderSummary.missingColumns);
    addMissingColumnWarnings(warnings, 'SetPart', files.setPart.missingColumns);

    return res.json({
      success: true,
      message: 'Preview completed',
      config,
      files,
      warnings,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Preview failed',
      errors: [error.message],
    });
  }
};


export const processAddressMasterUpload = (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'AddressMaster processing failed',
      errors: ['addressMaster file is required'],
    });
  }

  if (!req.body.targetMonth) {
    return res.status(400).json({
      success: false,
      message: 'AddressMaster processing failed',
      errors: ['targetMonth is required'],
    });
  }

  try {
    const result = processAddressMaster({
      file: req.file,
      targetMonth: req.body.targetMonth,
      targetDocks: req.body.targetDocks,
    });

    if (result.errors?.length) {
      return res.status(400).json({
        success: false,
        message: result.message || 'AddressMaster processing failed',
        errors: result.errors,
      });
    }

    return res.json({
      success: true,
      message: 'AddressMaster processed',
      summary: result.summary,
      rows: result.rows,
      warnings: result.warnings,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'AddressMaster processing failed',
      errors: [error.message],
    });
  }
};


const toPositiveNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const processNqcUpload = (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'NQC processing failed',
      errors: ['nqc file is required'],
    });
  }

  if (!req.body.targetMonth) {
    return res.status(400).json({
      success: false,
      message: 'NQC processing failed',
      errors: ['targetMonth is required'],
    });
  }

  const workingDayN1 = toPositiveNumber(req.body.workingDayN1);
  const workingDayN2 = toPositiveNumber(req.body.workingDayN2);
  const workingDayN3 = toPositiveNumber(req.body.workingDayN3);
  const errors = [];

  if (workingDayN1 === null) errors.push('workingDayN1 is required and must be a positive number');
  if (workingDayN2 === null) errors.push('workingDayN2 is required and must be a positive number');
  if (workingDayN3 === null) errors.push('workingDayN3 is required and must be a positive number');

  if (errors.length) {
    return res.status(400).json({
      success: false,
      message: 'NQC processing failed',
      errors,
    });
  }

  try {
    const result = processNqc({
      file: req.file,
      targetMonth: req.body.targetMonth,
      workingDayN1,
      workingDayN2,
      workingDayN3,
    });

    if (result.errors?.length) {
      return res.status(400).json({
        success: false,
        message: result.message || 'NQC processing failed',
        errors: result.errors,
        warnings: result.warnings || [],
      });
    }

    return res.json({
      success: true,
      message: 'NQC processed',
      summary: result.summary,
      rows: result.rows,
      warnings: result.warnings,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'NQC processing failed',
      errors: [error.message],
    });
  }
};


export const processPartMasterUpload = (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'PartMaster processing failed',
      errors: ['partMaster file is required'],
    });
  }

  if (!req.body.targetMonth) {
    return res.status(400).json({
      success: false,
      message: 'PartMaster processing failed',
      errors: ['targetMonth is required'],
    });
  }

  try {
    const result = processPartMaster({
      file: req.file,
      targetMonth: req.body.targetMonth,
      targetDocks: req.body.targetDocks,
    });

    if (result.errors?.length) {
      return res.status(400).json({
        success: false,
        message: result.message || 'PartMaster processing failed',
        errors: result.errors,
      });
    }

    return res.json({
      success: true,
      message: 'PartMaster processed',
      summary: result.summary,
      rows: result.rows,
      warnings: result.warnings,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'PartMaster processing failed',
      errors: [error.message],
    });
  }
};


export const processFreqLpUpload = (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Freq_LP processing failed',
      errors: ['freqLp file is required'],
    });
  }

  try {
    const result = processFreqLp({
      file: req.file,
      targetDocks: req.body.targetDocks,
    });

    if (result.errors?.length) {
      return res.status(400).json({
        success: false,
        message: result.message || 'Freq_LP processing failed',
        errors: result.errors,
        warnings: result.warnings || [],
      });
    }

    return res.json({
      success: true,
      message: 'Freq_LP processed',
      summary: result.summary,
      rows: result.rows,
      warnings: result.warnings,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Freq_LP processing failed',
      errors: [error.message],
    });
  }
};


export const processOrderSummaryUpload = (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Order Summary / BoxLayer processing failed',
      errors: ['orderSummary file is required'],
    });
  }

  try {
    const result = processOrderSummary({ file: req.file });

    if (result.errors?.length) {
      return res.status(400).json({
        success: false,
        message: result.message || 'Order Summary / BoxLayer processing failed',
        errors: result.errors,
        warnings: result.warnings || [],
      });
    }

    return res.json({
      success: true,
      message: 'Order Summary / BoxLayer processed',
      summary: result.summary,
      rows: result.rows,
      warnings: result.warnings,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Order Summary / BoxLayer processing failed',
      errors: [error.message],
    });
  }
};

export const processSetPartUpload = (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'SetPart processing failed',
      errors: ['setPart file is required'],
    });
  }

  try {
    const result = processSetPart({ file: req.file, asOfDate: req.body.asOfDate });

    if (result.errors?.length) {
      return res.status(400).json({
        success: false,
        message: result.message || 'SetPart processing failed',
        errors: result.errors,
        warnings: result.warnings || [],
      });
    }

    return res.json({
      success: true,
      message: 'SetPart processed',
      summary: result.summary,
      rows: result.rows,
      warnings: result.warnings,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'SetPart processing failed',
      errors: [error.message],
    });
  }
};


export const processCalBaseUpload = (req, res) => {
  const { errors } = validateMinmaxUpload({ files: req.files, body: req.body });

  if (errors.length) {
    return res.status(400).json({
      success: false,
      message: 'Cal base processing failed',
      errors,
    });
  }

  try {
    const result = processCalBase({
      files: req.files,
      targetMonth: req.body.targetMonth,
      workingDayN1: req.body.workingDayN1,
      workingDayN2: req.body.workingDayN2,
      workingDayN3: req.body.workingDayN3,
      targetDocks: req.body.targetDocks,
    });

    if (result.errors?.length) {
      return res.status(400).json({
        success: false,
        message: result.message || 'Cal base processing failed',
        errors: result.errors,
        warnings: result.warnings || [],
      });
    }

    return res.json({
      success: true,
      message: 'Cal base processed',
      summary: result.summary,
      rows: result.rows,
      warnings: result.warnings,
      alarms: result.alarms,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Cal base processing failed',
      errors: [error.message],
    });
  }
};


export const calculateMinMaxUpload = (req, res) => {
  const { errors } = validateMinmaxUpload({ files: req.files, body: req.body });

  if (errors.length) {
    return res.status(400).json({
      success: false,
      message: 'Min-Max calculation failed',
      errors,
    });
  }

  try {
    const result = calculateMinMax({
      files: req.files,
      targetMonth: req.body.targetMonth,
      workingDayN1: req.body.workingDayN1,
      workingDayN2: req.body.workingDayN2,
      workingDayN3: req.body.workingDayN3,
      targetDocks: req.body.targetDocks,
    });

    if (result.errors?.length) {
      return res.status(400).json({
        success: false,
        message: result.message || 'Min-Max calculation failed',
        errors: result.errors,
        warnings: result.warnings || [],
      });
    }

    return res.json({
      success: true,
      message: 'Min-Max calculated',
      summary: result.summary,
      rows: result.rows,
      warnings: result.warnings,
      alarms: result.alarms,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Min-Max calculation failed',
      errors: [error.message],
    });
  }
};
