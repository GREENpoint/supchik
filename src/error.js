var _ = require('lodash');

function SupchikError() {
    Error.apply(this, arguments);
    this.name = 'SupchikError';
    this.message = (arguments[0] || '');
}
SupchikError.prototype = new Error;
SupchikError.prototype.toString = function() {
    return this.message;
}
SupchikError.prototype.inspect = function() {
    return this.toString();
}
SupchikError.prototype.extend = function(data) {
    return _.extend(this, data);
}

function ParseError() {
    SupchikError.apply(this, arguments);
    this.name = 'ParseError';
    this.extend({
        index:       null,
        lineNumber:  null,
        column:      null,
        description: '',
        source:      null
    });
}
ParseError.prototype = new SupchikError;

function GenerateError() {
    SupchikError.apply(this, arguments);
    this.name = 'GenerateError';
    this.extend({
        description: ''
    });
}
GenerateError.prototype = new SupchikError;

function ReadError() {
    SupchikError.apply(this, arguments);
    this.name = 'ReadError';
    this.extend({
        source: null
    });
}
ReadError.prototype = new SupchikError;

function WriteError() {
    SupchikError.apply(this, arguments);
    this.name = 'WriteError';
    this.extend({
        source: null
    });
}
WriteError.prototype = new SupchikError;

module.exports = {
    SupchikError: SupchikError,
    ParseError: ParseError,
    GenerateError: GenerateError,
    ReadError: ReadError,
    WriteError: WriteError
};
