const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const ncp = promisify(require('ncp').ncp);

async function copyModels() {
  try {
    const sourceDir = path.dirname(require.resolve('@vladmandic/face-api'));
    const targetDir = path.join(process.cwd(), 'public', 'models');
    
    // Create target directory if it doesn't exist
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    console.log('Copying model files...');
    
    // Copy all model files
    const modelFiles = [
      'ssd_mobilenetv1_model-weights_manifest.json',
      'ssd_mobilenetv1_model-shard1',
      'face_landmark_68_model-weights_manifest.json',
      'face_landmark_68_model-shard1',
      'face_expression_model-weights_manifest.json',
      'face_expression_model-shard1'
    ];
    
    for (const file of modelFiles) {
      const sourceFile = path.join(sourceDir, 'model', file);
      const targetFile = path.join(targetDir, file);
      
      if (fs.existsSync(targetFile)) {
        console.log(`Skipping ${file} (already exists)`);
        continue;
      }
      
      if (!fs.existsSync(sourceFile)) {
        console.warn(`Warning: Source file not found: ${sourceFile}`);
        continue;
      }
      
      console.log(`Copying ${file}...`);
      await ncp(sourceFile, targetFile);
    }
    
    console.log('\nAll model files have been copied successfully!');
    console.log(`Models saved to: ${path.relative(process.cwd(), targetDir)}`);
    
  } catch (error) {
    console.error('Error copying model files:', error);
    process.exit(1);
  }
}

copyModels();
