import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = path.dirname(fileURLToPath(import.meta.url));
const workbook = Workbook.create();

const navy = "#0F172A";
const blue = "#1D4ED8";
const lightBlue = "#DBEAFE";
const green = "#D1FAE5";
const amber = "#FEF3C7";
const border = "#CBD5E1";
const gray = "#F8FAFC";
const text = "#0F172A";

function styleTitle(sheet, range, title, subtitle) {
  sheet.showGridLines = false;
  sheet.getRange(range).merge();
  sheet.getRange(range).values = [[title]];
  sheet.getRange(range).format = {
    fill: navy,
    font: { bold: true, color: "#FFFFFF", size: 16 },
    horizontalAlignment: "center",
    verticalAlignment: "center",
  };
  sheet.getRange(range).format.rowHeight = 28;
  if (subtitle) {
    sheet.getRange("A2").values = [[subtitle]];
    sheet.getRange("A2").format = { font: { color: "#475569", italic: true } };
  }
}

function styleHeader(range) {
  range.format = {
    fill: navy,
    font: { bold: true, color: "#FFFFFF" },
    horizontalAlignment: "center",
    verticalAlignment: "center",
    wrapText: true,
    borders: { preset: "all", style: "thin", color: navy },
  };
}

function styleEditable(range) {
  range.format = {
    fill: "#FFFFFF",
    borders: { preset: "all", style: "thin", color: border },
    verticalAlignment: "center",
  };
}

function styleFormula(range) {
  range.format = {
    fill: lightBlue,
    borders: { preset: "all", style: "thin", color: border },
    font: { color: text },
  };
}

function setColWidths(sheet, widths) {
  widths.forEach((width, i) => {
    sheet.getRangeByIndexes(0, i, 120, 1).format.columnWidth = width;
  });
}

function applyNumberFormats(sheet, ranges) {
  for (const [range, format] of ranges) {
    sheet.getRange(range).format.numberFormat = format;
  }
}

const lista = workbook.worksheets.add("Pasar lista");
styleTitle(
  lista,
  "A1:N1",
  "EXCOMERCAFE SA DE CV - CONTROL DE ASISTENCIA",
  "Uso: escribe hora de entrada/salida y llena extras solo cuando aplique."
);
lista.getRange("A3:N3").merge();
lista.getRange("A3:N3").values = [["Hora recomendada: usa formato 07:00 AM, 05:00 PM o 17:00. Las horas trabajadas se calculan solas."]];
lista.getRange("A3:N3").format = { fill: amber, font: { bold: true, color: "#92400E" }, horizontalAlignment: "center" };

lista.getRange("A5:N5").values = [[
  "Fecha",
  "Empleado",
  "Area / cargo",
  "Entrada",
  "Salida",
  "Horas trabajadas",
  "Extra diurna",
  "Extra nocturna",
  "Asueto",
  "Domingo dia",
  "Domingo noche",
  "Total extras",
  "Observaciones",
  "Firma"
]];
styleHeader(lista.getRange("A5:N5"));
styleEditable(lista.getRange("A6:E105"));
styleEditable(lista.getRange("G6:K105"));
styleEditable(lista.getRange("M6:N105"));
styleFormula(lista.getRange("F6:F105"));
styleFormula(lista.getRange("L6:L105"));
lista.getRange("F6").formulas = [["=IF(OR(D6=\"\",E6=\"\"),\"\",MOD(E6-D6,1)*24)"]];
lista.getRange("F6:F105").fillDown();
lista.getRange("L6").formulas = [["=SUM(G6:K6)"]];
lista.getRange("L6:L105").fillDown();
lista.getRange("A106:E106").merge();
lista.getRange("A106:E106").values = [["TOTALES"]];
lista.getRange("A106:N106").format = { fill: green, font: { bold: true }, borders: { preset: "all", style: "thin", color: border } };
lista.getRange("F106").formulas = [["=SUM(F6:F105)"]];
lista.getRange("G106:L106").formulas = [["=SUM(G6:G105)", "=SUM(H6:H105)", "=SUM(I6:I105)", "=SUM(J6:J105)", "=SUM(K6:K105)", "=SUM(L6:L105)"]];
applyNumberFormats(lista, [
  ["A6:A105", "yyyy-mm-dd"],
  ["D6:E105", "h:mm AM/PM"],
  ["F6:L106", "0.00"],
]);
setColWidths(lista, [12, 28, 20, 12, 12, 13, 11, 12, 10, 11, 12, 11, 24, 18]);
lista.getRange("A5:N106").format.borders = { preset: "all", style: "thin", color: border };
lista.freezePanes.freezeRows(5);
lista.freezePanes.freezeColumns(2);

const rastra = workbook.worksheets.add("Rastra dia noche");
styleTitle(
  rastra,
  "A1:L1",
  "EXCOMERCAFE SA DE CV - CONTROL DE RASTRA DIA / NOCHE",
  "Uso exclusivo para PACHECO CEA, JOSE ERNESTO y PALACIOS AREVALO, JUAN ALBERTO."
);
rastra.getRange("A3:L3").merge();
rastra.getRange("A3:L3").values = [["Las columnas Rastra dia y Rastra noche se llenan manualmente con las horas que correspondan."]];
rastra.getRange("A3:L3").format = { fill: amber, font: { bold: true, color: "#92400E" }, horizontalAlignment: "center" };
rastra.getRange("A5:L5").values = [[
  "Fecha",
  "Empleado",
  "Turno",
  "Entrada",
  "Salida",
  "Horas calculadas",
  "Rastra dia",
  "Rastra noche",
  "Total rastra",
  "Ruta / placa",
  "Observaciones",
  "Firma"
]];
styleHeader(rastra.getRange("A5:L5"));
styleEditable(rastra.getRange("A6:E85"));
styleEditable(rastra.getRange("G6:H85"));
styleEditable(rastra.getRange("J6:L85"));
styleFormula(rastra.getRange("F6:F85"));
styleFormula(rastra.getRange("I6:I85"));
rastra.getRange("B6:B7").values = [["PACHECO CEA, JOSE ERNESTO"], ["PALACIOS AREVALO, JUAN ALBERTO"]];
rastra.getRange("F6").formulas = [["=IF(OR(D6=\"\",E6=\"\"),\"\",MOD(E6-D6,1)*24)"]];
rastra.getRange("F6:F85").fillDown();
rastra.getRange("I6").formulas = [["=SUM(G6:H6)"]];
rastra.getRange("I6:I85").fillDown();
rastra.getRange("A86:E86").merge();
rastra.getRange("A86:E86").values = [["TOTALES"]];
rastra.getRange("A86:L86").format = { fill: green, font: { bold: true }, borders: { preset: "all", style: "thin", color: border } };
rastra.getRange("F86").formulas = [["=SUM(F6:F85)"]];
rastra.getRange("G86:I86").formulas = [["=SUM(G6:G85)", "=SUM(H6:H85)", "=SUM(I6:I85)"]];
rastra.getRange("B6:B85").dataValidation = { rule: { type: "list", values: ["PACHECO CEA, JOSE ERNESTO", "PALACIOS AREVALO, JUAN ALBERTO"] } };
rastra.getRange("C6:C85").dataValidation = { rule: { type: "list", values: ["Dia", "Noche", "Mixto"] } };
applyNumberFormats(rastra, [
  ["A6:A85", "yyyy-mm-dd"],
  ["D6:E85", "h:mm AM/PM"],
  ["F6:I86", "0.00"],
]);
setColWidths(rastra, [12, 30, 12, 12, 12, 13, 11, 12, 11, 20, 24, 18]);
rastra.getRange("A5:L86").format.borders = { preset: "all", style: "thin", color: border };
rastra.freezePanes.freezeRows(5);
rastra.freezePanes.freezeColumns(2);

const resumen = workbook.worksheets.add("Resumen");
styleTitle(resumen, "A1:H1", "RESUMEN DE HORAS", "Resumen automatico de asistencia y rastra.");
resumen.getRange("A3:B3").values = [["Concepto", "Horas"]];
styleHeader(resumen.getRange("A3:B3"));
resumen.getRange("A4:B10").values = [
  ["Horas trabajadas asistencia", null],
  ["Extra diurna", null],
  ["Extra nocturna", null],
  ["Asueto", null],
  ["Domingo dia", null],
  ["Domingo noche", null],
  ["Total extras asistencia", null],
];
resumen.getRange("B4:B10").formulas = [
  ["='Pasar lista'!F106"],
  ["='Pasar lista'!G106"],
  ["='Pasar lista'!H106"],
  ["='Pasar lista'!I106"],
  ["='Pasar lista'!J106"],
  ["='Pasar lista'!K106"],
  ["='Pasar lista'!L106"],
];
resumen.getRange("D3:H3").values = [["Empleado rastra", "Horas calculadas", "Rastra dia", "Rastra noche", "Total rastra"]];
styleHeader(resumen.getRange("D3:H3"));
resumen.getRange("D4:D5").values = [["PACHECO CEA, JOSE ERNESTO"], ["PALACIOS AREVALO, JUAN ALBERTO"]];
resumen.getRange("E4:H4").formulas = [[
  "=SUMIF('Rastra dia noche'!$B$6:$B$85,D4,'Rastra dia noche'!$F$6:$F$85)",
  "=SUMIF('Rastra dia noche'!$B$6:$B$85,D4,'Rastra dia noche'!$G$6:$G$85)",
  "=SUMIF('Rastra dia noche'!$B$6:$B$85,D4,'Rastra dia noche'!$H$6:$H$85)",
  "=SUMIF('Rastra dia noche'!$B$6:$B$85,D4,'Rastra dia noche'!$I$6:$I$85)"
]];
resumen.getRange("E4:H5").fillDown();
resumen.getRange("A4:B10").format = { fill: gray, borders: { preset: "all", style: "thin", color: border } };
resumen.getRange("D4:H5").format = { fill: gray, borders: { preset: "all", style: "thin", color: border } };
resumen.getRange("B4:B10").format.numberFormat = "0.00";
resumen.getRange("E4:H5").format.numberFormat = "0.00";
setColWidths(resumen, [30, 14, 4, 30, 15, 12, 13, 12]);
resumen.freezePanes.freezeRows(3);

const scans = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "formula error scan",
});
console.log(scans.ndjson);

for (const sheetName of ["Pasar lista", "Rastra dia noche", "Resumen"]) {
  const preview = await workbook.render({ sheetName, autoCrop: "all", scale: 1, format: "png" });
  await fs.writeFile(`${outputDir}/preview_${sheetName.replaceAll(" ", "_")}.png`, new Uint8Array(await preview.arrayBuffer()));
}

await fs.mkdir(outputDir, { recursive: true });
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(`${outputDir}/Control_asistencia_y_rastra_EXCOMERCAFE.xlsx`);
