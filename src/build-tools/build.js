const {basename, extname, join, resolve} = require('path')
const matter = require('gray-matter')
const marked = require('marked')
const mkdirp = require('mkdirp')
const {sync} = require('glob')
const {copyFile, readFileSync, writeFileSync} = require('fs')

const srcPath = resolve('src')
const distPath = resolve('dist')

// Copy static CSS
const pageCSSStatic = join(srcPath, '/templates/index.css')
const pageCSSDist = join(distPath, '/index.css')
copyFile(pageCSSStatic, pageCSSDist, (err) => {
  if (err) throw err;
  console.log('Copied CSS to dist folder!');
});

// Copy static JS
const pageJSStatic = join(srcPath, '/templates/index.js')
const pageJSDist = join(distPath, '/index.js')
copyFile(pageJSStatic, pageJSDist, (err) => {
  if (err) throw err;
  console.log('Copied JS to dist folder!');
});

// Fill out special page-boxes and jump-bar
const pageTemplate =
	readFileSync(join(srcPath, '/templates/index.html'), 'utf8')
const pageBoxTemplate =
	readFileSync(join(srcPath, 'templates/page-box/index.html'), 'utf8')
const rebuttalTemplate =
	readFileSync(join(srcPath, 'templates/page-box/rebuttal.html'), 'utf8')
const jumpBarTemplate =
	readFileSync(join(srcPath, 'templates/jump-bar/index.html'), 'utf8')

let workingPage = pageTemplate.valueOf()
const convertVar = (template, varName, replacement='') =>
	template.replace(new RegExp(`<!-- var\\(${varName}\\) -->`, 'g'), replacement)
function replicateArray(array, n) {
	let arrays = Array.apply(null, new Array(n))
	arrays = arrays.map(_ => array)
	return [].concat.apply([], arrays)
}

const specialSections = sync(srcPath + '/templates/special-sections/*.md')
specialSections.forEach(filename => {
	const fileId = basename(filename, extname(filename))
	const rawMarkdown = readFileSync(filename, 'utf8')
	const parsed = matter(rawMarkdown)

	let workingPageBox = pageBoxTemplate.valueOf()
	workingPageBox = convertVar(workingPageBox, 'id', fileId)
	workingPageBox = convertVar(workingPageBox, 'title', parsed.data.title)
	const backgroundSpans = replicateArray(parsed.data['background-text'], 50)
		.map(question => `<span>${question}</span>`).join('\n')
	workingPageBox = convertVar(workingPageBox, 'background-text', backgroundSpans)
	workingPageBox = convertVar(workingPageBox, 'details', marked(parsed.content))

	workingPage = convertVar(workingPage, fileId, workingPageBox)
})
console.log("Added special sections!")

// FIXME
workingPage = convertVar(workingPage, 'jump-bar', jumpBarTemplate)
console.log("Added jump bar!")

// Fill out questions and answers
const questionsContent =
	Object.entries(
		JSON.parse(readFileSync(join(srcPath, 'content/q-and-a.json'), 'utf8')))
	.map(([key, value]) => ({ ...value, id: key }))
	.sort((a, b) => (a.title > b.title) ? 1 : -1)
const questionDivs = questionsContent.map(question => {
	let workingPageBox = pageBoxTemplate.valueOf()
	workingPageBox = convertVar(workingPageBox, 'id', question.id)
	workingPageBox = convertVar(workingPageBox, 'title', question.title)
	const backgroundSpans =
		replicateArray(question['background-text'], 50)
		.map(bgText => `<span>${bgText}</span>`).join('\n')
	workingPageBox = convertVar(workingPageBox, 'background-text', backgroundSpans)

	let workingRebuttal = rebuttalTemplate.valueOf()
	workingRebuttal = convertVar(workingRebuttal, 'tldr', question.tldr)
	workingRebuttal = convertVar(workingRebuttal, 'answer', question.answer.replace(/\\n/g, "<br />"))
	workingPageBox = convertVar(workingPageBox, 'details', workingRebuttal)

	return workingPageBox
})
workingPage = convertVar(workingPage, 'questions', questionDivs.join('\n'))
console.log("Added questions and answers!")

const outputFilename = join(distPath, "index.html")
mkdirp.sync(distPath)
writeFileSync(outputFilename, workingPage)
