const fs = require('fs');
const babel = require('@babel/core');
const { default: generate } = require('@babel/generator');


const decodeMagicNumberCalls = require('./transformations/magicNumber');
const decodeHCalls = require('./transformations/hCalls');
const decodeListPlacements = require('./transformations/listPlacements');
const replaceVariableCallsWithValues = require('./transformations/replaceVariableCalls');
const replaceDictCalls = require('./transformations/replaceDictCalls');

// Read the code
const passedFile = process.argv[2];
const file = passedFile || 'script.js';
const outputFile = passedFile ? `${passedFile}_transformed.js` : 'transformed_script.js';
const code = fs.readFileSync(file, 'utf8');
const ast = babel.parse(code,);

// Apply transformations
replaceDictCalls(ast);
replaceVariableCallsWithValues(ast);
decodeListPlacements(ast);
decodeMagicNumberCalls(ast);
decodeHCalls(ast);


const transformedCode = generate(ast).code;
fs.writeFileSync(outputFile, transformedCode, 'utf8');
console.log(`Code transformed and written to ${outputFile}`);