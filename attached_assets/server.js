const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('NexLead Hunter is Live!');
});

app.get('/api/search', (req, res) => {
  res.json({ message: 'Search functionality will go here.' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
