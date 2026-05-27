const fs = require('fs').promises;
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

const parsePdf = async (filePath) => {
  const fileBuffer = await fs.readFile(filePath);
  const data = await pdfParse(fileBuffer);
  return data.text || '';
};

const parseDocx = async (filePath) => {
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value || '';
};

// Detects file extension and uses the correct parser.
const parseResumeFile = async (filePath, originalName) => {
  const extension = path.extname(originalName).toLowerCase();

  if (extension === '.pdf') {
    return parsePdf(filePath);
  }

  if (extension === '.docx') {
    return parseDocx(filePath);
  }

  throw new Error('Unsupported resume format');
};

module.exports = {
  parseResumeFile,
};
