import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType } from 'docx'
import { saveAs } from 'file-saver'

export const generateWordReport = async (records: ServiceRecord[]) => {
    const doc = new Document({
        sections: [{
            properties: {},
            children: [
                new Paragraph({
                    children: [
                        new TextRun({
                            text: "Service Record Report",
                            bold: true,
                            size: 32,
                        }),
                    ],
                    spacing: { after: 400 },
                }),
                new Table({
                    width: {
                        size: 100,
                        type: WidthType.PERCENTAGE,
                    },
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Start Time", bold: true })] })] }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "End Time", bold: true })] })] }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Municipalities", bold: true })] })] }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Diets", bold: true })] })] }),
                            ],
                        }),
                        ...records.map(record => {
                            const municipalities = record.displacements.map(d => d.municipality).join(', ')
                            const diets = `Lunch: ${record.displacements.filter(d => d.hasLunch).length}, Dinner: ${record.displacements.filter(d => d.hasDinner).length}`

                            return new TableRow({
                                children: [
                                    new TableCell({ children: [new Paragraph(new Date(record.startTime).toLocaleString())] }),
                                    new TableCell({ children: [new Paragraph(new Date(record.endTime).toLocaleString())] }),
                                    new TableCell({ children: [new Paragraph(municipalities)] }),
                                    new TableCell({ children: [new Paragraph(diets)] }),
                                ],
                            })
                        })
                    ],
                }),
            ],
        }],
    })

    const blob = await Packer.toBlob(doc)
    saveAs(blob, `service-report-${new Date().toISOString().split('T')[0]}.docx`)
}
