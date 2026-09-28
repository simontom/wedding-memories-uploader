/**
 * Wedding Photo Uploader - Google Apps Script Backend
 * Target Google Drive Folder ID: YOUR-GOOGLE-DRIVE-FOLDER-ID
 * Repository: wedding-memories-uploader
 */

const TARGET_FOLDER_ID = 'YOUR-GOOGLE-DRIVE-FOLDER-ID';

/**
 * Serves the upload form HTML to guests.
 */
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Svatební vzpomínky - Nahrávání fotek')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Generates a unique, chronologically sortable filename.
 * Example output: wedding_20260928_105530_a1b2c3_IMG_0042.jpg
 *
 * @param {string} originalName - Original uploaded file name
 * @return {string} Unique filename
 */
function generateUniqueFileName(originalName) {
  const timeZone = Session.getScriptTimeZone() || 'UTC';
  const timestamp = Utilities.formatDate(new Date(), timeZone, 'yyyyMMdd_HHmmss');
  const uniqueHash = Utilities.getUuid().substring(0, 6);

  let extension = '';
  const safeName = (originalName && typeof originalName === 'string') ? originalName : 'photo.jpg';
  let baseName = safeName;

  const dotIndex = safeName.lastIndexOf('.');
  if (dotIndex !== -1) {
    baseName = safeName.substring(0, dotIndex);
    extension = safeName.substring(dotIndex);
  }

  // Clean original base name and limit length to 30 characters
  const cleanBaseName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);

  return 'wedding_' + timestamp + '_' + uniqueHash + '_' + cleanBaseName + extension;
}

/**
 * Handles individual file upload from the client directly into the target folder
 * with a generated unique filename.
 *
 * @param {Object} fileData - { fileName, mimeType, base64 }
 * @return {Object} result - { success: boolean, fileName: string, error?: string }
 */
function uploadFile(fileData) {
  try {
    if (!fileData || !fileData.base64) {
      return {
        success: false,
        fileName: 'unknown',
        error: 'Chybí data souboru (No file data)'
      };
    }

    const folder = DriveApp.getFolderById(TARGET_FOLDER_ID);

    // Decode base64 file data
    const decodedBytes = Utilities.base64Decode(fileData.base64);

    // Generate unique filename
    const fileName = fileData.fileName || 'photo.jpg';
    const mimeType = fileData.mimeType || 'image/jpeg';
    const uniqueFileName = generateUniqueFileName(fileName);
    const blob = Utilities.newBlob(decodedBytes, mimeType, uniqueFileName);

    // Save directly into the wedding folder
    const uploadedFile = folder.createFile(blob);

    return {
      success: true,
      fileName: uploadedFile.getName(),
      id: uploadedFile.getId()
    };
  } catch (error) {
    return {
      success: false,
      fileName: fileData ? fileData.fileName : 'unknown',
      error: error.toString()
    };
  }
}
