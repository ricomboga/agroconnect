// Web shim for expo-secure-store — uses localStorage (non-encrypted, web only)
const PREFIX = '__agroconnect_secure_';

async function setItemAsync(key, value) {
  try { localStorage.setItem(PREFIX + key, value); } catch {}
}

async function getItemAsync(key) {
  try { return localStorage.getItem(PREFIX + key); } catch { return null; }
}

async function deleteItemAsync(key) {
  try { localStorage.removeItem(PREFIX + key); } catch {}
}

module.exports = { setItemAsync, getItemAsync, deleteItemAsync };
