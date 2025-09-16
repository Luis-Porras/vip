const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

app.post('/test', (req, res) => {
  console.log('TEST POST WORKED:', req.body);
  res.json({ message: 'success' });
});

app.listen(5001, () => {
  console.log('Test server on 5001');
});