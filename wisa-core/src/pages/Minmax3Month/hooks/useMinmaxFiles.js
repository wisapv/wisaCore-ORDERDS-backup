import { useState } from 'react';
import { INITIAL_FILES } from '../constants/minmaxConstants.js';

export function useMinmaxFiles() {
  const [files, setFiles] = useState(INITIAL_FILES);
  const [config, setConfig] = useState({ targetMonth: '', workingDayN1: '', workingDayN2: '', workingDayN3: '', unitPerDay: '', tackTime: '' });
  const handleFileChange = (key, selectedFile) => setFiles((current) => ({ ...current, [key]: selectedFile || null }));
  const handleConfigChange = (key, value) => setConfig((current) => ({ ...current, [key]: value }));
  return { files, config, handleFileChange, handleConfigChange };
}
