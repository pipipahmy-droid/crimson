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
  const collectionName = process.env.FIREBASE_COLLECTION_NAME || 'files';
  const status = process.env.STATUS || 'completed';
  
  // Optional fields
  const filename = process.env.FILENAME;
  const totalSize = process.env.TOTAL_SIZE ? parseInt(process.env.TOTAL_SIZE, 10) : null;
  const chunkUrlsFile = process.env.CHUNK_URLS_FILE;

  if (!serviceAccount || !docId) {
    console.error('Missing required environment variables (DOC_ID, FIREBASE_SERVICE_ACCOUNT).');
    process.exit(1);
  }

  try {
    // Check if initialized
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }

    const db = admin.firestore();
    console.log(`Updating document ${docId} in collection ${collectionName} with status: ${status}`);

    const updateData = {
      status: status,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (filename) updateData.filename = filename;
    if (totalSize !== null) updateData.total_size = totalSize;

    if (chunkUrlsFile && fs.existsSync(chunkUrlsFile)) {
         const chunkUrlsData = fs.readFileSync(chunkUrlsFile, 'utf8');
         const chunkUrls = chunkUrlsData.split('\n').filter(url => url.trim().length > 0);
         updateData.chunk_urls = chunkUrls;
         console.log(`Adding ${chunkUrls.length} chunk URLs.`);
    }

    await db.collection(collectionName).doc(docId).set(updateData, { merge: true });

    console.log('Firestore update successful.');
    process.exit(0);
  } catch (error) {
    console.error('Error updating Firestore:', error);
    process.exit(1);
  }
}

updateFirestore();
