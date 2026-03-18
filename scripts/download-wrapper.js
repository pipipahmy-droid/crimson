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
  let buffer = '';

  child.stdout.on('data', async (data) => {
    const rawText = data.toString();
    process.stdout.write(rawText); // Pipe to Github Actions log

    buffer += rawText;
    // Remove ANSI escape codes if any
    buffer = buffer.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');

    const lines = buffer.split(/[\r\n]+/);
    buffer = lines.pop() || ''; // keep the last potentially incomplete line in buffer

    for (const line of lines) {
      const match = line.match(/\[[^ ]+\s+([0-9.]+)([KMGT]iB|B)\/([0-9.]+)([KMGT]iB|B)\(([0-9]+)%\).*?DL:([0-9.]+)([KMGT]iB|B)/);
      if (match && db) {
        let dlUnit = match[2];
        let downloadedMB = parseFloat(match[1]);
        if (dlUnit === 'KiB') downloadedMB = downloadedMB / 1024;
        else if (dlUnit === 'GiB') downloadedMB = downloadedMB * 1024;
        else if (dlUnit === 'B') downloadedMB = downloadedMB / (1024 * 1024);

        const progress = parseInt(match[5], 10);

        let spUnit = match[7];
        let speed = parseFloat(match[6]);
        if (spUnit === 'KiB') speed = speed / 1024;
        else if (spUnit === 'GiB') speed = speed * 1024;
        else if (spUnit === 'B') speed = speed / (1024 * 1024);

        downloadedMB = Math.round(downloadedMB * 10) / 10;
        speed = Math.round(speed * 10) / 10;

        const now = Date.now();
        if (now - lastUpdate > 1000) { // Throttle updates to every 1s
          lastUpdate = now;
          db.collection(collectionName).doc(docId).set({
            progress,
            speed,
            downloadedMB,
            updatedAt: Date.now()
          }, { merge: true }).catch(()=>{});
        }

  child.stderr.on('data', (data) => {
    process.stderr.write(data);
  });

  child.on('close', (code) => {
    console.log(`aria2c exited with code ${code}`);
    process.exit(code);
  });
}

main();
