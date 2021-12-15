
// prevent ssl verify because some let's encrypt ssls cannot be validated
process.env["​NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

const processa = require('./mainmt.js') /* the current working directory so that means main.js because of package.json */

let theFile = process.argv[2] /* what the user enters as first argument */
let theDir = process.argv[3] /* what the user enters as first argument */

// start application
processa(theFile, theDir);

