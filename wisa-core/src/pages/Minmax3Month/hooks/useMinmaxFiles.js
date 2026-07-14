import { useState } from 'react';
import { INITIAL_FILES, REQUIRED_FILES } from '../constants/minmaxConstants.js';

const FILE_FIELDS_BY_KEY = REQUIRED_FILES.reduce((map, item) => ({ ...map, [item.key]: item }), {});

export function useMinmaxFiles() {
  const [files, setFiles] = useState(INITIAL_FILES);
  const [config, setConfig] = useState({ targetMonth: '', workingDayN1: '', workingDayN2: '', workingDayN3: '', unitPerDay: '', tackTime: '' });
  // `selected` is a single File for regular fields, or a FileList/array for fields marked
  // multiple: true (currently just orderSummary) - normalize both shapes to what each field expects.
  const handleFileChange = (key, selected) => {
    const isMultiple = FILE_FIELDS_BY_KEY[key]?.multiple;
    setFiles((current) => ({ ...current, [key]: isMultiple ? Array.from(selected || []) : (selected || null) }));
  };
  const handleConfigChange = (key, value) => setConfig((current) => ({ ...current, [key]: value }));
  return { files, config, handleFileChange, handleConfigChange };
}
