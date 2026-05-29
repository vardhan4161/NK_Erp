const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'artifacts', 'mobile-erp', 'app', 'sale', '[id].tsx');
let code = fs.readFileSync(filePath, 'utf8');

const newHtmlFunc = `  const generateInvoiceHtml = () => {
    if (!sale) return '';
    
    const fDate = (dString) => {
      const d = new Date(dString);
      const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
    };
    
    const fCur = (val) => 'Rs. ' + parseFloat(val).toFixed(2);
    const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
    const dueBalance = Math.max(0, sale.grand_total - sale.amount_paid);

    return \`
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
        body { font-family: 'Inter', Helvetica, Arial, sans-serif; margin: 0; padding: 0; color: #000; font-size: 10px; }
        .invoice-box { max-width: 800px; margin: auto; border: 1px solid #000; background: #fff; display: flex; flex-direction: column; min-height: 98vh; box-sizing: border-box; }
        
        .header-title { padding: 12px 16px; font-size: 16px; font-weight: 400; letter-spacing: 0.5px; border-bottom: 1px solid #000; text-transform: uppercase; }
        
        .company-info { text-align: center; padding: 15px 0; border-bottom: 1px solid #000; }
        .company-name { color: #32E896; font-size: 22px; font-weight: 800; letter-spacing: 0.5px; margin-bottom: 8px; }
        .company-address { font-size: 10px; margin-bottom: 10px; }
        .company-meta { display: flex; justify-content: center; gap: 30px; font-size: 9px; font-weight: 600; }
        
        .bill-info-row { display: flex; border-bottom: 1px solid #000; min-height: 120px; }
        .bill-left { width: 50%; border-right: 1px solid #000; padding: 12px 16px; box-sizing: border-box; }
        .bill-right { width: 50%; display: flex; justify-content: space-around; align-items: center; text-align: center; }
        
        .bill-to-title { font-size: 11px; margin-bottom: 6px; }
        .customer-name { font-weight: 700; font-size: 12px; margin-bottom: 4px; }
        .customer-line { margin-bottom: 3px; font-size: 9px; }
        
        .inv-meta-block { display: flex; flex-direction: column; gap: 6px; }
        .inv-meta-label { font-weight: 700; font-size: 10px; }
        .inv-meta-val { font-size: 10px; }
        
        table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        th { background: #32E896; color: #000; font-weight: 600; text-align: left; padding: 8px 12px; font-size: 10px; }
        td { padding: 8px 12px; vertical-align: top; font-size: 10px; }
        th:first-child, td:first-child { width: 8%; text-align: center; }
        th:nth-child(2), td:nth-child(2) { width: 32%; }
        th:nth-child(3), td:nth-child(3) { width: 12%; }
        th:nth-child(4), td:nth-child(4) { width: 16%; }
        th:nth-child(5), td:nth-child(5) { width: 16%; }
        th:last-child, td:last-child { width: 16%; text-align: right; }
        
        .items-container { flex-grow: 1; border-bottom: 1px solid #000; display: flex; flex-direction: column; }
        .items-table-wrapper { flex-grow: 1; }
        
        /* Inner vertical lines for table */
        th:not(:last-child), td:not(:last-child) { border-right: 1px solid #ccc; }
        th { border-bottom: 1px solid #000; border-right: 1px solid #000 !important; }
        th:last-child { border-right: none !important; }
        .items-table-wrapper td { border-right: 1px solid #000; }
        .items-table-wrapper td:last-child { border-right: none; }
        
        .totals-table { border-collapse: collapse; width: 100%; }
        .totals-table td { border-right: 1px solid #000; padding: 8px 12px; font-size: 10px; }
        .totals-table td:last-child { border-right: none; text-align: right; font-weight: 600; }
        
        .row-border-top td { border-top: 1px solid #000; }
        
        .bg-green { background: #32E896; font-weight: 700; }
        .bg-green td { font-weight: 700; color: #000; }
        
        .footer-row { display: flex; min-height: 100px; }
        .footer-notes { width: 35%; border-right: 1px solid #000; padding: 12px; }
        .footer-terms { width: 35%; border-right: 1px solid #000; padding: 12px; }
        .footer-sign { width: 30%; padding: 12px; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; text-align: center; }
        
        .footer-title { font-weight: 700; margin-bottom: 6px; font-size: 10px; }
        .footer-text { font-size: 9px; line-height: 1.4; color: #333; }
      </style>
    </head>
    <body>
      <div class="invoice-box">
        <div class="header-title">TAX INVOICE</div>
        
        <div class="company-info">
          <div class="company-name">\${shopDetails.shop_name || 'Akash Enterprises'}</div>
          <div class="company-address">\${shopDetails.shop_address || 'Ajmer Road, Jaipur, Rajasthan 301202'}</div>
          <div class="company-meta">
            <span>Phone: +91 \${shopDetails.shop_phone1 || '9981278197'}</span>
            <span>GSTIN: \${shopDetails.shop_gstin || '08AALCR2857A1ZD'}</span>
            <span>PAN Number: \${shopDetails.shop_pan || 'AVHPC9999A'}</span>
          </div>
        </div>
        
        <div class="bill-info-row">
          <div class="bill-left">
            <div class="bill-to-title">BILL TO</div>
            <div class="customer-name">\${sale.customer_name || 'Walk-in Customer'}</div>
            <div class="customer-line">\${sale.customer_address || '04, KK Buildings, Ajmeri Gate, Jodhpur, Rajasthan, 304582'}</div>
            \${sale.customer_phone ? \`<div class="customer-line">Phone: +91 \${sale.customer_phone}</div>\` : ''}
            <div class="customer-line">PAN Number: \${sale.customer_pan || 'BBHPC9999A'}</div>
            \${sale.customer_gstin ? \`<div class="customer-line">GSTIN: \${sale.customer_gstin}</div>\` : ''}
            <div class="customer-line">Place of Supply: \${sale.place_of_supply || 'Rajasthan'}</div>
          </div>
          <div class="bill-right">
            <div class="inv-meta-block">
              <div class="inv-meta-label">Invoice No</div>
              <div class="inv-meta-val">\${sale.invoice_number}</div>
            </div>
            <div class="inv-meta-block">
              <div class="inv-meta-label">Invoice Date</div>
              <div class="inv-meta-val">\${fDate(sale.created_at)}</div>
            </div>
          </div>
        </div>
        
        <div class="items-container">
          <div class="items-table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Sr. No.</th>
                  <th>Items</th>
                  <th>Quantity</th>
                  <th>Price / Unit</th>
                  <th>Tax / Unit</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                \${items.map((item, i) => {
                  const itemGst = item.gst_amount / (item.quantity || 1);
                  return \`
                  <tr>
                    <td style="text-align:center;">\${i + 1}</td>
                    <td>\${item.product_name}</td>
                    <td>\${item.quantity} NOS</td>
                    <td>\${fCur(item.unit_price)}</td>
                    <td>\${fCur(itemGst)} (\${item.gst_rate}%)</td>
                    <td style="text-align:right;">\${fCur(item.total_price)}</td>
                  </tr>
                  \`;
                }).join('')}
              </tbody>
            </table>
          </div>
          
          <table class="totals-table">
            <tbody>
              \${sale.discount_amount > 0 ? \`
              <tr class="row-border-top">
                <td style="width: 8%;"></td>
                <td style="width: 32%; text-align: right;">Discount</td>
                <td style="width: 12%;"></td>
                <td style="width: 16%;"></td>
                <td style="width: 16%;"></td>
                <td style="width: 16%;">\${fCur(sale.discount_amount)}</td>
              </tr>
              \` : ''}
              
              <tr class="row-border-top bg-green">
                <td style="width: 8%;"></td>
                <td style="width: 32%; text-align: right;">Total</td>
                <td style="width: 12%;">\${totalQty}</td>
                <td style="width: 16%;"></td>
                <td style="width: 16%;">\${fCur(sale.total_tax)}</td>
                <td style="width: 16%;">\${fCur(sale.grand_total)}</td>
              </tr>
              
              <tr class="row-border-top">
                <td style="width: 8%;"></td>
                <td style="width: 32%; text-align: right;">Received Amount</td>
                <td style="width: 12%;"></td>
                <td style="width: 16%;"></td>
                <td style="width: 16%;"></td>
                <td style="width: 16%;">\${fCur(sale.amount_paid || sale.grand_total)}</td>
              </tr>
              
              <tr class="row-border-top">
                <td style="width: 8%;"></td>
                <td style="width: 32%; text-align: right; font-weight: 700;">Due Balance</td>
                <td style="width: 12%;"></td>
                <td style="width: 16%;"></td>
                <td style="width: 16%;"></td>
                <td style="width: 16%;">\${fCur(dueBalance)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div class="footer-row">
          <div class="footer-notes">
            <div class="footer-title">Notes</div>
            <div class="footer-text">\${sale.notes || '1. No return deal'}</div>
          </div>
          <div class="footer-terms">
            <div class="footer-title">Terms & Conditions</div>
            <div class="footer-text">
              1. Customer will pay the GST<br>
              2. Customer will pay the Delivery charges<br>
              3. Pay due amount within 15 days
            </div>
          </div>
          <div class="footer-sign">
            <div style="font-size: 9px; margin-bottom: 2px;">Authorised Signatory For</div>
            <div style="font-size: 10px; font-weight: 600;">\${shopDetails.shop_name || 'Akash Enterprises'}</div>
          </div>
        </div>
        
      </div>
    </body>
    </html>
    \`;
  };`;

const startIndex = code.indexOf('  const generateInvoiceHtml = () => {');
const endIndex = code.indexOf('  const handleSharePdf = async () => {');

if (startIndex !== -1 && endIndex !== -1) {
  code = code.substring(0, startIndex) + newHtmlFunc + '\n\n' + code.substring(endIndex);
  fs.writeFileSync(filePath, code);
  console.log('Invoice template updated successfully.');
} else {
  console.log('Failed to find replace indices.', startIndex, endIndex);
}
