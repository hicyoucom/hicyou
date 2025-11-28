import fs from 'fs';
import path from 'path';

const sqlFilePath = path.join(process.cwd(), 'postgres.sql');
const outputFilePath = path.join(process.cwd(), 'db/seed-data.json');

function parseSqlValue(value: string): any {
    if (value === 'NULL') return null;
    if (value.startsWith("'") && value.endsWith("'")) {
        let content = value.slice(1, -1);
        // Unescape single quotes: '' -> '
        content = content.replace(/''/g, "'");
        return content;
    }
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (!isNaN(Number(value))) return Number(value);
    return value;
}

function extractInsertValues(sqlContent: string, tableName: string): any[] {
    const insertRegex = new RegExp(`INSERT INTO "${tableName}" \\(([^)]+)\\) VALUES\\s*([\\s\\S]+?);`, 'g');
    const match = insertRegex.exec(sqlContent);

    if (!match) {
        console.log(`No INSERT statement found for table ${tableName}`);
        return [];
    }

    const columns = match[1].split(',').map(c => c.trim().replace(/"/g, ''));
    const valuesBlock = match[2];

    const rows: any[] = [];
    let currentRow = '';
    let inQuote = false;
    let depth = 0;

    for (let i = 0; i < valuesBlock.length; i++) {
        const char = valuesBlock[i];

        if (char === '(' && !inQuote) {
            depth++;
            if (depth === 1) currentRow = '';
            else currentRow += char;
        } else if (char === ')' && !inQuote) {
            depth--;
            if (depth === 0) {
                // Parse the row
                const values: string[] = [];
                let currentValue = '';
                let rowInQuote = false;

                for (let j = 0; j < currentRow.length; j++) {
                    const rChar = currentRow[j];
                    if (rChar === "'" && (j === 0 || currentRow[j - 1] !== "'")) { // Simplified quote handling
                        // This simple parser might fail on complex nested quotes, but let's try a split approach first
                    }
                }

                // Regex split is safer for SQL values list: split by comma, ignoring commas inside quotes
                // But regex is hard. Let's use a simpler state machine for the row content.
                const rowValues: string[] = [];
                let valBuffer = '';
                let valInQuote = false;

                for (let j = 0; j < currentRow.length; j++) {
                    const c = currentRow[j];
                    if (c === "'") {
                        // Check if it's an escaped quote ('')
                        if (valInQuote && j + 1 < currentRow.length && currentRow[j + 1] === "'") {
                            valBuffer += "''";
                            j++; // Skip next quote
                        } else {
                            valInQuote = !valInQuote;
                            valBuffer += c;
                        }
                    } else if (c === ',' && !valInQuote) {
                        rowValues.push(valBuffer.trim());
                        valBuffer = '';
                    } else {
                        valBuffer += c;
                    }
                }
                rowValues.push(valBuffer.trim());

                const rowObj: any = {};
                columns.forEach((col, idx) => {
                    if (idx < rowValues.length) {
                        rowObj[col] = parseSqlValue(rowValues[idx]);
                    }
                });
                rows.push(rowObj);
            } else {
                currentRow += char;
            }
        } else {
            if (char === "'") {
                // Check for escaped quote
                if (inQuote && i + 1 < valuesBlock.length && valuesBlock[i + 1] === "'") {
                    currentRow += "''";
                    i++;
                } else {
                    inQuote = !inQuote;
                    currentRow += char;
                }
            } else {
                currentRow += char;
            }
        }
    }

    return rows;
}

async function main() {
    try {
        const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');

        const categories = extractInsertValues(sqlContent, 'categories');
        console.log(`Extracted ${categories.length} categories`);

        const bookmarks = extractInsertValues(sqlContent, 'bookmarks');
        console.log(`Extracted ${bookmarks.length} bookmarks`);

        // Transform data to match schema if necessary
        // Schema expects camelCase, SQL has snake_case columns.
        // The extract function uses column names from SQL which are quoted "id", "name", etc.
        // Let's check schema.ts to see mapping.
        // categories: id, name, description, slug, color, icon, sortOrder (sort_order), createdAt (created_at), updatedAt (updated_at)
        // bookmarks: id, url, title, slug, description, categoryId (category_id), tags, ... pricingType (pricing_type), ...

        const toCamelCase = (str: string) => {
            return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        };

        const transformKeys = (rows: any[]) => {
            return rows.map(row => {
                const newRow: any = {};
                for (const key in row) {
                    newRow[toCamelCase(key)] = row[key];
                }
                return newRow;
            });
        };

        const finalData = {
            categories: transformKeys(categories),
            bookmarks: transformKeys(bookmarks)
        };

        fs.writeFileSync(outputFilePath, JSON.stringify(finalData, null, 2));
        console.log(`Successfully wrote data to ${outputFilePath}`);

    } catch (error) {
        console.error('Error extracting SQL data:', error);
    }
}

main();
