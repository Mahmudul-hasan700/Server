const express = require('express');
const fbvideos = require('fbvideos');
const app = express();
const port = 3000;

app.use(express.json());

app.post('/download', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const videoInfo = await fbvideos.low(url);
    res.json({
      title: videoInfo.title,
      downloadUrl: videoInfo.download_url
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch video information' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});