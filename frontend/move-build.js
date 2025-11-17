const fs = require('fs');
const path = require('path');
const ncp = require('ncp').ncp; // to copy files easily

const buildDir = path.join(__dirname, 'build');
const staticDir = path.join(__dirname, 'static');

ncp.limit = 16;

// Remove static directory if it already exists
if (fs.existsSync(staticDir)) {
  fs.rmdirSync(staticDir, { recursive: true });
}

// Copy the build files into the static directory
ncp(buildDir, staticDir, function (err) {
  if (err) {
    console.error('Error while copying files:', err);
  } else {
    console.log('Build files successfully moved to static folder!');
  }
});
