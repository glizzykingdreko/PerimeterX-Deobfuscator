
const babel = require('@babel/core');
const { default: traverse } = require('@babel/traverse');

var D = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
    Z = /[^+/=0-9A-Za-z]/,
    Q = function () {
        try {
            return p.atob;
        } catch (t) { }
    }();
V = "function"

function l(t) {
    return l = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (t) {
        return typeof t;
    } : function (t) {
        return t && "function" == typeof Symbol && t.constructor === Symbol && t !== Symbol.prototype ? "symbol" : typeof t;
    }, l(t);
}

function H(t) {
    return l(Q) === V ? Q(t) : function (t) {
        var e,
            n,
            r,
            a,
            o = [],
            i = 0,
            c = t.length;
        if (Z.test(t) || /=/.test(t) && (/=[^=]/.test(t) || /={3}/.test(t))) return null;
        for (c % 4 > 0 && (c = (t += Array(4 - c % 4 + 1).join("=")).length); i < c;) {
            for (n = [], a = i; i < a + 4;) n.push(D.indexOf(t.charAt(i++)));
            for (r = [((e = (n[0] << 18) + (n[1] << 12) + ((63 & n[2]) << 6) + (63 & n[3])) & 255 << 16) >> 16, 64 === n[2] ? -1 : (65280 & e) >> 8, 64 === n[3] ? -1 : 255 & e], a = 0; a < 3; ++a) (r[a] >= 0 || 0 === a) && o.push(String.fromCharCode(r[a]));
        }
        return o.join("");
    }(t);
}

function decodeHCalls(ast) {
    console.log('-> Decoding H() calls');
    let matches = 0;
    // identify the function name by checking the most 
    // common function called with a single string argument
    // and one letter name

    let functionName = '';
    let functionCalls = {};
    traverse(ast, {
        CallExpression(path) {
            if (
                path.node.arguments.length === 1 &&
                babel.types.isStringLiteral(path.node.arguments[0])
            ) {
                const functionName = path.node.callee.name;
                if (functionCalls[functionName]) {
                    functionCalls[functionName] += 1;
                } else {
                    functionCalls[functionName] = 1;
                }
            }
        }
    });

    // Find the function name with the most calls
    let maxCalls = 0;
    for (const [name, calls] of Object.entries(functionCalls)) {
        if (calls > maxCalls) {
            maxCalls = calls;
            functionName = name;
        }
    }

    console.log(`Identified function name: ${functionName}`);


    traverse(ast, {
        CallExpression(path) {
            // Check if the function call has only one argument
            if (path.node.arguments.length !== 1) {
                return;
            }

            // Check if the function name is "H"
            if (path.node.callee.name !== functionName) {
                return;
            }

            const arg = path.node.arguments[0];

            // Check if the argument is a string literal
            if (babel.types.isStringLiteral(arg)) {
                // Replace the call with a call to decodeHvalue
                decodedValue = H(arg.value);
                try{
                    path.replaceWith(babel.types.stringLiteral(decodedValue));
                    matches += 1;
                } catch (e) {
                    return
                }
            }
        }
    });

    console.log(`Replaced ${matches} function calls`);
    console.log('   ------------------');
}

module.exports = decodeHCalls;