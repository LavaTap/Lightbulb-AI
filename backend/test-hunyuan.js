const fs = require('fs');
const path = require('path');

const b64 = fs.readFileSync(path.join(__dirname, '..', 'data', 'test_image_b64.txt'), 'utf8');

const body = {
  prompt: "银发红瞳的女战士，穿着华丽的盔甲, front view, character design sheet",
  config: {
    provider: "tencent",
    model: "hy-image-v3.0",
    apiKey: "sk-eErlC0cI03kYpVMjh3SQuONkNqpMpIPrGa4n7HOsVF0pY0Ap",
    endpoint: "https://tokenhub.tencentmaas.com/v1/api/image",
    useProxy: false,
    proxyEndpoint: ""
  },
  size: "1792x1024",
  referenceImage: b64
};

fetch('http://localhost:3001/api/image/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
}).then(r => r.json()).then(data => {
  if (data.success) {
    console.log('SUCCESS! Image size:', (data.data.imageBase64.length / 1024).toFixed(2), 'KB');
    // Save result
    const outPath = path.join(__dirname, '..', 'data', 'test_result.jpg');
    fs.writeFileSync(outPath, Buffer.from(data.data.imageBase64, 'base64'));
    console.log('Saved to:', outPath);
  } else {
    console.log('FAILED:', data.error);
  }
}).catch(err => {
  console.error('Request error:', err.message);
});
