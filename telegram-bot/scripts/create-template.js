/**
 * Generator: writes Шаблон_статьи_АНО_Единый_Мир.docx in telegram-bot/.
 * Run from telegram-bot/: node scripts/create-template.js
 */
const fs = require("fs");
const path = require("path");
const JSZip = require("jszip");

const root = path.join(__dirname, "..");

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function cell(text) {
  return `<w:tc><w:tcPr><w:tcW w:w="5000" w:type="dxa"/></w:tcPr><w:p><w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p></w:tc>`;
}

const rows = [
  ["Заголовок", ""],
  ["Автор", ""],
  ["Рубрика", ""],
  ["Регион", ""],
  ["Формат", ""],
  ["Аннотация", ""],
];

let tbl = '<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/></w:tblPr>';
for (const [k, v] of rows) {
  tbl += `<w:tr>${cell(k)}${cell(v)}</w:tr>`;
}
tbl += "</w:tbl>";

const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<w:body>
<w:p><w:r><w:t>ШАБЛОН СТАТЬИ — АНО «Единый Мир»</w:t></w:r></w:p>
<w:p><w:r><w:t>Заполните таблицу ниже и напишите текст статьи под таблицей. Первое изображение в тексте станет обложкой.</w:t></w:r></w:p>
${tbl}
<w:p><w:r><w:t>Текст статьи начинается здесь.</w:t></w:r></w:p>
</w:body>
</w:document>`;

async function main() {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
  );

  zip.folder("_rels").file(
    ".rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
  );

  zip.folder("word").file("document.xml", documentXml);
  zip.folder("word").folder("_rels").file(
    "document.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>
`,
  );

  const buf = await zip.generateAsync({ type: "nodebuffer" });
  const out = path.join(root, "Шаблон_статьи_АНО_Единый_Мир.docx");
  fs.writeFileSync(out, buf);
  console.log("Wrote", out);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
