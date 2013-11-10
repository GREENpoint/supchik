var js = require('./js');

function parse(input, options) {
    var lines = input.match(/[^\r\n]+/g) || [''];
    return {
        type: 'Program',
        body: [{
            type: 'Literal',
            value: input,
            raw: '"' + input + '"',
            loc: {
                start: { line: 1, column: 0 },
                end: { line: lines.length, column: lines[lines.length-1].length },
                range: [ 0, input.length ],
                source: options.source || null
            }
        }],
    };
}

module.exports = {
    parse: parse
};
