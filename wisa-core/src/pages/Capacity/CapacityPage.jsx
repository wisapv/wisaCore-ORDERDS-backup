import { useState } from 'react';
import Header from '../../components/Header';
import { UploadCloud, Play, FileSpreadsheet, CheckCircle2, AlertTriangle, XCircle, Sparkles } from 'lucide-react';

export default function CapacityPage() {
  const [file, setFile] = useState(null);
  const [targetMonth, setTargetMonth] = useState('May-26');
  const [tableData, setTableData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  const handleProcessData = async () => {
    if (!file) return alert('กรุณาเลือกไฟล์ NQC ก่อนครับ');
    setIsLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('targetMonth', targetMonth);
    try {
      const response = await fetch('http://localhost:3000/api/cap/upload-nqc', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      if (result.success) setTableData(result.data);
      else alert('เกิดข้อผิดพลาด: ' + result.message);
    } catch {
      alert('ไม่สามารถเชื่อมต่อ Backend ได้ — กรุณาเปิด server ที่ localhost:3000');
    }
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-full gap-6">
      <Header title="Capacity Flowrack" />

      {/* Top Section : Bento Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 shrink-0">
        
        {/* Upload Card (Span 2) */}
        <div className="xl:col-span-2 relative overflow-hidden bg-[#111111] border border-white/10 rounded-[32px] p-6 shadow-2xl flex flex-col justify-center group">
          {/* Subtle Pink Glow Background */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-wisa-pink/10 rounded-full blur-3xl opacity-50 group-hover:bg-wisa-pink/20 transition-all duration-700"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
            <label className="flex-shrink-0 flex items-center justify-center w-20 h-20 bg-white/5 border border-white/10 rounded-[24px] cursor-pointer hover:bg-wisa-pink/10 hover:border-wisa-pink/50 transition-all duration-300">
              <UploadCloud className="text-white/80 group-hover:text-wisa-pink transition-colors duration-300" size={32} strokeWidth={1.5} />
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
            </label>
            <div className="flex flex-col w-full text-center md:text-left">
              <span className="text-wisa-pink text-[10px] font-bold tracking-[0.2em] uppercase mb-1 flex items-center justify-center md:justify-start gap-1.5">
                <Sparkles size={12} /> NQC Data Input
              </span>
              <span className="text-white font-medium text-lg md:text-xl truncate">
                {file ? file.name : 'Upload your .xlsx file here'}
              </span>
              <span className="text-white/40 text-xs mt-1">Select the Base Format file to begin processing</span>
            </div>
          </div>
        </div>

        {/* Configuration & Action Card */}
        <div className="xl:col-span-1 bg-[#111111] border border-white/10 rounded-[32px] p-6 shadow-2xl flex flex-col justify-between relative overflow-hidden">
          <div className="flex flex-col mb-4">
            <span className="text-white/40 text-[10px] font-bold tracking-[0.2em] uppercase mb-3">Target Month</span>
            <div className="bg-black/50 border border-white/5 rounded-2xl p-3 flex items-center">
              <input
                type="text"
                value={targetMonth}
                onChange={(e) => setTargetMonth(e.target.value)}
                placeholder="May-26"
                className="bg-transparent text-white font-semibold text-base w-full outline-none placeholder:text-white/20 text-center"
              />
            </div>
          </div>

          <button
            onClick={handleProcessData}
            disabled={isLoading}
            className="w-full bg-wisa-pink text-white py-4 rounded-2xl text-sm font-bold tracking-widest uppercase hover:shadow-[0_0_24px_rgba(233,30,140,0.4)] hover:bg-pink-500 transition-all duration-300 disabled:opacity-50 disabled:hover:shadow-none flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span className="animate-pulse">Processing...</span>
            ) : (
              <>
                <Play size={16} fill="currentColor" /> Process Data
              </>
            )}
          </button>
        </div>
      </div>

      {/* Table Section : Dark Minimalist */}
      <div className="bg-[#111111] border border-white/10 rounded-[32px] p-6 md:p-8 flex-1 flex flex-col min-h-0 shadow-2xl relative overflow-hidden">
        <div className="flex items-center justify-between mb-6 shrink-0 relative z-10">
          <h2 className="text-lg md:text-xl font-bold text-white tracking-wide">Data Overview</h2>
          {tableData.length > 0 && (
            <span className="bg-white/10 text-white border border-white/10 px-3 py-1.5 rounded-xl text-[10px] font-bold tracking-widest uppercase backdrop-blur-md">
              {tableData.length} Records
            </span>
          )}
        </div>

        <div className="overflow-auto flex-1 pr-2 custom-scrollbar relative z-10">
          {tableData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-white/20 gap-4">
              <div className="p-6 rounded-full bg-white/5 border border-white/5">
                <FileSpreadsheet size={48} strokeWidth={1} />
              </div>
              <p className="text-sm font-medium tracking-wide">Awaiting data injection</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#111111] z-10">
                <tr>
                  {['KBN', 'Part Name', 'Operation', 'Target Addr', 'Qty', 'Status'].map((h) => (
                    <th key={h} className="pb-4 text-[10px] font-bold text-white/30 uppercase tracking-[0.15em] border-b border-white/5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-sm text-white/80">
                {tableData.map((row, i) => (
                  <tr key={i} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 pr-4 font-bold text-white border-b border-white/5">{row.KBN}</td>
                    <td className="py-4 pr-4 border-b border-white/5 max-w-[200px] truncate text-white/60 font-medium" title={row.PartName}>
                      {row.PartName}
                    </td>
                    <td className="py-4 pr-4 border-b border-white/5">
                      <span className="bg-white/10 px-2 py-1 rounded text-[10px] font-bold tracking-wider uppercase text-white/70">
                        {row.Operation || 'Default'}
                      </span>
                    </td>
                    <td className="py-4 pr-4 font-medium text-wisa-pink border-b border-white/5">{row.Target_Addr || '-'}</td>
                    <td className="py-4 pr-4 font-semibold border-b border-white/5">{row.Month_Value || 0}</td>
                    <td className="py-4 border-b border-white/5">
                      <StatusPill remark={row.Remark} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// Minimal Dark Mode Status Pill
function StatusPill({ remark }) {
  if (remark === 'Multi Addr') {
    return (
      <div className="flex items-center gap-2 text-wisa-pink bg-wisa-pink/10 px-3 py-1.5 rounded-xl w-fit border border-wisa-pink/20 backdrop-blur-sm">
        <Sparkles size={14} />
        <span className="text-[10px] font-bold tracking-widest uppercase">Multi</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-white/60 bg-white/5 px-3 py-1.5 rounded-xl w-fit border border-white/5">
      <CheckCircle2 size={14} />
      <span className="text-[10px] font-bold tracking-widest uppercase">Normal</span>
    </div>
  );
}