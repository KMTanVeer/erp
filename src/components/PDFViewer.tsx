import React, { useMemo, useState } from 'react';
import { X, Download, Printer, Mail, MessageSquare, ArrowLeft, Loader2 } from 'lucide-react';
import { ERPDocument } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface PDFViewerProps {
  documentItem: ERPDocument;
  onClose: () => void;
}

const formatCurrency = (amount: number) =>
  amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatDocDate = (dateValue: string) => {
  if (!dateValue) return 'N/A';
  const dt = new Date(dateValue);
  if (Number.isNaN(dt.getTime())) return dateValue;
  return dt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
};

export default function PDFViewer({ documentItem, onClose }: PDFViewerProps) {
  const [loadingPdf, setLoadingPdf] = useState(false);

  const issueDate = useMemo(() => {
    const createdDate = (documentItem.createdAt as any)?.seconds
      ? new Date((documentItem.createdAt as any).seconds * 1000)
      : new Date();
    return formatDocDate(createdDate.toISOString());
  }, [documentItem.createdAt]);

  const handlePrint = () => {
    const printContent = window.document.getElementById('printable-pdf-invoice');
    if (!printContent) return;

    const printHtml = printContent.outerHTML;

    const style = `
      <style>
        body { background: #f1f5f9; color: #0f172a; font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; }
        .no-print { display: none !important; }
      </style>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`<html><head><title>Print ${documentItem.id}</title>${style}</head><body>${printHtml}</body></html>`);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };

  const handleDownload = async () => {
    const element = window.document.getElementById('printable-pdf-invoice');
    if (!element) return;

    setLoadingPdf(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const ratio = Math.min(pdfWidth / canvas.width, pdfHeight / canvas.height);
      const printWidth = canvas.width * ratio;
      const printHeight = canvas.height * ratio;

      const x = (pdfWidth - printWidth) / 2;
      const y = (pdfHeight - printHeight) / 2;

      pdf.addImage(imgData, 'PNG', x, y, printWidth, printHeight);
      pdf.save(`${documentItem.id}_${documentItem.type}.pdf`);
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('Failed to generate and download PDF. Please try printing.');
    } finally {
      setLoadingPdf(false);
    }
  };

  const handleEmail = () => {
    alert(`Prepared ${documentItem.type} ${documentItem.id} for ${documentItem.customerEmail}.`);
  };

  const handleWhatsApp = () => {
    const message = `Hello, please find ${documentItem.type.toUpperCase()} ${documentItem.id}. Total: ${formatCurrency(documentItem.total)}.`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div id="pdf-viewer-overlay" className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-gray-100 max-w-5xl w-full rounded-3xl overflow-hidden shadow-2xl border border-white/80 flex flex-col max-h-[92vh]">
        <div className="bg-white p-4 border-b border-gray-200 flex justify-between items-center no-print">
          <div className="flex items-center space-x-3">
            <button
              id="pdf-back-btn"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4 text-gray-500" />
              <span>Back</span>
            </button>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              id="pdf-download-btn"
              onClick={handleDownload}
              disabled={loadingPdf}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-sm disabled:opacity-70"
            >
              {loadingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              <span>{loadingPdf ? 'Generating...' : 'Download PDF'}</span>
            </button>
            <button id="pdf-print-btn" onClick={handlePrint} className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer">
              <Printer className="h-3.5 w-3.5" />
              <span>Print</span>
            </button>
            <button id="pdf-email-btn" onClick={handleEmail} className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer">
              <Mail className="h-3.5 w-3.5" />
              <span>Email</span>
            </button>
            <button id="pdf-whatsapp-btn" onClick={handleWhatsApp} className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer">
              <MessageSquare className="h-3.5 w-3.5" />
              <span>WhatsApp</span>
            </button>
            <button id="pdf-close-btn" onClick={onClose} className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-gray-600 rounded-full ml-2" title="Close window">
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-gray-200/50">
          <div id="printable-pdf-invoice" className="mx-auto w-full max-w-3xl bg-white border border-slate-200 shadow-lg p-8 md:p-10 text-slate-800 relative">
            <div className="flex items-start justify-between border-b border-slate-200 pb-5">
              <div>
                <h2 className="text-2xl font-black tracking-wide text-slate-900">INOVEXA TECHNOLOGIES</h2>
                <p className="text-xs font-semibold tracking-[0.25em] text-slate-500 uppercase mt-1">Enterprise IT Hardware & Networking</p>
                <p className="text-xs text-slate-500 mt-3">House 1/2, Block A, Prodhan House, Asadgate, Dhaka</p>
                <p className="text-xs text-slate-500">sales@inovexabd.com | +880 2-41022026</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold tracking-[0.2em] text-slate-500 uppercase">{documentItem.type === 'quotation' ? 'Quotation' : 'Invoice'}</p>
                <h3 className="text-xl font-black text-indigo-700 mt-1">{documentItem.id}</h3>
                <p className="text-xs text-slate-500 mt-3">Issued: <span className="font-semibold text-slate-700">{issueDate}</span></p>
                <p className="text-xs text-slate-500">{documentItem.type === 'quotation' ? 'Validity' : 'Due Date'}: <span className="font-semibold text-slate-700">{formatDocDate(documentItem.dueDate)}</span></p>
                {documentItem.type === 'invoice' && (
                  <span className="inline-flex mt-3 px-2.5 py-1 text-[10px] font-black uppercase rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {documentItem.status.replace('_', ' ')}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-5 border-b border-slate-200">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Bill To</p>
                <p className="text-sm font-bold text-slate-900 mt-1">{documentItem.customerName}</p>
                <p className="text-xs text-slate-600 mt-1">{documentItem.customerEmail}</p>
                <p className="text-xs text-slate-600">{documentItem.customerPhone || 'N/A'}</p>
              </div>
              <div className="md:text-right">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Address</p>
                <p className="text-xs text-slate-700 mt-1 whitespace-pre-wrap">{documentItem.customerAddress || 'Not provided'}</p>
              </div>
            </div>

            <div className="mt-5 border border-slate-200 rounded-md overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 uppercase tracking-wider text-[10px]">
                    <th className="text-left py-2.5 px-3 w-12">SL</th>
                    <th className="text-left py-2.5 px-3">Product</th>
                    <th className="text-right py-2.5 px-3 w-20">Qty</th>
                    <th className="text-right py-2.5 px-3 w-32">Unit Price</th>
                    <th className="text-right py-2.5 px-3 w-32">Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {documentItem.items.map((item, idx) => (
                    <tr key={`${item.productId}-${idx}`} className="border-t border-slate-100">
                      <td className="py-2.5 px-3 font-semibold text-slate-500">{String(idx + 1).padStart(2, '0')}</td>
                      <td className="py-2.5 px-3">
                        <p className="font-semibold text-slate-800">{item.productName}</p>
                        <p className="text-[10px] text-slate-400">Ref: {item.productId}</p>
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold">{item.quantity}</td>
                      <td className="py-2.5 px-3 text-right">{formatCurrency(item.price)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex flex-col md:flex-row md:items-start md:justify-between gap-5">
              <div className="max-w-md">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Notes & Terms</p>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {documentItem.notes || 'Thank you for your business. Please verify item details before final approval and payment.'}
                </p>
              </div>
              <div className="w-full md:w-72 border border-slate-200 rounded-md p-3 bg-slate-50/60">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(documentItem.subtotal)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-600 mt-2">
                  <span>Tax</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(documentItem.tax)}</span>
                </div>
                {documentItem.discount > 0 && (
                  <div className="flex justify-between text-xs text-emerald-700 mt-2">
                    <span>Discount</span>
                    <span className="font-semibold">- {formatCurrency(documentItem.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between mt-3 pt-3 border-t border-slate-200">
                  <span className="text-xs font-black uppercase tracking-wide text-slate-700">Grand Total</span>
                  <span className="text-base font-black text-indigo-700">{formatCurrency(documentItem.total)}</span>
                </div>
              </div>
            </div>

            <div className="mt-10 pt-4 border-t border-slate-200 flex justify-between items-end text-xs text-slate-500">
              <div>
                <p>System generated by Inovexa ERP</p>
                <p className="font-mono text-[10px] mt-1">Verification ID: {documentItem.id}-INVX</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-slate-700">Authorized Signatory</p>
                <div className="w-40 border-b border-slate-300 mt-6 mb-1 ml-auto" />
                <p className="font-semibold text-slate-700">Inovexa Finance Team</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
