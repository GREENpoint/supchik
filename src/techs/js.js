var _         = require('lodash'),
    esprima   = require('esprima'),
    escodegen = require('escodegen'),
    util      = require('util'),
    error     = require('../error');

function parse(input, options) {
    var ast;

    options = options || {};

    try {
        ast = esprima.parse(input, {
            loc: true,
            range: true,
            tokens: true,
            comment: true,
            attachComment: true,
            source: options.source || null
        });
    } catch(e) {
        throw _.extend(new error.ParseError(
            'Couldn\'t parse file' +
            (options.source ? ' "' + options.source + '"' : '') +
            ': ' + e.message
        ), {
            source: options.source || null,
            index: e.index,
            lineNumber: e.lineNumber,
            column: e.column,
            description: e.description
        });
    }

    return ast;
}

function attachSourceMap(result, sourceMap) {
    if(sourceMap && _.isString(sourceMap)) {
        result += '\n//# sourceMappingURL=' + sourceMap;
    }
    return result;
}

function generate(ast, options) {
    var result;
    options = options || {};

    try {

        result = escodegen.generate(
            ast, {
                format: options.prettyPrint ? {} : escodegen.FORMAT_MINIFY
            }
        );

        result = attachSourceMap(result, options.sourceMap);

    } catch(e) {

        console.log(' --- ast dump --- ');
        console.log(util.inspect(ast, { depth: null }));
        console.log(' --- ast dump --- ');
        throw new error.GenerateError(
            'Couldn\'t generate source from AST: ' + e.message
        ).extend({
            description: e.message
        });

    }

    return result;
}

function generateSourceMap(ast, options) {
    options = options || {};

    try {
        return escodegen.generate(
            ast, {
                format: options.prettyPrint ? {} : escodegen.FORMAT_MINIFY,
                sourceMap: true
            }
        );
    } catch(e) {
        throw new error.GenerateError(
            'Couldn\'t generate source map from AST: ' + e.message
        ).extend({
            description: e.message
        });
    }
}

function generateWithSourceMap(ast, options) {
    var result;
    options = options || {};

    try {

        result = escodegen.generate(
            ast, {
                format: options.prettyPrint ? {} : escodegen.FORMAT_MINIFY,
                sourceMap: true,
                sourceMapWithCode: true
            }
        );

        result.map = result.map.toString();

        result.code = attachSourceMap(result.code, options.sourceMap);

    } catch(e) {

        throw new error.GenerateError(
            'Couldn\'t generate source with map from AST: ' + e.message
        ).extend({
            description: e.message
        });

    }

    return result;
}

module.exports = {
    parse: parse,
    generate: generate,
    generateSourceMap: generateSourceMap,
    generateWithSourceMap: generateWithSourceMap
};
