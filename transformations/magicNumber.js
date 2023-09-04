
const babel = require('@babel/core');
const { default: traverse } = require('@babel/traverse');
const { default: generate } = require('@babel/generator');

// Define the decodeChat function
base64decoder = function () {
    try {
        if (atob && "test" === atob("dGVzdA=="))
            return atob
    } catch (t) {}

    function t(t) {
        this.message = t
    }
    t.prototype = new Error,
        t.prototype.name = "InvalidCharacterError";
    return function (e) {
        var n = String(e).replace(/[=]+$/, "");
        if (n.length % 4 == 1)
            throw new t("'atob' failed: The string to be decoded is not correctly encoded.");
        for (var r, a, o = 0, i = 0, c = ""; a = n.charAt(i++); ~a && (r = o % 4 ? 64 * r + a : a,
                o++ % 4) ? c += String.fromCharCode(255 & r >> (-2 * o & 6)) : 0)
            a = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".indexOf(a);
        return c
    }
}()

function decodeChat(n, magicNumber) {
    for (var c = base64decoder(n), u = "", l = 0; l < c.length; ++l) {
        var f = magicNumber.charCodeAt(l % 7);
        u += String.fromCharCode(f ^ c.charCodeAt(l))
    }
    return u
}

function decodeMagicNumberCalls(ast) {
    console.log('-> Decoding MagicNumber calls ');
    // We beed to get all the function calls with one string argument
    // Find the most common 3 starting char and make a regex
    let matches = 0;
    let functionCalls = {};
    let regexPattern = '';

    traverse(ast, {
        CallExpression(path) {
            if (
                path.node.arguments.length === 1 &&
                babel.types.isStringLiteral(path.node.arguments[0])
            ) {
                // we need to store the first 3 chars of the string
                const arg = path.node.arguments[0];
                const firstThreeChars = arg.value.substring(0, 3);
                if (functionCalls[firstThreeChars]) {
                    functionCalls[firstThreeChars] += 1;
                } else {
                    functionCalls[firstThreeChars] = 1;
                }
            }
        }
    });


    // Find the most common 3 starting char and make a regex
    const sortedFunctionCalls = Object.keys(functionCalls).sort((a, b) => functionCalls[b] - functionCalls[a]);
    const mostCommonThreeChars = sortedFunctionCalls[0];
    regexPattern = new RegExp(`^${mostCommonThreeChars}`);

    traverse(ast, {
        FunctionDeclaration(path) {
            // Check the structure
            const body = path.node.body.body;
            if (body.length >= 2 && 
                body[0].type === 'VariableDeclaration' && 
                body[1].type === 'IfStatement' &&
                body[1].alternate &&
                body[1].alternate.body &&
                body[1].alternate.body[0].type === 'ForStatement' &&
                body[1].alternate.body[0].body.body &&
                body[1].alternate.body[0].body.body[0].type === 'VariableDeclaration' &&
                body[1].alternate.body[0].body.body[0].declarations[0].init &&
                body[1].alternate.body[0].body.body[0].declarations[0].init.type === 'CallExpression' &&
                body[1].alternate.body[0].body.body[0].declarations[0].init.callee.property.name === 'charCodeAt'
            ) {
                let code = generate(body[1].alternate.body[0].body.body[0].declarations[0].init).code;
                magicNumber = code.split('"')[1];
            }
        }
    });

    console.log(`Identified magic number: ${magicNumber}`);



    traverse(ast, {
        CallExpression(path) {
            // Check if the function call has only one argument
            if (path.node.arguments.length !== 1) {
                return;
            }

            const arg = path.node.arguments[0];

            // Check if the argument is a string literal and matches the format starting with F29
            if (babel.types.isStringLiteral(arg) && regexPattern.test(arg.value)) {
                let decodedValue;
                try{
                    decodedValue = decodeChat(arg.value, magicNumber);
                    matches += 1;
                } catch (e) {
                    return;
                }

                // Replace the call with the decoded value
                //console.log(`Replaced ${arg.value} with ${decodedValue}`);
                path.replaceWith(babel.types.stringLiteral(decodedValue));
            }
        }
    });
    console.log(`Replaced ${matches} function calls`);
}

module.exports = decodeMagicNumberCalls;