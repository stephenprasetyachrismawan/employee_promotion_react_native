import * as XLSX from 'xlsx';
import { Criterion } from '../types';

export class ExcelHandler {
    /**
     * Generate Excel template based on current criteria
     */
    static async generateTemplate(criteria: Criterion[]): Promise<void> {
        const wb = XLSX.utils.book_new();

        const headers = ['Candidate Name', ...criteria.map(c => c.name)];
        const exampleRows = [
            [
                'John Doe',
                ...criteria.map(c => (c.dataType === 'SCALE' ? '3' : '75')),
            ],
            [
                'Jane Smith',
                ...criteria.map(c => (c.dataType === 'SCALE' ? '4' : '85')),
            ],
        ];

        const wsData = [headers, ...exampleRows];

        const instructions = [
            ['Employee Promotion Decision Support System - Data Template'],
            [''],
            ['Instructions:'],
            ['1. Fill in candidate names in the first column'],
            ['2. Fill in values for each criterion'],
            ['3. For NUMERIC criteria: Enter any positive number'],
            ['4. For SCALE criteria: Enter a number from 1 to 5'],
            ['5. Save the file and upload it in the app'],
            [''],
            ['Criteria Information:'],
            ['Criterion Name', 'Data Type', 'Impact Type'],
            ...criteria.map(c => [c.name, c.dataType, c.impactType]),
        ];

        const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
        const wsDataSheet = XLSX.utils.aoa_to_sheet(wsData);

        XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');
        XLSX.utils.book_append_sheet(wb, wsDataSheet, 'Candidate Data');

        const wbout = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
        const blob = new Blob([wbout], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'PromoteAI_Template.xlsx';
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

    /**
     * Parse Excel file and extract candidate data
     */
    static async parseExcelFile(
        source: string | File | Blob,
        criteria: Criterion[]
    ): Promise<{
        candidates: Array<{
            name: string;
            values: { criterionId: string; value: number }[];
        }>;
        errors: string[];
    }> {
        const errors: string[] = [];
        const candidates: Array<{
            name: string;
            values: { criterionId: string; value: number }[];
        }> = [];

        try {
            let buffer: ArrayBuffer;

            if (typeof source === 'string') {
                const response = await fetch(source);
                buffer = await response.arrayBuffer();
            } else {
                buffer = await source.arrayBuffer();
            }

            const wb = XLSX.read(buffer, { type: 'array' });

            const sheetName =
                wb.SheetNames.find(name => name === 'Candidate Data') || wb.SheetNames[0];
            const ws = wb.Sheets[sheetName];

            const data = XLSX.utils.sheet_to_json<any>(ws, { header: 1 });

            if (data.length < 2) {
                errors.push('Excel file must have at least a header row and one data row');
                return { candidates, errors };
            }

            const headers = data[0] as string[];

            if (headers[0] !== 'Candidate Name') {
                errors.push('First column must be "Candidate Name"');
            }

            const criteriaMap = new Map(criteria.map(c => [c.name, c]));

            for (let i = 1; i < data.length; i++) {
                const row = data[i] as any[];

                if (!row || row.length === 0) {
                    continue;
                }

                const candidateName = row[0]?.toString().trim();

                if (!candidateName) {
                    errors.push(`Row ${i + 1}: Candidate name is required`);
                    continue;
                }

                const values: { criterionId: string; value: number }[] = [];

                for (let j = 1; j < headers.length; j++) {
                    const criterionName = headers[j];
                    const criterion = criteriaMap.get(criterionName);

                    if (!criterion) {
                        errors.push(
                            `Row ${i + 1}: Criterion "${criterionName}" not found in current criteria`
                        );
                        continue;
                    }

                    const rawValue = row[j];

                    if (rawValue === undefined || rawValue === null || rawValue === '') {
                        errors.push(
                            `Row ${i + 1}: Missing value for criterion "${criterionName}"`
                        );
                        continue;
                    }

                    const value = parseFloat(rawValue.toString());

                    if (isNaN(value)) {
                        errors.push(
                            `Row ${i + 1}: Invalid number for criterion "${criterionName}"`
                        );
                        continue;
                    }

                    if (criterion.dataType === 'SCALE') {
                        if (value < 1 || value > 5 || !Number.isInteger(value)) {
                            errors.push(
                                `Row ${i + 1}: Value for "${criterionName}" must be an integer from 1 to 5`
                            );
                            continue;
                        }
                    } else if (value <= 0) {
                        errors.push(
                            `Row ${i + 1}: Value for "${criterionName}" must be positive`
                        );
                        continue;
                    }

                    values.push({
                        criterionId: criterion.id,
                        value,
                    });
                }

                if (values.length === criteria.length) {
                    candidates.push({
                        name: candidateName,
                        values,
                    });
                }
            }

            return { candidates, errors };
        } catch (error) {
            errors.push(`Failed to parse Excel file: ${error}`);
            return { candidates, errors };
        }
    }
}
