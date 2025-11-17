/**
 * Mobile Helper Utilities for SmashBoard
 *
 * This file contains helper functions for using native mobile features
 * via Capacitor plugins. These functions work on iOS, Android, and web.
 */

import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

/**
 * Check if running on a native mobile platform
 * @returns {boolean} True if iOS or Android, false if web
 */
export const isNativePlatform = () => {
  return Capacitor.isNativePlatform();
};

/**
 * Get platform name
 * @returns {string} 'ios', 'android', or 'web'
 */
export const getPlatform = () => {
  return Capacitor.getPlatform();
};

/**
 * Take a photo using the device camera or select from gallery
 * @param {Object} options - Camera options
 * @param {boolean} options.useGallery - If true, select from gallery instead of camera
 * @returns {Promise<string>} The photo URI/path
 */
export const takePhoto = async (options = {}) => {
  try {
    const photo = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: options.useGallery ? CameraSource.Photos : CameraSource.Camera
    });

    // photo.webPath will contain a path that can be used in an <img> tag
    return photo.webPath;
  } catch (error) {
    console.error('Error taking photo:', error);
    throw error;
  }
};

/**
 * Select an image from the device gallery
 * @returns {Promise<string>} The photo URI/path
 */
export const selectFromGallery = async () => {
  return takePhoto({ useGallery: true });
};

/**
 * Save data to a file on the device
 * @param {string} filename - Name of the file
 * @param {string} data - Data to write (will be converted to string)
 * @returns {Promise<string>} The file URI
 */
export const saveFile = async (filename, data) => {
  try {
    const result = await Filesystem.writeFile({
      path: filename,
      data: typeof data === 'string' ? data : JSON.stringify(data, null, 2),
      directory: Directory.Documents,
      encoding: 'utf8'
    });

    console.log('File saved:', result.uri);
    return result.uri;
  } catch (error) {
    console.error('Error saving file:', error);
    throw error;
  }
};

/**
 * Read a file from the device
 * @param {string} filename - Name of the file to read
 * @returns {Promise<string>} The file contents
 */
export const readFile = async (filename) => {
  try {
    const result = await Filesystem.readFile({
      path: filename,
      directory: Directory.Documents,
      encoding: 'utf8'
    });

    return result.data;
  } catch (error) {
    console.error('Error reading file:', error);
    throw error;
  }
};

/**
 * Share content using the native share dialog
 * @param {Object} options - Share options
 * @param {string} options.title - Title of the share dialog
 * @param {string} options.text - Text to share
 * @param {string} options.url - URL to share (optional)
 * @param {string} options.dialogTitle - Dialog title (Android only)
 * @returns {Promise<void>}
 */
export const shareContent = async (options) => {
  try {
    await Share.share({
      title: options.title || 'Share',
      text: options.text || '',
      url: options.url || '',
      dialogTitle: options.dialogTitle || 'Share via'
    });
  } catch (error) {
    console.error('Error sharing:', error);
    throw error;
  }
};

/**
 * Export tournament results and allow sharing
 * @param {Object} results - Tournament results object
 * @param {string} filename - Filename for the export
 * @returns {Promise<void>}
 */
export const exportAndShareResults = async (results, filename = 'tournament-results.json') => {
  try {
    // Save the file first
    const fileUri = await saveFile(filename, results);

    // If on native platform, show share dialog
    if (isNativePlatform()) {
      await shareContent({
        title: 'Tournament Results',
        text: `Check out the results from ${results.meta?.eventName || 'this tournament'}!`,
        dialogTitle: 'Share Results'
      });
    } else {
      console.log('Results saved to:', fileUri);
      // On web, could trigger a download instead
    }
  } catch (error) {
    console.error('Error exporting results:', error);
    throw error;
  }
};

/**
 * Example: Add a photo upload button to your component
 *
 * Usage in a React component:
 *
 * import { takePhoto, selectFromGallery } from './mobileHelpers';
 *
 * function MyComponent() {
 *   const [photoUrl, setPhotoUrl] = useState(null);
 *
 *   const handleTakePhoto = async () => {
 *     try {
 *       const url = await takePhoto();
 *       setPhotoUrl(url);
 *     } catch (error) {
 *       alert('Failed to take photo');
 *     }
 *   };
 *
 *   const handleSelectPhoto = async () => {
 *     try {
 *       const url = await selectFromGallery();
 *       setPhotoUrl(url);
 *     } catch (error) {
 *       alert('Failed to select photo');
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <button onClick={handleTakePhoto}>Take Photo</button>
 *       <button onClick={handleSelectPhoto}>Select from Gallery</button>
 *       {photoUrl && <img src={photoUrl} alt="Uploaded" />}
 *     </div>
 *   );
 * }
 */
