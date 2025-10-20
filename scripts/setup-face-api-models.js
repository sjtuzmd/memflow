const fs = require('fs');
const path = require('path');
const https = require('https');
const { promisify } = require('util');
const pipeline = promisify(require('stream').pipeline);

const modelsDir = path.join(process.cwd(), 'public', 'models');

// List of face-api.js model files we need
const modelFiles = [
  // SSD Mobilenet V1
  'https://raw.githubusercontent.com/vladmandic/face-api/master/model/ssd_mobilenetv1_model-weights_manifest.json',
  'https://raw.githubusercontent.com/vladmandic/face-api/master/model/ssd_mobilenetv1_model-shard1',
  'https://raw.githubusercontent.com/vladmandic/face-api/master/model/ssd_mobilenetv1_model-shard2',
  
  // Face Landmark 68 Model
  'https://raw.githubusercontent.com/vladmandic/face-api/master/model/face_landmark_68_model-weights_manifest.json',
  'https://raw.githubusercontent.com/vladmandic/face-api/master/model/face_landmark_68_model-shard1',
  
  // Face Recognition Model
  'https://raw.githubusercontent.com/vladmandic/face-api/master/model/face_recognition_model-weights_manifest.json',
  'https://raw.githubusercontent.com/vladmandic/face-api/master/model/face_recognition_model-shard1',
  
  // Face Expression Model
  'https://raw.githubusercontent.com/vladmandic/face-api/master/model/face_expression_model-weights_manifest.json',
  'https://raw.githubusercontent.com/vladmandic/face-api/master/model/face_expression_model-shard1',
];

async function downloadFile(url) {
  const filename = url.split('/').pop();
  const filePath = path.join(modelsDir, filename);
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
  }
  
  // Skip if file already exists
  if (fs.existsSync(filePath)) {
    console.log(`Skipping ${filename} (already exists)`);
    return;
  }
  
  console.log(`Downloading ${filename}...`);
  
  try {
    const response = await new Promise((resolve, reject) => {
      const req = https.get(url, resolve);
      req.on('error', reject);
    });
    
    if (response.statusCode === 200) {
      const fileStream = fs.createWriteStream(filePath);
      await pipeline(response, fileStream);
      console.log(`✅ Downloaded ${filename}`);
    } else {
      console.error(`Failed to download ${filename}: ${response.statusCode}`);
    }
  } catch (error) {
    console.error(`Error downloading ${filename}:`, error.message);
  }
}

async function downloadAll() {
  console.log('Starting to download face-api.js models...');
  
  try {
    for (const url of modelFiles) {
      await downloadFile(url);
    }
    
    console.log('\n✅ All models downloaded successfully!');
    console.log(`Models saved to: ${path.relative(process.cwd(), modelsDir)}`);
  } catch (error) {
    console.error('\n❌ Error downloading models:', error.message);
    process.exit(1);
  }
}

// Run the download
downloadAll();
