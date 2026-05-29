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
    
    const fDate = (dString: any) => {
      const d = new Date(dString);
      const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
    };
    
    const fCur = (val: any) => 'Rs. ' + Number(val).toFixed(2);
    const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
    const dueBalance = Math.max(0, sale.grand_total - sale.amount_paid);

    return `
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
          <div class="company-name">${shopDetails.shop_name || 'Akash Enterprises'}</div>
          <div class="company-address">${shopDetails.shop_address || 'Ajmer Road, Jaipur, Rajasthan 301202'}</div>
          <div class="company-meta">
            <span>Phone: +91 ${shopDetails.shop_phone1 || '9981278197'}</span>
            <span>GSTIN: ${shopDetails.shop_gstin || '08AALCR2857A1ZD'}</span>
            <span>PAN Number: ${'AVHPC9999A'}</span>
          </div>
        </div>
        
        <div class="bill-info-row">
          <div class="bill-left">
            <div class="bill-to-title">BILL TO</div>
            <div class="customer-name">${sale.customer_name || 'Walk-in Customer'}</div>
            <div class="customer-line">${'04, KK Buildings, Ajmeri Gate, Jodhpur, Rajasthan, 304582'}</div>
            ${sale.customer_phone ? `<div class="customer-line">Phone: +91 ${sale.customer_phone}</div>` : ''}
            <div class="customer-line">PAN Number: ${'BBHPC9999A'}</div>
            ${sale.customer_gstin ? `<div class="customer-line">GSTIN: ${sale.customer_gstin}</div>` : ''}
            <div class="customer-line">Place of Supply: ${'Rajasthan'}</div>
          </div>
          <div class="bill-right">
            <div class="inv-meta-block">
              <div class="inv-meta-label">Invoice No</div>
              <div class="inv-meta-val">${sale.invoice_number}</div>
            </div>
            <div class="inv-meta-block">
              <div class="inv-meta-label">Invoice Date</div>
              <div class="inv-meta-val">${fDate(sale.created_at)}</div>
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
                ${items.map((item, i) => {
                  const itemGst = item.gst_amount / (item.quantity || 1);
                  return `
                  <tr>
                    <td style="text-align:center;">${i + 1}</td>
                    <td>${item.product_name}</td>
                    <td>${item.quantity} NOS</td>
                    <td>${fCur(item.unit_price)}</td>
                    <td>${fCur(itemGst)} (${item.gst_rate}%)</td>
                    <td style="text-align:right;">${fCur(item.total_price)}</td>
                  </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
          
          <table class="totals-table">
            <tbody>
              ${sale.discount_amount > 0 ? `
              <tr class="row-border-top">
                <td style="width: 8%;"></td>
                <td style="width: 32%; text-align: right;">Discount</td>
                <td style="width: 12%;"></td>
                <td style="width: 16%;"></td>
                <td style="width: 16%;"></td>
                <td style="width: 16%;">${fCur(sale.discount_amount)}</td>
              </tr>
              ` : ''}
              
              <tr class="row-border-top bg-green">
                <td style="width: 8%;"></td>
                <td style="width: 32%; text-align: right;">Total</td>
                <td style="width: 12%;">${totalQty}</td>
                <td style="width: 16%;"></td>
                <td style="width: 16%;">${fCur(sale.total_tax)}</td>
                <td style="width: 16%;">${fCur(sale.grand_total)}</td>
              </tr>
              
              <tr class="row-border-top">
                <td style="width: 8%;"></td>
                <td style="width: 32%; text-align: right;">Received Amount</td>
                <td style="width: 12%;"></td>
                <td style="width: 16%;"></td>
                <td style="width: 16%;"></td>
                <td style="width: 16%;">${fCur(sale.amount_paid || sale.grand_total)}</td>
              </tr>
              
              <tr class="row-border-top">
                <td style="width: 8%;"></td>
                <td style="width: 32%; text-align: right; font-weight: 700;">Due Balance</td>
                <td style="width: 12%;"></td>
                <td style="width: 16%;"></td>
                <td style="width: 16%;"></td>
                <td style="width: 16%;">${fCur(dueBalance)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div class="footer-row">
          <div class="footer-notes">
            <div class="footer-title">Notes</div>
            <div class="footer-text">${sale.notes || '1. No return deal'}</div>
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
            <div style="font-size: 10px; font-weight: 600;">${shopDetails.shop_name || 'Akash Enterprises'}</div>
          </div>
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
