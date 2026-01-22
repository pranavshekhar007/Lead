const ExcelJS = require('exceljs');

class ExcelService {
    static async exportToExcel(data, columnMapping, sheetName = 'Sheet1') {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(sheetName);

        worksheet.columns = columnMapping.map(col => ({
            header: col.header,
            key: col.key,
            width: col.width || 15
        }));

        worksheet.getRow(1).font = { bold: true };

        data.forEach(item => {
            const row = {};
            columnMapping.forEach(col => {
                if (col.transform) {
                    row[col.key] = col.transform(item[col.key], item);
                } else {
                    row[col.key] = item[col.key];
                }
            });
            worksheet.addRow(row);
        });

        return await workbook.xlsx.writeBuffer();
    }

    static async importFromExcel(fileBuffer, columnMapping) {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(fileBuffer);
        const worksheet = workbook.worksheets[0];
        const data = [];

        const headerRow = worksheet.getRow(1);
        const headerMap = {};

        // Map Excel headers to config keys
        headerRow.eachCell((cell, colNumber) => {
            const header = cell.value;
            const mapping = columnMapping.find(col => col.header === header);
            if (mapping) {
                headerMap[colNumber] = mapping;
            }
        });

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Skip header

            const rowData = {};
            let hasData = false;

            row.eachCell((cell, colNumber) => {
                const mapping = headerMap[colNumber];
                if (mapping) {
                    let value = cell.value;

                    // Handle rich text or formulas
                    if (value !== null && value !== undefined && value !== '') {
                        if (typeof value === 'object') {
                            if (value.text) value = value.text;
                            else if (value.result) value = value.result;
                        }

                        if (mapping.parse) {
                            value = mapping.parse(value);
                        }

                        rowData[mapping.key] = value;
                        hasData = true;
                    }
                }
            });

            if (hasData) {
                data.push(rowData);
            }
        });

        return data;
    }
}

module.exports = ExcelService;