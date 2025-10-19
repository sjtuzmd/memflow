const fs = require('fs');
const path = require('path');
const https = require('https');

const modelsDir = path.join(process.cwd(), 'public', 'models');
const models = [
  'https://github.com/vladmandic/face-api/raw/master/model/ssd_mobilenetv1_model-weights_manifest.json',
  'https://github.com/vladmandic/face-api/raw/master/model/ssd_mobilenetv1_model-shard1',
  'https://github.com/vladmandic/face-api/raw/master/model/face_landmark_68_model-weights_manifest.json',
  'https://github.com/vladmandic/face-api/raw/master/model/face_landmark_68_model-shard1',
  'https://github.com/vladmandic/face-api/raw/master/model/face_expression_model-weights_manifest.json',
  'https://github.com/vladmandic/face-api/raw/master/model/face_expression_model-shard1',
];

if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
}

async function downloadFile(url) {
  const filename = url.split('/').pop();
  const filePath = path.join(modelsDir, filename);
  
  if (fs.existsSync(filePath)) {
    console.log(`Skipping ${filename} (already exists)`);
    return;
  }
  
  console.log(`Downloading ${filename}...`);
  
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filePath);
    https.get(url, response => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`Downloaded ${filename}`);
        resolve(null);
      });
    }).on('error', error => {
      fs.unlink(filePath, () => {}); // Delete the file async
      reject(error);
    });
  });
}

async function downloadAll() {
  try {
    for (const modelUrl of models) {
      await downloadFile(modelUrl);
    }
    console.log('All models downloaded successfully!');
  } catch (error) {
    console.error('Error downloading models:', error);
    process.exit(1);
  }
}

downloadAll();
