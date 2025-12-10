type UpdateListener = () => void;

const listeners = new Set<UpdateListener>();
let pendingRegistration: ServiceWorkerRegistration | null = null;
let registrationInitiated = false;
let controllerChangeListenerRegistered = false;
let refreshing = false;

const notifyListeners = () => {
  listeners.forEach((listener) => listener());
};

const monitorRegistration = (registration: ServiceWorkerRegistration | undefined) => {
  if (!registration) return;
  const handleWaiting = () => {
    if (registration.waiting) {
      pendingRegistration = registration;
      notifyListeners();
    }
  };

  handleWaiting();

  registration.addEventListener('updatefound', () => {
    const newWorker = registration.installing;
    if (!newWorker) return;
    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        pendingRegistration = registration;
        notifyListeners();
      }
    });
  });

  if (!controllerChangeListenerRegistered) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
    controllerChangeListenerRegistered = true;
  }
};

export const registerServiceWorker = () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || registrationInitiated) {
    return;
  }
  registrationInitiated = true;
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        monitorRegistration(registration);
      })
      .catch((error) => {
        console.error('Service worker registration failed', error);
      });
  });
};

export const subscribeToServiceWorkerUpdates = (listener: UpdateListener) => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return () => {};
  }
  listeners.add(listener);
  if (pendingRegistration?.waiting) {
    listener();
  }
  return () => {
    listeners.delete(listener);
  };
};

export const applyPendingServiceWorkerUpdate = () => {
  if (pendingRegistration?.waiting) {
    pendingRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
};
