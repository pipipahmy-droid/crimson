const fs = require('fs');
const path = 'c:/Users/Bagas/Documents/Project Coding/NextJS/crimson/src/components/leech-form.tsx';
let content = fs.readFileSync(path, 'utf8');

const newSnapshot = `    // Listen to the document in 'files' collection
    const unsub = onSnapshot(doc(db, "files", docId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();

        if (data.status === 'completed') {
           setStatus("completed");
           setProgress(100);
           setDownloadLink(\`https://crimson.pipipahmy.workers.dev/download/\${docId}\`);
           setIsSubmitting(false);
        } else if (data.status === 'failed') {
           setStatus("error");
           setErrorMsg("Mirror failed. Check if link is direct.");
           setIsSubmitting(false);
        } else {
           // Still processing
           setStatus("running");
           if (typeof data.progress === 'number') setProgress(data.progress);
           if (typeof data.speed === 'number') setSpeed(data.speed);
           if (typeof data.downloadedMB === 'number') setDownloadedMB(data.downloadedMB);
        }
      }
    });

    return () => unsub();
  }, [docId]);

  // Remove the fake progress interval by commenting it out or deleting it
  // Simulated progress for visual feedback
  // (Removed so true server limits show)`;

// Find the snapshot block and replace it
content = content.replace(/    \/\/ Listen to the document in 'files' collection[\s\S]*?\}, \[status\]\);/m, newSnapshot);

fs.writeFileSync(path, content);
