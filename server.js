const app = require('./src/app');
const {setupData} = require('./src/data');

const PORT = process.env.PORT || 5000;

setupData();

//1 hour interval
setInterval(() => {
    console.log('start routine to fetch and write data');
    setupData();
}, 1000 * 60 * 60);

app.listen(PORT, () => {
    console.log(`Server up and running on port ${PORT}`);
});
