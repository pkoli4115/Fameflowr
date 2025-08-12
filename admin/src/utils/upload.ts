// =============================
// FILE: src/utils/upload.ts
// =============================
// Optional helper if you store images in Firebase Storage. This uses the Web SDK v10 style import path.
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

export async function uploadWithProgress(path: string, file: File, onProgress?: (p: number) => void): Promise<string> {
  const storage = getStorage();
  const storageRef = ref(storage, path);
  const task = uploadBytesResumable(storageRef, file);
  return new Promise((resolve, reject) => {
    task.on(
      "state_changed",
      (snap) => {
        const pct = (snap.bytesTransferred / snap.totalBytes) * 100;
        if (onProgress) onProgress(pct);
      },
      (err) => reject(err),
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        resolve(url);
      }
    );
  });
}
