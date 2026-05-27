import { useState } from 'react';
import Header from '../../components/Header';

export default function CapacityPage() {
  const [file, setFile]               = useState(null);
  const [targetMonth, setTargetMonth] = useState('May-26');
  const [tableData, setTableData]     = useState([]);
  const [isLoading, setIsLoading]     = useState(false);

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
    <>
      <Header title="Capacity Flowrack" />

      <div className="bg-white rounded-2xl p-6 border border-black/5 shadow-sm mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <label className="flex items-center gap-2 bg-wisa-dark text-white px-5 py-2.5 rounded-xl cursor-pointer hover:opacity-85 transition text-sm font-medium">
            📂 เลือกไฟล์ NQC
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
          </label>
          <span className="text-sm text-gray-400">{file ? file.name : 'ยังไม่ได้เลือกไฟล์'}</span>
          <input
            type="text"
            value={targetMonth}
            onChange={(e) => setTargetMonth(e.target.value)}
            placeholder="เช่น May-26"
            className="border border-black/15 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-wisa-pink transition"
          />
          <button
            onClick={handleProcessData}
            disabled={isLoading}
            className="bg-wisa-pink text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:opacity-85 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '⏳ กำลังประมวลผล...' : '▶ ประมวลผล'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
        {tableData.length === 0 ? (
          <div className="py-16 text-center text-gray-300 text-sm">
            📋 อัพโหลดไฟล์ NQC เพื่อดูข้อมูล Capacity
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-wisa-dark text-white text-left">
                {['KBN', 'Part Name', 'Capacity', 'Used', 'Remaining', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, i) => (
                <tr key={i} className="border-b border-black/5 hover:bg-wisa-pink/5 transition">
                  <td className="px-4 py-3">{row.KBN}</td>
                  <td className="px-4 py-3">{row.PartName}</td>
                  <td className="px-4 py-3">{row.Capacity}</td>
                  <td className="px-4 py-3">{row.Used}</td>
                  <td className="px-4 py-3">{row.Remaining}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                      row.Status === 'OK'      ? 'bg-green-50 text-green-700'   :
                      row.Status === 'Warning' ? 'bg-orange-50 text-orange-700' :
                                                 'bg-red-50 text-red-700'
                    }`}>
                      {row.Status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}