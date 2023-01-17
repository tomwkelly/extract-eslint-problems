const core = require("@actions/core");
const github = require("@actions/github");
const sloc = require("node-sloc");
const { exec } = require("child_process");

const formatter = `module.exports = function(results){
  const r = results.reduce((acc, cur) => {
    return [ acc[0] + cur.warningCount, acc[1] + cur.errorCount ]
  }, [0,0]);
  return JSON.stringify({warnings: r[0], errors: r[1]});
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
  }

  exec(`echo '${formatter}' > formatter.cjs`);

  const path = core.getInput("path");
  const ignore = core.getInput("ignore");

  sloc({
    path,
    ignorePaths: ignore,
    extensions: ["js", "ts"],
    ignoreDefault: true,
  }).then((locres) => {
    const tloc = locres.loc;
    exec(
      `npm_config_yes=true npx eslint ${path} --ignore-pattern ${ignore} -f ./formatter.cjs`,
      (_, out) => {
        const o = JSON.parse(out);

        const score = Math.max(
          0,
          10.0 - ((5 * o.errors + o.warnings) / tloc) * 10
        ).toFixed(1);

        core.setOutput("warnings", o.warnings);
        core.setOutput("errors", o.errors);
        core.setOutput("problems", o.warnings + o.errors);
        core.setOutput("score", score);
      }
    );
  });
} catch (error) {
  core.setFailed(error.message);
}
