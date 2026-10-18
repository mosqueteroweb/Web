const CACHE = 'infotren-astra-v1';
const HOME = new URL('./infotren.html',self.location).href;
const ASSETS = ['./infotren.html','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('infotren-astra-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(new URL('./',self.location).pathname))return;
 if(event.request.mode==='navigate'){
  if(url.pathname!==new URL(HOME).pathname)return;
  event.respondWith(fetch(event.request).then(response=>{if(!response.ok)throw Error('Offline');const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(HOME,copy)));return response;}).catch(()=>caches.match(HOME)));
 }else if(ASSETS.some(path=>new URL(path,self.location).pathname===url.pathname)){
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
 }
});
