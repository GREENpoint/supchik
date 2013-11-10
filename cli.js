#!/usr/bin/env node

var supchik   = require('./supchik'),
    commander = require('commander'),
    path      = require('path');

commander
    .version('0.1.0')
    .usage('<file ...> [options]')
    .option('-o, --output', 'Specify output file.')
    .option('--input-format <format>', 'Specify input format: `code` or `ast`. Default: `code`.')
    .option('--output-format <format>', 'Specify output format: `code` or `ast`. Default: `code`.')
    .option('--source-map <file>', 'Specify source map output file.')
    .option('--transforms <transforms>', 'Specify transform modules. Default: `borschik`.')
    .option('--pretty-print', 'Pretty print output. Default: false.')
    .option('--verbose', 'Default: false.')
    .parse(process.argv);

if (commander.args.length == 0) {
    console.log('Please specify input file...');
    process.exit(0);
}

var input = commander.args[0];

try {
    supchik.compile(
        input,
        commander['output'] || path.basename(input, '.js') + '.output.js',
        {
            inputFormat:  commander.inputFormat  ? ('file-' + commander.inputFormat)  : supchik.Format.FILE_CODE,
            outputFormat: commander.outputFormat ? ('file-' + commander.outputFormat) : supchik.Format.FILE_CODE,
            transforms:   commander.transforms ? commander.transforms.split(',') : null,
            prettyPrint:  commander.prettyPrint,
            sourceMap:    commander.sourceMap
        }
    );
} catch(e) {
    console.dir(e);
    if(commander.verbose) {
        console.log(e.stack);
    }
    process.exit(0);
}

process.exit(1);
