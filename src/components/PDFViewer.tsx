import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Printer, 
  Mail, 
  Sparkles, 
  Building2, 
  CheckCircle, 
  MessageSquare,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { ERPDocument } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface PDFViewerProps {
  documentItem: ERPDocument;
  onClose: () => void;
}

export default function PDFViewer({ documentItem, onClose }: PDFViewerProps) {
  const [loadingPdf, setLoadingPdf] = useState(false);
  
  const handlePrint = () => {
    const printContent = window.document.getElementById('printable-pdf-invoice');
    if (!printContent) return;
    
    const printHtml = printContent.outerHTML;
    
    const style = `
      <style>
        body { background: white; color: black; font-family: sans-serif; padding: 20px; }
        .no-print { display: none !important; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border-bottom: 1px solid #e5e7eb; padding: 10px 0; text-align: left; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .text-indigo-600 { color: #4f46e5; }
        /* Cursive style for signature */
        @import url('https://fonts.googleapis.com/css2?family=Alex+Brush&display=swap');
        .signature-font { font-family: 'Alex Brush', cursive; }
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
        scale: 2, // High resolution
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      
      const printWidth = imgWidth * ratio;
      const printHeight = imgHeight * ratio;
      
      // Center the invoice in A4 page
      const x = (pdfWidth - printWidth) / 2;
      const y = (pdfHeight - printHeight) / 2;
      
      pdf.addImage(imgData, 'PNG', x, y, printWidth, printHeight);
      pdf.save(`${documentItem.id}_${documentItem.type}.pdf`);
    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("Failed to generate and download PDF. Please try printing.");
    } finally {
      setLoadingPdf(false);
    }
  };

  const handleEmail = () => {
    alert(`Successfully generated secure invoice payload. Dispatching corporate email containing printable PDF copy directly to client representative at: ${documentItem.customerEmail}`);
  };

  const handleWhatsApp = () => {
    const message = `Hello, this is Inovexa Technologies Ltd. Please find attached our formal ${documentItem.type} ${documentItem.id} for your review. Total amount due: $${documentItem.total}. Thank you!`;
    const encoded = encodeURIComponent(message);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  return (
    <div id="pdf-viewer-overlay" className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-gray-100 max-w-4xl w-full rounded-3xl overflow-hidden shadow-2xl border border-white/80 flex flex-col max-h-[90vh]">
        
        {/* Tool Bar controls */}
        <div className="bg-white p-4 border-b border-gray-200 flex justify-between items-center no-print">
          <div className="flex items-center space-x-3">
            <button
              id="pdf-back-btn"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm hover:translate-x-[-1px] cursor-pointer"
              title="Go back to Documents dashboard"
            >
              <ArrowLeft className="h-4 w-4 text-gray-500" />
              <span>Back</span>
            </button>
            <div className="h-4 w-[1px] bg-gray-200 hidden sm:block" />
            <div className="hidden sm:flex items-center space-x-2">
              <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <Sparkles className="h-4 w-4" />
              </span>
              <h3 className="text-xs font-black text-gray-800 font-mono">
                Inovexa PDF Engine v1.1
              </h3>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-1.5">
            <button
              id="pdf-download-btn"
              onClick={handleDownload}
              disabled={loadingPdf}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-sm hover:shadow-indigo-100 disabled:opacity-70"
            >
              {loadingPdf ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span>{loadingPdf ? "Generating..." : "Download PDF"}</span>
            </button>
            <button
              id="pdf-print-btn"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print</span>
            </button>
            <button
              id="pdf-email-btn"
              onClick={handleEmail}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer"
            >
              <Mail className="h-3.5 w-3.5" />
              <span>Email</span>
            </button>
            <button
              id="pdf-whatsapp-btn"
              onClick={handleWhatsApp}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>WhatsApp</span>
            </button>
            <button
              id="pdf-close-btn"
              onClick={onClose}
              className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-gray-600 rounded-full ml-2"
              title="Close window"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        {/* Paper Container Body (The printed PDF content) */}
        <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-gray-200/50">
          <div 
            id="printable-pdf-invoice"
            className="w-full max-w-2xl p-10 rounded-none flex flex-col justify-between font-sans min-h-[842px]"
            style={{ backgroundColor: '#ffffff', color: '#1f2937', borderColor: '#d1d5db', borderWidth: '1px', borderStyle: 'solid', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}
          >
            <div>
              {/* Header */}
              <div className="flex justify-between items-start pb-6" style={{ borderBottom: '1px solid #e5e7eb' }}>
                <div>
                  <div className="flex items-center space-x-3">
                    {/* Beautiful styled corporate vector logo */}
                    <div className="p-2 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', color: '#ffffff', boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)' }}>
                      <svg className="h-6 w-6" style={{ color: '#ffffff' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-lg font-black tracking-tight block" style={{ color: '#111827' }}>Inovexa Technologies Ltd.</span>
                      <span className="text-[9px] font-extrabold uppercase tracking-wider block" style={{ color: '#4f46e5' }}>Enterprise IT & Network Security</span>
                    </div>
                  </div>
                  <p className="text-[10px] font-mono mt-3" style={{ color: '#6b7280' }}>House1/2, Block A, Prodhan House,</p>
                  <p className="text-[10px] font-mono" style={{ color: '#6b7280' }}>Asadgate, Dhaka</p>
                  <p className="text-[10px] font-mono mt-0.5" style={{ color: '#9ca3af' }}>sales@inovexabd.com | +880 2-41022026</p>
                </div>
                <div className="text-right">
                  <span className="font-black text-2xl tracking-tight uppercase block" style={{ color: '#4f46e5' }}>
                    {documentItem.type.replace('_', ' ')}
                  </span>
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg" style={{ color: '#6b7280', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}>Ref: {documentItem.id}</span>
                  <div className="mt-4 space-y-0.5 text-[10px]" style={{ color: '#6b7280' }}>
                    <p>Date Issued: <span className="font-bold" style={{ color: '#374151' }}>2026-07-10</span></p>
                    <p>Due/Validity: <span className="font-bold" style={{ color: '#374151' }}>{documentItem.dueDate}</span></p>
                  </div>
                </div>
              </div>

              {/* Client & Billing Info */}
              <div className="grid grid-cols-2 gap-6 py-6 text-xs" style={{ borderBottom: '1px solid #f3f4f6' }}>
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider block mb-1.5" style={{ color: '#4f46e5' }}>ISSUED TO / CLIENT</span>
                  <p className="font-black text-sm" style={{ color: '#111827' }}>{documentItem.customerName}</p>
                  <p className="font-semibold mt-0.5" style={{ color: '#6b7280' }}>{documentItem.customerEmail}</p>
                  {documentItem.customerPhone && <p className="mt-0.5 font-mono" style={{ color: '#9ca3af' }}>{documentItem.customerPhone}</p>}
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-black uppercase tracking-wider block mb-1.5" style={{ color: '#4f46e5' }}>DELIVERY ADDRESS</span>
                  <p className="font-medium whitespace-pre-wrap leading-relaxed" style={{ color: '#374151' }}>{documentItem.customerAddress || 'Direct Digital API/License Delivery'}</p>
                </div>
              </div>

              {/* PDF Items Table */}
              <table className="w-full text-left text-xs my-6">
                <thead>
                  <tr className="font-extrabold uppercase tracking-wider text-[9px]" style={{ borderBottom: '1px solid #e5e7eb', color: '#9ca3af' }}>
                    <th className="pb-2.5">Description / Technical Specification</th>
                    <th className="pb-2.5 text-right">Quantity</th>
                    <th className="pb-2.5 text-right">Unit Price</th>
                    <th className="pb-2.5 text-right">Total (USD)</th>
                  </tr>
                </thead>
                <tbody style={{ color: '#4b5563' }}>
                  {documentItem.items.map((item, idx) => (
                    <tr key={idx} className="py-2.5" style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td className="py-3 pr-4">
                        <span className="font-bold block text-[13px]" style={{ color: '#111827' }}>{item.productName}</span>
                        <span className="text-[9px] font-mono" style={{ color: '#9ca3af' }}>Reference node: {item.productId}</span>
                      </td>
                      <td className="py-3 text-right font-bold" style={{ color: '#1f2937' }}>{item.quantity}</td>
                      <td className="py-3 text-right font-semibold" style={{ color: '#374151' }}>${item.price.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                      <td className="py-3 text-right font-black" style={{ color: '#111827' }}>${item.total.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom calculation blocks */}
            <div>
              <div className="flex flex-col md:flex-row justify-between items-start gap-4 pt-5 text-xs" style={{ borderTop: '1px solid #e5e7eb' }}>
                <div className="flex-1 text-[10px] max-w-sm" style={{ color: '#6b7280' }}>
                  <span className="font-bold block mb-1.5 uppercase text-[8px] tracking-wider" style={{ color: '#374151' }}>PAYMENT TERMS & SYSTEM REMARKS</span>
                  <p className="italic leading-relaxed">{documentItem.notes || "Standard Net-30 payment schedule. Deliveries for physical hardware node models proceed within 10 operational days following invoice approval. Client assumes responsibility for cloud compliance setups."}</p>
                </div>

                <div className="w-64 space-y-1.5 self-end">
                  <div className="flex justify-between font-medium" style={{ color: '#6b7280' }}>
                    <span>Subtotal</span>
                    <span>${documentItem.subtotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                  </div>
                  <div className="flex justify-between font-medium" style={{ color: '#6b7280' }}>
                    <span>VAT Surcharge / Tax</span>
                    <span>${documentItem.tax.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                  </div>
                  {documentItem.discount > 0 && (
                    <div className="flex justify-between font-bold" style={{ color: '#059669' }}>
                      <span>Volume Discount</span>
                      <span>-${documentItem.discount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-sm pt-2.5" style={{ borderTop: '1px solid #e5e7eb', color: '#111827' }}>
                    <span>Grand Total Due</span>
                    <span style={{ color: '#4f46e5' }}>${documentItem.total.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                  </div>
                </div>
              </div>

              {/* Signatures footer */}
              <div className="mt-14 flex justify-between items-center text-[10px]" style={{ borderTop: '1px solid #f3f4f6', color: '#9ca3af' }}>
                <div>
                  <p className="font-medium" style={{ color: '#6b7280' }}>Electronically generated via Inovexa ERP.</p>
                  <p className="font-mono text-[8px] mt-0.5" style={{ color: '#9ca3af' }}>Secure SHA256 Verification: {documentItem.id}_82H1K</p>
                </div>
                <div className="text-right">
                  {/* Styled handwritten elegant signature */}
                  <div className="h-8 flex items-center justify-end pr-3">
                    <span 
                      className="text-xl font-black select-none transform -rotate-2 origin-right tracking-widest leading-none block"
                      style={{ fontFamily: "'Alex Brush', cursive, serif", color: '#4f46e5' }}
                    >
                      Salman Khan Tushar
                    </span>
                  </div>
                  <div className="w-36 mt-1 mb-1 ml-auto" style={{ borderBottom: '1px solid #d1d5db' }} />
                  <p className="font-bold" style={{ color: '#1f2937' }}>Salman Khan Tushar</p>
                  <p className="text-[8px] uppercase font-bold tracking-wider" style={{ color: '#9ca3af' }}>Authorized Signatory</p>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
