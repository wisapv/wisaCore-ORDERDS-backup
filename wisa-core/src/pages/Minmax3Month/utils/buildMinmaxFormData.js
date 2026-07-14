import { REQUIRED_FILES, TARGET_DOCKS } from '../constants/minmaxConstants.js';

export const buildMinmaxFormData = (files, config) => {
  const formData = new FormData();
  REQUIRED_FILES.forEach(({ key, multiple }) => {
    if (multiple) {
      (files[key] || []).forEach((file) => formData.append(key, file));
    } else if (files[key]) {
      formData.append(key, files[key]);
    }
  });
  formData.append('targetMonth', config.targetMonth);
  formData.append('unitPerDay', config.unitPerDay);
  formData.append('tackTime', config.tackTime);
  formData.append('targetDocks', TARGET_DOCKS.join(','));
  return formData;
};
