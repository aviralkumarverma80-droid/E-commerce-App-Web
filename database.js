const ArrivalDB = (() => {
  const databaseName = 'arrival-store';
  const databaseVersion = 2;
  const sessionStore = 'session';
  const usersStore = 'users';
  const sessionKey = 'current-user';
  const fallbackKey = 'arrivalUser';
  const cartKey = 'cart';
  const ordersKey = 'orders';

  function openDatabase() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error('IndexedDB unavailable'));
        return;
      }
      const request = window.indexedDB.open(databaseName, databaseVersion);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(sessionStore)) {
          request.result.createObjectStore(sessionStore, { keyPath: 'id' });
        }
        if (!request.result.objectStoreNames.contains(usersStore)) {
          request.result.createObjectStore(usersStore, { keyPath: 'email' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function hashPassword(password) {
    const encodedPassword = new TextEncoder().encode(password);
    const digest = await window.crypto.subtle.digest('SHA-256', encodedPassword);
    return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  async function authenticate(email, password) {
    const normalizedEmail = email.trim().toLowerCase();
    const passwordHash = await hashPassword(password);
    try {
      const database = await openDatabase();
      const result = await new Promise((resolve, reject) => {
        const transaction = database.transaction(usersStore, 'readwrite');
        const store = transaction.objectStore(usersStore);
        const request = store.get(normalizedEmail);
        request.onsuccess = () => {
          const existingUser = request.result;
          if (existingUser && existingUser.passwordHash !== passwordHash) {
            resolve(false);
            return;
          }
          if (!existingUser) store.add({ email: normalizedEmail, passwordHash, createdAt: new Date().toISOString() });
          resolve(true);
        };
        request.onerror = () => reject(request.error);
      });
      if (!result) return false;
      await saveUser({ email: normalizedEmail, signedInAt: new Date().toISOString() });
      return true;
    } catch (error) {
      return false;
    }
  }

  function readFallback() {
    try {
      const savedUser = window.localStorage.getItem(fallbackKey);
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (error) {
      return null;
    }
  }

  async function saveUser(user) {
    try {
      const database = await openDatabase();
      await new Promise((resolve, reject) => {
        const transaction = database.transaction(sessionStore, 'readwrite');
        transaction.objectStore(sessionStore).put({ id: sessionKey, ...user });
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      window.localStorage.setItem(fallbackKey, JSON.stringify(user));
    }
  }

  async function getUser() {
    try {
      const database = await openDatabase();
      const storedUser = await new Promise((resolve, reject) => {
        const request = database.transaction(sessionStore, 'readonly').objectStore(sessionStore).get(sessionKey);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
      if (storedUser) return storedUser;
    } catch (error) {
      return readFallback();
    }
    return readFallback();
  }

  async function clearUser() {
    try {
      const database = await openDatabase();
      await new Promise((resolve, reject) => {
        const transaction = database.transaction(sessionStore, 'readwrite');
        transaction.objectStore(sessionStore).delete(sessionKey);
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      // The fallback is cleared below for browsers without IndexedDB.
    }
    window.localStorage.removeItem(fallbackKey);
  }

  async function saveCart(cart) {
    try {
      const database = await openDatabase();
      await new Promise((resolve, reject) => {
        const transaction = database.transaction(sessionStore, 'readwrite');
        transaction.objectStore(sessionStore).put({ id: cartKey, items: cart });
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      window.localStorage.setItem('arrivalCart', JSON.stringify(cart));
    }
  }

  async function getCart() {
    try {
      const database = await openDatabase();
      const storedCart = await new Promise((resolve, reject) => {
        const request = database.transaction(sessionStore, 'readonly').objectStore(sessionStore).get(cartKey);
        request.onsuccess = () => resolve(request.result?.items || []);
        request.onerror = () => reject(request.error);
      });
      return storedCart;
    } catch (error) {
      try { return JSON.parse(window.localStorage.getItem('arrivalCart')) || []; } catch (fallbackError) { return []; }
    }
  }

  async function clearCart() {
    try {
      const database = await openDatabase();
      await new Promise((resolve, reject) => {
        const transaction = database.transaction(sessionStore, 'readwrite');
        transaction.objectStore(sessionStore).delete(cartKey);
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      // The fallback is cleared below for browsers without IndexedDB.
    }
    window.localStorage.removeItem('arrivalCart');
  }

  async function saveOrder(order) {
    const orders = await getOrders();
    orders.unshift(order);
    try {
      const database = await openDatabase();
      await new Promise((resolve, reject) => {
        const transaction = database.transaction(sessionStore, 'readwrite');
        transaction.objectStore(sessionStore).put({ id: ordersKey, items: orders });
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      window.localStorage.setItem('arrivalOrders', JSON.stringify(orders));
    }
  }

  async function getOrders() {
    try {
      const database = await openDatabase();
      const storedOrders = await new Promise((resolve, reject) => {
        const request = database.transaction(sessionStore, 'readonly').objectStore(sessionStore).get(ordersKey);
        request.onsuccess = () => resolve(request.result?.items || []);
        request.onerror = () => reject(request.error);
      });
      return storedOrders;
    } catch (error) {
      try { return JSON.parse(window.localStorage.getItem('arrivalOrders')) || []; } catch (fallbackError) { return []; }
    }
  }

  return { saveUser, getUser, clearUser, authenticate, saveCart, getCart, clearCart, saveOrder, getOrders };
})();
