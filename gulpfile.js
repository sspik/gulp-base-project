const gulp = require('gulp');
const gulpIf = require('gulp-if');
const sync = require('browser-sync');
const plumber = require('gulp-plumber');
const notify = require("gulp-notify");
const fileInclude = require('gulp-file-include');
const del = require('del');
const scss = require('gulp-sass');
const autoprefixer = require('gulp-autoprefixer');
const groupMedia = require('gulp-group-css-media-queries');
const cleanCss = require('gulp-clean-css');
const rename = require('gulp-rename');
const imagemin = require('gulp-imagemin');
const webp = require('gulp-webp');
const webpHtml = require('gulp-webp-html');
const webpCss = require('gulp-webp-css');
const svgSprite = require('gulp-svg-sprite');
const ttf2woff = require('gulp-ttf2woff');
const ttf2woff2 = require('gulp-ttf2woff2');
const otf2ttf = require('gulp-fonter');
const fontStyleWrite = require('./utils').fontStyle;
const webpack = require('webpack-stream');
const webpackConfig = require('./webpack.config');

const { src, dest } = gulp;

// apt-get install dh-autoreconf
// Конвертация изображений в webp и замена кода в html
const useWebp = true;

const projectFolder = "dist";
const sourceFolder = "src";

// Констанда определяющая путь к болванке стилей
// подключающих шрифты для автоматической генерации
const fontStylePath = `${sourceFolder}/scss/fonts.scss`

const path = {
  build:
    {
      html: `${projectFolder}/`,
      css: `${projectFolder}/css/`,
      js: `${projectFolder}/js/`,
      img: `${projectFolder}/img/`,
      fonts: `${projectFolder}/fonts/`,
    },
  src:
    {
      html: [
        `${sourceFolder}/*.html`,
        `!${sourceFolder}/@*.html`
      ],
      scss: `${sourceFolder}/scss/style.scss`,
      js: `${sourceFolder}/js/main.js`,
      img: `${sourceFolder}/img/**/*.{jpg,png,svg,gif,ico,webp}`,
      fonts: `${sourceFolder}/fonts/*.ttf`,
    },
  watch:
    {
      html: `${sourceFolder}/**/*.html`,
      scss: `${sourceFolder}/scss/**/*.scss`,
      js: `${sourceFolder}/js/**/*.js`,
      img: `${sourceFolder}/img/**/*.{jpg,png,svg,gif,ico,webp}`,
    },
  baseDir: `${projectFolder}/`,
  clean: `${projectFolder}/`,
  iconSpritePath: `${projectFolder}/svgSprite`
};

function browserSync() {
  /*
  *  Создаёт сервер и триггерит
  *  перезагрузку окна
  */
  sync.init({
    server: {
      baseDir: path.baseDir,
    },
    port: 3000,
    notify: false,
  });
}

function watchFiles() {
  /*
  *  Смотрит за изменением файлов
  *  по указанному пути
  */
  gulp.watch([ path.watch.js ], js);
  gulp.watch([ path.watch.html ], html);
  gulp.watch([ path.watch.scss ], css);
  gulp.watch([ path.watch.img ], images);
}

function clean() {
  /*
  *  Удаляет dist папку перед
  *  сборкой проекта
  */
  return del(path.clean)
}

function html() {
  /*
  *  Собирает файлы html, кладёт в dest
  *  и триггерит перезагрузку
  */
  return src(path.src.html)
    .pipe(plumber({
      errorHandler: notify.onError(function(err){
        return {
          title: 'html',
          message: err.message
        }
      })
    }))
    .pipe(fileInclude())           // собирает
    .pipe(gulpIf(                  // заменяет в html тег img под webp
      useWebp,
      webpHtml(),
    ))
    .pipe(dest(path.build.html))   // кладёт в dist
    .pipe(sync.stream())    // перезагружает страницу
}

function css() {
  /*
  *  Собирает scss файлы в css, кладёт
  *  в dest и триггерит перезагрузку
  */
  return src(path.src.scss)
    .pipe(plumber({
      errorHandler: notify.onError(function(err){
        return {
          title: 'scss',
          message: err.message
        }
      })
    }))
    .pipe(scss({                        // Собирает
      outputStyle: "expanded"
    }))
    .pipe(groupMedia())                         // Группировка и вынос в конец файла медиа запросов
    .pipe(autoprefixer({                // Добавляет автопрефиксы
      overrideBrowserslist: [
        "last 2 versions"
      ],
      cascade: true
    }))
    .pipe(gulpIf(                               // Добавляет webp стили к обычным. Работает хуёво
      useWebp,
      webpCss()
    ))
    .pipe(dest(path.build.css))                 // Кладёт в dist
    .pipe(cleanCss())                           // Минифицирует
    .pipe(rename({ extname: ".min.css" }))  // Переименовывает min.css
    .pipe(dest(path.build.css))                 // Кладёт минифицированный в dist
    .pipe(sync.stream())                 // Перезагружает страницу
}

function js() {
  /*
  *  Создаёт обычную и минифицированную версию main.js
  */
  return src(path.src.js)
    .pipe(plumber({
      errorHandler: notify.onError(function(err){
        return {
          title: 'js',
          message: err.message
        }
      })
    }))
    .pipe(webpack({       // скармливает entry файл в webpack
      config: webpackConfig,
    }))
    .pipe(dest(path.build.js))   // кладёт в dist
    .pipe(sync.stream())    // перезагружает страницу
}

function images() {
  /*
  *  Собирает файлы html, кладёт в dest
  *  и триггерит перезагрузку
  */
  return src(path.src.img)
    .pipe(gulpIf(
      useWebp,
      webp({              // Конвертирует в webp
        quality: 70
      })))
    .pipe(gulpIf(                 // кладёт в dist
      useWebp,
      dest(path.build.img)
    ))
    .pipe(gulpIf(                  // Опять берёт за исходник обычный формат
      useWebp,
      src(path.src.img)
    ))
    .pipe(imagemin({      // Оптимизирует изображения
      progressive: true,
      svgoPlugins: [{ removeViewBox: false }],
      interlaced: true,
      optimisationLevel: 3       // От 0 до 7
    }))
    .pipe(dest(path.build.img))   // кладёт в dist
}

function fonts(){
  /*
  *  Отдельный таск для конвертации шрифтов из ttf в woff и woff2
  */
  src(path.src.fonts)
    .pipe(ttf2woff())                 // Конвертирует в woff
    .pipe(dest(path.build.fonts))     // кладёт в dist
  return src(path.src.fonts)
    .pipe(ttf2woff2())                // Конвертирует в woff2
    .pipe(dest(path.build.fonts))     // кладёт в dist
}

gulp.task('svgSprite', function (){
  /*
  *  Отдельный таск для создания карты спрайтов
  */
  return gulp.src([`${path.iconSpritePath}/*.svg`])
    .pipe(svgSprite({   // Создаёт карту
      mode: {
        stack: {
          sprite: "../icons/icon.svg",
          // example: true   // Если нужен html пример для подключения
        }
      }
    }))
    .pipe(dest(path.build.img)) // Кладёт в dist
});

gulp.task('otf2ttf', function () {
  /*
  *  Отдельный таск для конвертирования otf в ttf
  */
  return src(([`${path.src.fonts}/*.otf`]))
    .pipe(otf2ttf({              // Конвертирует otf в ttf
      formats: ['ttf']
    }))
    .pipe(dest(path.src.fonts)) // кладёт в папку со шрифтами исходного кода
})

gulp.task('connectFonts', function fontStyle() {
  /*
  *  Отдельный таск для подключения шрифтов к стилям
  *  Логика тупая, нужно подправить имена шрифтов
  *  и жирность руками.
  */
  return new Promise((resolve, reject) => {
    try {
      fontStyleWrite(fontStylePath, `${sourceFolder}/fonts`);
      resolve();
    } catch (e) {
      reject(e);
    }
  })
})

const build = gulp.series( // Выполняемые функции во время сборки
  clean,            // Чистка dist
  gulp.parallel(
    html,           // Сборка html
    css,            // Сборка css
    images,         // Оптимизация изображений
    fonts,          // Конвертирование шрифтов
  ),
  js,             // Сборка js

)
const watch = gulp.parallel(build, watchFiles, browserSync);



// exports.js = js;
// exports.css = css;
// exports.html = html;
// exports.build = build;
// exports.watch = watch;
exports.default = watch;
