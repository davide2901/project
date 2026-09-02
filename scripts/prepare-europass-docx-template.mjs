/**
 * Prepara il template Word Europass con placeholder docxtemplater.
 * Esegui: node scripts/prepare-europass-docx-template.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import PizZip from "pizzip";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const source = path.join(root, "public/templates/cv-europass-word.docx");
const target = path.join(root, "public/templates/cv-europass-template.docx");

const SUMMARY =
  "Ho esperienza di diversi anni come Assistente di direzione, amo il mio lavoro e mi piacerebbe mettermi alla prova in un altro settore. La vosra azienda mi interessa particolarmente. Sono attenta ed entusiasta, mi impegno per portare sempre a termine i miei progetti. Spero di poter condividere la mia esperienza con voi.";

const replacements = [
  ["Maria Rossi", "{full_name}"],
  ["maria.rossi@mail.com", "{email}"],
  ["marie.dupont@mail.com", "{email}"],
  ["maria.rossi/linkedin", "{linkedin}"],
  ["(+39) 666666666", "{phone}"],
  ["(+39) 06 06 06 06 06", "{phone}"],
  ["Milano, Italia", "{location}"],
  [SUMMARY, "{summary}"],
  [
    "LAUREA MAGISTRALE IN RELAZIONI INTERNAZIONALI – Università di Roma LA SAPIENZA",
    "{education_block}",
  ],
  ["2020 – Roma, Italia", ""],
  ["2018 – Roma, Italia", ""],
  [
    "DIPLOMA LICEO LINGUISTICO – Liceo classico statale B.Russell",
    "",
  ],
  [
    "ASSISTENTE DI DIREZIONE – CARREFOUR",
    "{work_block}",
  ],
  ["ASSISTENTE DI DIREZIONE– NIKE", ""],
  ["ASSISTENTE DI DIREZIONE–", ""],
  ["2022 – ATTUALE – Milano, Italia", ""],
  ["01/09/2020 – 05/03/2021 – Roma, Italia", ""],
  [
    "Organizzazione e archiviazione di pratiche e documenti di lavoro e personali.",
    "",
  ],
  ["Gestione e archiviazione della corrispondenza.", ""],
  ["Organizzazione meeting e affiancamento al Manager.", ""],
  ["Supporto a 360 all’Executive.", ""],
  ["Organizzazione Business Travel.", ""],
  [
    "Microsoft Word   |   Microsoft Excel   |   Power Point   |   Social Media   |   Outlook   |   Microsoft Powerpoint",
    "{digital_skills}",
  ],
  ["ITALIANO", "{language_mother}"],
  ["SPAGNOLO | INGLESE | FRANCESE", "{languages_other}"],
  ["SPAGNOLO", ""],
  ["INGLESE", ""],
  ["FRANCESE", ""],
  ["Patente di guida : B", "{additional}"],
  ["Patente di guida : B", "{additional}"],
  ["Nazionalità : Italiana", "Nazionalità : {nationality}"],
  ["Nazionalità", "Nazionalità"],
  ["©AZURIUS – Modeles-de-cv,com", ""],
  ["© Questi esempi di modelli gratuiti", ""],
];

const bytes = fs.readFileSync(source);
const zip = new PizZip(bytes);
let xml = zip.file("word/document.xml").asText();

for (const [from, to] of replacements) {
  if (!from) continue;
  xml = xml.split(from).join(to);
}

zip.file("word/document.xml", xml);
fs.writeFileSync(target, zip.generate({ type: "nodebuffer" }));
console.log("Template scritto:", target);
