const Transform = require('stream').Transform;

class RemoveQuotes extends Transform {
    constructor(){
        super();
    }

    _transform(chunk, enc, done) {
        let cleaned = chunk.toString().replace(/"/g, ' ');
        this.push(cleaned);
        done();
    }
}

module.exports = RemoveQuotes;




