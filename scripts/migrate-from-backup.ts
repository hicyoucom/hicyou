import fs from 'fs';
import path from 'path';
import { db } from '../db/client';
import { categories, bookmarks } from '../db/schema';
import { sql } from 'drizzle-orm';

async function migrate() {
    const backupPath = path.join(process.cwd(), 'backup.sql');
    const content = fs.readFileSync(backupPath, 'utf-8');
    const lines = content.split('\n');

    console.log('Starting migration...');

    // 1. Migrate Categories
    console.log('Migrating categories...');
    const categoryInserts = lines.filter(line => line.startsWith('INSERT INTO categories'));

    for (const line of categoryInserts) {
        // Parse values: INSERT INTO categories VALUES(id, 'name', 'description', 'slug', 'color', 'icon', created_at, updated_at, rank);
        // But looking at the grep output, the actual format is:
        // VALUES(id, 'name', 'description', 'slug', 'color', 'icon', 'created_at', updated_at, rank)
        // Let me check the exact order from the grep result:
        // VALUES(6,'Productivity','Discover...','productivity','#f1c40f','Package','2025-11-17 14:54:28',NULL,0);
        // So: id, name, description, slug, color, icon, createdAt, updatedAt, rank

        const match = line.match(/VALUES\((.*)\);/);
        if (!match) continue;

        const valuesStr = match[1];
        const values = parseSqlValues(valuesStr);

        if (values.length < 9) {
            console.error('Skipping invalid category line:', line.substring(0, 100));
            continue;
        }

        const id = parseInt(values[0]);
        const name = cleanString(values[1]);
        const description = cleanString(values[2]);
        const slug = cleanString(values[3]);
        const color = cleanString(values[4]);
        const icon = cleanString(values[5]);
        // createdAt is a date string like '2025-11-17 14:54:28'
        const createdAt = values[6] && values[6] !== 'NULL' ? new Date(cleanString(values[6])!) : new Date();
        const updatedAt = values[7] && values[7] !== 'NULL' ? new Date(cleanString(values[7])!) : null;
        const rank = values[8] && values[8] !== 'NULL' ? parseInt(values[8]) : 0;

        try {
            await db.insert(categories).values({
                id: id,
                name: name!,
                slug: slug!,
                description: description,
                color: color,
                icon: icon,
                sortOrder: rank, // Map rank to sortOrder
                createdAt: createdAt,
                updatedAt: updatedAt,
            }).onConflictDoNothing();
            console.log(`Inserted category: ${name}`);
        } catch (e) {
            console.error(`Failed to insert category ${name}:`, e);
        }
    }

    // 2. Migrate Bookmarks
    console.log('Migrating bookmarks...');
    const bookmarkInserts = lines.filter(line => line.startsWith('INSERT INTO bookmarks'));

    for (const line of bookmarkInserts) {
        const match = line.match(/VALUES\((.*)\);/);
        if (!match) continue;

        const valuesStr = match[1];
        const values = parseSqlValues(valuesStr);

        // Schema: id, url, title, description, category_id, tags, favicon, screenshot, overview, og_image, og_title, og_description, created_at, updated_at, last_visited, notes, is_archived, is_favorite, slug, search_results, is_dofollow, why_startups, alternatives, pricing_type
        // Total 24 columns based on schema view, but let's verify index from backup.sql CREATE TABLE
        // CREATE TABLE `bookmarks` (id, url, title, description, category_id, tags, favicon, screenshot, overview, og_image, og_title, og_description, created_at, updated_at, last_visited, notes, is_archived, is_favorite, slug, search_results, is_dofollow, why_startups, alternatives, pricing_type)

        // values array index mapping:
        // 0: id
        // 1: url
        // 2: title
        // 3: description
        // 4: category_id
        // 5: tags
        // 6: favicon
        // 7: screenshot
        // 8: overview
        // 9: og_image
        // 10: og_title
        // 11: og_description
        // 12: created_at
        // 13: updated_at
        // 14: last_visited
        // 15: notes
        // 16: is_archived
        // 17: is_favorite
        // 18: slug
        // 19: search_results
        // 20: is_dofollow
        // 21: why_startups
        // 22: alternatives
        // 23: pricing_type

        if (values.length < 24) {
            console.warn(`Skipping bookmark line with unexpected column count (${values.length}):`, line.substring(0, 50) + '...');
            // continue; // Try to proceed or inspect?
            // The backup might have `replace(...)` functions which break simple splitting.
            // Example: replace('...','\n',char(10))
            // My simple parser needs to handle function calls or I need to pre-process the file to remove them.
            // The replace is used for newlines. I can probably just replace `replace(..., char(10))` with the string content containing \n.
            // Or better, just execute the SQL if possible? No, syntax differs.
            // I will improve the parser to handle nested parens for `replace(...)` or just strip it.
        }

        try {
            const id = parseInt(values[0]);
            const url = cleanString(values[1]);
            const title = cleanString(values[2]);
            const description = cleanString(values[3]);
            const categoryId = values[4] === 'NULL' ? null : parseInt(values[4]);
            // ... map other fields

            // Let's use a more robust approach for values parsing if possible, or just map indices carefully.
            // Given the complexity of `replace(...)` in SQL dump, a regex parser is risky.
            // However, for this task, I'll try to handle the specific `replace` pattern seen in the file.

            // Value mapping
            const bookmarkData = {
                id: id,
                url: url,
                title: title,
                description: description,
                categoryId: categoryId,
                tags: cleanString(values[5]),
                favicon: cleanString(values[6]),
                screenshot: cleanString(values[7]),
                overview: cleanString(values[8]), // This often has the replace() call
                ogImage: cleanString(values[9]),
                ogTitle: cleanString(values[10]),
                ogDescription: cleanString(values[11]),
                createdAt: values[12] !== 'NULL' ? new Date(parseInt(values[12])) : new Date(),
                updatedAt: values[13] !== 'NULL' ? new Date(parseInt(values[13])) : new Date(),
                // lastVisited: 14
                // notes: 15
                isArchived: values[16] === '1' || values[16] === 'true',
                isFavorite: values[17] === '1' || values[17] === 'true',
                slug: cleanString(values[18]),
                // search_results: 19
                isDofollow: values[20] === '1' || values[20] === 'true',
                whyStartups: cleanString(values[21]),
                alternatives: cleanString(values[22]),
                pricingType: cleanString(values[23]) || 'Free',
            };

            await db.insert(bookmarks).values(bookmarkData).onConflictDoNothing();
            // console.log(`Inserted bookmark: ${title}`);
        } catch (e) {
            console.error(`Failed to insert bookmark ${values[2]}:`, e);
        }
    }

    console.log('Migration complete.');
}

function cleanString(val: string): string | null {
    if (!val || val === 'NULL') return null;
    if (val.startsWith("'") && val.endsWith("'")) {
        let s = val.slice(1, -1);
        // Handle escaped quotes ' -> ''
        s = s.replace(/''/g, "'");
        // Handle replace(..., char(10)) pattern if it was passed as a single value string (unlikely with simple split)
        return s;
    }
    return val;
}

function parseSqlValues(str: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuote = false;
    let parenDepth = 0;

    for (let i = 0; i < str.length; i++) {
        const char = str[i];

        if (char === "'" && str[i - 1] !== '\\') { // Simple quote check, SQL uses '' for escape usually
            // Check for '' escape
            if (inQuote && str[i + 1] === "'") {
                current += "'";
                i++; // skip next quote
                continue;
            }
            inQuote = !inQuote;
            current += char;
        } else if (char === '(' && !inQuote) {
            parenDepth++;
            current += char;
        } else if (char === ')' && !inQuote) {
            parenDepth--;
            current += char;
        } else if (char === ',' && !inQuote && parenDepth === 0) {
            values.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    if (current) values.push(current.trim());

    // Post-process values to handle `replace(...)`
    return values.map(v => {
        if (v.startsWith("replace(")) {
            // Extract the first string argument: replace('content', '\n', char(10))
            // This is a hacky parser for the specific format seen
            const match = v.match(/replace\('((?:[^']|'')*)'/);
            if (match) {
                return "'" + match[1] + "'"; // Return as quoted string
            }
        }
        return v;
    });
}

migrate().catch(console.error);
