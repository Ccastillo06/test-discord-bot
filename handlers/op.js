const Parser = require('expr-eval').Parser;

const parser = new Parser();

// Command example: !!op>1+1*2-5/5
// Command example: !!op>1+x*3,x=5
function handler(message, args) {
  try {
    const [operation, ...rest] = args[0].split(',');;
    const parsed = parser.parse(operation);
    const params = rest.reduce((acc, next) => {
      const [varName, value] = next.split('=');
      return {
        ...acc,
        [varName]: value,
      };
    }, {});

    const evaluated = parsed.evaluate(params);
    message.reply(`Your operation results in ${evaluated} 🤖`);
  } catch (err) {
    message.reply(`Error calculating your operation 😭`);
  }
}

module.exports = handler;
