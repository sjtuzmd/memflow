const fs = require('fs');
const path = require('path');
const https = require('https');
const { promisify } = require('util');
const stream = require('stream');

const pipeline = promisify(stream.pipeline);

const modelsDir = path.join(process.cwd(), 'public', 'models');
const models = [
  'https://raw.githubusercontent.com/vladmandic/face-api/master/model/ssd_mobilenetv1_model-weights_manifest.json',
  'https://raw.githubusercontent.com/vladmandic/face-api/master/model/ssd_mobilenetv1_model-shard1',
  'https://raw.githubusercontent.com/vladmandic/face-api/master/model/face_landmark_68_model-weights_manifest.json',
  'https://raw.githubusercontent.com/vladmandic/face-api/master/model/face_landmark_68_model-shard1',
  'https://raw.githubusercontent.com/vladmandic/face-api/master/model/face_expression_model-weights_manifest.json',
  'https://raw.githubusercontent.com/vladmandic/face-api/master/model/face_expression_model-shard1',
];

async function downloadFile(url) {
  const filename = url.split('/').pop();
  const filePath = path.join(modelsDir, filename);
  
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
    
    if (response.statusCode !== 200) {
      throw new Error(`Failed to download ${url}: ${response.statusCode}`);
    }
    
    await pipeline(
      response,
      fs.createWriteStream(filePath)
    );
    
    console.log(`Downloaded ${filename}`);
  } catch (error) {
    console.error(`Error downloading ${filename}:`, error.message);
    // Clean up if file was partially downloaded
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    throw error;
  }
}

async function main() {
  try {
    if (!fs.existsSync(modelsDir)) {
      fs.mkdirSync(modelsDir, { recursive: true });
    }
    
    console.log('Starting model downloads...');
    
    for (const modelUrl of models) {
      await downloadFile(modelUrl);
    }
    
    console.log('\nAll models downloaded successfully!');
    console.log(`Models saved to: ${path.relative(process.cwd(), modelsDir)}`);
  } catch (error) {
    console.error('\nError downloading models:', error.message);
    process.exit(1);
  }
}

main();
