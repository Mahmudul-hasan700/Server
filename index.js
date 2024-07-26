const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.urlencoded({ extended: true }));

app.post('/proxy-download', async (req, res) => {
  const { url, fileName } = req.body;

  try {
    const response = await axios({
      method: 'get',
      url: url,
      responseType: 'stream'
    });

    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');

    response.data.pipe(res);
  } catch (error) {
    console.error('Download failed:', error);
    res.status(500).send('Download failed');
  }
});

app.listen(3000, () => console.log('Server running on port 3000'));