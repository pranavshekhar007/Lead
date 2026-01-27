const { Parser } = require('json2csv');
const moment = require('moment');

const _getTimestamp = () => {
    return moment().format('YYYYMMDD_HHmmss');
};

const convertToCsv = (data) => {
    if (!data || data.length === 0) {
        return { buffer: null, filename: null, mimetype: null };
    }

    try {
        const parser = new Parser();
        const csv = parser.parse(data);
        const buffer = Buffer.from(csv, 'utf-8');
        const filename = `data_${_getTimestamp()}.csv`;
        return { buffer, filename, mimetype: 'text/csv' };
    } catch (err) {
        console.error("Error converting to CSV:", err);
        throw err;
    }
};

const convertToJson = (data) => {
    if (!data) {
        return { buffer: null, filename: null, mimetype: null };
    }

    try {
        const jsonStr = JSON.stringify(data, null, 2);
        const buffer = Buffer.from(jsonStr, 'utf-8');
        const filename = `data_${_getTimestamp()}.json`;
        return { buffer, filename, mimetype: 'application/json' };
    } catch (err) {
        console.error("Error converting to JSON:", err);
        throw err;
    }
};

module.exports = { convertToCsv, convertToJson };