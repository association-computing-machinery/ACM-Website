import ImageKit, { toFile } from '@imagekit/nodejs';

let _ik = null;

export function getImageKit(env = process.env) {
  if (!_ik) {
    _ik = new ImageKit({
      publicKey:   env.IMAGEKIT_PUBLIC_KEY,
      privateKey:  env.IMAGEKIT_PRIVATE_KEY,
      urlEndpoint: env.IMAGEKIT_URL_ENDPOINT,
    });
  }
  return _ik;
}

/**
 * Upload a file buffer to ImageKit.
 * @param {Buffer} buffer - file data
 * @param {string} fileName - e.g. "photo.jpg"
 * @param {string} folder   - e.g. "/Members"
 * @param {object} env
 * @returns {Promise<string>} public URL
 */
export async function uploadFile(buffer, fileName, folder, env = process.env) {
  const ik = getImageKit(env);
  const result = await ik.files.upload({
    file: await toFile(buffer, fileName),
    fileName,
    folder,
    useUniqueFileName: true,
  });
  return result.url;
}

/**
 * Delete a file from ImageKit by its fileId.
 * @param {string} fileId
 * @param {object} env
 */
export async function deleteFile(fileId, env = process.env) {
  const ik = getImageKit(env);
  await ik.deleteFile(fileId);
}
