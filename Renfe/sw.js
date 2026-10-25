// InfoTren moved to https://mosqueteroweb.github.io/infoTren/.
// This replacement worker clears the old offline copy so installed apps load the redirect page.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
        await self.registration.unregister();
        const windows = await self.clients.matchAll({ type: 'window' });
        windows.forEach((client) => client.navigate('https://mosqueteroweb.github.io/infoTren/'));
    })());
});
