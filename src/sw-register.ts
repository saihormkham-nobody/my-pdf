import { Workbox } from 'workbox-window';

if ('serviceWorker' in navigator) {
  const wb = new Workbox('/sw.js');

  wb.addEventListener('activated', (event) => {
    if (!event.isUpdate) {
      console.log('Service worker activated for the first time!');
    } else {
      console.log('Service worker activated!');
    }
  });

  wb.addEventListener('waiting', () => {
    if (confirm('A new version is available! Click OK to refresh.')) {
      wb.messageSkipWaiting();
      window.location.reload();
    }
  });

  wb.register();
}