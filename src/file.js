var _     = require('lodash'),
    fs    = require('fs'),
    path  = require('path'),
    error = require('./error');

// Get final tech preset from options.techs
// by file's name accepted first argument.
//
// options.techs = { 'js': { ... }, 'custom.js': { ... } };
// 'example.custom.js' -> techs['custom.js']
//
// options.techs = { 'js': { ... } };
// 'example.custom.js' -> techs['js']
function tech(input, options) {
    var basename = path.basename(input),
        techPath = basename.substring(basename.indexOf('.') + 1).split('.'),
        tech;

    while(techPath.length) {
        tech = techPath.join('.');
        if(options.techs[tech]) {
            return options.techs[tech];
        }
        techPath.shift();
    }

    return options.defaultTech ? options.techs[options.defaultTech] : null;
}

function resolve(list) {
    return path.resolve.apply(this, list);
}

function dirname(file) {
    return path.dirname(file);
}

function realpath(file) {
    return fs.realpathSync(file);
}

function read(input) {
    var result;
    try {
        result = fs.readFileSync(input);
        if(Buffer.isBuffer(result)) {
            result = result.toString('utf8');
        }
    } catch(e) {
        throw new error.ReadError('Couldn\'t read file "' + input + '": ' + e.message).extend({
            source: input
        });
    }
    return result;
}

function write(output, data) {
    try {
        return fs.writeFileSync(output, data, 'utf8');
    } catch(e) {
        throw new error.WriteError('Couldn\'t write file "' + output + '": ' + e.message).extend({
            source: output
        });
    }
}

module.exports = {
    tech: tech,
    resolve: resolve,
    dirname: dirname,
    realpath: realpath,
    read: read,
    write: write
};
