const { spawn, execSync } = require('child_process');
const admin = require('firebase-admin');
const fs = require('fs');

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/**
 * Resolve the final direct URL by following redirects with curl.
 * This is critical for SourceForge and similar hosts that use
 * a chain of 302 redirects with temporary tokens.
 */
function resolveDirectUrl(url) {
  try {
    console.log('Resolving final download URL via curl...');
    const result = execSync(
      `curl -LsI -o /dev/null -w '%{url_effective}' -A "${USER_AGENT}" "${url}"`,
      { encoding: 'utf8', timeout: 30000 }
    ).trim();
    if (result && result.startsWith('http')) {
      console.log(`Resolved to: ${result}`);
      return result;
    }
  } catch (err) {
    console.warn('Failed to resolve URL with curl, using original:', err.message);
  }
  return url;
}

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

  // Resolve the final direct URL to avoid redirect issues (SourceForge etc.)
  const resolvedUrl = resolveDirectUrl(downloadUrl);

  // Determine if we should limit connections (some mirrors reject multi-connection)
  const isSourceForge = downloadUrl.includes('sourceforge.net');
  const connections = isSourceForge ? '1' : '16';

  // Run aria2c with the resolved URL  
  const args = [
    `-x${connections}`, `-s${connections}`, '-k1M',
    '--check-certificate=false',
    '--summary-interval=2',
    '--max-tries=3',
    '--retry-wait=3',
    '--follow-torrent=false',
    `--user-agent=${USER_AGENT}`,
    `--referer=${new URL(downloadUrl).origin}`,
    resolvedUrl
  ];

  console.log(`Starting aria2c with ${connections} connection(s)...`);

  const exitCode = await new Promise((resolve) => {
    const child = spawn('aria2c', args, { stdio: ['ignore', 'pipe', 'pipe'] });

    let lastUpdate = 0;
    let buffer = '';

    child.stdout.on('data', async (data) => {
      const rawText = data.toString();
      process.stdout.write(rawText);

      buffer += rawText;
      buffer = buffer.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');

      const lines = buffer.split(/[\r\n]+/);
      buffer = lines.pop() || '';

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
          if (now - lastUpdate > 1000) {
            lastUpdate = now;
            db.collection(collectionName).doc(docId).set({
              progress,
              speed,
              downloadedMB,
              updatedAt: Date.now()
            }, { merge: true }).catch(()=>{});
          }
        }
      }
    });

    child.stderr.on('data', (data) => {
      process.stderr.write(data);
    });

    child.on('close', (code) => {
      console.log(`aria2c exited with code ${code}`);
      resolve(code);
    });
  });

  // Fallback to curl if aria2c failed
  if (exitCode !== 0) {
    console.log('aria2c failed, falling back to curl...');
    
    if (db) {
      await db.collection(collectionName).doc(docId).set({
        status: 'running',
        statusText: 'Retrying with curl...',
        updatedAt: Date.now()
      }, { merge: true }).catch(()=>{});
    }

    const curlCode = await new Promise((resolve) => {
      const curl = spawn('curl', [
        '-L', '-f', '-o', 'download_file',
        '--retry', '3',
        '--retry-delay', '5',
        '-A', USER_AGENT,
        '-e', new URL(downloadUrl).origin,
        '--progress-bar',
        downloadUrl  // use original URL — curl handles redirects natively
      ], { stdio: ['ignore', 'pipe', 'pipe'] });

      curl.stdout.on('data', (data) => process.stdout.write(data));
      curl.stderr.on('data', (data) => process.stderr.write(data));
      curl.on('close', (code) => {
        console.log(`curl exited with code ${code}`);
        resolve(code);
      });
    });

    process.exit(curlCode);
  }

  process.exit(0);
}

main();
