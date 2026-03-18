const { spawn } = require('child_process');
const admin = require('firebase-admin');
const fs = require('fs');

async function main() {
  const downloadUrl = process.argv[2];
  const docId = process.argv[3];
  
  if (!downloadUrl || !docId) {
    console.error("Missing args");
    process.exit(1);
  }

  const collectionName = process.env.FIREBASE_COLLECTION_NAME || 'files';
  let db;

  // Initialize Firebase
  try {
    let serviceAccount;
    if (fs.existsSync('service-account.json')) {
      serviceAccount = JSON.parse(fs.readFileSync('service-account.json', 'utf8'));
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    }
    
    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      db = admin.firestore();
    } else {
      console.warn("No FIREBASE_SERVICE_ACCOUNT found. Progress will not be reported to Firestore.");
    }
  } catch (err) {
    console.error("Failed to init Firebase", err);
  }

  // Update status to 'running'
  if (db) {
    try {
      await db.collection(collectionName).doc(docId).set({
        status: 'running',
        updatedAt: Date.now()
      }, { merge: true });
    } catch(e) { console.error(e); }
  }

  // Run aria2c
  // aria2c -x16 -s16 -k1M --check-certificate=false --summary-interval=2 --user-agent="..." "$DOWNLOAD_URL"
  const args = [
    '-x16', '-s16', '-k1M', '--check-certificate=false', 
    '--summary-interval=2', 
    '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (HTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    downloadUrl
  ];

  const child = spawn('aria2c', args, { stdio: ['ignore', 'pipe', 'pipe'] });

  let lastUpdate = 0;

  child.stdout.on('data', async (data) => {
    const text = data.toString();
    process.stdout.write(text); // Pipe to Github Actions log
    
    // Parse progress: [#123456 12MiB/90MiB(13%) CN:16 DL:5.2MiB]
    const match = text.match(/\[[^ ]+\s+([0-9.]+)MiB\/([0-9.]+)MiB\(([0-9]+)%\).*?DL:([0-9.]+)MiB/);
    if (match && db) {
      const downloadedMB = parseFloat(match[1]);
      const totalMB = parseFloat(match[2]);
      const progress = parseInt(match[3], 10);
      const speed = parseFloat(match[4]);
      
      const now = Date.now();
      if (now - lastUpdate > 3000) { // Throttle updates to every 3s
        lastUpdate = now;
        try {
          db.collection(collectionName).doc(docId).set({
            progress,
            speed,
            downloadedMB,
            updatedAt: Date.now()
          }, { merge: true }).catch(()=>{});
        } catch(e) {}
      }
    } else {
       // Also look for KB/s or GiB
       const matchKB = text.match(/\[[^ ]+\s+([0-9.]+)MiB\/([0-9.]+)MiB\(([0-9]+)%\).*?DL:([0-9.]+)KiB/);
       if (matchKB && db) {
         const downloadedMB = parseFloat(matchKB[1]);
         const totalMB = parseFloat(matchKB[2]);
         const progress = parseInt(matchKB[3], 10);
         const speed = parseFloat(matchKB[4]) / 1024; // Convert KiB to MiB
         
         const now = Date.now();
         if (now - lastUpdate > 3000) {
           lastUpdate = now;
           try {
             db.collection(collectionName).doc(docId).set({
               progress, speed, downloadedMB, updatedAt: Date.now()
             }, { merge: true }).catch(()=>{});
           } catch(e) {}
         }
       }
    }
  });

  child.stderr.on('data', (data) => {
    process.stderr.write(data);
  });

  child.on('close', (code) => {
    console.log(`aria2c exited with code ${code}`);
    process.exit(code);
  });
}

main();
