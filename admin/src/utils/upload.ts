import { storage } from "../firebase/firebaseConfig";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";

export const uploadWithProgress = (path: string, file: File, onProgress?: (p: number)=>void) =>
  new Promise<string>((resolve, reject) => {
    const storageRef = ref(storage, path);
    const task = uploadBytesResumable(storageRef, file);

    task.on("state_changed",
      (snap) => {
        if (!onProgress) return;
        const p = (snap.bytesTransferred / snap.totalBytes) * 100;
        onProgress(Math.round(p));
      },
      reject,
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        resolve(url);
      }
    );
  });
