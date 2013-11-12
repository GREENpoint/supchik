var _     = require('lodash');
    error = require('./src/error'),
    file  = require('./src/file'),
    techs = {
        js:   require('./src/techs/js'),
        json: require('./src/techs/json'),
        txt:  require('./src/techs/txt')
    },
    borschik = require('./src/transform/borschik');

var Format = {
    UNKNOWN:   'unknown',
    FILE_CODE: 'file-code',
    FILE_AST:  'file-ast',
    CODE:      'code',
    AST:       'ast'
};

function compile(input, output, options) {
    var ast,
        source,
        sourcePath,
        sourceMap,
        compiledSource,
        transformOptions,
        _file,
        _techs;

    options = options || {};

    if(!options.inputFormat) {
        options.inputFormat = Format.CODE;
    }
    if(!_.has(_.invert(Format), options.inputFormat)) {
        throw new Error('Unknown input format `' + options.inputFormat + '`.');
    }

    if(!options.outputFormat) {
        options.outputFormat = Format.CODE;
    }
    if(!_.has(_.invert(Format), options.outputFormat)) {
        throw new Error('Unknown output format `' + options.outputFormat + '`.');
    }

    _file  = options.file || file;
    _techs = _.extend(techs, options.techs || {});
    sourcePath = options.source || null;

    if(options.inputFormat === Format.FILE_CODE) {
        source = file.read(input);
        sourcePath = sourcePath || input;
        ast = techs.js.parse(source, {
            source: sourcePath
        });
    } else if(options.inputFormat === Format.CODE) {
        source = input;
        ast = techs.js.parse(input, {
            source: sourcePath
        });
    } else if(options.inputFormat === Format.FILE_AST) {
        ast = JSON.parse(file.read(input))
    } else  {
        ast = input;
    }

    transformOptions = {
        sourcePath: [ _file.dirname(sourcePath) ],
        source: sourcePath,
        file: _file,
        techs: _techs,
        transforms: options.transforms || [borschik]
    };

    if(transformOptions.transforms) {
        transformOptions.transforms.forEach(function(transform) {
            if(typeof transform === 'string') {
                try {
                    if(transform === 'borschik') {
                        transform = borschik;
                    } else {
                        transform = require(transform);
                    }
                } catch(e) {
                    throw new SupchikError('Couldn\'t find `' + transform + '` transform.');
                }
            }
            ast = transform.transform(ast, transformOptions);
        });
    }

    if(options.sourceMap) {
        sourceMap = _techs.js.generateSourceMap(ast, {
            prettyPrint: options.prettyPrint
        });
        if(options.outputFormat === Format.FILE_CODE ||
           options.outputFormat === Format.FILE_AST) {
            _file.write(options.sourceMap, sourceMap);
        }
    }

    if(options.outputFormat === Format.FILE_CODE ||
       options.outputFormat === Format.CODE) {
        compiledSource = _techs.js.generate(ast, {
            prettyPrint: options.prettyPrint,
            sourceMap: options.sourceMap
        });
    }

    var outputObject = {
        source: source,
        ast: ast,
        sourceMap: sourceMap,
        compiledSource: compiledSource
    };

    if(output && _.isObject(output)) {
        _.extend(output, outputObject);
    }

    switch(options.outputFormat) {
    case Format.FILE_CODE:
        return _file.write(output, compiledSource);
    case Format.FILE_AST:
        return _file.write(output, JSON.stringify(ast, null, options.prettyPrint ? 4 : undefined));
    case Format.CODE:
        return compiledSource;
    case Format.AST:
        return ast;
    }

}

module.exports = {
    Format: Format,
    compile: compile,
    file: file,
    techs: techs,
    ParseError: error.ParseError,
    GenerateError: error.GenerateError,
    ReadError: error.ReadError,
    WriteError: error.WriteError
};
