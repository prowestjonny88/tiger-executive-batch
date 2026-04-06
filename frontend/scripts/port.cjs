const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../../UI prototype/figma/src/app/pages');
const targetAppDir = path.join(__dirname, '../app');

const pageMapping = {
  'Welcome.tsx': '',
  'PhotoUpload.tsx': 'upload',
  'ImageQualityCheck.tsx': 'quality',
  'AdaptiveQuestions.tsx': 'questions',
  'ResultAssessment.tsx': 'result',
  'SafeGuidance.tsx': 'guidance',
  'Escalation.tsx': 'escalation',
  'Confirmation.tsx': 'confirmation',
};

for (const [file, route] of Object.entries(pageMapping)) {
  const srcPath = path.join(srcDir, file);
  if (!fs.existsSync(srcPath)) continue;

  let content = fs.readFileSync(srcPath, 'utf-8');

  // Replace component export
  const componentName = file.replace('.tsx', '');
  content = content.replace(`export function ${componentName}()`, `export default function ${componentName}()`);

  // Replace React Router Link with Next/link
  content = content.replace(/import\s+\{\s*Link\s*\}\s+from\s+["']react-router["'];/g, 'import Link from "next/link";');

  // Change <Link to="..."> to <Link href="...">
  content = content.replace(/<Link([^>]*?)to=/g, '<Link$1href=');

  // Fix SVG import paths
  // Currently: import svgPaths from "../../imports/..."
  // Since we copied to frontend/imports, and the page is in frontend/app/[route]/page.tsx
  const depthMatches = content.match(/import svgPaths from ["'](.*?)["']/);
  if (depthMatches) {
    const oldPath = depthMatches[1];
    // Need to resolve to frontend/imports. The page is at app/route/page.tsx which is 2 levels deep if route != '', or 1 level deep if route == ''.
    const newPrefix = route === '' ? '../imports/' : '../../imports/';
    // remove existing `../../imports/` or similar
    const cleanPath = oldPath.replace(/^(\.\.\/)+imports\//, newPrefix);
    content = content.replace(oldPath, cleanPath);
  }

  // Same for other imports relative to pages like ImageWithFallback or imgEvChargingStation
  // import imgEvChargingStation from "figma:asset/d7f377fb3e2fe41926ad4335ad1401e786c79fcf.png";
  // Next.js doesn't support 'figma:asset/'. Let's replace it with a generic div or just comment it out, or better yet, make it an actual absolute path if we copied it. We didn't copy assets. 
  // Let's replace "figma:asset/(...).png" with "/demo.png" for now assuming they can be mocked.
  content = content.replace(/from ["']figma:asset\/.*?["']/g, 'from "/demo.png"');

  // Fix imports from "../components/..." -> "../../components/..." for nested routes
  const compPrefix = route === '' ? '../components/' : '../../components/';
  content = content.replace(/from ["']\.\.\/components\//g, `from "${compPrefix}`);

  // Create target directory
  const targetDir = path.join(targetAppDir, route);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Write file
  const targetPath = path.join(targetDir, 'page.tsx');
  fs.writeFileSync(targetPath, content, 'utf-8');
  console.log(`Ported ${file} to ${route}/page.tsx`);
}
