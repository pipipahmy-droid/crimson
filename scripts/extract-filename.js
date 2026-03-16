const https = require('https');
const http = require('http');
const { URL } = require('url');
const path = require('path');

const urlString = process.argv[2];
if (!urlString) {
  console.error("Usage: node extract-filename.js <url>");
  process.exit(1);
}

function sanitizeFilename(name) {
  // Decode URI components (e.g., %20 -> space)
  try {
    name = decodeURIComponent(name);
  } catch (e) {}

  // Remove path separators and null bytes
  name = path.basename(name);
  
  // Replace potentially dangerous characters, but keep common safe ones
  // Allowing: alphanumeric, dot, underscore, dash, space, parentheses
  name = name.replace(/[^a-zA-Z0-9._\- ()]/g, '_');
  
  // Condense multiple underscores
  name = name.replace(/_+/g, '_');
  
  // Ensure non-empty and sensible length
  if (name.length > 200) name = name.substring(0, 196) + path.extname(name);
  if (!name || name === '.' || name === '..') name = "downloaded_file.bin";
  
  return name;
}

function getFilenameFromHeaders(headers, url) {
  let filename = null;
  
  // 1. Content-Disposition
  const cd = headers['content-disposition'];
  if (cd) {
    // Try filename*=UTF-8''...
    const utfMatch = cd.match(/filename\*=UTF-8''([^;]+)/i);
    if (utfMatch && utfMatch[1]) {
      try {
        filename = decodeURIComponent(utfMatch[1]);
      } catch (e) {}
    }
    
    // Try filename="..."
    if (!filename) {
       const quoteMatch = cd.match(/filename="([^"]+)"/i);
       if (quoteMatch && quoteMatch[1]) filename = quoteMatch[1];
    }
    
    // Try filename=...
    if (!filename) {
       const stdMatch = cd.match(/filename=([^;]+)/i);
       if (stdMatch && stdMatch[1]) filename = stdMatch[1].trim().replace(/^['"]|['"]$/g, '');
    }
  }
  
  // 2. Fallback to URL path
  if (!filename) {
    try {
        const u = new URL(url);
        filename = path.basename(u.pathname);
    } catch (e) {}
  }

  // 3. Fallback to default
  if (!filename) filename = "downloaded_file";

  return sanitizeFilename(filename);
}

// Perform HEAD request to get headers
try {
  const targetUrl = new URL(urlString);
  const client = targetUrl.protocol === 'https:' ? https : http;
  
  const req = client.request(urlString, { method: 'HEAD' }, (res) => {
    // Handle redirects (up to 5)
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Just print the redirect, we rely on the final destination only if we follow it.
        // For simplicity, let's try to extract from the redirect location URL if initial response has no C-D
        // Recursion or loop would be better, but let's keep it simple for a script.
        // Actually, if it's a redirect, the filename usually comes from the final URL or its headers.
        // Let's print a special marker to indicate redirect, or just parse the *current* location?
        // Wait, standard curl -I -L follows redirects. Node's http.request does NOT.
        // So we might be getting headers for the redirect page, which has no C-D.
        console.log("REDIRECT_LOC:" + res.headers.location);
    } else {
        const filename = getFilenameFromHeaders(res.headers, urlString);
        console.log(filename);
    }
  });
  
  req.on('error', (e) => {
    // If request fails (e.g. network), fallback to URL parsing
    console.log(sanitizeFilename(path.basename(new URL(urlString).pathname)));
  });
  
  req.end();

} catch (e) {
  // Invalid URL
  console.log("downloaded_file.bin");
}
