const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    lastUpdateDate: Date,
    confirmados: {
        count: Number,
        dataPoints: [{x: Date, y: Number}]
    },
    obitos: {
        count: Number,
        dataPoints: [{x: Date, y: Number}]
    },
    cura: {
        count: Number,
        dataPoints: [{x: Date, y: Number}]
    },
    suspeitos: {
        count: Number,
        dataPoints: [{x: Date, y: Number}]
    },
    descartados: {
        count: Number,
        dataPoints: [{x: Date, y: Number}]
    },
    notificados: {
        count: Number,
        dataPoints: [{x: Date, y: Number}]
    },
    ativos: {
        count: Number,
        dataPoints: [{x: Date, y: Number}]
    },
});

module.exports = Data = mongoose.model('Data', schema);