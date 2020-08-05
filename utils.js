const fs = require('fs');
const readline = require('readline');

function fontStyle(fontStylePath, fontsPath) {

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });


  function rewriteStyles() {
    fs.writeFile(fontStylePath, '', (err) => {
      if (err) throw err;
    });
    fs.readdir(fontsPath, (err, fontFiles) => {
      if (err) throw err;
      fontFiles.forEach(font => {
        const [fontName, ext] = font.split('.');
        if (!['ttf', 'woff', 'woff2', 'otf'].includes(ext)) return;
        fs.appendFile(
          fontStylePath,
          `@include font("${fontName}", "${fontName}", "400", "normal");\r\n`,
          (err) => {
            if (err) throw err;
            console.log(`Шрифт ${font} записан в ${fontStylePath}`)
          }
        )
      })
    })
  }

  let styleFileContent = fs.readFileSync(fontStylePath);
  if (styleFileContent) {
    rl.question('Перезаписать styles.scss? y/N: ', (answer) => {
      if (answer.trim() === 'y'){
        rewriteStyles();
      }
      rl.close();
    })
  }
}

module.exports.fontStyle = fontStyle;
