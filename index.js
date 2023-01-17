const core = require("@actions/core");
const github = require("@actions/github");
const { exec } = require("child_process");

const formatter = `module.exports = function(results){
  const r = results.reduce((acc, cur) => {
    return [ acc[0] + cur.warningCount, acc[1] + cur.errorCount ]
  }, [0,0]);
  return {warnings: r[0], errors: r[1]};
}`;

try {
  const createDefault = core.getBooleanInput("create-default");
  if (createDefault) {
    const useSemicolons = core.getBooleanInput("use-semicolons");
    const standard = useSemicolons ? "semistandard" : "standard";
    exec(`echo '{ "extends": "${standard}" }' > .eslintrc`);

    exec(
      `npm install --save-dev eslint-config-${standard} eslint-plugin-promise eslint-plugin-import eslint-plugin-n`
    );
  } else {
    exec("npm install");
  }
  exec("npm i -g eslint");
  exec(`echo '${formatter}' > formatter.cjs`);

  const files = JSON.parse(core.getInput("files")).join(" ");

  exec(`eslint ${files} -f ./formatter.cjs`, (e, out) => {
    if (e) throw e;
    const o = JSON.parse(out);
    core.setOutput("warnings", o.warnings);
    core.setOutput("errors", o.errors);
    core.setOutput("problems", o.warnings + o.errors);
  });
} catch (error) {
  core.setFailed(error.message);
}