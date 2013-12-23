var _          = require('lodash'),
    estraverse = require('estraverse');

var DEFAULT_TECH = 'txt',
    REG_EXP_INCLUDE = /^\s*borschik:include:(.*?)\s*$/,
    ATOMS = [ 'ObjectExpression', 'ArrayExpression', 'Literal' ],
    VISITOR_KEYS = _.transform(estraverse.VisitorKeys, function(result, value, key) {
        result[key] = _.intersection(value, [
            'body',
            'elements',
            'properties'
        ]);
    }),
    Place = {
        INTO:    1,
        REPLACE: 2,
        BEFORE:  3,
        AFTER:   4
    };

function matches(regExp, comments, range) {
    return comments.reduce(function(result, comment) {
        if(range) {
            if(!comment.range) {
                return result;
            }
            if(comment.range[0] < range[0] ||
               comment.range[1] > range[1]) {
                return result;
            }
        }
        if(comment.type !== 'Block') {
            return result;
        }
        var matches = comment.value.match(regExp);
        if(matches) {
            result.push({ path: matches[1], comment: comment });
        }
        return result;
    }, []);
}

function includes(comments, range) {
    return matches(REG_EXP_INCLUDE, comments, range);
}

function insert(nodes, into, property, ofNode) {
    return Array.prototype.splice.apply(ofNode[property], [into, 0].concat(nodes));
}

function push(nodes, toProperty, ofNode) {
    return Array.prototype.push.apply(ofNode[toProperty], nodes);
}

function clean(node) {
    _.forOwn(node, function(value, key) {
        delete node[key];
    });
}

function replace(node, replacer) {
    clean(node);
    _.extend(node, replacer);
}

function removeComment(comment, comments) {
    if(!comments) {
        return;
    }
    var index = _.findIndex(comments, comment);
    if(index !== -1) {
        comments.splice(index, 1);
    }
}

function throwValidityError(source, file) {
    throw new error.ParseError(
            'Source validity treat at' +
            (source ? ' `' + source + '`' : '') +
            ' line: ' + file.comment.loc.start.line +
            ' column: ' + file.comment.loc.start.column
        ).extend({
            source: source,
            index: file.comment.range[0],
            lineNumber: file.comment.loc.start.line,
            column: file.comment.loc.start.column,
            description: 'Source validity treat.'
        });
}

function assertValidity(nodes, atProperty, ofNode, options) {
    if(ofNode.type === 'Program' ||
       ofNode.type === 'BlockStatement') {

        // Allow lends nodes only to body
        // for Program and BlockStatement
        if(atProperty !== 'body') {
            throwValidityError(options.source, options.file);
        }

        // Do not allow lend ObjectExpression,
        // ArrayExpression and Literal
        nodes.forEach(function(node) {
            if(_.contains(ATOMS, node.type)) {
                throwValidityError(options.source, options.file);
            }
        });

    }
}

function include(file, place, options) {
    var ast,
        tech,
        content,
        sourcePath,
        transformOptions,
        ownerIndex, owner;

    if(!_.isArray(file)) {

        // Select predefined tech for file or
        // extract tech from file's name:
        //
        // `filename.js` -> `js`
        tech =
            options.techs[file.tech] ||
            options.file.tech(file.path, {
                techs: options.techs,
                defaultTech: DEFAULT_TECH
            });

        // Resolve path to file relative to
        // parent file and reads file content
        content = options.file.read(
            options.file.resolve(
                (options.realPath || options.sourcePath).concat([file.path])
            )
        );

        // Render file's AST tree.
        ast = tech.parse(content, {
            source: file.path,
            shared: options.shared
        });

        // Generate transform options.
        transformOptions = _.extend(_.clone(options), {
            sourcePath: options.sourcePath.concat(
                [options.file.dirname(file.path)]
            )
        });

        // Solve realpath for transform options.
        if(options.realPath) {
            transformOptions = _.extend(transformOptions, {
                realPath: options.realPath.concat(
                    [options.file.dirname(file.path)]
                )
            });
        }

        // Transform AST using Borschik transform.
        ast = transform(ast, transformOptions);

        if(place.where === Place.REPLACE) {

            // Allow replace ObjectExpression,
            // ArrayExpression and Literal to
            // ObjectExpression, ArrayExpression,
            // Literal only.
            if(!_.contains(ATOMS, options.path[0].type) ||
               !_.contains(ATOMS, ast.body[0].type)) {
                throwValidityError(options.source, file);
            }

            // Replace node with new node.
            replace(options.path[0], ast.body[0]);

        } else if(place.where === Place.INTO) {

            // Check can we lend any of new nodes here.
            assertValidity(ast.body, place.key, options.path[0], {
                options: options.source,
                file: file
            });

            // Add nodes to end.
            push(ast.body, place.key, options.path[0]);

        } else if(place.where === Place.BEFORE || place.where === Place.AFTER) {

            // Find parent node index that contains lending visitor key
            // (typically `body`: function body or something like this).
            ownerIndex = _.findIndex(options.path, function(node, index) {
                return index > 0 && node[place.key] && _.isArray(node[place.key]);
            });

            // Memo node with lending option.
            owner = options.path[ownerIndex];

            // Check can we lend any of new nodes here.
            assertValidity(ast.body, place.key, owner, {
                source: options.source,
                file: file
            });

            // Insert nodes.
            insert(
                ast.body,
                _.indexOf( // Find crossroad with current node owner.
                    owner[place.key],
                    options.path[ownerIndex-1]) + (place.where === Place.AFTER ? 1 : 0
                ),
                place.key,
                owner
            );

        }

        // Remove processed comment from
        // all AST nodes to avoid repeats.
        if(file.comment) {
            removeComment(file.comment, options.ast.comments);
            estraverse.traverse(options.ast, {
                enter: function(node, parent) {
                    removeComment(file.comment, node.leadingComments);
                    removeComment(file.comment, node.trailingComments);
                }
            });
        }

        return file;
    }

    file.forEach(function(file) {
        include(file, place, options);
    });

    return file;
}

function transform(ast, options) {
    options = options ? _.clone(options) : {};
    options.path = [];
    options.ast = ast;

    estraverse.traverse(ast, {
        enter: function(node, parent) {
            options.path.unshift(node);

            // Replace string literal includes.
            //
            // var a = 'borshick:include:b.txt'; ->
            // var a = 'Some text from b.txt';
            if(node.type === 'Literal' && typeof node.value === 'string') {
                var matches = node.value.match(REG_EXP_INCLUDE);
                if(matches) {
                    include(
                        { path: matches[1], tech: 'txt' },
                        { where: Place.REPLACE },
                        options
                    );
                }
            }

            // Look up for empty lending options and
            // replace them with comment's include
            // if available. Escapes ObjectExpression
            // and ArrayExpression.
            //
            // function a() { /*borschilk:include:b.js*/ } ->
            // function a() { var b = true; }
            //
            // var a = { /*borschilk:include:b.json*/ } ->
            // var a = { "b": "Some json from b.json." }
            if(ast.comments && node.range) {
                VISITOR_KEYS[node.type].forEach(function(visitorKey) {
                    if(node[visitorKey] && _.isArray(node[visitorKey]) &&
                       node[visitorKey].length === 0) {
                        include(
                            includes(ast.comments, node.range), {
                                key: visitorKey,
                                where: // ObjectExpression, ArrayExpression, Literal must be replaced.
                                    _.contains(ATOMS, node.type)
                                    ? Place.REPLACE : Place.INTO
                            },
                            options
                        );
                    }
                });
            }

            // Look up for includes before node.
            //
            // /*borshick:include:b.js*/ var a = 1; ->
            // var b = 'String from b.js'; var a = 1;
            if(node.leadingComments) {
                include(
                    includes(node.leadingComments),
                    { key: 'body', where: Place.BEFORE },
                    options
                );
            }

            // Look up for includes after node.
            //
            // var a = 1; /*borshick:include:b.js*/ ->
            // var a = 1; var b = 'String from b.js';
            if(node.trailingComments) {
                include(
                    includes(node.trailingComments),
                    { key: 'body', where: Place.AFTER },
                    options
                );
            }
        },
        leave: function() {
            options.path.shift();
        }
    });

    return ast;
}

module.exports = {
    transform: transform,
    Place: Place
};
