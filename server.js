const app = require('./src/app');

const PORT = process.env.PORT || 5000;

// Server static assets in produdction
if(process.env.NODE_ENV === 'production'){
    // Set static folder
    app.use(express.static('client/build'));

    app.get('*', (req, res) => {
        res.sendfile(path.resolve(__dirname, 'client', 'build', 'index.html'));
    });
}

app.listen(PORT, () => {
    console.log(`Server up and running on port ${PORT}`);
});
