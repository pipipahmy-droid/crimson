const admin = require('firebase-admin');
const fs = require('fs');

async function updateFirestore() {
  // Use a file for service account to avoid env var truncation issues
  let serviceAccount;
  if (fs.existsSync('service-account.json')) {
    serviceAccount = JSON.parse(fs.readFileSync('service-account.json', 'utf8'));
  } else {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  }
  const docId = process.env.DOC_ID;
  const filename = process.env.FILENAME;
  const totalSize = parseInt(process.env.TOTAL_SIZE, 10);
  const collectionName = process.env.FIREBASE_COLLECTION_NAME || 'files';
  
  // Read chunk URLs from a temporary file where we stored them
  // The workflow will produce a file containing URLs, one per line
  const chunkUrlsFile = process.env.CHUNK_URLS_FILE;
  const chunkUrls = fs.readFileSync(chunkUrlsFile, 'utf8')
    .split('\n')
    .filter(url => url.trim().length > 0);

  if (!serviceAccount || !docId || !filename || !chunkUrlsFile) {
    console.error('Missing required environment variables.');
    process.exit(1);
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

    const db = admin.firestore();
    
    console.log(`Updating document ${docId} in collection ${collectionName}...`);
    console.log(`Filename: ${filename}`);
    console.log(`Total Size: ${totalSize}`);
    console.log(`Chunks: ${chunkUrls.length}`);

    await db.collection(collectionName).doc(docId).set({
      filename: filename,
      total_size: totalSize,
      chunk_urls: chunkUrls,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      status: 'completed'
    }, { merge: true });

    console.log('Firestore update successful.');
    process.exit(0);
  } catch (error) {
    console.error('Error updating Firestore:', error);
    process.exit(1);
  }
}

updateFirestore();
