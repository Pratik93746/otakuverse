'use client';

import { useState } from 'react';
import { Printer, X, FileText, CheckSquare, Sparkles } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

interface InvoicePrintProps {
  order: {
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    shippingAddress?: {
      fullName: string;
      phone: string;
      addressLine1: string;
      addressLine2?: string;
      city: string;
      state: string;
      pinCode: string;
      country: string;
    };
    items: Array<{
      name?: string;
      sku?: string;
      purchasePrice?: number;
      price?: number;
      quantity: number;
      subtotal?: number;
    }>;
    subtotal: number;
    shipping: number;
    tax: number;
    discount: number;
    total: number;
    couponCode?: string | null;
    deliveryMethod: string;
    payment?: {
      paymentStatus: string;
      paymentMethod: string;
      paymentId?: string;
      razorpayOrderId?: string;
    };
    tracking?: {
      carrier?: string;
      trackingNumber?: string;
    };
    createdAt: Date | string;
  };
}

export function OrderInvoicePrint({ order }: InvoicePrintProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeView, setActiveView] = useState<'invoice' | 'packing_slip'>('invoice');

  const orderDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const isDelhi = order.shippingAddress?.state?.toLowerCase().includes('delhi');
  const halfTax = order.tax > 0 ? Math.round(order.tax / 2) : 0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-3.5 py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold uppercase tracking-wider rounded-sm transition-colors shadow-xs"
      >
        <Printer className="w-3.5 h-3.5 text-brand-red" />
        <span>Print GST Invoice & Slip</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 print:p-0 print:bg-white print:static">
          <div className="bg-white w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded shadow-2xl flex flex-col print:max-h-none print:shadow-none print:w-full print:rounded-none">
            {/* Top Modal Controls (Hidden in Print) */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 print:hidden">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveView('invoice')}
                  className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-colors ${
                    activeView === 'invoice'
                      ? 'bg-brand-red text-white'
                      : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <FileText className="w-3 h-3 inline mr-1" /> GST Tax Invoice
                </button>
                <button
                  onClick={() => setActiveView('packing_slip')}
                  className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-colors ${
                    activeView === 'packing_slip'
                      ? 'bg-brand-red text-white'
                      : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <CheckSquare className="w-3 h-3 inline mr-1" /> Warehouse Packing Slip
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="btn-primary text-xs px-4 py-1.5 flex items-center gap-1.5 uppercase font-bold"
                >
                  <Printer className="w-3.5 h-3.5" /> Print / Save PDF
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Content Area */}
            <div className="p-8 print:p-0 text-gray-900 font-sans" id="printable-invoice">
              {activeView === 'invoice' ? (
                /* ================= GST TAX INVOICE ================= */
                <div className="border border-gray-300 p-6 space-y-6 text-xs print:border-none print:p-0">
                  {/* Header */}
                  <div className="flex justify-between items-start border-b border-gray-300 pb-5">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-heading text-2xl tracking-wider text-black font-black">
                          BAKA <span className="text-brand-red">STYLE</span>
                        </span>
                        <span className="text-[10px] bg-red-100 text-brand-red font-bold px-1.5 py-0.5 uppercase">
                          Collectibles LLP
                        </span>
                      </div>
                      <p className="font-semibold text-gray-800">OTIV TRADING PVT LTD</p>
                      <p className="text-gray-500">Plot 42, Okhla Industrial Area Phase III</p>
                      <p className="text-gray-500">New Delhi, Delhi - 110020, India</p>
                      <p className="text-gray-700 mt-1 font-mono font-bold">
                        GSTIN: 07AAACB2489Q1Z6 • PAN: AAACB2489Q
                      </p>
                      <p className="text-gray-500">Email: support@baka.style | Tel: +91 98765 43210</p>
                    </div>

                    <div className="text-right">
                      <h2 className="font-heading text-xl font-bold uppercase tracking-wider text-gray-900 mb-1">
                        TAX INVOICE
                      </h2>
                      <p className="text-xs font-mono font-bold text-gray-700">
                        Invoice No: <span className="text-black">INV-{order.orderNumber}</span>
                      </p>
                      <p className="text-gray-500 font-mono">Order Ref: #{order.orderNumber}</p>
                      <p className="text-gray-500">Invoice Date: {orderDate}</p>
                      <p className="text-gray-500">Place of Supply: {order.shippingAddress?.state || 'Delhi'} (07)</p>
                    </div>
                  </div>

                  {/* Customer Billing & Shipping */}
                  <div className="grid grid-cols-2 gap-6 border-b border-gray-300 pb-5">
                    <div>
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2">
                        BILLED TO:
                      </h4>
                      <p className="font-bold text-gray-900 text-sm">{order.customerName}</p>
                      <p className="text-gray-600">{order.customerEmail}</p>
                      {order.customerPhone && <p className="text-gray-600">Phone: {order.customerPhone}</p>}
                    </div>

                    <div>
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2">
                        SHIPPED TO:
                      </h4>
                      {order.shippingAddress ? (
                        <>
                          <p className="font-bold text-gray-900 text-sm">
                            {order.shippingAddress.fullName}
                          </p>
                          <p className="text-gray-600">{order.shippingAddress.addressLine1}</p>
                          {order.shippingAddress.addressLine2 && (
                            <p className="text-gray-600">{order.shippingAddress.addressLine2}</p>
                          )}
                          <p className="text-gray-700 font-medium">
                            {order.shippingAddress.city}, {order.shippingAddress.state} -{' '}
                            <strong>{order.shippingAddress.pinCode}</strong>
                          </p>
                          <p className="text-gray-600">Phone: {order.shippingAddress.phone}</p>
                        </>
                      ) : (
                        <p className="text-gray-400">Digital Order / In-Store Pickup</p>
                      )}
                    </div>
                  </div>

                  {/* Items Table */}
                  <div>
                    <table className="w-full text-left border border-gray-300">
                      <thead className="bg-gray-100 text-gray-700 font-bold uppercase text-[10px] border-b border-gray-300">
                        <tr>
                          <th className="p-2.5 border-r border-gray-300">#</th>
                          <th className="p-2.5 border-r border-gray-300">Item Description</th>
                          <th className="p-2.5 border-r border-gray-300">HSN</th>
                          <th className="p-2.5 border-r border-gray-300 text-center">Qty</th>
                          <th className="p-2.5 border-r border-gray-300 text-right">Rate</th>
                          <th className="p-2.5 border-r border-gray-300 text-right">Taxable</th>
                          <th className="p-2.5 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 text-xs">
                        {order.items.map((item, i) => {
                          const unitPrice = item.purchasePrice || item.price || 0;
                          const taxableAmount = Math.round((unitPrice * item.quantity) / 1.18);
                          const totalItem = unitPrice * item.quantity;
                          return (
                            <tr key={i}>
                              <td className="p-2.5 border-r border-gray-300 font-mono text-gray-500">
                                {i + 1}
                              </td>
                              <td className="p-2.5 border-r border-gray-300">
                                <span className="font-bold text-gray-900 block">
                                  {item.name || 'Authentic Anime Figure'}
                                </span>
                                {item.sku && (
                                  <span className="text-[10px] font-mono text-gray-500">
                                    SKU: {item.sku}
                                  </span>
                                )}
                              </td>
                              <td className="p-2.5 border-r border-gray-300 font-mono text-gray-600">
                                95030090
                              </td>
                              <td className="p-2.5 border-r border-gray-300 text-center font-bold">
                                {item.quantity}
                              </td>
                              <td className="p-2.5 border-r border-gray-300 text-right">
                                {formatPrice(unitPrice)}
                              </td>
                              <td className="p-2.5 border-r border-gray-300 text-right font-mono">
                                {formatPrice(taxableAmount)}
                              </td>
                              <td className="p-2.5 text-right font-bold text-gray-900">
                                {formatPrice(totalItem)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Financial Breakdown & Tax Matrix */}
                  <div className="grid grid-cols-2 gap-6 pt-2">
                    <div className="border border-gray-200 p-3.5 space-y-2 bg-gray-50">
                      <p className="font-bold text-gray-700 uppercase tracking-wider text-[10px]">
                        Payment & Verification
                      </p>
                      <p className="text-gray-600">
                        Mode: <strong className="uppercase">{order.payment?.paymentMethod || 'Razorpay / UPI'}</strong>
                      </p>
                      <p className="text-gray-600">
                        Status: <strong className="text-emerald-700 font-bold">{order.payment?.paymentStatus || 'PAID'}</strong>
                      </p>
                      {order.payment?.paymentId && (
                        <p className="text-gray-500 font-mono text-[10px]">
                          Txn Ref: {order.payment.paymentId}
                        </p>
                      )}
                      {order.tracking?.trackingNumber && (
                        <p className="text-gray-600 pt-1 border-t border-gray-200">
                          Carrier: <strong>{order.tracking.carrier}</strong> | AWB:{' '}
                          <strong className="font-mono">{order.tracking.trackingNumber}</strong>
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5 text-right">
                      <div className="flex justify-between text-gray-600">
                        <span>Taxable Value:</span>
                        <span className="font-mono">{formatPrice(order.subtotal - order.tax)}</span>
                      </div>
                      {isDelhi ? (
                        <>
                          <div className="flex justify-between text-gray-600">
                            <span>CGST (9%):</span>
                            <span className="font-mono">{formatPrice(halfTax)}</span>
                          </div>
                          <div className="flex justify-between text-gray-600">
                            <span>SGST (9%):</span>
                            <span className="font-mono">{formatPrice(halfTax)}</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-between text-gray-600">
                          <span>IGST (18%):</span>
                          <span className="font-mono">{formatPrice(order.tax)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-gray-600">
                        <span>Shipping ({order.deliveryMethod}):</span>
                        <span className="font-mono">
                          {order.shipping === 0 ? 'FREE' : formatPrice(order.shipping)}
                        </span>
                      </div>
                      {order.discount > 0 && (
                        <div className="flex justify-between text-emerald-600 font-medium">
                          <span>Discount Applied:</span>
                          <span className="font-mono">-{formatPrice(order.discount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-black text-sm text-gray-900 border-t border-gray-400 pt-2">
                        <span>INVOICE TOTAL (INR):</span>
                        <span className="text-brand-red text-base">{formatPrice(order.total)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Declaration & Signature */}
                  <div className="flex justify-between items-end border-t border-gray-300 pt-6">
                    <div className="max-w-xs text-[10px] text-gray-500 leading-relaxed">
                      <p className="font-bold uppercase text-gray-700 mb-1">Declaration:</p>
                      <p>
                        We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct. Computer generated invoice; no physical stamp required.
                      </p>
                    </div>

                    <div className="text-center">
                      <div className="border-b border-gray-400 pb-1 mb-1 w-44 font-heading text-sm uppercase text-gray-800 tracking-wider">
                        BAKA STYLE (OTIV)
                      </div>
                      <p className="text-[10px] text-gray-500 uppercase">Authorized Signatory</p>
                    </div>
                  </div>
                </div>
              ) : (
                /* ================= WAREHOUSE PACKING SLIP ================= */
                <div className="border-2 border-dashed border-gray-300 p-6 space-y-6 text-xs print:border-none print:p-0">
                  {/* Dispatch Barcode & AWB Header */}
                  <div className="flex justify-between items-center border-b-2 border-black pb-4">
                    <div>
                      <h2 className="font-heading text-2xl font-black uppercase tracking-wider">
                        DISPATCH PACKING SLIP
                      </h2>
                      <p className="text-sm font-mono font-bold text-brand-red">
                        ORDER #{order.orderNumber}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs uppercase font-bold text-gray-500">Carrier / Service</p>
                      <p className="text-base font-black text-gray-900">
                        {order.tracking?.carrier || 'DELHIVERY EXPRESS'}
                      </p>
                      <p className="font-mono text-xs font-bold text-gray-700">
                        AWB: {order.tracking?.trackingNumber || 'PENDING MANIFEST'}
                      </p>
                    </div>
                  </div>

                  {/* Destination Shipping Label Box */}
                  <div className="border-2 border-black p-4 bg-gray-50">
                    <span className="bg-black text-white text-[10px] font-bold px-2 py-0.5 uppercase tracking-widest inline-block mb-2">
                      SHIP TO DESTINATION
                    </span>
                    {order.shippingAddress ? (
                      <div className="space-y-1 text-sm">
                        <p className="font-black text-base text-gray-900">
                          {order.shippingAddress.fullName}
                        </p>
                        <p className="text-gray-800">{order.shippingAddress.addressLine1}</p>
                        {order.shippingAddress.addressLine2 && (
                          <p className="text-gray-800">{order.shippingAddress.addressLine2}</p>
                        )}
                        <p className="font-bold text-gray-900 text-base">
                          {order.shippingAddress.city}, {order.shippingAddress.state} -{' '}
                          <span className="text-brand-red font-mono font-black text-lg">
                            {order.shippingAddress.pinCode}
                          </span>
                        </p>
                        <p className="text-gray-900 font-mono font-bold pt-1">
                          Phone: {order.shippingAddress.phone}
                        </p>
                      </div>
                    ) : (
                      <p className="text-gray-500">Customer Pickup</p>
                    )}
                  </div>

                  {/* Pick & Pack Checklist */}
                  <div>
                    <h4 className="font-heading text-sm font-bold uppercase tracking-wider mb-2">
                      FIGURES TO PICK & PACK ({order.items.reduce((s, i) => s + i.quantity, 0)} TOTAL UNITS)
                    </h4>
                    <table className="w-full text-left border border-gray-300">
                      <thead className="bg-gray-100 text-[10px] uppercase font-bold border-b border-gray-300">
                        <tr>
                          <th className="p-2.5 border-r border-gray-300 w-12 text-center">TICK</th>
                          <th className="p-2.5 border-r border-gray-300">Figure Title</th>
                          <th className="p-2.5 border-r border-gray-300">SKU / Code</th>
                          <th className="p-2.5 text-center w-24">Pack Qty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {order.items.map((item, idx) => (
                          <tr key={idx} className="h-12">
                            <td className="p-2.5 border-r border-gray-300 text-center">
                              <div className="w-5 h-5 border-2 border-gray-400 mx-auto" />
                            </td>
                            <td className="p-2.5 border-r border-gray-300 font-bold text-gray-900">
                              {item.name || 'Anime Figure Collectible'}
                            </td>
                            <td className="p-2.5 border-r border-gray-300 font-mono text-gray-600">
                              {item.sku || 'OTV-FIG'}
                            </td>
                            <td className="p-2.5 text-center font-black text-base text-brand-red">
                              {item.quantity}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Collector Quality Check Directives */}
                  <div className="bg-red-50 border border-red-200 p-4 rounded text-xs space-y-2">
                    <p className="font-bold text-brand-red uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" /> Collector Packaging Protocol:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-gray-700 text-[11px]">
                      <li>Check box condition: No corner creases or blister damage allowed.</li>
                      <li>Wrap outer box with at least 3 layers of high-density air bubble sheet.</li>
                      <li>Fill void spaces with crush-absorbing foam chips.</li>
                      <li>Seal with branded FRAGILE / HANDLE WITH CARE security tape.</li>
                    </ul>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-gray-500 pt-4 border-t border-gray-200">
                    <p>Packed by: ______________________</p>
                    <p>QC Verified by: ______________________</p>
                    <p>Date: {orderDate}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
