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
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        data.forEach(item => {
            const row = {};
            columnMapping.forEach(col => {
                if (col.transform) {
                    row[col.key] = col.transform(item[col.key], item);
                } else {
                    row[col.key] = item[col.key] || '';
                }
            });
            worksheet.addRow(row);
        });

        const buffer = await workbook.xlsx.writeBuffer();
        return buffer;
    }

    static async importFromExcel(fileBuffer, columnMapping) {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(fileBuffer);

        const worksheet = workbook.worksheets[0];
        const data = [];

        const headerRow = worksheet.getRow(1);
        const headerMap = {};

        headerRow.eachCell((cell, colNumber) => {
            const header = cell.value;
            const mapping = columnMapping.find(col => col.header === header);
            if (mapping) {
                headerMap[colNumber] = mapping.key;
            }
        });

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;

            const rowData = {};
            let hasData = false;

            row.eachCell((cell, colNumber) => {
                const key = headerMap[colNumber];
                if (key) {
                    const value = cell.value;
                    const mapping = columnMapping.find(col => col.key === key);

                    if (mapping && mapping.parse) {
                        rowData[key] = mapping.parse(value);
                    } else {
                        rowData[key] = value;
                    }

                    if (value !== null && value !== undefined && value !== '') {
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
