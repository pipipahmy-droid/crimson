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
      const totalSize = parseInt(fields.total_size?.integerValue || "0", 10);
      
      const chunkUrlsArray = fields.chunk_urls?.arrayValue?.values || [];
      const chunkUrls = chunkUrlsArray.map((v) => v.stringValue).filter(Boolean);

      if (chunkUrls.length === 0) {
        return new Response("No chunks found for this file", { status: 404 });
      }

      // 2. Stream Stitching Logic
      // Create a readable stream that pulls from each chunk URL sequentially
      const stream = new ReadableStream({
        async start(controller) {
          try {
            for (const chunkUrl of chunkUrls) {
              // Fetch the chunk 
              // We use a new request to ensure no identifying headers are forwarded unless intended
              const chunkResponse = await fetch(chunkUrl);

              if (!chunkResponse.ok) {
                console.error(`Failed to fetch chunk: ${chunkUrl} - ${chunkResponse.status}`);
                controller.error(new Error(`Failed to fetch chunk: ${chunkUrl}`));
                return;
              }

              if (!chunkResponse.body) {
                console.error(`Empty body for chunk: ${chunkUrl}`);
                controller.error(new Error(`Empty body for chunk: ${chunkUrl}`));
                return;
              }

              // Pipe the chunk's body into our controller
              const reader = chunkResponse.body.getReader();
              
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                controller.enqueue(value);
              }
            }
            
            // All chunks processed
            controller.close();
          } catch (err) {
            console.error("Stream stitching error:", err);
            controller.error(err);
          }
        }
      });

      // 3. Return response with correct headers
      return new Response(stream, {
        headers: {
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Content-Type": "application/octet-stream",
          "Content-Length": totalSize.toString(),
          // Add CORS headers if needed for browser downloads triggering from frontend
          "Access-Control-Allow-Origin": "*",
        },
      });

    } catch (err) {
      console.error("Worker error:", err);
      return new Response("Internal Server Error", { status: 500 });
    }
  }
};
