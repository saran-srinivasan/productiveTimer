const fs = require('fs');
const path = require('path');

const podfilePath = path.join(__dirname, '../ios/Podfile');

if (!fs.existsSync(podfilePath)) {
  console.error('Podfile not found at:', podfilePath);
  process.exit(1);
}

let podfileContent = fs.readFileSync(podfilePath, 'utf8');

const patchCode = `post_install do |installer|
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['CODE_SIGNING_ALLOWED'] = 'NO'
      config.build_settings['CODE_SIGNING_REQUIRED'] = 'NO'
      config.build_settings['CODE_SIGN_IDENTITY'] = ''
    end
  end
`;

if (podfileContent.includes("config.build_settings['CODE_SIGNING_ALLOWED'] = 'NO'")) {
  console.log('Podfile is already patched.');
  process.exit(0);
}

// Find post_install block and replace it with our patched version
const targetStr = 'post_install do |installer|';
if (!podfileContent.includes(targetStr)) {
  console.error('Could not find post_install block in Podfile');
  process.exit(1);
}

const patchedContent = podfileContent.replace(targetStr, patchCode);

fs.writeFileSync(podfilePath, patchedContent, 'utf8');
console.log('Successfully patched Podfile to disable code signing for pod targets.');
