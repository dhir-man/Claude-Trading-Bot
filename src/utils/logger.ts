import chalk from "chalk";

function ts(): string {
  return new Date().toISOString().slice(11, 23);
}

export const log = {
  info:    (msg: string) => console.log(`${chalk.gray(ts())} ${chalk.cyan("INFO")}  ${msg}`),
  warn:    (msg: string) => console.log(`${chalk.gray(ts())} ${chalk.yellow("WARN")}  ${msg}`),
  error:   (msg: string) => console.log(`${chalk.gray(ts())} ${chalk.red("ERR ")}  ${msg}`),
  success: (msg: string) => console.log(`${chalk.gray(ts())} ${chalk.green("OK  ")}  ${msg}`),
  dim:     (msg: string) => console.log(chalk.gray(`${ts()} ${msg}`)),
  section: (title: string) => {
    console.log("");
    console.log(chalk.bold.white("─".repeat(60)));
    console.log(chalk.bold.white(`  ${title}`));
    console.log(chalk.bold.white("─".repeat(60)));
  },
};
