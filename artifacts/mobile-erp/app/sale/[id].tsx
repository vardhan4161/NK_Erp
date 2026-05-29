/**
 * Sale/Invoice Detail Screen — Full invoice view with PDF sharing
 */
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useTheme } from '@/contexts/ThemeContext';
import { useDatabaseStatus } from '@/contexts/DatabaseContext';
import { formatCurrency, formatDateTime, numberToWords } from '@/utils/formatters';
import type { Sale, SaleItem } from '@/database/repositories';

export default function SaleDetailScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { repos } = useDatabaseStatus();
  const [sale, setSale] = useState<Sale | null>(null);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [shopDetails, setShopDetails] = useState<any>({});

  const loadData = useCallback(async () => {
    if (!repos || !id) return;
    const s = await repos.sales.getById(Number(id));
    setSale(s);
    const i = await repos.sales.getItems(Number(id));
    setItems(i);
    const shop = await repos.settings.getShopDetails();
    setShopDetails(shop);
  }, [repos, id]);

  useEffect(() => { loadData(); }, [loadData]);

  const generateInvoiceHtml = () => {
    if (!sale) return '';
    return `
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 10px; color: #111; font-size: 11px; line-height: 1.4; }
        .invoice-box { max-width: 800px; margin: auto; padding: 15px; border: 1.5px solid #111; background: #fff; }
        
        .main-header { display: table; width: 100%; border-bottom: 2.5px solid #111; padding-bottom: 12px; margin-bottom: 15px; }
        .logo-section { display: table-cell; width: 55%; vertical-align: middle; }
        .logo-box { background: #111; color: white; padding: 8px 16px; border-radius: 4px; display: inline-block; font-weight: 900; font-size: 26px; letter-spacing: 1.5px; }
        .logo-sub { font-size: 11px; letter-spacing: 0.5px; font-weight: bold; margin-top: 4px; color: #333; }
        
        .shop-section { display: table-cell; width: 45%; text-align: right; vertical-align: middle; font-size: 10px; }
        .shop-title { font-size: 13px; font-weight: bold; margin: 0 0 4px 0; color: #111; text-transform: uppercase; }
        .shop-info { margin: 2px 0; color: #333; }
        
        .meta-container { display: table; width: 100%; margin-bottom: 15px; }
        .meta-cell { display: table-cell; border: 1.5px solid #111; padding: 10px; vertical-align: top; width: 50%; }
        .meta-title { font-weight: 800; border-bottom: 1.5px solid #111; padding-bottom: 4px; margin-bottom: 8px; font-size: 11px; text-transform: uppercase; }
        
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        .items-table th { background: #f1f5f9; color: #111; padding: 8px 4px; font-size: 10px; font-weight: 800; text-align: center; border: 1.5px solid #111; border-bottom: 2.5px solid #111; text-transform: uppercase; }
        .items-table td { padding: 6px 4px; border: 1.5px solid #111; font-size: 10px; text-align: center; font-family: 'Courier New', Courier, monospace; }
        .product-name-cell { text-align: left !important; font-family: 'Inter', sans-serif !important; font-size: 11px !important; }
        
        .peach-block { background: #fff1f1; border: 1.5px solid #111; padding: 12px; margin-top: 15px; border-radius: 4px; }
        .words-container { border: 1px solid #111; padding: 8px; background: #fff; margin-bottom: 10px; font-size: 11px; font-family: 'Inter', sans-serif; }
        
        .sig-row { display: table; width: 100%; margin-top: 35px; text-align: center; }
        .sig-col { display: table-cell; width: 33.3%; vertical-align: bottom; }
        .sig-line { width: 85%; border-top: 1.2px solid #111; margin: 0 auto 5px auto; }
        .sig-label { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #111; font-family: 'Inter', sans-serif; }
        .sig-desc { font-size: 8.5px; color: #555; margin-top: 2px; font-family: 'Inter', sans-serif; }
        
        .footer-banner { margin-top: 20px; text-align: center; font-size: 8.5px; color: #666; line-height: 1.4; border-top: 1px solid #ccc; padding-top: 12px; font-family: 'Inter', sans-serif; }
      </style>
    </head>
    <body>
      <div class="invoice-box">
        <div class="main-header">
          <div class="logo-section">
            <div class="logo-box">${shopDetails.shop_name || 'NK Enterprises'}</div>
            <div class="logo-sub">ELECTRONICS & APPLIANCES BILL (ORIGINAL)</div>
          </div>
          <div class="shop-section">
            <div class="shop-title">Store / Office Details</div>
            <div class="shop-info">${shopDetails.shop_address || 'Plot No. 40, Sagar Road, Hyderabad - 500 079.'}</div>
            <div class="shop-info">Phone: ${shopDetails.shop_phone1 || '9121011065'} ${shopDetails.shop_phone2 ? ', ' + shopDetails.shop_phone2 : ''}</div>
            ${shopDetails.shop_gstin ? `<div class="shop-info"><strong>GSTIN:</strong> ${shopDetails.shop_gstin}</div>` : `<div class="shop-info"><strong>GSTIN:</strong> 36AAFCE1683D1ZT</div>`}
          </div>
        </div>

        <div class="meta-container">
          <div class="meta-cell">
            <div class="meta-title">To</div>
            <strong>${sale.customer_name || 'Walk-in Customer'}</strong><br>
            ${sale.customer_phone ? `Phone: ${sale.customer_phone}<br>` : ''}
            ${sale.customer_gstin ? `GSTIN: ${sale.customer_gstin}<br>` : ''}
            Address: H NO 7-8-7 , DULLAPALLI, Telangana - 500079
          </div>
          <div class="meta-cell">
            <div class="meta-title">Invoice Details</div>
            <strong>Invoice No:</strong> ${sale.invoice_number}<br>
            <strong>Date:</strong> ${formatDateTime(sale.created_at)}<br>
            <strong>Payment Method:</strong> ${sale.payment_method}<br>
            <strong>Status:</strong> ${sale.status}
          </div>
        </div>

        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 5%">S.No</th>
              <th style="width: 40%">PRODUCT NAME</th>
              <th style="width: 10%">HSN/SAC</th>
              <th style="width: 8%">QTY</th>
              <th style="width: 10%">RATE</th>
              <th style="width: 8%">CGST</th>
              <th style="width: 8%">SGST</th>
              <th style="width: 8%">IGST</th>
              <th style="width: 13%">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item, i) => {
              const hsn = item.product_sku ? item.product_sku.substring(0, 8) : '84796000';
              const discountValue = item.discount / item.quantity;
              const rateVal = (item.unit_price - discountValue);
              
              const isInter = sale.is_inter_state === 1;
              const cgstRate = isInter ? 0 : item.gst_rate / 2;
              const cgstVal = isInter ? 0 : item.gst_amount / 2;
              const sgstRate = isInter ? 0 : item.gst_rate / 2;
              const sgstVal = isInter ? 0 : item.gst_amount / 2;
              const igstRate = isInter ? item.gst_rate : 0;
              const igstVal = isInter ? item.gst_amount : 0;
              
              return `
                <tr>
                  <td>${i + 1}</td>
                  <td class="product-name-cell">
                    <strong>${(item.product_name || 'UNKNOWN PRODUCT').toUpperCase()}</strong>
                    <div style="font-size: 8.5px; color: #555; margin-top: 3px; font-weight: normal; font-family: 'Inter', sans-serif;">
                      SKU: ${item.product_sku || '84796000'} | Variant: Standard
                    </div>
                  </td>
                  <td>${hsn}</td>
                  <td>
                    <div style="font-weight: bold; font-size: 11px;">${item.quantity}</div>
                    <div style="font-size: 8px; color: #555; font-family: 'Inter', sans-serif;">Value</div>
                  </td>
                  <td>
                    <div style="font-weight: bold; font-size: 11px;">${rateVal.toFixed(2)}</div>
                    <div style="font-size: 8px; color: #555; font-family: 'Inter', sans-serif;">Value</div>
                  </td>
                  <td>
                    <div>${cgstRate}%</div>
                    <div style="font-size: 8.5px; color: #333; margin-top: 2px;">${cgstVal > 0 ? cgstVal.toFixed(2) : '-'}</div>
                  </td>
                  <td>
                    <div>${sgstRate}%</div>
                    <div style="font-size: 8.5px; color: #333; margin-top: 2px;">${sgstVal > 0 ? sgstVal.toFixed(2) : '-'}</div>
                  </td>
                  <td>
                    <div>${igstRate > 0 ? igstRate + '%' : '-'}</div>
                    <div style="font-size: 8.5px; color: #333; margin-top: 2px;">${igstVal > 0 ? igstVal.toFixed(2) : '-'}</div>
                  </td>
                  <td style="font-weight: bold; font-size: 11px; text-align: right;">
                    ${item.total_price.toFixed(2)}
                  </td>
                </tr>
              `;
            }).join('')}
            
            <!-- Table Totals Row -->
            <tr style="font-weight: bold; background: #fafafa;">
              <td colspan="3" style="text-align: right; font-family: 'Inter', sans-serif; font-size: 10px; border-top: 1.5px solid #111;">Total</td>
              <td style="border-top: 1.5px solid #111;">
                <div style="font-size: 11px;">${items.reduce((sum, item) => sum + item.quantity, 0)}</div>
                <div style="font-size: 8px; font-weight: normal; color: #555; font-family: 'Inter', sans-serif;">Value</div>
              </td>
              <td style="border-top: 1.5px solid #111;"></td>
              <td style="border-top: 1.5px solid #111; font-size: 11px;">${sale.cgst > 0 ? '₹' + sale.cgst.toFixed(2) : '-'}</td>
              <td style="border-top: 1.5px solid #111; font-size: 11px;">${sale.sgst > 0 ? '₹' + sale.sgst.toFixed(2) : '-'}</td>
              <td style="border-top: 1.5px solid #111; font-size: 11px;">${sale.igst > 0 ? '₹' + sale.igst.toFixed(2) : '-'}</td>
              <td style="text-align: right; border-top: 1.5px solid #111; font-size: 11px;">
                ₹${sale.grand_total.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>

        <div class="peach-block">
          <div class="words-container">
            <strong>Rupees in words:</strong> <span style="text-transform: capitalize;">${numberToWords(sale.grand_total)} Only.</span>
          </div>
          
          <div style="margin-bottom: 4px; font-size: 10px; font-family: 'Inter', sans-serif;">
            <strong>Remarks:</strong> ${sale.notes || 'None'}
          </div>
          <div style="margin-bottom: 8px; font-size: 10px; font-family: 'Inter', sans-serif;">
            <strong>HP To:</strong> Wallet-${sale.grand_total.toFixed(0)}
          </div>
          
          <div style="border-top: 1.2px dashed #111; padding-top: 6px; font-size: 9px; line-height: 1.35; font-style: italic; font-family: 'Inter', sans-serif;">
            <strong>Note:</strong> Goods once sold will not be taken back or exchanged under any circumstances. The article(s) sold is/are guaranteed by respective manufacturers only.
          </div>
        </div>

        <div class="sig-row">
          <div class="sig-col">
            <div class="sig-line"></div>
            <div class="sig-label">Receiver's Signature</div>
            <div class="sig-desc">Received items in good condition</div>
          </div>
          <div class="sig-col">
            <div class="sig-line"></div>
            <div class="sig-label">Customer Signature</div>
            <div class="sig-desc">Confirmed and Accepted</div>
          </div>
          <div class="sig-col">
            <div class="sig-line"></div>
            <div class="sig-label">Authorised Signatory</div>
            <div class="sig-desc">For ${shopDetails.shop_name || 'NK Enterprises'}</div>
          </div>
        </div>

        <div class="footer-banner">
          Thank you for choosing ${shopDetails.shop_name || 'NK Enterprises'} for your electronics and appliances purchases.<br>
          For support or service requests, please contact us with this invoice number.
        </div>
      </div>
    </body>
    </html>
    `;
  };

  const handleSharePdf = async () => {
    try {
      const html = generateInvoiceHtml();
      if (Platform.OS === 'web') {
        await Print.printAsync({ html });
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Invoice ${sale?.invoice_number}` });
        } else {
          await Print.printAsync({ uri });
        }
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to generate PDF');
    }
  };

  if (!sale) return <View style={[styles.root, { backgroundColor: colors.background }]}><Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 100 }}>Loading...</Text></View>;

  const statusColor = sale.status === 'COMPLETED' ? colors.success : sale.status === 'RETURNED' ? colors.error : colors.warning;

  return (
    <ScrollView style={[styles.root, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Invoice Header */}
      <View style={[styles.invoiceHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.invNum, { color: colors.text }]}>{sale.invoice_number}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{sale.status}</Text>
        </View>
        <Text style={[styles.invDate, { color: colors.textSecondary }]}>{formatDateTime(sale.created_at)}</Text>
        <Text style={[styles.invTotal, { color: colors.primary }]}>{formatCurrency(sale.grand_total)}</Text>
      </View>

      {/* Customer */}
      {sale.customer_name && (
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.secTitle, { color: colors.textSecondary }]}>CUSTOMER</Text>
          <Text style={[styles.custName, { color: colors.text }]}>{sale.customer_name}</Text>
          {sale.customer_phone && <Text style={[styles.custInfo, { color: colors.textSecondary }]}>📱 {sale.customer_phone}</Text>}
          {sale.customer_gstin && <Text style={[styles.custInfo, { color: colors.textSecondary }]}>GSTIN: {sale.customer_gstin}</Text>}
        </View>
      )}

      {/* Items */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.secTitle, { color: colors.textSecondary }]}>ITEMS ({items.length})</Text>
        {items.map(item => (
          <View key={item.id} style={[styles.itemRow, { borderBottomColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.itemName, { color: colors.text }]}>{item.product_name}</Text>
              <Text style={[styles.itemSku, { color: colors.textMuted }]}>{item.product_sku} • GST {item.gst_rate}%</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.itemPrice, { color: colors.text }]}>{formatCurrency(item.total_price)}</Text>
              <Text style={[styles.itemQty, { color: colors.textSecondary }]}>{item.quantity} × {formatCurrency(item.unit_price)}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Totals */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.secTitle, { color: colors.textSecondary }]}>TOTALS</Text>
        <TotalRow label="Subtotal" value={formatCurrency(sale.subtotal)} colors={colors} />
        {sale.discount_amount > 0 && <TotalRow label="Discount" value={`-${formatCurrency(sale.discount_amount)}`} valueColor={colors.success} colors={colors} />}
        {sale.cgst > 0 && <TotalRow label="CGST" value={formatCurrency(sale.cgst)} colors={colors} />}
        {sale.sgst > 0 && <TotalRow label="SGST" value={formatCurrency(sale.sgst)} colors={colors} />}
        {sale.igst > 0 && <TotalRow label="IGST" value={formatCurrency(sale.igst)} colors={colors} />}
        <View style={[styles.divider, { borderTopColor: colors.border }]} />
        <TotalRow label="Grand Total" value={formatCurrency(sale.grand_total)} bold valueColor={colors.primary} colors={colors} />
        <TotalRow label="Amount Paid" value={formatCurrency(sale.amount_paid)} colors={colors} />
        {sale.change_amount > 0 && <TotalRow label="Change" value={formatCurrency(sale.change_amount)} colors={colors} />}
        <TotalRow label="Payment" value={sale.payment_method} colors={colors} />
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={handleSharePdf} activeOpacity={0.8}>
          <Feather name="share" size={18} color="#FFF" />
          <Text style={styles.actionText}>Share Invoice PDF</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function TotalRow({ label, value, bold, valueColor, colors }: any) {
  return (
    <View style={styles.totalRow}>
      <Text style={[styles.totalLabel, { color: colors.textSecondary }, bold && { fontFamily: 'Inter_700Bold', color: colors.text }]}>{label}</Text>
      <Text style={[styles.totalValue, { color: valueColor || colors.text }, bold && { fontFamily: 'Inter_700Bold', fontSize: 18 }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  invoiceHeader: { alignItems: 'center', padding: 24, gap: 6, borderBottomWidth: 1 },
  invNum: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  invDate: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  invTotal: { fontSize: 28, fontFamily: 'Inter_700Bold' },
  section: { margin: 16, marginBottom: 0, padding: 16, borderRadius: 14, borderWidth: 1, gap: 8 },
  secTitle: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 1 },
  custName: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  custInfo: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5 },
  itemName: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  itemSku: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  itemPrice: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  itemQty: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totalLabel: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  totalValue: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  divider: { borderTopWidth: 1, marginVertical: 4 },
  actions: { padding: 16, gap: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: 12, gap: 8 },
  actionText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#FFF' },
});
