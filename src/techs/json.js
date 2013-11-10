var js = require('./js');

function parse(input, options) {
    return {
        type: 'Program',
        body: [
            js.parse('j=' + input, options).body[0].expression.right
        ]
    };
}

module.exports = {
    parse: parse
};
