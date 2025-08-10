/// <reference types="@fastly/js-compute" />

// The entry point for your application.
//
// Use this fetch event listener to define your main request handling logic. It could be
// used to route based on the request properties (such as method or path), send
// the request to a backend, make completely new requests, and/or generate
// synthetic responses.

addEventListener("fetch", (event) => event.respondWith(handleRequest(event)));

async function handleRequest(event) {
  // Get the request from the client.
  let req = event.request;
  let url = new URL(req.url);

  // Serve static assets from the /assets path
  if (url.pathname.startsWith('/assets/')) {
    // If the request is for a static asset, fetch it from the backend
    return fetch(req, { backend: 'app' });
  }

  // For all other requests, serve the index.html file
  // This is the standard pattern for single-page applications
  const index = new Request(new URL('/index.html', url), req);
  return fetch(index, { backend: 'app' });
}
