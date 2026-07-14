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
  formData.append('workingDayN1', config.workingDayN1);
  formData.append('workingDayN2', config.workingDayN2);
  formData.append('workingDayN3', config.workingDayN3);
  formData.append('unitPerDay', config.unitPerDay);
  formData.append('tackTime', config.tackTime);
  formData.append('targetDocks', TARGET_DOCKS.join(','));
  return formData;
};
