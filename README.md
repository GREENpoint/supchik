# Supchik
[![Build Status](https://travis-ci.org/GREENpoint/supchik.png?branch=master)](https://travis-ci.org/GREENpoint/supchik)

Supchik like [Borschik](https://github.com/bem/borschik) but with source maps support and one more thing... things.

### Supchik features
* [Borshick JS include notations](https://github.com/bem/borschik/blob/master/docs/js-include/js-include.en.md)
* AST processing under the hood (https://developer.mozilla.org/en-US/docs/SpiderMonkey/Parser_API)
* Сustomizable AST transformations
* Source map generation
* Minimize support
* Accurate error handling
* Well documented
* Heavy tested

### Limitations
* No CSS processing
* No HTML processing
* No freezing
* No resource inlining
* Just JS

## Contents

* [Command line usage](#contentsCmd)
* [node.js usage](#contentsNode)
* [Error handling](#contentsErrorHandling)
* [Borshick JS include notations diffirence](#contentsDiffirence)
* [Understanding techs](#contentsTechs)
* [Understanding transformations](#contentsTransformations)
* [Tests](#contentsTests)
* [Contribution guide](#contentsContribution)
* [License](#contentsLicense)

<a name="contentsCmd"/>
## Command line usage

Install global: `npm install supchik -g`

```

// `source.js` to `source.output.js`
supchik source.js

// `source.js` to `source.output.js` with pretty print
supchik source.js --pretty-print

// `source.js` to `source.output.js` with source map
supchik source.js --source-map output.js.map

// `source.js` to ast `source.output.json`
supchik source.js --output-format ast --output source.output.json

```

### Command line options list

```
Usage: supchik <file ...> [options]

  Options:

    -h, --help                 output usage information
    -V, --version              output the version number
    -o, --output               Specify output file.
    --input-format <format>    Specify input format: `code` or `ast`. Default: `code`.
    --output-format <format>   Specify output format: `code` or `ast`. Default: `code`.
    --source-map <file>        Specify source map output file.
    --transforms <transforms>  Specify transform modules. Default: `borschik`.
    --pretty-print             Pretty print output. Default: true.
    --verbose                  Default: false.
```

<a name="contentsNode"/>
## node.js usage

Install: `npm install supchik`

```javascript
    var supchik = require('supchik');

    // Compile `source.js` to `output.js`
    supchik.compile('source.js', 'output.js', {
        inputFormat: supchik.Format.FILE_CODE,
        outputFormat: supchik.Format.FILE_CODE
    });

    // Compile from source string to `output.js`
    var source = fs.readFileSync('source.js', { encoding: 'utf-8' });
    supchik.compile(source, 'output.js', {
        outputFormat: supchik.Format.FILE_CODE
    });

    // Compile from source string to generated source string
    var generatedSource = supchik.compile(source);

    // Compile from source string to generated AST
    var generatedAst = supchik.compile(source, null, {
        outputFormat: supchik.Format.AST
    });

    // Compile from AST to generated source string
    var ast = esprima.parse(source);
    generatedSource = supchik.compile(ast, null, {
        inputFormat: supchik.Format.AST
    });

    // Compile `source.js` to generated AST file
    supchik.compile('source.js', 'output.ast.json', {
        inputFormat: supchik.Format.FILE_CODE,
        outputFormat: supchik.Format.FILE_AST
    });

    // Advanced example
    var output = {};
    supchik.compile(source, output, {
        sourceMap: 'output.js.map',
        prettyPrint: true, // pretty print output
        // additional AST transformation stages
        transforms: [ '/path/to/my/transform/module' ],
        techs: { // specify techs
            js: require('/path/to/my/js/tech'),
            txt: MyTxtTech,
            custom: MyCustomExtensionTech
        },
        file: require('/path/to/my/file') // specify file system engine
    });

    output.source; // file source string
    output.ast; // generated AST
    output.sourceMap; // source map string
    output.compiledSource; // compiled source string

    // Supported input formats
    supchik.Format.FILE_CODE; // read js file
    supchik.Format.FILE_AST; // read ast json file
    supchik.Format.CODE; // string js source
    supchik.Format.AST; // ast json source

    // Supported output formats
    supchik.Format.FILE_CODE; // write js file
    supchik.Format.FILE_AST; // write ast json file
    supchik.Format.CODE; // output as js string
    supchik.Format.AST; // output as ast json
```

<a name="contentsErrorHandling">
## Error handling

One of the Supchik's goals to accurate handle errors.
It uses rich exceptions design to tell you about errors.

```javascript

    try {
        supchik.compile( ... );
    } catch(error) {
        if(error instanceof supchik.ParseError) {
            // Parse source error occured

            error.source;      // file
            error.lineNumber;  // at line number
            error.column;      // at column number
            error.description; // error's description

        } else if(error instanceof supchik.GenerateError) {
            // Generate source from AST error occured

            error.description; // error's description

        } else if(error instanceof supchik.ReadError){
            // Read file error occured

            error.source; // file

        } else if(error instanceof supchik.WriteError) {
            // Write file error occured

            error.source; // file

        } else {
            // Other error not tracked by Supchik
        }
    }

```

<a name="contentsDiffirence"/>
## Borshick JS include notations diffirence

All literal notations always escapes as include type.
Except string literal notation that always escapes strings.

```javascript

    var a = {/*borschik:include:a.json*/}; // var a = { a: true };
    var b = {/*borschik:include:b.txt*/};  // var b = 'Text from B';
    var c = 'borschik:include:c.json';     // var c = '{"c":true}';

```

All JavaScript includes must provide valid JavaScript source and must lends to AST node's body.

```javascript

    /*borschik:include:a.js*/ // ok

    /*borschik:include:a.json*/ // failed! makes source js file not valid.

    /*borschik:include:a.txt*/ // failed! makes source js file not valid.

    for(;;) {
       /*borschik:include:b.js*/ // ok
    }

    for(;/*borschik:include:b.js*/;) { // failed! makes source js file not valid.
    }

    if(true) {
       /*borschik:include:b.js*/ // ok
    } else  {
       /*borschik:include:b.js*/ // ok
    }

    if({/*borschik:include:b.js*/}) { // failed! makes source js file not valid.
    }

    function f() {
       /*borschik:include:b.js*/ // ok
    }

    function f(/*borschik:include:b.js*/) { // failed! makes source js file not valid.
    }

    var c = {/*borschik:include:c.json*/}; // ok

    var c = {/*borschik:include:c.js*/}; // failed! makes source js file not valid.

```

[Borshick JS include notations reference](https://github.com/bem/borschik/blob/master/docs/js-include/js-include.en.md)

<a name="contentsTechs"/>
## Understanding techs

Techs role in Supchik to generate [Mozilla AST tree](https://developer.mozilla.org/en-US/docs/SpiderMonkey/Parser_API) from source string. Supchik's techs must export `parse` method that accepts `source string` and returns `Mozilla AST tree`. Basic example:

```javascript
    function parse(input, options) {
        options = options || {};

        return {
            type: 'Program',
            body: [{
                type: 'Literal',
                kind: 'string',
                value: input,
                loc: {
                    range: [ 0, input.length ],
                    start: { line: 1, column: 0 },
                    end: { line: 1, column: input.length }
                    source: options.source || null
                }
            }]
        };
    }

    module.exports = {
        parse: parse
    };
```

### node.js usage:

```javascript
    ...

    var MyCustomTech = {
        parse: function(input, options) { ... }
    };

    supchik.compile(source, null, {
        techs: {
            js: require('/path/to/my/js/tech'),
            custom: MyCustomTech
        }
    });

    ...
```

<a name="contentsTransformations"/>
## Understanding transformations

Supchik's transformation allow to provide your custom AST transformation stage. Transformation must export `transfrom` method that accepts `Mozilla AST tree` and returns transformed `Mozilla AST Tree`. Basic example:

```javascript
    var estraverse = require('estraverse');

    function transform(ast, options) {
        options = options || {};

        options.sourcePath; // path to file as array: [ '/path/to/file/', '..' ]
        options.source;     // file name: ../file.js
        options.file;       // file engine
        options.techs;      // available techs
        options.transforms; // available transforms

        // Let's make all vars names forced lowercase
        estraverse.traverse(ast, {
            enter: function(node, parent) {
                if(node.type === 'Identifier') {
                    node.name = node.name.toLowerCase();
                }
            }
        });
    }

    module.exports = {
        transform: transform
    };
```

### Command line usage

```
    supchik source.js --transforms /path/to/my/transform/module,/path/to/my/other/transform/module
```

### node.js usage

```javascript
    ...

    var MyTransformModule = {
        transform: function(ast, options) { ... }
    };

    supchik.compile(source, null, {
        transforms: [ '/path/to/my/transform/module', MyTransformModule ]
    });

    ...
```

<a name="contentsTests"/>
## Tests

Supchik uses [Mocha framework](http://mochajs.org/) for tests. Run tests: `npm test`.

<a name="contentsContribution"/>
## Contribution guide

Just try to keep current code styles.

<a name="contentsLicense"/>
## License

```
The MIT License (MIT)

Copyright (c) 2013 Vitaliy Green

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

### lodash license

```
Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
Based on Underscore.js 1.5.2, copyright 2009-2013 Jeremy Ashkenas,
DocumentCloud and Investigative Reporters & Editors <http://underscorejs.org/>

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

### commander license

```
(The MIT License)

Copyright (c) 2011 TJ Holowaychuk &lt;tj@vision-media.ca&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

### esprima license

```
Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright
    notice, this list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright
    notice, this list of conditions and the following disclaimer in the
    documentation and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

### estraverse license

```
Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright
    notice, this list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright
    notice, this list of conditions and the following disclaimer in the
    documentation and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

### escodegen license

```
Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright
    notice, this list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright
    notice, this list of conditions and the following disclaimer in the
    documentation and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

### mocha license

```
(The MIT License)

Copyright (c) 2011-2013 TJ Holowaychuk <tj@vision-media.ca>

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

### chai license

```
(The MIT License)

Copyright (c) 2011-2013 Jake Luer <jake@alogicalparadox.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

### wrench license

```
The MIT License

Copyright (c) 2010 Ryan McGrath

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```
