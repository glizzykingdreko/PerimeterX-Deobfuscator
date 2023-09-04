
const babel = require('@babel/core');
const { default: traverse } = require('@babel/traverse');
const { default: generate } = require('@babel/generator');
const vm = require('vm');

function decodeListPlacements(ast){
    console.log('-> Replacing List call    ');
    let matches = 0;
    let backupScripts = {}
    let trFunctionNames = {};  // Placeholder for the identified function's name

    traverse(ast, {
        FunctionDeclaration(path) {
            // 1. Check if the function has no arguments
            if (path.node.params.length !== 0) {
                return;
            }

            // 2. Check if there's a single variable declaration with an array initializer
            const bodyStatements = path.node.body.body;
            if (bodyStatements.length !== 2) {
                return;
            }

            const varDeclaration = bodyStatements[0];
            if (!babel.types.isVariableDeclaration(varDeclaration) || varDeclaration.declarations.length !== 1) {
                return;
            }

            const arrayInitializer = varDeclaration.declarations[0].init;
            if (!babel.types.isArrayExpression(arrayInitializer)) {
                return;
            }

            // 3. Check for the return statement
            const returnStatement = bodyStatements[1];
            if (!babel.types.isReturnStatement(returnStatement)) {
                return;
            }

            const returnedFunctionCall = returnStatement.argument;
            if (!babel.types.isCallExpression(returnedFunctionCall)) {
                return;
            }

            const returnedFunction = returnedFunctionCall.callee;
            if (!babel.types.isAssignmentExpression(returnedFunction) || returnedFunction.operator !== "=") {
                return;
            }

            const leftAssignment = returnedFunction.left;
            const rightAssignment = returnedFunction.right;

            if (!babel.types.isIdentifier(leftAssignment) || !babel.types.isFunctionExpression(rightAssignment)) {
                return;
            }

            trFunctionNames[leftAssignment.name] = generate(path.node).code;
            
        }
    });

    // Output the identified function names
    const identifiedFunctions = Object.keys(trFunctionNames);
    if (identifiedFunctions.length > 0) {
        //console.log(`Functions similar to 'Tr' identified as: ${identifiedFunctions.join(", ")}`);
    } else {
        //console.log("No functions similar to 'Tr' were found.");
    }

    let grFunctionNames = {};  // Placeholder for the identified function names and their associated Tr-like functions
    let grFunctionsAssociations = {};
    traverse(ast, {
        FunctionDeclaration(path) {
            // 1. Check if the function has two arguments
            if (path.node.params.length !== 2) {
                return;
            }

            // 2. Check for a variable declaration that calls one of the functions identified in step 1
            let associatedTrFunction = null;
            path.traverse({
                VariableDeclarator(innerPath) {
                    const init = innerPath.node.init;
                    if (babel.types.isCallExpression(init) &&
                        babel.types.isIdentifier(init.callee) &&
                        trFunctionNames[init.callee.name]) {
                        associatedTrFunction = init.callee.name;
                    }
                }
            });

            if (!associatedTrFunction) {
                return;
            }

            // 3. Check for a return statement that redefines the function itself
            const returnStatement = path.node.body.body.find(statement => 
                babel.types.isReturnStatement(statement) &&
                babel.types.isCallExpression(statement.argument) &&
                babel.types.isAssignmentExpression(statement.argument.callee) &&
                babel.types.isIdentifier(statement.argument.callee.left, { name: path.node.id.name })
            );

            if (!returnStatement) {
                return;
            }

            grFunctionNames[path.node.id.name] = generate(path.node).code;
            grFunctionsAssociations[associatedTrFunction] = path.node.id.name;
            
        }
    });

    let shufflingFunctions = {};  // Placeholder for the identified shuffling functions

    traverse(ast, {
        CallExpression(path) {
            // 1. Check if the function takes one of the `Tr`-like functions as an argument
            const callee = path.node.callee;
            const argument = path.node.arguments[0];
            if (path.node.arguments.length !== 1 || !babel.types.isIdentifier(argument) || !trFunctionNames[argument.name]) {
                return;
            }

            // 2. Inside this function, look for a loop with arithmetic operations
            let hasLoopWithArithmetic = false;
            path.traverse({
                ForStatement(innerPath) {
                    innerPath.traverse({
                        BinaryExpression(binaryPath) {
                            if (["+", "-", "*", "/", "%"].includes(binaryPath.node.operator)) {
                                hasLoopWithArithmetic = true;
                            }
                        }
                    });
                }
            });

            if (!hasLoopWithArithmetic) {
                return;
            }

            // If all checks pass, we've identified the shuffling function
            functionCode = path.node;
            shufflingFunctions[argument.name] = generate(callee).code
            //console.log(`Identified shuffling function for ${argument.name}: ${generate(callee).code}`);
            

        }
    });

    function executeInVM(trFunctionNames, grFunctionNames, shufflingFunctions) {
        // Creating a sandboxed environment
        let sandbox = {
            console: console,
            ...trFunctionNames,
            ...grFunctionNames,
        };

        const context = vm.createContext(sandbox);

        for (const [name, shuffleFunction] of Object.entries(shufflingFunctions)) {
            const trFunctionName = name;  // Assuming the shuffling function's name corresponds to the trFunction's name
            const trFunction = trFunctionNames[trFunctionName];
            const grFunctionName = grFunctionsAssociations[trFunctionName];
            const grFunction = grFunctionNames[grFunctionName];

            if (trFunction) {
                // Executing the shuffling function with the trFunction
                let scriptCode = `
                    ${trFunction}
                    ${grFunction}
                    (${shuffleFunction})(${trFunctionName})
                `
                const script = new vm.Script(scriptCode);
                backupScripts[grFunctionName] = scriptCode;
                //console.log(`Executing ${trFunctionName} with ${shuffleFunction}`);
                script.runInContext(context);
            }else {
                //console.log(`No trFunction found for ${trFunctionName}`);
            }
        }

        // Return the sandbox for potential further use or inspection
        return sandbox;
    }


    context = executeInVM(
        trFunctionNames,
        grFunctionNames,
        shufflingFunctions
    )

    // 1. Identify variable associations for each grFunctionName
    let grFunctionAssociations = {};
    traverse(ast, {
        VariableDeclaration(path) {
            path.node.declarations.forEach(declaration => {
                if (
                    babel.types.isIdentifier(declaration.init) 
                    && 
                    Object.keys(grFunctionNames).includes(declaration.init.name)
                ) {
                    // this declaration.id.name may have different gr associations
                    // so we wanna have grFunctionAssociations like k: [...]
                    if (grFunctionAssociations[declaration.id.name]) {
                        grFunctionAssociations[declaration.id.name].push(declaration.init.name);
                    }else {
                        grFunctionAssociations[declaration.id.name] = [declaration.init.name];
                    }

                    //console.log(`Found association between ${declaration.init.name} and ${declaration.id.name}`);
                    // Remove the declaration
                }
            });
        }
    });

    //console.log(grFunctionAssociations)

    let brokenReplace = [];
    // Now we check all the function calls
    // if the function is inside replacableFunctions
    // and the argument is one int, we replace it by running the function
    traverse(ast, {
        CallExpression(path) {
            if (
                Object.keys(grFunctionAssociations).includes(path.node.callee.name)
                &&
                path.node.arguments.length === 1
                &&
                babel.types.isNumericLiteral(path.node.arguments[0])
            ) {
                const functionName = path.node.callee.name;
                const argument = path.node.arguments[0].value;
                const grFunctionNames = grFunctionAssociations[functionName];
                // we need to execute in the context and get the output
                
                // Loop trought grFunctionNames
                matched = false;
                for (const grFunctionName of grFunctionNames) {
                    let output = context[grFunctionName](argument);
                    // Output can be from undefined to string
                    if (output === undefined) {
                        //console.log(`Undefined output for ${functionName}(${argument})`);
                        continue
                    }
                    else if (typeof output === "string") {
                        matched = true;
                        //console.log(`Replaced ${functionName}(${argument}) with ${output} from ${grFunctionName}`);
                        path.replaceWith(babel.types.stringLiteral(output));
                        matches += 1;
                        break
                    }
                }
                if (!matched) {
                    brokenReplace.push(functionName)
                }
            }
        }
    });
    //console.log(grFunctionAssociations)

    // Now brokenReplace are probably because sometimes the Object.keys(grFunctionAssociations)
    // get associated to other variables, for example 
    // x = Aa
    // So what we need to do now is to make a traverse similar to the 
    // previous one that is going to search for the variables that are
    // associated to one of the keys of grFunctionAssociations, keep in mind that are not initialized
    // with a 'var'
    let associationsOfAssociations = {}
    traverse(ast, {
        VariableDeclaration(path) {
            path.node.declarations.forEach(declaration => {
                if (
                    declaration.init
                    &&
                    Object.keys(grFunctionAssociations).includes(declaration.init.name)
                ) {
                    // this declaration.id.name may have different gr associations
                    // so we wanna have grFunctionAssociations like k: [...]
                    if (associationsOfAssociations[declaration.id.name]) {
                        associationsOfAssociations[declaration.id.name].push(declaration.init.name);
                    }else {
                        associationsOfAssociations[declaration.id.name] = [declaration.init.name];
                    }

                    //console.log(`Found association between ${declaration.init.name} and ${declaration.id.name}`);
                    // Remove the declaration
                }
            });
        }
    });

    const brokenAgain = []
    // Now like before we need to check the calls and replace them
    traverse(ast, {
        CallExpression(path) {
            if (
                Object.keys(associationsOfAssociations).includes(path.node.callee.name)
                &&
                path.node.arguments.length === 1
                &&
                babel.types.isNumericLiteral(path.node.arguments[0])
            ) {
                const functionName = path.node.callee.name;
                const argument = path.node.arguments[0].value;
                const associationFunctionNames = associationsOfAssociations[functionName];
                // we need to execute in the context and get the output
                match = false;
                // Loop trought grFunctionNames
                for (const associationFunctionName of associationFunctionNames) {
                    grFunctionNames = grFunctionAssociations[associationFunctionName]
                    for (const grFunctionName of grFunctionNames) {
                        let output = context[grFunctionName](argument);
                        // Output can be from undefined to string
                        if (output === undefined) {
                            //console.log(`Undefined output for ${functionName}(${argument})`);
                            continue
                        }
                        else if (typeof output === "string") {
                            match = true;
                            path.replaceWith(babel.types.stringLiteral(output));
                            break
                        }
                    }
                }
                if (!match) {
                    brokenAgain.push(functionName)
                }
            }
        }
    });

    console.log(`Replaced ${matches} function calls`);

}

module.exports = decodeListPlacements;