import { v2 as cloudinary } from 'cloudinary';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../../.env');

// Manual parsing as a last resort if dotenv fails
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  lines.forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      process.env[key.trim()] = value;
    }
  });
}

console.log("Cloudinary Config Debug (Manual):", {
  envPath,
  exists: fs.existsSync(envPath),
  hasApiKey: !!process.env.CLOUDINARY_API_KEY,
  apiKeyPrefix: process.env.CLOUDINARY_API_KEY ? process.env.CLOUDINARY_API_KEY.substring(0, 4) : 'none'
});

cloudinary.config({
  cloud_name: 'dacmb5ncl',
  api_key: '683324892812421',
  api_secret: 'gc9EJBbcj-9rp1K2-KRYAppqnfU',
  secure: true
});

export default cloudinary;
