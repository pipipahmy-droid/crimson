/**
 * @typedef {Object} Env
 * @property {string} FIREBASE_PROJECT_ID
 * @property {string} [FIREBASE_COLLECTION_NAME]
 */

/**
 * @typedef {Object} FileMetadata
 * @property {string} filename
 * @property {number} total_size
 * @property {string[]} chunk_urls
 */

export default {
  /**
   * @param {Request} request
   * @param {Env} env
   * @param {ExecutionContext} ctx
   * @returns {Promise<Response>}
   */
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // We expect the path to be /download/:doc_id
    // But since this worker might be deployed on a route like https://crimson.workers.dev/download/:id
    // we should be careful with path segmentation.
    // Let's assume the docId is the last part of the path.
    const pathSegments = url.pathname.split('/').filter(p => p.length > 0);
    const docId = pathSegments[pathSegments.length - 1];

    if (!docId || pathSegments[0] !== 'download') {
      return new Response("Invalid request. Usage: GET /download/:doc_id", { status: 400 });
    }

    if (!env.FIREBASE_PROJECT_ID) {
      return new Response("Server Configuration Error: FIREBASE_PROJECT_ID not set", { status: 500 });
    }

    const collectionName = env.FIREBASE_COLLECTION_NAME || 'files';
    const projectId = env.FIREBASE_PROJECT_ID;

    // 1. Fetch metadata from Firestore REST API
    // Using simple REST call without auth for public read access (if rules allow).
    // For secured access, you would need to generate an OAuth token using a service account,
    // which is complex in Workers without external libraries.
    // Assuming Firestore rules allow read access to this collection for now.
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}/${docId}`;

    try {
      const metadataResponse = await fetch(firestoreUrl);
      
      if (metadataResponse.status === 404) {
        return new Response("File not found in database", { status: 404 });
      }
      
      if (!metadataResponse.ok) {
        const errorText = await metadataResponse.text();
        console.error(`Firestore error: ${metadataResponse.status} ${errorText}`, firestoreUrl);
        return new Response("Error fetching file metadata", { status: 500 });
      }

      const data = await metadataResponse.json();
      
      // Firestore REST API returns fields in a specific structure:
      // { fields: { filename: { stringValue: "..." }, total_size: { integerValue: "..." }, chunk_urls: { arrayValue: { values: [...] } } } }
      // We need to parse this.
      
      const fields = data.fields;
      if (!fields) {
        return new Response("Invalid metadata format", { status: 500 });
      }

      const filename = fields.filename?.stringValue || "download.bin";
      
      // Robustly parse total_size from possible Firestore types
      let totalSize = 0;
      if (fields.total_size) {
        if (fields.total_size.integerValue) {
          totalSize = parseInt(fields.total_size.integerValue, 10);
        } else if (fields.total_size.doubleValue) {
          totalSize = Math.floor(fields.total_size.doubleValue);
        } else if (fields.total_size.stringValue) {
          // Fallback if stored as string
          totalSize = parseInt(fields.total_size.stringValue, 10);
        }
      }
      
      const chunkUrlsArray = fields.chunk_urls?.arrayValue?.values || [];
      const chunkUrls = chunkUrlsArray.map((v) => v.stringValue).filter(Boolean);

      if (chunkUrls.length === 0) {
        return new Response("No chunks found for this file", { status: 404 });
      }

      // 2. Stream Stitching Logic
      let readable, writable;
      
      // Use IdentityTransformStream (TransformStream) as the default base.
      // If FixedLengthStream is available, we use it to enforce Content-Length.
      let useFixedLength = false;
      
      if (typeof FixedLengthStream !== 'undefined' && totalSize > 0) {
        try {
          const stream = new FixedLengthStream(totalSize);
          readable = stream.readable;
          writable = stream.writable;
          useFixedLength = true;
        } catch (e) {
          console.warn("FixedLengthStream failed, falling back to TransformStream", e);
          const transform = new TransformStream();
          readable = transform.readable;
          writable = transform.writable;
        }
      } else {
        const transform = new TransformStream();
        readable = transform.readable;
        writable = transform.writable;
      }
      
      // Start processing in the background
      ctx.waitUntil((async () => {
        try {
          // Helper for fetching with consistent headers
          const fetchChunk = (url) => fetch(url, {
             headers: {
                "User-Agent": "Crimson-Stitcher/1.0",
             }
          });

          // Start fetching the first chunk immediately
          let nextChunkPromise = chunkUrls.length > 0 ? fetchChunk(chunkUrls[0]) : null;

          for (let i = 0; i < chunkUrls.length; i++) {
            const currentChunkUrl = chunkUrls[i];
            const currentChunkPromise = nextChunkPromise;

            // PRE-FETCH: Start fetching the NEXT chunk while processing the CURRENT one.
            // This eliminates the "dead time" between chunks (RTT + TTFB).
            if (i + 1 < chunkUrls.length) {
              nextChunkPromise = fetchChunk(chunkUrls[i+1]);
            }

            // Await the response headers of the current chunk
            const chunkResponse = await currentChunkPromise;

            if (!chunkResponse.ok) {
              throw new Error(`Failed to fetch chunk: ${currentChunkUrl} - ${chunkResponse.status}`);
            }

            if (chunkResponse.body) {
              // Pipe the chunk's body directly to our writable stream.
              await chunkResponse.body.pipeTo(writable, { preventClose: true });
            }
          }
          
          // Once all chunks are piped, we close the writable stream.
          const writer = writable.getWriter();
          await writer.close();
          
        } catch (err) {
          console.error("Stream stitching error:", err);
          // Attempt to abort the stream to signal error to the client
          try {
             // If fetching failed, we need to abort the output stream
             // If the stream is currently locked by pipeTo, this catch block might be reached after pipeTo fails?
             // If pipeTo fails, it automatically aborts the writable stream unless prevented?
             // MDN: "If the readable stream errors, the writable stream is aborted" (default behavior).
             // But if fetch fails before pipeTo, we are here.
             if (!writable.locked) {
                 const writer = writable.getWriter();
                 await writer.abort(err);
             }
          } catch (e) {
             console.error("Error while aborting stream:", e);
          }
        }
      })());

      // 3. Return response with correct headers

      // 3. Return response with correct headers
      const headers = {
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Type": "application/octet-stream",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-transform", 
      };

      if (typeof totalSize === 'number' && !isNaN(totalSize) && totalSize > 0) {
        headers["Content-Length"] = totalSize.toString();
      }

      return new Response(readable, {
        headers: headers,
        // encodeBody: "manual" // Coba lepaskan ini jika FixedLengthStream dipakai
      });

    } catch (err) {
      console.error("Worker error:", err);
      return new Response("Internal Server Error", { status: 500 });
    }
  }
};
