var assert  = require('chai').assert;
    supchik = require('../supchik'),
    file    = require('../src/file');
    error   = require('../src/error'),
    techs = {
        'js': require('../src/techs/js'),
        'custom.js': {},
        'complex.custom.js': {},
        'json': require('../src/techs/json'),
        'txt': require('../src/techs/txt')
    },
    estraverse = require('estraverse');

var assertAst = function(ast) {
    assert.isObject(ast);
    assert.propertyVal(ast, 'type', 'Program');
    assert.isArray(ast.body);
}

describe('file', function() {

    describe('#file.read', function() {
        it('should read file and return string', function() {
            var source = file.read('./test/sources/include.js');
            assert.isString(source);
        });

        it('should throw error with not exists file', function() {
            assert.throws(function() {
                file.read('./test/sources/not-exists.js');
            }, error.ReadError);
        });
    });

    describe('#file.tech', function() {
        var options = {
            techs: techs,
            defaultTech: 'txt'
        };

        it('should return tech by extension', function() {
            var tech = file.tech('file.js', options);
            assert.strictEqual(tech, techs['js']);
        });

        it('should return default tech for unknown extension', function() {
            var tech = file.tech('file.unknown', options);
            assert.strictEqual(tech, techs['txt']);
        });

        it('should return custom tech for extension', function() {
            var tech = file.tech('file.custom.js', options);
            assert.strictEqual(tech, techs['custom.js']);
        });

        it('should return custom tech for extension (more complex)', function() {
            var tech = file.tech('file.complex.custom.js', options);
            assert.strictEqual(tech, techs['complex.custom.js']);
        });

        it('should return null with unknown extension and without default tech', function() {
            var tech = file.tech('file.js', { techs: {} });
            assert.isNull(tech, null);
        });
    });

});

describe('techs', function() {

    describe('#techs.js', function() {
        it('should return valid ast', function() {
            var source = 'var a = 100, b = 50; var c = a + b;',
                ast = techs.js.parse(source, {
                    source: 'file.js'
                });

            assertAst(ast);
        });

        it('should throw error with not valid js', function() {
            var source = 'var a = 100 b = 50; var c = a + b';

            assert.throws(function() {
                techs.js.parse(source, {
                    source: 'file.js'
                });
            }, error.ParseError);

            try {
                techs.js.parse(source, {
                    source: 'file.js'
                });
            } catch(e) {
                assert.property(e, 'index');
                assert.isNumber(e.index);
                assert.property(e, 'lineNumber');
                assert.isNumber(e.lineNumber);
                assert.property(e, 'column');
                assert.isNumber(e.column);
                assert.property(e, 'description');
                assert.isString(e.description);
            }
        });
    });

    describe('#techs.json', function() {
        it('should return valid ast', function() {
            var source = '{ "a": 100, b: "text" }',
                ast = techs.json.parse(source, {
                    source: 'file.json'
                });

            assertAst(ast);

            assert.propertyVal(ast.body[0], 'type', 'ObjectExpression');
        });

        it('should throw error with not valid json', function() {
            var source = '{ "a": 100 b: "text" }';

            assert.throws(function() {
                techs.json.parse(source, {
                    source: 'file.json'
                });
            }, error.ParseError);

            try {
                techs.json.parse(source, {
                    source: 'file.json'
                });
            } catch(e) {
                assert.property(e, 'index');
                assert.isNumber(e.index);
                assert.property(e, 'lineNumber');
                assert.isNumber(e.lineNumber);
                assert.property(e, 'column');
                assert.isNumber(e.column);
                assert.property(e, 'description');
                assert.isString(e.description);
            }
        });
    });

    describe('#techs.txt', function() {
        it('should return valid ast', function() {
            var line1 = 'Some text file content.',
                line2 = 'Another file line.',
                source = line1 + '\n' + line2,
                fileName = 'file.txt',
                ast = techs.txt.parse(source, {
                    source: fileName
                });

            assertAst(ast);

            assert.propertyVal(ast.body[0], 'type', 'Literal');
            assert.propertyVal(ast.body[0], 'value', source);
            assert.isObject(ast.body[0].loc);
            assert.isObject(ast.body[0].loc.start);
            assert.isObject(ast.body[0].loc.end);
            assert.isArray(ast.body[0].loc.range);
            assert.deepEqual(ast.body[0].loc.start, { line: 1, column: 0 });
            assert.deepEqual(ast.body[0].loc.end, { line: 2, column: line2.length });
            assert.deepEqual(ast.body[0].loc.range, [ 0, source.length ]);
            assert.propertyVal(ast.body[0].loc, 'source', fileName);
        });

        it('should return valid ast with empty string', function() {
            var source = '',
                fileName = 'file.txt',
                ast = techs.txt.parse(source, {
                    source: fileName
                });

            assertAst(ast);
        });
    });

});

describe('transforms', function() {
    describe('#transforms', function() {
        it('should transform with custom transform', function() {
            var CustomTransform = {
                transform: function(ast, options) {
                    estraverse.traverse(ast, {
                        enter: function(node, parent) {
                            if(node.type === 'Identifier') {
                                node.name = 'TRANSFORM';
                            }
                        }
                    });
                    return ast;
                }
            };

            var ast = supchik.compile('./test/sources/a.js', null, {
                inputFormat: supchik.Format.FILE_CODE,
                outputFormat: supchik.Format.AST,
                transforms: [
                    CustomTransform
                ]
            });

            assert.propertyVal(ast.body[0].declarations[0].id, 'name', 'TRANSFORM');
        });

        it('should transform with custom transform provided as string', function() {
            var ast = supchik.compile('./test/sources/a.js', null, {
                inputFormat: supchik.Format.FILE_CODE,
                outputFormat: supchik.Format.AST,
                transforms: [
                    './test/transform.js'
                ]
            });

            assert.propertyVal(ast.body[0].declarations[0].id, 'name', 'TRANSFORM');
        });

        it('should throw error with unknown transform', function() {
            assert.throws(function() {
                supchik.compile('var a = 100;', null, {
                    transforms: [ 'unknown-transform' ]
                });
            }, error.SupchikError);
        });
    });

    describe('#transforms.borschik', function() {
        it('should include a.js, b.js and c.js', function() {
            var source = './test/sources/include.js',
                ast = supchik.compile(source, null, {
                    inputFormat: supchik.Format.FILE_CODE,
                    outputFormat: supchik.Format.AST
                });

            assertAst(ast);

            assert.propertyVal(ast.body[0].loc,  'source', 'a.js');
            assert.propertyVal(ast.body[3].loc,  'source', source);
            assert.propertyVal(ast.body[5].loc,  'source', 'b.js');
            assert.propertyVal(ast.body[7].loc,  'source', source);
            assert.propertyVal(ast.body[10].loc, 'source', 'c.js');
        });

        it('should include a.json, b.json, c.json and a.txt', function() {
            var source = './test/sources/include-escape.js',
                ast = supchik.compile(source, null, {
                    inputFormat: supchik.Format.FILE_CODE,
                    outputFormat: supchik.Format.AST
                });

            assertAst(ast);

            assert.propertyVal(ast.body[0].declarations[0].init.loc, 'source', 'a.json');
            assert.propertyVal(ast.body[0].declarations[0].init, 'type', 'ObjectExpression');
            assert.propertyVal(ast.body[1].declarations[0].init.loc, 'source', 'b.json');
            assert.propertyVal(ast.body[1].declarations[0].init, 'type', 'ArrayExpression');
            assert.propertyVal(ast.body[2].declarations[0].init.loc, 'source', 'c.json');
            assert.propertyVal(ast.body[2].declarations[0].init, 'type', 'ArrayExpression');
            assert.propertyVal(ast.body[3].declarations[0].init.loc, 'source', 'a.txt');
            assert.propertyVal(ast.body[3].declarations[0].init, 'type', 'Literal');
        });

        it('should include a.txt, b.txt, c.txt and a.json', function() {
            var source = './test/sources/include-string-literal.js',
                ast = supchik.compile(source, null, {
                    inputFormat: supchik.Format.FILE_CODE,
                    outputFormat: supchik.Format.AST
                });

            assertAst(ast);

            assert.propertyVal(ast.body[0].declarations[0].init.loc, 'source', 'a.txt');
            assert.propertyVal(ast.body[0].declarations[0].init, 'type', 'Literal');
            assert.propertyVal(ast.body[1].declarations[0].init.loc, 'source', 'b.txt');
            assert.propertyVal(ast.body[1].declarations[0].init, 'type', 'Literal');
            assert.propertyVal(ast.body[2].declarations[0].init.loc, 'source', 'c.txt');
            assert.propertyVal(ast.body[2].declarations[0].init, 'type', 'Literal');
            assert.propertyVal(ast.body[3].declarations[0].init.loc, 'source', 'a.json');
            assert.propertyVal(ast.body[3].declarations[0].init, 'type', 'Literal');
        });

        it('should include mixed and nested stuff', function() {
            var source = './test/sources/include-mixed.js',
                ast = supchik.compile(source, null, {
                    inputFormat: supchik.Format.FILE_CODE,
                    outputFormat: supchik.Format.AST
                });

            assertAst(ast);

            assert.propertyVal(ast.body[0].declarations[0].init.loc, 'source', 'mixed/a.js');
            assert.propertyVal(
                ast.body[1].body.body[0].body.body[0].declarations[0].init.loc,
                'source', '../b.js'
            );
            assert.propertyVal(ast.body[2].declarations[0].init.loc, 'source', 'mixed/a.json');
            assert.propertyVal(ast.body[3].body.body[0].declarations[0].init.loc, 'source', 'mixed/b.js');
            assert.propertyVal(
                ast.body[3].body.body[1].body.body[0].declarations[0].init.loc,
                'source', '../b.js'
            );
        });

        it('should throw error with not valid source', function() {
            var source = './test/sources/include-not-valid.js';

            assert.throws(function() {
                supchik.compile(source, null, {
                    inputFormat: supchik.Format.FILE_CODE
                });
            }, error.ParseError);
        });

        it('should throw error with not valid source (2)', function() {
            var source = './test/sources/include-not-valid2.js';

            assert.throws(function() {
                supchik.compile(source, null, {
                    inputFormat: supchik.Format.FILE_CODE
                });
            }, error.ParseError);
        });

        it('should throw error with not valid source (3)', function() {
            var source = './test/sources/include-not-valid3.js';

            assert.throws(function() {
                supchik.compile(source, null, {
                    inputFormat: supchik.Format.FILE_CODE
                });
            }, error.ParseError);
        });
    });
});

describe('sourcemap', function() {
    it('should generate valid sourcemap and attach sourcemap\'s url', function() {
        var source = './test/sources/include.js',
            sourceMapUrl = 'source-map.js.map',
            output = {};

        var generatedSourced = supchik.compile(source, output, {
            inputFormat: supchik.Format.FILE_CODE,
            sourceMap: sourceMapUrl
        });

        assert.property(output, 'sourceMap');
        assert.isString(output.sourceMap);

        if(output.sourceMap) {
            var sourceMap;
            assert.doesNotThrow(function() {
                sourceMap = JSON.parse(output.sourceMap);
            });
            assert.property(sourceMap, 'version');
            assert.isNumber(sourceMap.version);
            assert.property(sourceMap, 'names');
            assert.isArray(sourceMap.names);
            assert.property(sourceMap, 'sources');
            assert.isArray(sourceMap.sources);
            assert.property(sourceMap, 'mappings');
            assert.isString(sourceMap.mappings);
            assert.includeMembers(
                sourceMap.sources,
                [ 'a.js', 'b.js', 'c.js', './test/sources/include.js' ]
            );
        }

        assert.isString(generatedSourced);
        var lines = generatedSourced.match(/[^\r\n]+/g),
            lastLine = lines[lines.length-1];
        assert.match(
            lastLine,
            new RegExp('\/\/\# sourceMappingURL\=' + sourceMapUrl.replace('.', '\.'))
        );
    });

    it('should not attach sourcemap\'s url if source map file name is not specified', function() {
        var source = './test/sources/include.js',
             output = {};

        var generatedSourced = supchik.compile(source, output, {
            inputFormat: supchik.Format.FILE_CODE,
            sourceMap: true
        });

        var lines = generatedSourced.match(/[^\r\n]+/g),
            lastLine = lines[lines.length-1];

        assert.ok(lastLine.indexOf('//#sourceMappingURL') === -1);
    });
});

describe('api', function() {
    it('should output all required stuff', function() {

        var output = {};

        supchik.compile('./test/sources/include.js', output, {
            inputFormat: supchik.Format.FILE_CODE
        });

        assert.property(output, 'source');
        assert.isString(output.source);
        assert.property(output, 'ast');
        assert.isObject(output.ast);
        assertAst(output.ast);
        assert.property(output, 'compiledSource');
        assert.isString(output.compiledSource);

    });

    it('should output source despite syntax error', function() {

        var output = {};

        try {
            supchik.compile('./test/sources/include-syntax-error.js', output, {
                inputFormat: supchik.Format.FILE_CODE
            });
        } catch(e) {
        }

        assert.property(output, 'source');
        assert.isString(output.source);

    });

    it('should use custom tech', function() {

        var accessCount = 0;

        var MyTechJs = {
            parse: function(source, options) {
                accessCount++;
                return {
                    'type': 'Program',
                    'body': []
                };
            },

            generate: function(ast, options) {
                accessCount++;
                return '';
            },

            generateSourceMap: function(ast, options) {
                accessCount++;
                return '';
            },

            generateWithSourceMap: function(ast, options) {
                accessCount++;
                return { code: '', map: '' };
            }
        };

        supchik.compile('./test/sources/include.js', null, {
            inputFormat: supchik.Format.FILE_CODE,
            sourceMap: 'output.js.map',
            techs: {
                js: MyTechJs
            }
        });

        assert.equal(accessCount, 2);

    });

    it('should share options with techs by 2 steps', function() {

        var MyTechJs = {
            parse: function(source, options) {
                assert.propertyVal(options.shared, 'mySharedOption', true);
                return {
                    'type': 'Program',
                    'body': []
                };
            },

            generate: function(ast, options) {
                assert.propertyVal(options.shared, 'mySharedOption', true);
                return '';
            },

            generateSourceMap: function(ast, options) {
                assert.propertyVal(options.shared, 'mySharedOption', true);
                return '';
            },

            generateWithSourceMap: function(ast, options) {
                assert.propertyVal(options.shared, 'mySharedOption', true);
                return { code: '', map: '' };
            }
        };

        supchik.compile('./test/sources/include.js', null, {
            inputFormat: supchik.Format.FILE_CODE,
            sourceMap: 'output.js.map',
            techs: {
                js: MyTechJs
            },
            mySharedOption: true
        });

    });

    it('should share options with transforms', function() {

        var accessCount = 0;

        var MyTransform = {
            transform: function(ast, options) {
                assert.propertyVal(options.shared, 'mySharedOption', true);
                accessCount++;
                return ast;
            }
        };

        supchik.compile('./test/sources/include.js', null, {
            inputFormat: supchik.Format.FILE_CODE,
            transforms: [ MyTransform ],
            mySharedOption: true
        });

        assert.equal(accessCount, 1);

    });
});

