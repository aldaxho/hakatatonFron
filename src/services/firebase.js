import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyBnwb50kZ461R-HLw0xLhWj4sBjygP5CXQ',
  authDomain: 'sombraai-hackathon-c0c44.firebaseapp.com',
  projectId: 'sombraai-hackathon-c0c44',
  storageBucket: 'sombraai-hackathon-c0c44.firebasestorage.app',
  messagingSenderId: '1066596518095',
  appId: '1:1066596518095:web:c94bbabf104bca2d670fba',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const storage = getStorage(app, 'gs://sombraai-hackathon-c0c44.firebasestorage.app');

export async function subirFotoArbol(uid, uri) {
  const blob = await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => resolve(xhr.response);
    xhr.onerror = () => reject(new Error('No se pudo leer la imagen'));
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });
  const storageRef = ref(storage, `arboles/${uid}/${Date.now()}.jpg`);
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
}
