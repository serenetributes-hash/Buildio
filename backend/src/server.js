require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 4000; // Render injects PORT automatically

app.listen(PORT, () => {
  console.log(`Construction ERP API listening on port ${PORT}`);
});
