require('dotenv').config();

const connectDB = require('./src/db');
connectDB();

const app = require('./src/app');
const {setupData} = require('./src/data');

const PORT = process.env.PORT || 5000;

setupData();

//20 minutes interval
setInterval(() => {
    console.log('start routine to fetch and write data');
    setupData();
}, 1000 * 60 * 20);

app.listen(PORT, () => {
    console.log(`Server up and running on port ${PORT}`);
});
