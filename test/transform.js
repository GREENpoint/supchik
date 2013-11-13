var estraverse = require('estraverse');

function transform(ast, options) {
    estraverse.traverse(ast, {
        enter: function(node, parent) {
            if(node.type === 'Identifier') {
                node.name = 'TRANSFORM';
            }
        }
    });
    return ast;
}

module.exports = {
    transform: transform
};
