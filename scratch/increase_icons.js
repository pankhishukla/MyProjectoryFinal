const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const orig = content;
      
      // Upgrade common icon size classes
      content = content.replace(/className="([^"]*)w-4 h-4([^"]*)"/g, 'className="$1w-5 h-5$2"');
      content = content.replace(/className="([^"]*)w-5 h-5([^"]*)"/g, 'className="$1w-6 h-6$2"');
      content = content.replace(/className='([^']*)w-4 h-4([^']*)'/g, "className='$1w-5 h-5$2'");
      content = content.replace(/className='([^']*)w-5 h-5([^']*)'/g, "className='$1w-6 h-6$2'");
      // Sometimes it's h-4 w-4
      content = content.replace(/className="([^"]*)h-4 w-4([^"]*)"/g, 'className="$1h-5 w-5$2"');
      content = content.replace(/className="([^"]*)h-5 w-5([^"]*)"/g, 'className="$1h-6 w-6$2"');

      if (content !== orig) {
        fs.writeFileSync(fullPath, content);
        console.log('Updated', fullPath);
      }
    }
  }
}

processDir('./artifacts/careerstack/src');
