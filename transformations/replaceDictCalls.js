
const babel = require('@babel/core');
const { default: traverse } = require('@babel/traverse');
const { default: generate } = require('@babel/generator');

function replaceDictCalls(ast) {
    console.log('   ------------------');
    console.log('->   Replacing Dict call  ');
    let matches = 0;
    const localDicts = {};
    traverse(ast, {
        VariableDeclarator(path) {
            if (path.node.init && path.node.init.type === 'ObjectExpression') {
                const dictName = path.node.id.name;
                localDicts[dictName] = {};

                for (const property of path.node.init.properties) {
                    if (property.key.type === 'Identifier' && ['NumericLiteral', 'StringLiteral'].includes(property.value.type)) {
                        localDicts[dictName][property.key.name] = property.value;
                    }
                }
            }
        }
    });

    traverse(ast, {
        MemberExpression(path) {
            if (path.parent.type === "AssignmentExpression" && path.parent.left === path.node) {
                return;
            }

            const objectName = path.node.object.name;
            const propName = path.node.property.name;

            if (localDicts[objectName] && localDicts[objectName][propName]) {
                const replacementValue = localDicts[objectName][propName];
                if (replacementValue.type === 'NumericLiteral' || replacementValue.type === 'StringLiteral') {
                    path.replaceWith(replacementValue);
                    matches += 1;
                }
            }
        }

        
    });
    traverse(ast, {
        VariableDeclarator(path) {
            if (path.node.init && path.node.init.type === 'ObjectExpression') {
                const dictName = path.node.id.name;
                localDicts[dictName] = {};

                for (const property of path.node.init.properties) {
                    if (property.key.type === 'Identifier' && ['NumericLiteral', 'StringLiteral'].includes(property.value.type)) {
                        localDicts[dictName][property.key.name] = property.value;
                    }
                }
            }
        },
        MemberExpression(path) {
            if (path.parent.type === "AssignmentExpression" && path.parent.left === path.node) {
                // Skip replacing if this MemberExpression is the left side of an assignment
                return;
            }
        
            const objectName = path.node.object.name;
            const propName = path.node.property.name;
        
            if (localDicts[objectName] && localDicts[objectName][propName]) {
                const replacementValue = localDicts[objectName][propName];
                if (replacementValue.type === 'NumericLiteral' || replacementValue.type === 'StringLiteral') {
                    path.replaceWith(replacementValue);
                    matches += 1;
                }
            }
        }
    });
    console.log(`Replaced ${matches} dict calls`);
}

module.exports = replaceDictCalls;