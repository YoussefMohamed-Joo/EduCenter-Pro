import { useEffect, useState } from 'react';
import type { Receipt as ReceiptType } from '@/types';

export default function ReceiptView({ receiptId, onClose }: { receiptId: number; onClose: () => void }) {
  const [receipt, setReceipt] = useState<ReceiptType | null>(null);

  useEffect(() => {
    (async () => {
      try { setReceipt(await window.electronAPI.getReceiptForPrint(receiptId)); } catch {}
    })();
  }, [receiptId]);

  const handlePrint = () => {
    if (!receipt) return;
    const content = document.getElementById('receipt-content')?.innerHTML || '';
    const win = window.open('', '', 'width=400,height=600');
    if (!win) return;
    win.document.write(`
      <html dir="rtl">
      <head><title>إيصال</title>
      <style>
        body { font-family: 'Cairo', sans-serif; margin: 0; padding: 20px; display: flex; justify-content: center; }
        .receipt { width: 320px; border: 2px solid #333; border-radius: 12px; padding: 20px; }
        .receipt h2 { text-align: center; margin: 0 0 5px; font-size: 18px; }
        .receipt .header { text-align: center; font-size: 12px; color: #666; margin-bottom: 15px; }
        .receipt .info { text-align: right; font-size: 14px; margin: 10px 0; }
        .receipt .info p { margin: 4px 0; }
        .receipt .total { font-size: 20px; text-align: center; margin: 15px 0; font-weight: bold; }
        .receipt .qr { text-align: center; margin: 10px 0; font-family: monospace; font-size: 10px; background: #f0f0f0; padding: 8px; border-radius: 4px; }
        .receipt .footer { font-size: 10px; color: #999; text-align: center; margin-top: 15px; }
      </style>
      </head>
      <body>${content}</body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 mx-4" onClick={e => e.stopPropagation()}>
        <div id="receipt-content">
          {receipt && (
            <div className="text-center p-4" style={{ width: 320, fontFamily: 'Cairo, sans-serif' }}>
              <h2 className="text-lg font-bold text-gray-800">إيصال دفع</h2>
              <p className="text-xs text-gray-500">رقم: {receipt.receipt_number}</p>
              <p className="text-xs text-gray-500">{new Date(receipt.created_at).toLocaleDateString('ar-EG')}</p>
              <div className="text-right text-sm mt-3 space-y-1 text-gray-700">
                <p><strong>اسم الطالب:</strong> {receipt.student_name}</p>
                <p><strong>الكود:</strong> {receipt.sid}</p>
                <p><strong>النوع:</strong> {receipt.payment_type === 'full' ? 'كامل' : receipt.payment_type === 'partial' ? 'جزئي' : receipt.payment_type}</p>
              </div>
              <div className="text-2xl font-bold text-gray-800 my-4">{receipt.amount} ج.م</div>
              {receipt.notes && <p className="text-xs text-gray-500 mb-2">{receipt.notes}</p>}
              <div className="font-mono text-xs bg-gray-100 p-2 rounded text-gray-800">QR-{receipt.receipt_number}</div>
              <p className="text-[10px] text-gray-400 mt-3">EduCenter Pro - إيصال دفع</p>
            </div>
          )}
        </div>
        <div className="flex justify-center gap-3 mt-4">
          {receipt && <button onClick={handlePrint} className="btn-primary">طباعة</button>}
          <button onClick={onClose} className="btn-secondary">إغلاق</button>
        </div>
      </div>
    </div>
  );
}
