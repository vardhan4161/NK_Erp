import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as XLSX from 'xlsx';

export class ExportService {
  /**
   * Export an array of objects to an Excel (.xlsx) file and share it.
   */
  static async exportToExcel(data: any[], filename: string, sheetName: string = 'Sheet1') {
    try {
      // 1. Convert JSON to Worksheet
      const ws = XLSX.utils.json_to_sheet(data);
      
      // 2. Create Workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      
      // 3. Write Workbook to base64
      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      
      // 4. Save to filesystem
      const fs = FileSystem as any;
      const uri = fs.cacheDirectory + `${filename}.xlsx`;
      await fs.writeAsStringAsync(uri, wbout, {
        encoding: fs.EncodingType?.Base64 || 'base64'
      });
      
      // 5. Share
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: 'Export Excel Report',
        });
      } else {
        throw new Error("Sharing is not available on this device");
      }
    } catch (error: any) {
      console.error('Excel Export Error:', error);
      throw new Error(`Failed to export Excel: ${error.message}`);
    }
  }

  /**
   * Export HTML string to PDF and share it.
   */
  static async exportToPdf(html: string, filename: string) {
    try {
      // 1. Generate PDF
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false
      });
      
      // 2. Rename file (Print.printToFileAsync creates a random filename)
      const fs = FileSystem as any;
      const newUri = fs.cacheDirectory + `${filename}.pdf`;
      await fs.moveAsync({
        from: uri,
        to: newUri,
      });

      // 3. Share
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(newUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Export PDF Report',
        });
      } else {
        throw new Error("Sharing is not available on this device");
      }
    } catch (error: any) {
      console.error('PDF Export Error:', error);
      throw new Error(`Failed to export PDF: ${error.message}`);
    }
  }

  /**
   * Helper to generate a generic PDF report from an array of objects
   */
  static generateGenericHtmlReport(title: string, data: any[]): string {
    if (!data || data.length === 0) return `<h1>${title}</h1><p>No data available</p>`;
    
    const columns = Object.keys(data[0]);
    
    const rows = data.map(item => `
      <tr>
        ${columns.map(col => `<td style="padding: 8px; border: 1px solid #ddd;">${item[col] ?? ''}</td>`).join('')}
      </tr>
    `).join('');

    return `
      <html>
        <head>
          <style>
            body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 20px; color: #333; }
            h1 { color: #1E3A8A; border-bottom: 2px solid #1E3A8A; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th { background-color: #F3F4F6; padding: 10px 8px; text-align: left; border: 1px solid #ddd; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <p>Generated on: ${new Date().toLocaleString()}</p>
          <table>
            <thead>
              <tr>
                ${columns.map(col => `<th>${col.toUpperCase().replace(/_/g, ' ')}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </body>
      </html>
    `;
  }
}
