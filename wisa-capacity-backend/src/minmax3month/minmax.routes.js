import { Router } from 'express';
import multer from 'multer';
import { auditRouteCodeUpload, calculateMinMaxUpload, downloadMinMaxHistoryExcel, getMinMaxHistoryDetail, healthCheck, listMinMaxHistory, previewUpload, processAddressMasterUpload, processCalBaseUpload, processFreqLpUpload, processNqcUpload, processOrderSummaryUpload, processPartMasterUpload, processSetPartUpload, validateUpload } from './minmax.controller.js';
import { REQUIRED_FILE_FIELDS } from './validators/minmax.validator.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });
// orderSummary may be exported as multiple files that get concatenated (header from the first
// file only, data rows from all of them) - see orderSummary.service.js#processOrderSummary.
const uploadFields = REQUIRED_FILE_FIELDS.map((name) => ({ name, maxCount: name === 'orderSummary' ? 30 : 1 }));
const uploadValidationFiles = (req, res, next) => {
  upload.fields(uploadFields)(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Upload validation failed',
        errors: [error.message],
      });
    }

    return next();
  });
};


const uploadAddressMasterFile = (req, res, next) => {
  upload.single('addressMaster')(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'AddressMaster processing failed',
        errors: [error.message],
      });
    }

    return next();
  });
};


const uploadNqcFile = (req, res, next) => {
  upload.single('nqc')(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'NQC processing failed',
        errors: [error.message],
      });
    }

    return next();
  });
};


const uploadPartMasterFile = (req, res, next) => {
  upload.single('partMaster')(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'PartMaster processing failed',
        errors: [error.message],
      });
    }

    return next();
  });
};


const uploadFreqLpFile = (req, res, next) => {
  upload.single('freqLp')(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Freq_LP processing failed',
        errors: [error.message],
      });
    }

    return next();
  });
};


const uploadOrderSummaryFile = (req, res, next) => {
  upload.array('orderSummary', 30)(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Order Summary / BoxLayer processing failed',
        errors: [error.message],
      });
    }

    return next();
  });
};

const uploadSetPartFile = (req, res, next) => {
  upload.single('setPart')(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'SetPart processing failed',
        errors: [error.message],
      });
    }

    return next();
  });
};

router.get('/health', healthCheck);
router.post('/validate-upload', uploadValidationFiles, validateUpload);
router.post('/preview-upload', uploadValidationFiles, previewUpload);
router.post('/process-address-master', uploadAddressMasterFile, processAddressMasterUpload);
router.post('/process-nqc', uploadNqcFile, processNqcUpload);
router.post('/process-part-master', uploadPartMasterFile, processPartMasterUpload);
router.post('/process-freq-lp', uploadFreqLpFile, processFreqLpUpload);
router.post('/process-order-summary', uploadOrderSummaryFile, processOrderSummaryUpload);
router.post('/process-set-part', uploadSetPartFile, processSetPartUpload);
router.post('/process-cal-base', uploadValidationFiles, processCalBaseUpload);
router.post('/calculate-minmax', uploadValidationFiles, calculateMinMaxUpload);
router.post('/audit-route-code', uploadValidationFiles, auditRouteCodeUpload);

router.get('/history', listMinMaxHistory);
router.get('/history/:id', getMinMaxHistoryDetail);
router.get('/history/:id/download', downloadMinMaxHistoryExcel);

export default router;
