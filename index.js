#!/usr/bin/env node

const program = require('commander');
const fs = require('fs');
const MarkdownIt = require('markdown-it');
const md = new MarkdownIt();
const path = require('path');

const package = require('./package.json');
const axios = require('axios').default;
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const extensionFile = file => {
  return file.split('.').pop();
};

const getFiles = (dirName, files) => {
  const extFile = extensionFile(dirName)
  if (extFile === 'md') {
    return [dirName];
  } else {
    return fs.readdirSync(dirName).reduce((pathFiles, file) => {
      const pathFile = path.join(dirName, file);
      if (fs.statSync(pathFile).isDirectory()) {
          getFiles(pathFile, pathFiles);
      } else if (extensionFile(file) == 'md') {
          pathFiles.push(pathFile);
      }
      return pathFile;
    }, files || []);
  }
};

const convertToHtml = file => {
  return md.render(fs.readFileSync(file, 'utf-8'));
};

const getLinks = files => {
  let links = [];
  for (let file of files) {
    const content = convertToHtml(file);
    const dom = new JSDOM(`<!DOCTYPE html>${content}</html>`);
    const linksDom = dom.window.document.querySelectorAll("a")
    
    linksDom.forEach(link => {
      if (link.href.match(/(https?:\/\/.*)+/g)) {
        links.push({ href: link.href, content: link.textContent, file: file })
      }
    });
  }
  return links;
};

const validateLinks = files => {
  return new Promise(resolve => {
    Promise.all(
      files.map(file => axios.get(file.href))
    ).then(response => {
      resolve(
        files.map((file, i) => {
          file.statusCode = response[i].status;
          file.statusText = response[i].statusText;
          return file;
        })
      );
    });
  });
};

const mdLinks = (pathFile, { validate, stats, contentMd }) => {
  return new Promise((resolve, reject) => {
    !pathFile ? reject('Informe uma pasta ou um arquivo para fazer a validação') : "";

    const files = getFiles(pathFile);
    const links = getLinks(files);

    if (!validate && !stats) {
      return resolve(links);
    } else if (validate && !stats) {
      const validLinks = validateLinks(links)
      validLinks.then(results => {
        return resolve(results)
      })
    } else if (!validate && stats) {
      let linksUnique = {}
      for (let link of links) {
        linksUnique[link.href] = link.href
      }
      resolve({ 
        total: links.length, 
        unique: Object.keys(linksUnique).length
      })
    } else if (validate && stats) {
      const validLinks = validateLinks(links)
      validLinks.then(results => {
        let linksUnique = {}
        for (let link of links) {
          linksUnique[link.href] = link.href
        }
        resolve({ 
          total: links.length, 
          unique: Object.keys(linksUnique).length, 
          broken: results.filter(v => { return v.statusText=='OK' } ).length
        })
      })
    }

  })
};

program.version(package.version);

program.command('read [path-to-file]')
.description('Lê o conteúdo de um path')
.option('-v, --validate [validate]', 'Valida os links do conteudo do arquivo')
.option('-s, --stats [stats]', 'Statistica de links do conteudo do arquivo')
.action((pathFile, options) => {
  new Promise((resolve, reject) => {

    if (!pathFile) {
      return reject('Erro precisa informar o parametro [path-to-file] "arquivo.md" para leitura.')
    }

    mdLinks(pathFile, { validate: options.validate, stats: options.stats }).then(result => {
      resolve(result)
    })

  }).then(result => {
    console.log(result)
  }).catch(err => {
    console.log(err)
  })
});

module.exports = mdLinks

if (process.argv.length > 1) {
  program.parse(process.argv);
}

