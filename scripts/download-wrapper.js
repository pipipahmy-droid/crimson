const { spawn, execSync } = require('child_process');
const admin = require('firebase-admin');
const fs = require('fs');

const USER_AGENT = 'Wget/1.21';

function isSourceForge(url) {
  try {
    const hostname = new URL(url).hostname;
    return hostname.includes('sourceforge.net');
  } catch { return false; }
}

/**
 * Download using curl. For SourceForge, we try multiple URL patterns.
 */
function downloadWithCurl(url, db, collectionName, docId) {
  return new Promise((resolve) => {
    console.log(`Downloading: ${url}`);
    
    const curl = spawn('curl', [
      '-L', '-f', '-O', '--compressed',
      '--max-redirs', '10',
      '-A', USER_AGENT,
      '-H', 'Accept: */*',
      '-e', 'https://sourceforge.net/',
      '--retry', '2', '--retry-delay', '3',
      '--progress-bar',
      url
    ], { stdio: ['ignore', 'pipe', 'pipe'] });

    let lastUpdate = 0;

    curl.stdout.on('data', (data) => process.stdout.write(data));

    curl.stderr.on('data', (data) => {
      process.stderr.write(data);
      if (db) {
        const match = data.toString().match(/(\d+\.\d+)%/);
        if (match) {
          const now = Date.now();
          if (now - lastUpdate > 2000) {
            lastUpdate = now;
            db.collection(collectionName).doc(docId).set({
              progress: Math.round(parseFloat(match[1])),
              updatedAt: now
            }, { merge: true }).catch(() => {});
          }
        }
      }
    });

    curl.on('close', async (code) => {
      console.log(`curl exited with code ${code}`);
      
      // Verify we didn't download an HTML page
      if (code === 0) {
        try {
          const downloadedFile = url.split('/').pop().split('?')[0] || 'download';
          if (fs.existsSync(downloadedFile)) {
            const content = fs.readFileSync(downloadedFile, { encoding: 'utf8', flag: 'r' });
            const preview = content.substring(0, 500).toLowerCase();
            if (preview.startsWith('<!doctype') || preview.includes('<html')) {
              console.log('Got HTML instead of binary, returning error code 23');
              fs.unlinkSync(downloadedFile); // Delete HTML file
              resolve(23); // Custom code for HTML content
              return;
            }
          }
        } catch (err) {
          console.warn('Content check failed:', err.message);
        }
      }
      
      resolve(code);
    });
  });
}

/**
 * Download using aria2c (for non-SourceForge URLs).
 */
function downloadWithAria2c(url, db, collectionName, docId) {
  return new Promise((resolve) => {
    const args = ['-x16', '-s16', '-k1M', '--check-certificate=false', '--summary-interval=2', '--max-tries=3', '--retry-wait=3', `--user-agent=${USER_AGENT}`, url];

    console.log('Downloading with aria2c...');
    const child = spawn('aria2c', args, { stdio: ['ignore', 'pipe', 'pipe'] });

    let lastUpdate = 0;
    let buffer = '';

    child.stdout.on('data', async (data) => {
      process.stdout.write(data);
      buffer += data.toString();
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

          const now = Date.now();
          if (now - lastUpdate > 1000) {
            lastUpdate = now;
            db.collection(collectionName).doc(docId).set({
              progress, speed, downloadedMB: Math.round(downloadedMB * 10) / 10,
              updatedAt: now
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
    console.log('SourceForge URL detected — trying multiple download methods');

    try {
      const parsedUrl = new URL(downloadUrl);
      const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
      const mirror = parsedUrl.searchParams.get('use_mirror') || 'downloads';

      if (pathParts.length >= 3 && pathParts[0] === 'project') {
        const projectName = pathParts[1];
        const filePath = pathParts.slice(2).join('/');

        // Try multiple URL patterns
        const urls = [
          `https://${mirror}.dl.sourceforge.net/project/${projectName}/${filePath}`,
          `https://downloads.sourceforge.net/project/${projectName}/${filePath}`,
          `https://sourceforge.net/projects/${projectName}/files/${filePath}/download`
        ];

        for (const url of urls) {
          console.log(`Attempting: ${url}`);
          const exitCode = await downloadWithCurl(url, db, collectionName, docId);
          if (exitCode === 0) {
            process.exit(0);
          }
          console.log(`Failed (exit ${exitCode}), trying next URL...`);
        }

        console.error('All SourceForge download methods failed');
        process.exit(1);
      } else {
        console.log('Could not parse SourceForge URL format, trying original');
        const exitCode = await downloadWithCurl(downloadUrl, db, collectionName, docId);
        process.exit(exitCode);
      }
    } catch(error) {
      console.error(`Failed to construct SourceForge download URL: ${error.message}`);
      const exitCode = await downloadWithCurl(downloadUrl, db, collectionName, docId);
      process.exit(exitCode);
    }
  } else {
    // Non-SourceForge: use aria2c with fallback to curl
    const exitCode = await downloadWithAria2c(downloadUrl, db, collectionName, docId);

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
