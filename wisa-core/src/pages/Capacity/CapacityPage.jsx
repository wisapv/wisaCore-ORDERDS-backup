import { useState } from 'react';
import Header from '../../components/Header.jsx';
import { UploadCloud, Play, FileSpreadsheet, Sparkles, Download } from 'lucide-react';

export default function CapacityPage() {
  const [file, setFile] = useState(null);
  const [targetMonth, setTargetMonth] = useState('May-26');
  const [tableData, setTableData] = useState([]);
  const [availableMonths, setAvailableMonths] = useState([]);
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
      const response = await fetch('http://localhost:3000/api/capacity/upload-nqc', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      if (result.success) {
        setTableData(result.data);
        setAvailableMonths(result.availableMonths || []);
      }
      else alert('เกิดข้อผิดพลาด: ' + result.message);
    } catch {
      alert('ไม่สามารถเชื่อมต่อ Backend ได้ — กรุณาเปิด server ที่ localhost:3000');
    }
    setIsLoading(false);
  };

  const handleExport = () => {
    if (!tableData.length) return alert('ไม่มีข้อมูลสำหรับ Export');
    
    const baseCols = [
      'Source', 'Dock', 'Sup', 'Splant', 'Sdock', 'Pno', 'PartNo', 'PartName', 'KBN', 'Qty', 'PC_Addr',
      'Addr01', 'Addr02', 'Addr03', 'Addr04', 'Addr05', 'Addr06', 'Addr07', 'Addr08', 'Addr09', 'Addr10', 'Addr11', 'Addr12', 'Addr13'
    ];
    
    const headers = [...baseCols, ...availableMonths, 'Multiaddr'];

    const csvRows = [];
    csvRows.push(headers.join(','));

    tableData.forEach(row => {
      const values = headers.map(header => {
        let val = row[header] ?? '';
        val = String(val).replace(/"/g, '""');
        if (val.search(/("|,|\n)/g) >= 0) {
          val = `"${val}"`;
        }
        return val;
      });
      csvRows.push(values.join(','));
    });

    const blob = new Blob(["\ufeff" + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FinalData_NQC_${targetMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // รวมหัวคอลัมน์ทั้งหมดที่จะโชว์ในตาราง UI
  const baseCols = [
    'Source', 'Dock', 'Sup', 'Splant', 'Sdock', 'Pno', 'PartNo', 'PartName', 'KBN', 'Qty', 'PC_Addr',
    'Addr01', 'Addr02', 'Addr03', 'Addr04', 'Addr05', 'Addr06', 'Addr07', 'Addr08', 'Addr09', 'Addr10', 'Addr11', 'Addr12', 'Addr13'
  ];
  const tableHeaders = [...baseCols, ...availableMonths, 'Multiaddr'];

  return (
    <div className="flex flex-col h-full gap-6">
      <Header title="Capacity Flowrack" />

      {/* Top Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 shrink-0">
        <div className="card-strong xl:col-span-2 relative overflow-hidden p-6 flex flex-col justify-center group">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-wisa-pink/20 rounded-full blur-3xl opacity-50 group-hover:bg-wisa-pink/30 transition-all duration-700"></div>

          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
            <label className="flex-shrink-0 flex items-center justify-center w-20 h-20 bg-white/50 border border-white/60 rounded-[24px] cursor-pointer hover:bg-wisa-pink/10 hover:border-wisa-pink/50 transition-all duration-300">
              <UploadCloud className="text-wisa-dark/70 group-hover:text-wisa-pink transition-colors duration-300" size={32} strokeWidth={1.5} />
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
            </label>
            <div className="flex flex-col w-full text-center md:text-left">
              <span className="text-wisa-pink text-[10px] font-bold tracking-[0.2em] uppercase mb-1 flex items-center justify-center md:justify-start gap-1.5">
                <Sparkles size={12} /> NQC Data Input
              </span>
              <span className="text-wisa-dark font-medium text-lg md:text-xl truncate" style={{ color: 'var(--text-primary)' }}>
                {file ? file.name : 'Upload your .xlsx file here'}
              </span>
              <span className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Select the Base Format file to begin processing</span>
            </div>
          </div>
        </div>

        <div className="card-strong xl:col-span-1 flex flex-col justify-between relative overflow-hidden p-6">
          <div className="flex flex-col mb-4">
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase mb-3" style={{ color: 'var(--text-muted)' }}>Target Month</span>
            <div className="bg-white/60 border border-white/60 rounded-2xl p-3 flex items-center">
              <input
                type="text"
                value={targetMonth}
                onChange={(e) => setTargetMonth(e.target.value)}
                placeholder="May-26"
                className="bg-transparent font-semibold text-base w-full outline-none placeholder:text-slate-300 text-center"
                style={{ color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          <button
            onClick={handleProcessData}
            disabled={isLoading}
            className="btn-dark w-full py-4 text-sm font-bold tracking-widest uppercase disabled:opacity-50 flex items-center justify-center gap-2"
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

      {/* Table Section */}
      <div className="card-soft p-6 md:p-8 flex-1 flex flex-col min-h-0 relative overflow-hidden">
        <div className="flex items-center justify-between mb-6 shrink-0 relative z-10">
          <h2 className="text-lg md:text-xl font-bold text-wisa-dark tracking-wide">Data Overview</h2>

          <div className="flex items-center gap-3">
            {tableData.length > 0 && (
              <>
                <span className="bg-wisa-dark/5 text-wisa-dark border border-wisa-dark/10 px-3 py-1.5 rounded-xl text-[10px] font-bold tracking-widest uppercase">
                  {tableData.length} Records
                </span>
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 bg-wisa-pink/10 text-wisa-pink border border-wisa-pink/30 hover:bg-wisa-pink hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  <Download size={14} /> EXPORT CSV
                </button>
              </>
            )}
          </div>
        </div>

        <div className="overflow-auto flex-1 pr-2 custom-scrollbar relative z-10">
          {tableData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
              <div className="p-6 rounded-full bg-wisa-dark/5 border border-wisa-dark/5">
                <FileSpreadsheet size={48} strokeWidth={1} />
              </div>
              <p className="text-sm font-medium tracking-wide">Awaiting data injection</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white/90 z-10">
                <tr>
                  {tableHeaders.map((h) => (
                    <th key={h} className="px-4 pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] border-b border-slate-200 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-sm text-slate-700">
                {tableData.map((row, i) => (
                  <tr key={i} className="group hover:bg-wisa-pink/5 transition-colors">
                    {tableHeaders.map((col) => (
                      <td key={col} className="px-4 py-4 border-b border-slate-100 whitespace-nowrap">
                        {/* ทำสไตล์พิเศษให้คอลัมน์ Multiaddr ดูเด่นขึ้นเหมือน Status เก่า */}
                        {col === 'Multiaddr' && row[col] === 'Multi Addr' ? (
                          <span className="bg-wisa-pink/10 text-wisa-pink border border-wisa-pink/20 px-2 py-1 rounded text-[10px] font-bold tracking-widest uppercase flex items-center gap-1 w-fit">
                            <Sparkles size={12} /> Multi
                          </span>
                        ) : (
                          // ถ้าช่องไหนว่างให้ใส่ขีด (-)
                          row[col] !== undefined && row[col] !== null && row[col] !== '' ? row[col] : <span className="text-slate-300">-</span>
                        )}
                      </td>
                    ))}
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