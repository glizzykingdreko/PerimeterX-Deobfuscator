const { default: traverse } = require('@babel/traverse');
const types = require('@babel/types');

function replaceVariableCallsWithValues(ast) {
    console.log('->   Replacing Variable call  ');
    let matches = 0;
    traverse(ast, {
        FunctionDeclaration(path) {
            // For each function, collect replacements within its scope
            let localReplacements = {};

            // Collect variable assignments within the function
            path.traverse({
                VariableDeclarator(innerPath) {
                    if (types.isNumericLiteral(innerPath.node.init)) {
                        localReplacements[innerPath.node.id.name] = innerPath.node.init.value;
                    }
                }
            });

            // Replace the variable calls with their values within the function
            path.traverse({
                Identifier(innerPath) {
                    if (
                        innerPath.parent.type === 'ObjectProperty' && innerPath.key === 'key' ||
                        innerPath.parentPath.isFunction() && innerPath.listKey === 'params' ||
                        innerPath.parent.type === 'MemberExpression' && innerPath.key === 'object' ||
                        innerPath.parent.type === 'NewExpression' && innerPath.key === 'callee' ||
                        innerPath.parent.type === 'CallExpression' && innerPath.key === 'callee' ||
                        innerPath.parent.type === 'MemberExpression' && innerPath.key === 'property' ||
                        innerPath.parent.type === 'ForInStatement' && innerPath.key === 'left' ||
                        innerPath.parent.type === 'VariableDeclarator' && innerPath.key === 'id' ||
                        innerPath.parent.type === 'AssignmentExpression' && innerPath.key === 'left' ||
                        innerPath.parent.type === 'MemberExpression' && innerPath.key === 'property' ||
                        innerPath.parent.type === 'FunctionDeclaration' && innerPath.key === 'id' ||
                        innerPath.parent.type === 'CatchClause' && innerPath.key === 'param'
                    ) {
                        return;
                    }
                    
                    
                    if (localReplacements[innerPath.node.name] && 
                        path.scope.hasBinding(innerPath.node.name)) {
                        if (typeof localReplacements[innerPath.node.name] === 'number') {
                            matches += 1;
                            innerPath.replaceWith(types.numericLiteral(localReplacements[innerPath.node.name]));
                        }                            
                    }
                }
            });
        }
    });

    console.log(`Replaced ${matches} variable calls`);
}

module.exports = replaceVariableCallsWithValues;
