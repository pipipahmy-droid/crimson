const { spawn, execSync } = require('child_process');
const admin = require('firebase-admin');
const fs = require('fs');

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

function isSourceForge(url) {
  try {
    const hostname = new URL(url).hostname;
    return hostname.includes('sourceforge.net');
  } catch { return false; }
}

/**
 * Download using curl (best for SourceForge — handles their redirect chain natively).
 * curl -L follows 302s through SourceForge's download page to the actual mirror file.
 * Uses -J to honor Content-Disposition filename from the server.
 */
function downloadWithCurl(url, db, collectionName, docId) {
  return new Promise((resolve) => {
    console.log('Downloading with curl -L (redirect-following)...');
    const sourceForgeUrl = new URL(url);
    // Remove the timestamp and token params that might cause issues
    const cleanUrl = new URL(sourceForgeUrl.origin + sourceForgeUrl.pathname);
    cleanUrl.searchParams.set('use_mirror', sourceForgeUrl.searchParams.get('use_mirror')||'autoselect');
    
    const curl = spawn('curl', [
      '-L',                    // follow redirects (critical for SourceForge)
      '-f',                    // fail on HTTP errors
      '-J',                    // use server-provided filename
      '-O',                    // write to file (uses -J filename or URL basename)       
      '--cookie-jar', 'cookies.txt',   // store session cookies if needed
      '--cookie', 'cookies.txt',       // send stored cookies back
      '--compressed',          // handle compression (accept-encoding)
      '--max-redirs', '10',    // SourceForge can have many redirects but cap it
      '-A', USER_AGENT,
      '-H', 'Accept: */*',
      '-H', 'Accept-Language: en-US,en;q=0.9',
      '-H', 'Accept-Encoding: gzip, deflate, br',
      '-H', 'Connection: keep-alive',
      '-H', 'Upgrade-Insecure-Requests: 1',
      '-H', 'Sec-Fetch-Dest: document',
      '-H', 'Sec-Fetch-Mode: navigate', 
      '-H', 'Sec-Fetch-Site: none',
      '-e', sourceForgeUrl.origin,  // referer
      '--retry', '3',
      '--retry-delay', '5',
      '--progress-bar',
      cleanUrl.toString()
    ], { stdio: ['ignore', 'pipe', 'pipe'] });

    let lastUpdate = 0;

    curl.stdout.on('data', (data) => process.stdout.write(data));

    curl.stderr.on('data', (data) => {
      const text = data.toString();
      process.stderr.write(data);

      // Parse curl progress bar: e.g. "  45.2% ..." or "###...  100.0%"
      if (db) {
        const pctMatch = text.match(/(\d+\.\d+)%/);
        if (pctMatch) {
          const progress = Math.round(parseFloat(pctMatch[1]));
          const now = Date.now();
          if (now - lastUpdate > 2000) {
            lastUpdate = now;
            db.collection(collectionName).doc(docId).set({
              progress,
              updatedAt: Date.now()
            }, { merge: true }).catch(() => {});
          }
        }
      }
    });

    curl.on('close', (code) => {
      console.log(`curl exited with code ${code}`);
      resolve(code);
    });
  });
}

/**
 * Download using aria2c (best for non-SourceForge URLs — multi-connection speed).
 */
function downloadWithAria2c(url, db, collectionName, docId) {
  return new Promise((resolve) => {
    const args = [
      '-x16', '-s16', '-k1M',
      '--check-certificate=false',
      '--summary-interval=2',
      '--max-tries=3',
      '--retry-wait=3',
      `--user-agent=${USER_AGENT}`,
      url
    ];

    console.log('Downloading with aria2c (multi-connection)...');
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
          if (dlUnit === 'KiB') downloadedMB /= 1024;
          else if (dlUnit === 'GiB') downloadedMB *= 1024;
          else if (dlUnit === 'B') downloadedMB /= (1024 * 1024);

          const progress = parseInt(match[5], 10);

          let spUnit = match[7];
          let speed = parseFloat(match[6]);
          if (spUnit === 'KiB') speed /= 1024;
          else if (spUnit === 'GiB') speed *= 1024;
          else if (spUnit === 'B') speed /= (1024 * 1024);

          downloadedMB = Math.round(downloadedMB * 10) / 10;
          speed = Math.round(speed * 10) / 10;

          const now = Date.now();
          if (now - lastUpdate > 1000) {
            lastUpdate = now;
            db.collection(collectionName).doc(docId).set({
              progress, speed, downloadedMB,
              updatedAt: Date.now()
            }, { merge: true }).catch(() => {});
          }
        }
      }
    });

    child.stderr.on('data', (data) => process.stderr.write(data));

    child.on('close', (code) => {
      console.log(`aria2c exited with code ${code}`);
      resolve(code);
    });
  });
}

async function main() {
  const downloadUrl = process.argv[2];
  const docId = process.argv[3];

  if (!downloadUrl || !docId) {
    console.error("Missing args: <url> <doc_id>");
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
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
      db = admin.firestore();
    } else {
      console.warn("No FIREBASE_SERVICE_ACCOUNT found. Progress will not be reported.");
    }
  } catch (err) {
    console.error("Failed to init Firebase", err);
  }

  // Update status
  if (db) {
    try {
      await db.collection(collectionName).doc(docId).set({
        status: 'running', updatedAt: Date.now()
      }, { merge: true });
    } catch (e) { console.error(e); }
  }

  // Check if it's a SourceForge URL
  if (isSourceForge(downloadUrl)) {
    console.log('SourceForge URL detected — converting to direct mirror URL');
    
    try {
      const parsedUrl = new URL(downloadUrl);
      const pathname = parsedUrl.pathname; // e.g., /project/foo/bar.zip
      
      // Get the mirror from the query param, default to autoselect
      const mirror = parsedUrl.searchParams.get('use_mirror') || 'autoselect';
      
      // Construct the direct mirror URL
      let mirrorUrl;
      if(mirror.toLowerCase() === 'autoselect') {
        // Use any working mirror (try the first alternative)
        // Often fastest is the US one so we'll try that
        mirrorUrl = `https://newcontinuum.dl.sourceforge.net${pathname}`;
      } else {
        mirrorUrl = `https://${mirror}.dl.sourceforge.net${pathname}`;
      }
      
      console.log(`Using direct mirror URL: ${mirrorUrl}`);
      
      // Now use curl with the constructed mirror URL
      const exitCode = await downloadWithCurl(mirrorUrl, db, collectionName, docId);
      process.exit(exitCode);
    } catch(error) {
      console.error(`Failed to construct SourceForge mirror URL: ${error.message}, falling back to original URL`);
      // Fallback to original URL handling  
      const exitCode = await downloadWithCurl(downloadUrl, db, collectionName, docId);
      process.exit(exitCode);
    }
  } else {
    // Non-SourceForge: use aria2c with fallback to curl
    const exitCode = await downloadWithAria2c(downloadUrl, db, collectionName, docId);

    // Fallback to curl if aria2c failed
    if (exitCode !== 0) {
      console.log('aria2c failed, falling back to curl...');
      if (db) {
        await db.collection(collectionName).doc(docId).set({
          statusText: 'Retrying with curl...', updatedAt: Date.now()
        }, { merge: true }).catch(() => {});
      }
      const exitCode = await downloadWithCurl(downloadUrl, db, collectionName, docId);
      process.exit(exitCode);
    }
  }

  process.exit(0);
}

main();
